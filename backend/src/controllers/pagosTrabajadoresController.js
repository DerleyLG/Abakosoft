const db = require('../database/db');
const pagosModel = require('../models/pagosTrabajadoresModel'); // Tu modelo de pagos
const detalleModel = require('../models/detallePagoTrabajadorModel'); // Tu modelo de detalles de pago
const trabajadorModel = require('../models/trabajadoresModel'); // Tu modelo de trabajadores
const avanceEtapasModel = require ('../models/avanceEtapasModel'); // Tu modelo de avances de etapa
const AnticiposModel = require('../models/anticiposModel'); // Tu modelo de anticipos

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
        detalles,
        id_orden_fabricacion, // Este campo viene del frontend
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

      // Validar detalles
      if (!Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ error: "Los detalles del pago son obligatorios." });
      }

      // Validar orden de fabricación (siempre debe venir para un pago de avances)
      if (!id_orden_fabricacion) {
        return res.status(400).json({ error: "La orden de fabricación es obligatoria para el pago de avances." });
      }

      // Crear el pago base
      const id_pago = await pagosModel.create({
        id_trabajador,
        id_orden_fabricacion, // Asegúrate de que tu pagosModel.create acepte id_orden_fabricacion
        fecha_pago,
        observaciones,
        monto_total: 0, // se actualizará después
      });

      // Registrar detalles y actualizar avances como pagados
      for (const detalle of detalles) {
        const esDescuento = detalle.es_descuento === true;

        if (!esDescuento) {
          // Validar que el avance exista antes de registrar el detalle del pago
          const avanceExistente = await avanceEtapasModel.getById(detalle.id_avance_etapa);
          if (!avanceExistente) {
            // Si el avance no existe, revertir la creación del pago y detalles anteriores
            await detalleModel.deleteByPagoId(id_pago); // Eliminar detalles ya creados para este pago
            await pagosModel.delete(id_pago); // Eliminar el pago base
            return res.status(400).json({
              error: `El id_avance_etapa ${detalle.id_avance_etapa} no existe o ya fue pagado.`,
            });
          }

          // Crear el detalle del pago
          await detalleModel.create({
            id_pago,
            id_avance_etapa: detalle.id_avance_etapa,
            cantidad: detalle.cantidad,
            pago_unitario: detalle.pago_unitario,
            es_descuento: 0, // No es un descuento
          });

          // --- ¡CORRECCIÓN CLAVE AQUÍ! Actualizar el avance a 'pagado' ---
          await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 1); // 1 para true/pagado
          console.log(`Avance de etapa ${detalle.id_avance_etapa} marcado como pagado.`);
        } else {
          // Si es un descuento, solo crear el detalle del pago (no hay avance de etapa asociado)
          await detalleModel.create({
            id_pago,
            id_avance_etapa: null, // Los descuentos no se asocian a un avance de etapa específico
            cantidad: detalle.cantidad, // La cantidad del descuento
            pago_unitario: detalle.pago_unitario, // El monto del descuento (negativo)
            es_descuento: 1, // Es un descuento
          });
        }
      }

      // Lógica para aplicar descuento de anticipo (si existe)
      const descuento = detalles.find((d) => d.es_descuento === true);
      if (descuento) {
        const descuentoAbs = Math.abs(descuento.pago_unitario);

        const anticipo = await AnticiposModel.getActivo(id_trabajador, id_orden_fabricacion);
        if (!anticipo) {
          throw new Error("No se encontró un anticipo activo para aplicar el descuento.");
        }

        if ((anticipo.monto_usado || 0) + descuentoAbs > anticipo.monto) {
          throw new Error("El descuento excede el monto disponible del anticipo.");
        }

        await AnticiposModel.descontar(anticipo.id_anticipo, descuentoAbs);
        console.log(`Anticipo ${anticipo.id_anticipo} descontado en ${descuentoAbs}.`);
      }

      // Calcular el monto total del pago y actualizarlo en la tabla 'pagos'
      await pagosModel.calcularMonto(id_pago);
      console.log(`Monto total calculado para el pago ${id_pago}.`);

      res.status(201).json({ message: "Pago registrado correctamente", id_pago });

    } catch (error) {
      console.error("Error creando pago:", error);
      // Asegúrate de que el mensaje de error sea más amigable para el usuario
      const errorMessage = error.message || "Error interno del servidor al registrar el pago.";
      res.status(500).json({ error: errorMessage });
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
        // Si no es un descuento, validar que el avance exista
        if (detalle.es_descuento !== true) { // Asegurarse de no validar id_avance_etapa para descuentos
          const avance = await avanceEtapasModel.getById(detalle.id_avance_etapa);
          if (!avance) {
            return res
              .status(400)
              .json({
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
          const avanceActual = await avanceEtapasModel.getById(detalle.id_avance_etapa);
          if (avanceActual && avanceActual.pagado !== 1) { // Solo actualiza si no está ya pagado
            await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 1);
            console.log(`Avance de etapa ${detalle.id_avance_etapa} marcado como pagado durante la actualización del pago.`);
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
        if (detalle.id_avance_etapa && detalle.es_descuento !== 1) { // Si es un avance de etapa y no un descuento
          await avanceEtapasModel.updatePagado(detalle.id_avance_etapa, 0); // 0 para false/no pagado
          console.log(`Avance de etapa ${detalle.id_avance_etapa} desmarcado como pagado.`);
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
