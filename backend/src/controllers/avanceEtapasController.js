const AvanceModel = require('../models/avanceEtapasModel');
const db = require('../database/db');
 const inventarioModel = require('../models/inventarioModel');
 const detalleOrdenFabricacionModel = require('../models/detalleOrdenFabricacionModel');

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
  try {
    const {
      id_orden_fabricacion,
      id_articulo,
      id_etapa_produccion,
      costo_fabricacion,
      id_trabajador,
      cantidad,
      observaciones,
    } = req.body;

    console.log('BODY recibido:', req.body);

    if (!id_trabajador || !cantidad) {
      return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    if (costo_fabricacion <= 0) {
      return res.status(400).json({ error: 'Se esperaba un valor válido para costo de fabricación.' });
    }

    const [estadoOrden] = await db.query(`
      SELECT estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?
    `, [id_orden_fabricacion]);

    if (estadoOrden[0]?.estado === 'completada') {
      return res.status(400).json({ error: 'La orden de fabricación ya está completada. No se pueden registrar más avances.' });
    }

    const ordenExiste = await exists('ordenes_fabricacion', 'id_orden_fabricacion', id_orden_fabricacion);
    const articuloExiste = await exists('articulos', 'id_articulo', id_articulo);
    const etapaExiste = await exists('etapas_produccion', 'id_etapa', id_etapa_produccion);
    const trabajadorExiste = await exists('trabajadores', 'id_trabajador', id_trabajador);

    if (!articuloExiste || !ordenExiste || !etapaExiste || !trabajadorExiste) {
      return res.status(404).json({ error: 'Alguna entidad relacionada no existe.' });
    }

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

    const cantidadTotal = await AvanceModel.getCantidadTotalArticulo(id_orden_fabricacion, id_articulo);
  // Calcular lo que ya se ha registrado en esta etapa (antes de insertar)
const cantidadRegistradaAntes = parseInt( await AvanceModel.getCantidadRegistradaEtapa(
  id_orden_fabricacion,
  id_articulo,
  id_etapa_produccion
)
);
const cantidadNumerica = parseInt(cantidad);


const totalAcumulado = cantidadRegistradaAntes + cantidadNumerica;

console.log(`🔢 Cantidad total esperada en orden: ${cantidadTotal}`);
console.log(`🔄 Cantidad ya registrada en esta etapa (antes de este avance): ${cantidadRegistradaAntes}`);
console.log(`➕ Cantidad que se está registrando: ${cantidad}`);
console.log(`🧮 Total acumulado (registrado + actual): ${totalAcumulado}`);

const estado = totalAcumulado >= cantidadTotal ? 'completado' : 'en proceso';


    const etapaFinalCliente = await AvanceModel.getEtapaFinalCliente(id_orden_fabricacion, id_articulo);

    const insertId = await AvanceModel.create({
      id_orden_fabricacion,
      id_articulo,
      id_etapa_produccion,
      id_trabajador,
      cantidad,
      estado,
      observaciones,
      costo_fabricacion
    });

    // Solo si el avance actual completa la etapa
    if (estado === 'completado') {
      await AvanceModel.actualizarEstadoAvancesEtapa(
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion
      );
    }

    // Si es la etapa final del cliente, registrar en lotes
    if (id_etapa_produccion === etapaFinalCliente) {
      await db.query(`
        INSERT INTO lotes_fabricados 
        (id_orden_fabricacion, id_articulo, id_trabajador, cantidad, observaciones)
        VALUES (?, ?, ?, ?, ?)
      `, [
        id_orden_fabricacion,
        id_articulo,
        id_trabajador,
        cantidad,
        observaciones || null
      ]);
    }

    // Cambiar estado de la orden si es necesario
    const estadoActual = await AvanceModel.getEstadoOrden(id_orden_fabricacion);
    if (estadoActual === 'pendiente') {
      await AvanceModel.actualizarEstadoOrden(id_orden_fabricacion, 'en proceso');
    }

    await AvanceModel.checkearSiOrdenCompleta(id_orden_fabricacion);

    const estadoFinal = await AvanceModel.getEstadoOrden(id_orden_fabricacion);

    if (estadoFinal === 'completada') {
      const detalles = await detalleOrdenFabricacionModel.getById(id_orden_fabricacion);

      for (const detalle of detalles) {
        const { id_articulo, cantidad } = detalle;
        try {
          await inventarioModel.agregarActualizarInventario(id_articulo, cantidad);
          console.log(` Stock actualizado para artículo ${id_articulo}: +${cantidad}`);
        } catch (err) {
          console.error(` Error actualizando stock para artículo ${id_articulo}:`, err.message);
        }
      }

      console.log(` Inventario actualizado tras completar la orden #${id_orden_fabricacion}`);
    }

    res.status(201).json({ message: 'Avance registrado correctamente', id: insertId });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear el avance de etapa' });
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
