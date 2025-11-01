const db = require("../database/db");
const pagosModel = require("../models/pagosTrabajadoresModel"); // Tu modelo de pagos
const detalleModel = require("../models/detallePagoTrabajadorModel"); // Tu modelo de detalles de pago
const trabajadorModel = require("../models/trabajadoresModel"); // Tu modelo de trabajadores
const avanceEtapasModel = require("../models/avanceEtapasModel"); // Tu modelo de avances de etapa
const AnticiposModel = require("../models/anticiposModel"); // Tu modelo de anticipos

module.exports = {
  // Obtener pagos paginados (siempre paginado)
  getAllPagos: async (req, res) => {
    try {
      const {
        buscar = "",
        page,
        pageSize,
        sortBy,
        sortDir,
        trabajadorId,
      } = req.query;
      const p = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));

      const { data, total } = await pagosModel.getAllPaginated({
        buscar,
        trabajadorId,
        page: p,
        pageSize: ps,
        sortBy,
        sortDir,
      });
      const totalPages = Math.ceil(total / ps) || 1;

      res.json({
        data,
        page: p,
        pageSize: ps,
        total,
        totalPages,
        hasNext: p < totalPages,
        hasPrev: p > 1,
        sortBy: sortBy || "fecha_pago",
        sortDir: String(sortDir).toLowerCase() === "asc" ? "asc" : "desc",
      });
    } catch (error) {
      console.error("Error obteniendo pagos:", error);
      res.status(500).json({ error: "Error obteniendo pagos" });
    }
  },

  // Obtener pago por ID con detalles
  getPagoById: async (req, res) => {
    try {
      const id = req.params.id;
      const pago = await pagosModel.getById(id);
      if (!pago) {
        return res.status(404).json({ error: "Pago no encontrado" });
      }
      const detalles = await detalleModel.getByPagoId(id);
      pago.detalles = detalles;
      res.json(pago);
    } catch (error) {
      console.error("Error obteniendo pago:", error);
      res.status(500).json({ error: "Error obteniendo pago" });
    }
  },

  // Crear nuevo pago con detalles
  createPago: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const {
        id_trabajador,
        fecha_pago,
        observaciones = "",
        detalles,
        appliedAnticipos = [], // [{ id_anticipo, id_orden_fabricacion, monto_aplicado }]
      } = req.body;

      // Validar trabajador
      const trabajadorExistente = await trabajadorModel.getById(id_trabajador);
      if (!trabajadorExistente) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "El trabajador especificado no existe." });
      }
      if (!fecha_pago) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "La fecha de pago es obligatoria." });
      }
      if (!Array.isArray(detalles) || detalles.length === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Los detalles del pago son obligatorios." });
      }

      // Validar avances: existencia, no pagados, y mismo trabajador
      const avancesIds = detalles
        .filter((d) => !d.es_descuento)
        .map((d) => d.id_avance_etapa);
      if (avancesIds.length === 0 && appliedAnticipos.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          error: "Debe incluir al menos un avance o un anticipo aplicado.",
        });
      }
      if (avancesIds.length) {
        const placeholders = avancesIds.map(() => "?").join(",");
        const [avances] = await connection.query(
          `SELECT id_avance_etapa, id_trabajador, id_orden_fabricacion, pagado
           FROM avance_etapas_produccion
           WHERE id_avance_etapa IN (${placeholders})`,
          avancesIds
        );
        if (avances.length !== avancesIds.length) {
          await connection.rollback();
          return res
            .status(400)
            .json({ error: "Uno o más avances no existen." });
        }
        const algunoPagado = avances.some((a) => a.pagado === 1);
        if (algunoPagado) {
          await connection.rollback();
          return res
            .status(400)
            .json({ error: "Uno o más avances ya fueron pagados." });
        }
        const mismoTrabajador = avances.every(
          (a) => a.id_trabajador === id_trabajador
        );
        if (!mismoTrabajador) {
          await connection.rollback();
          return res.status(400).json({
            error:
              "Todos los avances deben pertenecer al mismo trabajador del pago.",
          });
        }
      }

      // Crear pago
      const id_pago = await pagosModel.create({
        id_trabajador,
        monto_total: 0,
        observaciones,
        fecha_pago,
      });

      // Insertar detalles de avances y marcar pagados
      for (const d of detalles) {
        const esDescuento = d.es_descuento === true;
        if (!esDescuento) {
          // Validar la fila específica del avance (opcional redundante por el batch de arriba)
          const avance = await avanceEtapasModel.getById(d.id_avance_etapa);
          if (!avance) {
            await connection.rollback();
            return res.status(400).json({
              error: `El id_avance_etapa ${d.id_avance_etapa} no existe.`,
            });
          }
          if (avance.pagado === 1) {
            await connection.rollback();
            return res.status(400).json({
              error: `El avance ${d.id_avance_etapa} ya está pagado.`,
            });
          }
          if (avance.id_trabajador !== id_trabajador) {
            await connection.rollback();
            return res.status(400).json({
              error: `El avance ${d.id_avance_etapa} no pertenece al trabajador del pago.`,
            });
          }

          await connection.query(
            `INSERT INTO detalle_pago_trabajador (id_pago, id_avance_etapa, cantidad, pago_unitario, es_descuento)
             VALUES (?, ?, ?, ?, 0)`,
            [id_pago, d.id_avance_etapa, d.cantidad, d.pago_unitario]
          );
          await avanceEtapasModel.updatePagado(
            d.id_avance_etapa,
            1,
            connection
          );
        }
      }

      // Aplicar anticipos por orden de forma segura
      for (const a of appliedAnticipos) {
        const anticipo = await AnticiposModel.getActivo(
          id_trabajador,
          a.id_orden_fabricacion
        );
        if (!anticipo) {
          await connection.rollback();
          return res.status(400).json({
            error: `No hay anticipo activo para la orden ${a.id_orden_fabricacion}.`,
          });
        }
        const disponible =
          Number(anticipo.monto) - Number(anticipo.monto_usado || 0);
        if (a.monto_aplicado <= 0 || a.monto_aplicado > disponible) {
          await connection.rollback();
          return res.status(400).json({
            error: `Monto de anticipo inválido para la orden ${a.id_orden_fabricacion}.`,
          });
        }
        // Insertar detalle de descuento por anticipo (subtotal negativo)
        await connection.query(
          `INSERT INTO detalle_pago_trabajador (id_pago, id_avance_etapa, cantidad, pago_unitario, es_descuento)
           VALUES (?, NULL, 1, ?, 1)`,
          [id_pago, -Math.abs(a.monto_aplicado)]
        );
        await AnticiposModel.descontar(
          anticipo.id_anticipo,
          Math.abs(a.monto_aplicado)
        );
      }

      // Recalcular total
      await pagosModel.calcularMonto(id_pago, connection);
      await connection.commit();
      return res.status(201).json({ success: true, id_pago });
    } catch (error) {
      await connection.rollback();
      console.error("Error creando pago:", error);
      return res
        .status(500)
        .json({ error: error.message || "Error creando pago" });
    } finally {
      connection.release();
    }
  },

  // Actualizar pago y sus detalles
  updatePago: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        id_trabajador,
        fecha_pago,
        observaciones,
        es_anticipo = 0,
        detalles,
      } = req.body;

      // Validaciones básicas
      if (!id_trabajador || !fecha_pago) {
        return res.status(400).json({
          error: "Faltan campos obligatorios: id_trabajador o fecha_pago",
        });
      }

      if (!Array.isArray(detalles) || detalles.length === 0) {
        return res
          .status(400)
          .json({ error: "Debe incluir al menos un detalle de pago" });
      }

      // Validar trabajador existente
      const trabajadorExistente = await trabajadorModel.getById(id_trabajador);
      if (!trabajadorExistente) {
        return res
          .status(400)
          .json({ error: "El trabajador especificado no existe." });
      }

      // Validar que todos los id_avance_etapa en detalles existan
      for (const detalle of detalles) {
        // Si no es un descuento, validar que el avance exista
        if (detalle.es_descuento !== true) {
          // Asegurarse de no validar id_avance_etapa para descuentos
          const avance = await avanceEtapasModel.getById(
            detalle.id_avance_etapa
          );
          if (!avance) {
            return res.status(400).json({
              error: `El id_avance_etapa ${detalle.id_avance_etapa} no existe`,
            });
          }
        }
      }

      // Calcular monto_total sumando subtotal de detalles
      const monto_total = detalles.reduce(
        (acc, item) => acc + item.cantidad * item.pago_unitario,
        0
      );

      // Actualizar pago principal
      await pagosModel.update(id, {
        id_trabajador,
        fecha_pago,
        observaciones,
        es_anticipo,
        monto_total,
      });

      // Primero eliminar detalles antiguos para evitar conflicto FK
      await detalleModel.deleteByPagoId(id);

      // Insertar detalles nuevos y actualizar el estado 'pagado' si no es un descuento
      for (const detalle of detalles) {
        const esDescuento = detalle.es_descuento === true;
        await detalleModel.create({
          id_pago: id,
          id_avance_etapa: esDescuento ? null : detalle.id_avance_etapa,
          cantidad: detalle.cantidad,
          pago_unitario: detalle.pago_unitario,
          es_descuento: esDescuento ? 1 : 0,
        });

        // Si no es un descuento, y el avance no estaba ya pagado, marcarlo como pagado
        if (!esDescuento) {
          const avanceActual = await avanceEtapasModel.getById(
            detalle.id_avance_etapa
          );
          if (avanceActual && avanceActual.pagado !== 1) {
            // Solo actualiza si no está ya pagado
            await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 1);
            console.log(
              `Avance de etapa ${detalle.id_avance_etapa} marcado como pagado durante la actualización del pago.`
            );
          }
        }
      }

      // Lógica para aplicar/revertir descuento de anticipo si es relevante en la actualización
      // (Esta parte no estaba en tu código original de update, pero sería necesaria si los anticipos
      // se gestionan en las actualizaciones de pagos)

      return res
        .status(200)
        .json({ message: "Pago actualizado correctamente" });
    } catch (error) {
      console.error("Error actualizando pago:", error);
      return res.status(500).json({ error: "Error actualizando pago" });
    }
  },

  // Eliminar pago y detalles asociados
  deletePago: async (req, res) => {
    try {
      const id_pago = req.params.id;

      // Obtener los detalles del pago antes de eliminarlos para saber qué avances desmarcar
      const detallesDelPago = await detalleModel.getByPagoId(id_pago);

      // Verificar existencia
      const pagoExistente = await pagosModel.getById(id_pago);
      if (!pagoExistente) {
        return res.status(404).json({ error: "Pago no encontrado" });
      }

      // Borrar detalles primero para evitar FK
      await detalleModel.deleteByPagoId(id_pago);

      // Borrar pago
      await pagosModel.delete(id_pago);

      // --- ¡AÑADIDO CLAVE AQUÍ! Desmarcar avances como pagados al eliminar el pago ---
      for (const detalle of detallesDelPago) {
        if (detalle.id_avance_etapa && detalle.es_descuento !== 1) {
          // Si es un avance de etapa y no un descuento
          await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 0); // 0 para false/no pagado
          console.log(
            `Avance de etapa ${detalle.id_avance_etapa} desmarcado como pagado.`
          );
        }
      }
      // --- FIN AÑADIDO ---

      res.json({ message: "Pago eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminando pago:", error);
      res.status(500).json({ error: "Error eliminando pago" });
    }
  },
};
