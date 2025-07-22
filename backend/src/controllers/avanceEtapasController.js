const AvanceModel = require('../models/avanceEtapasModel');
const db = require('../database/db');
 const inventarioModel = require('../models/inventarioModel');
 const detalleOrdenFabricacionModel = require('../models/detalleOrdenFabricacionModel');
const LoteModel = require ('../models/lotesFabricadosModel');

async function exists(table, key, id) {
  if (typeof id === 'undefined') {
    throw new Error(`ID indefinido para la tabla ${table}`);
  }
  const [rows] = await db.execute(
    `SELECT 1 FROM ${table} WHERE ${key} = ? LIMIT 1`,
    [id]
  );
  return rows.length > 0;
}

const estadosValidos = ['completado', 'en proceso', 'pendiente'];
function validarEstado(estado) {
  return estadosValidos.includes(estado);
}

module.exports = {
 create: async (req, res) => {
    let connection; // Declarar la conexión aquí para que sea accesible en el catch final
    try {
      const {
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion,
        costo_fabricacion,
        id_trabajador,
        cantidad, // Cantidad de avance para esta etapa
        observaciones,
      } = req.body;

      console.log('BODY recibido para crear avance:', req.body);

      // Validaciones iniciales
      if (!id_trabajador || !cantidad || typeof cantidad !== 'number' || cantidad <= 0) {
        return res.status(400).json({ error: 'Faltan campos obligatorios o la cantidad es inválida.' });
      }
      if (typeof costo_fabricacion === 'undefined' || costo_fabricacion <= 0) {
        return res.status(400).json({ error: 'Se esperaba un valor válido para costo de fabricación.' });
      }

      // Validar estado de la orden de fabricación
      const [estadoOrden] = await db.query(`
        SELECT estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?
      `, [id_orden_fabricacion]);

      if (estadoOrden.length === 0) {
        return res.status(404).json({ error: 'Orden de fabricación no encontrada.' });
      }
      if (estadoOrden[0].estado === 'completada') {
        return res.status(400).json({ error: 'La orden de fabricación ya está completada. No se pueden registrar más avances.' });
      }

      // Validar existencia de entidades relacionadas
      const ordenExiste = await exists('ordenes_fabricacion', 'id_orden_fabricacion', id_orden_fabricacion);
      const articuloExiste = await exists('articulos', 'id_articulo', id_articulo);
      const etapaExiste = await exists('etapas_produccion', 'id_etapa', id_etapa_produccion);
      const trabajadorExiste = await exists('trabajadores', 'id_trabajador', id_trabajador);

      if (!articuloExiste || !ordenExiste || !etapaExiste || !trabajadorExiste) {
        return res.status(404).json({ error: 'Alguna entidad relacionada no existe.' });
      }

      // Validar si es posible registrar el avance para la cantidad especificada
      const validacion = await AvanceModel.puedeRegistrarAvance(
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion,
        cantidad
      );

      if (validacion?.permitido !== true) {
        return res.status(400).json({
          error: `No puedes registrar esa cantidad. Están disponibles ${validacion?.disponible ?? 0} unidades para esta etapa.`,
        });
      }

      // Obtener cantidad total esperada para el artículo en esta OF
      const cantidadTotalEsperada = await AvanceModel.getCantidadTotalArticulo(id_orden_fabricacion, id_articulo);
      // Calcular lo que ya se ha registrado en esta etapa (antes de insertar este avance)
      const cantidadRegistradaAntes = await AvanceModel.getCantidadRegistradaEtapa(
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion
      );

      const totalAcumulado = cantidadRegistradaAntes + cantidad; // Usar 'cantidad' directamente, ya validada como number

      // Determinar el estado del avance
      const estadoAvance = totalAcumulado >= cantidadTotalEsperada ? 'completado' : 'en proceso';

      // Obtener la etapa final del cliente para este artículo en esta orden
      const etapaFinalCliente = await AvanceModel.getEtapaFinalCliente(id_orden_fabricacion, id_articulo);

      // Iniciar una transacción para el avance, lote e inventario
      // Nota: InventarioModel.processInventoryMovement ya maneja su propia transacción interna.
      // Aquí, la transacción es para AvanceModel.create y LoteModel.createLote.
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. Registrar el avance de etapa
      const avanceId = await AvanceModel.create({
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion,
        id_trabajador,
        cantidad,
        estado: estadoAvance, // Usar el estado calculado
        observaciones,
        costo_fabricacion
      }, connection); // Pasar la conexión para la transacción

      // 2. Si el avance actual completa la etapa, actualizar el estado de los avances de esa etapa
      if (estadoAvance === 'completado') {
        await AvanceModel.actualizarEstadoAvancesEtapa(
          id_orden_fabricacion,
          id_articulo,
          id_etapa_produccion,
          connection // Pasar la conexión
        );
      }

      // 3. Si es la etapa final del cliente, registrar en lotes y actualizar inventario
      if (id_etapa_produccion === etapaFinalCliente) {
        console.log(`Detectada etapa final (${id_etapa_produccion}) para artículo ${id_articulo}. Registrando lote y actualizando inventario.`);
        let loteId;
        try {
          // Registrar el lote
          loteId = await LoteModel.createLote({
            id_orden_fabricacion,
            id_articulo,
            id_trabajador, // Asumimos que el trabajador del avance es el que registra el lote
            cantidad, // La cantidad del lote es la cantidad del avance final
            observaciones: observaciones || null
          }, connection); // Pasar la conexión para la transacción

          // Actualizar el inventario (stock_disponible y stock_fabricado)
          const inventarioUpdateResult = await inventarioModel.processInventoryMovement({
            id_articulo: Number(id_articulo),
            cantidad_movida: Number(cantidad),
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA, // Es una entrada al stock
            tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.PRODUCCION, // Origen: Producción
            observaciones: `Lote #${loteId} de Orden de Fabricación #${id_orden_fabricacion} completado.`,
            referencia_documento_id: loteId, // ID del lote
            referencia_documento_tipo: 'lote', // Tipo de documento de referencia
          });

          console.log(`Stock actualizado para artículo ${id_articulo} (lote fabricado): +${cantidad}. Nuevo stock disponible: ${inventarioUpdateResult.newStockDisponible}, Fabricado: ${inventarioUpdateResult.newStockFabricado}`);

        } catch (inventoryError) {
          console.error(`Error crítico al actualizar inventario para artículo ${id_articulo} al crear lote:`, inventoryError.message);
          // Si la actualización de inventario falla, revertir la transacción del avance y lote
          await connection.rollback();
          connection.release();
          return res.status(500).json({ error: `Lote registrado, pero error al actualizar inventario: ${inventoryError.message}` });
        }
      }

      // 4. Cambiar estado de la orden si es necesario
      const estadoActualOrden = await AvanceModel.getEstadoOrden(id_orden_fabricacion);
      if (estadoActualOrden === 'pendiente') {
        await AvanceModel.actualizarEstadoOrden(id_orden_fabricacion, 'en proceso', connection); // Pasar la conexión
      }

      // 5. Verificar si la orden de fabricación está completamente terminada
      await AvanceModel.checkearSiOrdenCompleta(id_orden_fabricacion, connection); // Pasar la conexión

      await connection.commit(); // Confirmar la transacción
      connection.release(); // Liberar la conexión

      res.status(201).json({ message: 'Avance registrado correctamente', id: avanceId });

    } catch (error) {
      if (connection) {
        await connection.rollback(); // Revertir la transacción en caso de error
        connection.release(); // Liberar la conexión
      }
      console.error('Error al crear el avance de etapa:', error);
      res.status(500).json({ error: error.message || 'Error al crear el avance de etapa' });
    }
  },

getCostoAnterior: async (req, res) => {
  const { id_articulo, id_etapa_produccion } = req.params;

  console.log("🔍 Recibido:", id_articulo, id_etapa_produccion);

  try {
    const costo = await AvanceModel.obtenerUltimoCosto(
      parseInt(id_articulo),
      parseInt(id_etapa_produccion)
    );

    console.log(`✔️ Backend - Costo anterior para artículo ${id_articulo}, etapa ${id_etapa_produccion}:`, costo);
    return res.json({ costo_fabricacion: costo });
  } catch (error) {
    console.error("❌ Error al obtener costo anterior:", error);
    res.status(500).json({ error: "Error al obtener costo anterior" });
  }
},


 getAll: async (req, res) => {
  try {
    const { id_trabajador } = req.query;
    const avances = await AvanceModel.getAll(id_trabajador);
    if (avances.length === 0) {
      return res.status(404).json({ error: 'No se encontraron avances de etapas de producción.' });
    }
    res.status(200).json(avances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

getAllPagados: async (req, res) => {
  try {
    const { id_trabajador } = req.query;
    const avances = await AvanceModel.getAllPagados(id_trabajador);
    if (avances.length === 0) {
      return res.status(404).json({ error: 'No se encontraron avances pagados.' });
    }
    res.status(200).json(avances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

  getAvancesByOrden: async (req, res) => {
  const { id } = req.params;
  try {
    const avances = await AvanceModel.getByOrden(id);
    res.json(avances);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
},

  getById: async (req, res) => {
    const { id } = req.params;
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'El ID proporcionado no es válido.' });
    }

    try {
      const avance = await AvanceModel.getById(id);
      if (!avance) {
        return res.status(404).json({ error: 'Id no encontrado.' });
      }
      res.status(200).json(avance);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  update: async (req, res) => {
    const { id } = req.params;
    const {
      id_orden_fabricacion,
      id_etapa_produccion,
      id_trabajador,
      cantidad,
      estado,
      observaciones = null
    } = req.body;

    if (!id_orden_fabricacion || !id_etapa_produccion || !id_trabajador || !cantidad || !estado) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }
    if (!validarEstado(estado)) {
      return res
        .status(400)
        .json({
          error: `El estado debe ser uno de: ${estadosValidos.join(", ")}`,
        });
    }

    if (cantidad <= 0) {
      return res.status(400).json({ error: 'La cantidad debe ser mayor a 0.' });
    }

    try {
      const ordenExiste = await exists('ordenes_fabricacion', 'id_orden_fabricacion', id_orden_fabricacion);
      const etapaExiste = await exists('etapas_produccion', 'id_etapa', id_etapa_produccion);
      const trabajadorExiste = await exists('trabajadores', 'id_trabajador', id_trabajador);

      if (!ordenExiste || !etapaExiste || !trabajadorExiste) {
        return res.status(404).json({ error: 'Alguna entidad relacionada no existe.' });
      }

      await AvanceModel.update(id, {
        id_orden_fabricacion,
        id_etapa_produccion,
        id_trabajador,
        cantidad,
        estado,
        observaciones
      });

      res.json({ message: 'Avance actualizado correctamente' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error al actualizar el avance de etapa' });
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'El ID proporcionado no es válido.' });
    }

    try {
      const deleted = await AvanceModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Avance de etapa de producción no encontrado.' });
      }

      res.status(200).json({ message: 'Avance de etapa de producción eliminado correctamente.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  getEtapasFinalizadas: async (req, res) => {
  try {
    const { idOrden, idArticulo } = req.params;
    const etapas = await AvanceModel.getEtapasTotalmenteCompletadas(idOrden, idArticulo);
    res.json(etapas);
  } catch (error) {
    console.error("Error al obtener etapas finalizadas:", error);
    res.status(500).json({ error: "Error al obtener etapas finalizadas" });
  }
}

};
