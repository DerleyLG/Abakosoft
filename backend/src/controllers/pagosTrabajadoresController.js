const pagosModel = require('../models/pagosTrabajadoresModel');
const detalleModel = require('../models/detallePagoTrabajadorModel');
const trabajadorModel = require('../models/trabajadoresModel');
const avanceEtapasModel = require ('../models/avanceEtapasModel');
const ordenFabricacionModel = require ('../models/ordenesFabricacionModel');





module.exports = {
  // Obtener todos los pagos con detalles
  getAllPagos: async (req, res) => {
    try {
      const pagos = await pagosModel.getAll();
      res.json(pagos);
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
  try {
    const {
      id_trabajador,
      fecha_pago,
      observaciones = "",
      es_anticipo = 0,
      detalles,
      monto_manual,
      id_orden_fabricacion,
    } = req.body;

    // Validar existencia del trabajador
    const trabajadorExistente = await trabajadorModel.getById(id_trabajador);
    if (!trabajadorExistente) {
      return res.status(400).json({ error: "El trabajador especificado no existe." });
    }

    // Validar fecha
    if (!fecha_pago) {
      return res.status(400).json({ error: "La fecha de pago es obligatoria." });
    }

    // Si no es anticipo, validar detalles
    if (!es_anticipo && (!Array.isArray(detalles) || detalles.length === 0)) {
      return res.status(400).json({ error: "Los detalles del pago son obligatorios." });
    }

    // Si es anticipo, validar monto y orden
    if (es_anticipo) {
      if (!monto_manual || isNaN(monto_manual)) {
        return res.status(400).json({
          error: "El monto del anticipo es obligatorio y debe ser numérico.",
        });
      }
      if (!id_orden_fabricacion) {
        return res.status(400).json({
          error: "La orden de fabricación es obligatoria para un anticipo.",
        });
      }
    }

    // Enriquecer observación si es anticipo
    let obsFinal = observaciones;
    if (es_anticipo && id_orden_fabricacion) {
      const orden = await ordenFabricacionModel.getById(id_orden_fabricacion);
      if (!orden) {
        return res.status(400).json({ error: "La orden de fabricación no existe." });
      }

      const cliente = orden.nombre_cliente || "desconocido";
      obsFinal += ` (Anticipo para orden de fabricación #${id_orden_fabricacion} con cliente ${cliente})`;
    }

    // Crear el pago
    const id_pago = await pagosModel.create({
      id_trabajador,
      id_orden_fabricacion: es_anticipo ? id_orden_fabricacion : null,
      fecha_pago,
      observaciones: obsFinal,
      es_anticipo,
      monto_total: es_anticipo ? parseFloat(monto_manual) : 0,
    });

    // Si no es anticipo, registrar los detalles y calcular el total
    if (!es_anticipo) {
      for (const detalle of detalles) {
        const avanceExistente = await avanceEtapasModel.getById(detalle.id_avance_etapa);
        if (!avanceExistente) {
          await detalleModel.deleteByPagoId(id_pago);
          await pagosModel.delete(id_pago);
          return res.status(400).json({
            error: `El id_avance_etapa ${detalle.id_avance_etapa} no existe.`,
          });
        }

        await detalleModel.create({
          id_pago,
          id_avance_etapa: detalle.id_avance_etapa,
          cantidad: detalle.cantidad,
          pago_unitario: detalle.pago_unitario,
        });

        await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 1);
      }

      await pagosModel.calcularMonto(id_pago);
    }

    res.status(201).json({ message: "Pago creado correctamente", id_pago });
  } catch (error) {
    console.error("Error creando pago:", error);
    res.status(500).json({ error: "Error interno del servidor." });
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
        return res
          .status(400)
          .json({
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
        const avance = await avanceEtapasModel.getById(detalle.id_avance_etapa);
        if (!avance) {
          return res
            .status(400)
            .json({
              error: `El id_avance_etapa ${detalle.id_avance_etapa} no existe`,
            });
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

      // Actualizar detalles:
      // Primero eliminar detalles antiguos para evitar conflicto FK
      await detalleModel.deleteByPagoId(id);

      // Insertar detalles nuevos
      for (const detalle of detalles) {
        await detalleModel.create({
          id_pago: id,
          id_avance_etapa: detalle.id_avance_etapa,
          cantidad: detalle.cantidad,
          pago_unitario: detalle.pago_unitario,
        });
      }

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

      // Verificar existencia
      const pagoExistente = await pagosModel.getById(id_pago);
      if (!pagoExistente) {
        return res.status(404).json({ error: "Pago no encontrado" });
      }

      // Borrar detalles primero para evitar FK
      await detalleModel.deleteByPagoId(id_pago);

      // Borrar pago
      await pagosModel.delete(id_pago);

      res.json({ message: "Pago eliminado correctamente" });
    } catch (error) {
      console.error("Error eliminando pago:", error);
      res.status(500).json({ error: "Error eliminando pago" });
    }
  },
};
