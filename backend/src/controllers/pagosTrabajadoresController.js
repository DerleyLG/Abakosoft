const db = require("../database/db");
const pagosModel = require("../models/pagosTrabajadoresModel");
const detalleModel = require("../models/detallePagoTrabajadorModel");
const trabajadorModel = require("../models/trabajadoresModel");
const avanceEtapasModel = require("../models/avanceEtapasModel");
const AnticiposModel = require("../models/anticiposModel");
const tesoreriaModel = require("../models/tesoreriaModel");

const {
  validarFechaNoEnPeriodoCerrado,
} = require("../utils/validacionCierres");

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
        id_metodo_pago,
        referencia,
        observaciones_pago,
        detalles,
      } = req.body;

      // Validar que la fecha no esté en un período cerrado
      const validacion = await validarFechaNoEnPeriodoCerrado(fecha_pago);
      if (!validacion.valido) {
        await connection.rollback();
        return res.status(400).json({ error: validacion.error });
      }

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
      if (!id_metodo_pago) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "El método de pago es obligatorio." });
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
      if (avancesIds.length === 0 && !detalles.some((d) => d.es_descuento)) {
        await connection.rollback();
        return res.status(400).json({
          error: "Debe incluir al menos un avance o un descuento por anticipo.",
        });
      }
      if (avancesIds.length) {
        const placeholders = avancesIds.map(() => "?").join(",");
        const [avances] = await connection.query(
          `SELECT id_avance_etapa, id_trabajador, id_orden_fabricacion, pagado
           FROM avance_etapas_produccion
           WHERE id_avance_etapa IN (${placeholders})`,
          avancesIds,
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
          (a) => a.id_trabajador === id_trabajador,
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

      // Insertar detalles (avances y descuentos) y aplicar descuentos de anticipos desde detalles
      for (const d of detalles) {
        const esDescuento = d.es_descuento === true;
        if (!esDescuento) {
          // Validar la fila específica del avance
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

          const idDetalle = await detalleModel.create(
            {
              id_pago,
              id_avance_etapa: d.id_avance_etapa,
              cantidad: d.cantidad,
              pago_unitario: d.pago_unitario,
              es_descuento: 0,
            },
            connection,
          );
          console.log("Insert detalle avance, id generado:", idDetalle);
          await avanceEtapasModel.updatePagado(
            d.id_avance_etapa,
            1,
            connection,
          );
        } else {
          // Descuento por anticipo: buscar anticipos del trabajador (prefiere la orden si viene)
          const preferOrder = d.id_orden_fabricacion || null;
          const montoAAplicar = Math.abs(d.pago_unitario);

          // Insertar un único detalle de descuento (registro del descuento en el pago)
          const idDetalle = await detalleModel.create(
            {
              id_pago,
              id_avance_etapa: null,
              cantidad: d.cantidad,
              pago_unitario: d.pago_unitario,
              es_descuento: 1,
            },
            connection,
          );
          console.log("Insert detalle descuento, id generado:", idDetalle);

          // Aplicar el descuento a uno o varios anticipos del trabajador hasta cubrir el
          // monto, dejando registro de cada porción aplicada (para poder revertir después).
          try {
            await AnticiposModel.aplicarDescuento(
              {
                id_trabajador,
                id_detalle_pago: idDetalle,
                montoAAplicar,
                preferOrder,
              },
              connection,
            );
          } catch (errAplicar) {
            await connection.rollback();
            return res.status(400).json({ error: errAplicar.message });
          }
        }
      }

      // Recalcular total
      await pagosModel.calcularMonto(id_pago, connection);

      // Obtener el monto total calculado
      const [pagoResult] = await connection.query(
        "SELECT monto_total FROM pagos_trabajadores WHERE id_pago = ?",
        [id_pago],
      );
      const montoTotal = pagoResult[0]?.monto_total || 0;

      // El descuento por anticipo no puede superar la suma de los avances
      if (montoTotal < 0) {
        await connection.rollback();
        return res.status(400).json({
          error:
            "El descuento por anticipo supera el total de avances del pago. El pago no puede quedar negativo.",
        });
      }

      // Crear movimiento de tesorería

      await tesoreriaModel.insertarMovimiento(
        {
          id_documento: id_pago,
          tipo_documento: "pago_trabajador",
          monto: -Math.abs(Number(montoTotal)),
          id_metodo_pago,
          referencia: referencia || null,
          observaciones: observaciones_pago || null,
          fecha_movimiento: fecha_pago,
        },
        connection,
      );

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
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params;
      const {
        id_trabajador,
        fecha_pago,
        observaciones,
        id_metodo_pago,
        referencia,
        observaciones_pago,
        detalles,
      } = req.body;

      // Validaciones básicas
      if (!id_trabajador || !fecha_pago) {
        await connection.rollback();
        return res.status(400).json({
          error: "Faltan campos obligatorios: id_trabajador o fecha_pago",
        });
      }

      if (!Array.isArray(detalles) || detalles.length === 0) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "Debe incluir al menos un detalle de pago" });
      }

      const pagoExistente = await pagosModel.getById(id);
      if (!pagoExistente) {
        await connection.rollback();
        return res.status(404).json({ error: "Pago no encontrado" });
      }

      // Validar trabajador existente
      const trabajadorExistente = await trabajadorModel.getById(id_trabajador);
      if (!trabajadorExistente) {
        await connection.rollback();
        return res
          .status(400)
          .json({ error: "El trabajador especificado no existe." });
      }

      // 1. Revertir el efecto del pago anterior: liberar el saldo de anticipos
      //    que hubieran consumido las líneas de descuento de este pago
      //    (debe hacerse ANTES de borrar los detalles, de donde se leen las aplicaciones).
      await AnticiposModel.revertirAplicacionesPorPago(id, connection);

      // Desmarcar como pagados los avances que traía el pago anterior; se vuelven
      // a marcar más abajo si siguen presentes en los detalles nuevos.
      const detallesAnteriores = await detalleModel.getById(id);
      for (const d of detallesAnteriores) {
        if (d.id_avance_etapa && d.es_descuento !== 1) {
          await avanceEtapasModel.updatePagado(d.id_avance_etapa, 0, connection);
        }
      }

      // Eliminar detalles antiguos (arrastra en cascada las aplicaciones ya revertidas)
      await detalleModel.deleteByPagoId(id, connection);

      // Validar avances: existencia, no pagados (por otro pago), y mismo trabajador
      const avancesIds = detalles
        .filter((d) => d.es_descuento !== true)
        .map((d) => d.id_avance_etapa);
      if (avancesIds.length) {
        const placeholders = avancesIds.map(() => "?").join(",");
        const [avances] = await connection.query(
          `SELECT id_avance_etapa, id_trabajador, pagado
           FROM avance_etapas_produccion
           WHERE id_avance_etapa IN (${placeholders})`,
          avancesIds,
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
            .json({ error: "Uno o más avances ya fueron pagados por otro pago." });
        }
        const mismoTrabajador = avances.every(
          (a) => a.id_trabajador === id_trabajador,
        );
        if (!mismoTrabajador) {
          await connection.rollback();
          return res.status(400).json({
            error:
              "Todos los avances deben pertenecer al mismo trabajador del pago.",
          });
        }
      }

      // Insertar detalles nuevos, marcando avances como pagados y aplicando descuentos
      for (const detalle of detalles) {
        const esDescuento = detalle.es_descuento === true;

        if (!esDescuento) {
          await detalleModel.create(
            {
              id_pago: id,
              id_avance_etapa: detalle.id_avance_etapa,
              cantidad: detalle.cantidad,
              pago_unitario: detalle.pago_unitario,
              es_descuento: 0,
            },
            connection,
          );
          await avanceEtapasModel.updatePagado(
            detalle.id_avance_etapa,
            1,
            connection,
          );
        } else {
          const idDetalle = await detalleModel.create(
            {
              id_pago: id,
              id_avance_etapa: null,
              cantidad: detalle.cantidad,
              pago_unitario: detalle.pago_unitario,
              es_descuento: 1,
            },
            connection,
          );

          const preferOrder = detalle.id_orden_fabricacion || null;
          const montoAAplicar = Math.abs(detalle.pago_unitario);
          try {
            await AnticiposModel.aplicarDescuento(
              {
                id_trabajador,
                id_detalle_pago: idDetalle,
                montoAAplicar,
                preferOrder,
              },
              connection,
            );
          } catch (errAplicar) {
            await connection.rollback();
            return res.status(400).json({ error: errAplicar.message });
          }
        }
      }

      // Recalcular total a partir de los detalles ya insertados
      await pagosModel.calcularMonto(id, connection);
      const [pagoResult] = await connection.query(
        "SELECT monto_total FROM pagos_trabajadores WHERE id_pago = ?",
        [id],
      );
      const montoTotal = pagoResult[0]?.monto_total || 0;

      // El descuento por anticipo no puede superar la suma de los avances
      if (montoTotal < 0) {
        await connection.rollback();
        return res.status(400).json({
          error:
            "El descuento por anticipo supera el total de avances del pago. El pago no puede quedar negativo.",
        });
      }

      await pagosModel.update(
        id,
        { id_trabajador, monto_total: montoTotal, observaciones, fecha_pago },
        connection,
      );

      // Sincronizar el movimiento de tesorería con el nuevo total
      // (si no se envían método/referencia, updateOrCreateMovimiento conserva los existentes)
      await tesoreriaModel.updateOrCreateMovimiento(
        {
          id_documento: id,
          tipo_documento: "pago_trabajador",
          monto: -Math.abs(Number(montoTotal)),
          id_metodo_pago: id_metodo_pago || null,
          referencia: referencia || null,
          observaciones: observaciones_pago || null,
          fecha_movimiento: fecha_pago,
        },
        connection,
      );

      await connection.commit();
      return res
        .status(200)
        .json({ message: "Pago actualizado correctamente" });
    } catch (error) {
      await connection.rollback();
      console.error("Error actualizando pago:", error);
      return res.status(500).json({ error: "Error actualizando pago" });
    } finally {
      connection.release();
    }
  },

  // Eliminar pago y detalles asociados
  deletePago: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const id_pago = req.params.id;

      // Verificar existencia
      const pagoExistente = await pagosModel.getById(id_pago);
      if (!pagoExistente) {
        await connection.rollback();
        return res.status(404).json({ error: "Pago no encontrado" });
      }

      // Obtener los detalles del pago antes de eliminarlos para saber qué avances desmarcar
      const detallesDelPago = await detalleModel.getById(id_pago);

      // Revertir el saldo consumido en anticipos por los descuentos de este pago
      // (debe hacerse ANTES de borrar los detalles, de donde se leen las aplicaciones)
      await AnticiposModel.revertirAplicacionesPorPago(id_pago, connection);

      // Borrar detalles primero para evitar FK
      await detalleModel.deleteByPagoId(id_pago, connection);

      // Borrar pago
      await pagosModel.delete(id_pago, connection);

      // Desmarcar avances como pagados al eliminar el pago
      for (const detalle of detallesDelPago) {
        if (detalle.id_avance_etapa && detalle.es_descuento !== 1) {
          await avanceEtapasModel.updatePagado(
            detalle.id_avance_etapa,
            0,
            connection,
          );
          console.log(
            `Avance de etapa ${detalle.id_avance_etapa} desmarcado como pagado.`,
          );
        }
      }

      // Eliminar movimiento de tesorería asociado al pago
      const tesoreriaEliminada =
        (await tesoreriaModel.deleteByDocumentoAndTipo(
          id_pago,
          "pago_trabajador",
          connection,
        )) > 0;

      await connection.commit();
      res.json({ message: "Pago eliminado correctamente", tesoreriaEliminada });
    } catch (error) {
      await connection.rollback();
      console.error("Error eliminando pago:", error);
      res.status(500).json({ error: "Error eliminando pago" });
    } finally {
      connection.release();
    }
  },

  // Crear anticipo con integración de tesorería
  createAnticipo: async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const {
        id_trabajador,
        id_orden_fabricacion,
        monto,
        observaciones = "",
        fecha,
        id_metodo_pago,
        referencia,
        observaciones_pago,
      } = req.body;

      // Validar que la fecha no esté en un período cerrado
      const validacion = await validarFechaNoEnPeriodoCerrado(fecha);
      if (!validacion.valido) {
        await connection.rollback();
        return res.status(400).json({ error: validacion.error });
      }

      // Validar campos obligatorios
      if (!id_trabajador || !monto || !fecha) {
        await connection.rollback();
        return res.status(400).json({
          error: "Faltan campos obligatorios: id_trabajador, monto, fecha",
        });
      }

      if (!id_metodo_pago) {
        await connection.rollback();
        return res.status(400).json({
          error: "El método de pago es obligatorio.",
        });
      }

      if (monto <= 0) {
        await connection.rollback();
        return res.status(400).json({
          error: "El monto debe ser mayor a cero.",
        });
      }

      // Validar trabajador
      const trabajadorExistente = await trabajadorModel.getById(id_trabajador);
      if (!trabajadorExistente) {
        await connection.rollback();
        return res.status(400).json({
          error: "El trabajador especificado no existe.",
        });
      }

      // Crear anticipo
      const id_anticipo = await AnticiposModel.create({
        id_trabajador,
        id_orden_fabricacion: id_orden_fabricacion || null,
        monto,
        observaciones,
        fecha,
      });

      // Crear movimiento de tesorería
      const tesoreriaModel = require("../models/tesoreriaModel");
      const nombreTrabajador = trabajadorExistente.nombre || null;
      await tesoreriaModel.insertarMovimiento(
        {
          id_documento: id_anticipo,
          tipo_documento: "anticipo",
          monto: -Math.abs(Number(monto)),
          id_metodo_pago,
          referencia: referencia || null,
          observaciones: observaciones_pago || nombreTrabajador || null,
          fecha_movimiento: fecha,
        },
        connection,
      );

      await connection.commit();
      return res.status(201).json({
        success: true,
        id_anticipo,
        message:
          "Anticipo registrado correctamente con movimiento de tesorería",
      });
    } catch (error) {
      await connection.rollback();
      console.error("Error creando anticipo:", error);
      return res.status(500).json({
        error: error.message || "Error creando anticipo",
      });
    } finally {
      connection.release();
    }
  },
};
