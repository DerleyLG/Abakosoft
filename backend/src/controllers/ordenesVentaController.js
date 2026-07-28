const ordenModel = require("../models/ordenesVentaModel");
const detalleOrdenModel = require("../models/detalleOrdenVentaModel");
const clienteModel = require("../models/clientesModel");
const articuloModel = require("../models/articulosModel");
const inventarioModel = require("../models/inventarioModel");
const tesoreriaModel = require("../models/tesoreriaModel");
const pedidoModel = require("../models/ordenPedidosModel");
const db = require("../database/db");
const ventasCreditoModel = require("../models/ventasCredito");
const metodosDePagoModel = require("../models/metodosDePagoModel");
const cierresCajaModel = require("../models/cierresCajaModel");

// Utilidad para obtener la fecha local YYYY-MM-DD en una zona horaria dada
function getTodayYMDForTZ(timeZone) {
  const tz =
    timeZone || process.env.APP_TZ || process.env.TZ || "America/Bogota";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

async function clienteExists(id_cliente, connection = db) {
  const [rows] = await (connection || db).query(
    "SELECT 1 FROM clientes WHERE id_cliente = ? LIMIT 1",
    [id_cliente],
  );
  return rows.length > 0;
}

const ESTADOS_VALIDOS = ["pendiente", "completada", "anulada"];

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        estado,
        buscar = "",
        page,
        pageSize,
        sortBy,
        sortDir,
      } = req.query;
      const estados =
        estado === "anulada" ? ["anulada"] : ["pendiente", "completada"];
      const p = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));

      const { data, total } = await ordenModel.getAllPaginated({
        estados,
        buscar,
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
        sortBy: sortBy || "fecha",
        sortDir: String(sortDir).toLowerCase() === "asc" ? "asc" : "desc",
        estado: estado || "activas",
      });
    } catch (err) {
      console.error("Error al obtener órdenes de venta:", err);
      res.status(500).json({ error: "Error al obtener órdenes de venta." });
    }
  },

  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const orden = await ordenModel.getById(id);
      if (!orden)
        return res.status(404).json({ error: "Orden de venta no encontrada." });

      const detalles = await detalleOrdenModel.getByVenta(id);
      res.json({ ...orden, detalles });
    } catch (err) {
      console.error("Error al obtener la orden:", err);
      res.status(500).json({ error: "Error al obtener la orden." });
    }
  },

  create: async (req, res) => {
    let connection;
    try {
      const {
        id_cliente,
        estado,
        // fecha ignorada deliberadamente para seguridad/rigidez
        detalles,
        id_metodo_pago,
        referencia,
        id_pedido,
        monto_saldo_favor: montoSaldoFavorRaw,
      } = req.body;

      let { observaciones_pago } = req.body;

      const montoSaldoFavor = Math.max(0, Number(montoSaldoFavorRaw) || 0);

      // Validar que la fecha actual no esté en un período cerrado
      // Usar la misma zona horaria que se usa para crear la orden
      const fechaHoy = getTodayYMDForTZ();
      const fechaCerrada = await cierresCajaModel.validarFechaCerrada(fechaHoy);
      if (fechaCerrada) {
        return res.status(400).json({
          error:
            "No se pueden crear órdenes de venta en períodos cerrados. La fecha actual está en un período cerrado de caja.",
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const clienteExistente = await clienteModel.getById(
        id_cliente,
        connection,
      );
      if (!clienteExistente) {
        throw new Error("El cliente especificado no existe.");
      }
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
        );
      }
      // Fecha de la OV: forzar fecha local del servidor según TZ configurable (por defecto America/Bogota)
      const fechaFormat = getTodayYMDForTZ();

      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe incluir al menos un detalle.");
      }

      let totalVenta = 0;
      for (const detalle of detalles) {
        const { id_articulo, cantidad, precio_unitario } = detalle;

        const articuloExistente = await articuloModel.getById(
          id_articulo,
          connection,
        );
        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }

        if (
          precio_unitario == null ||
          isNaN(precio_unitario) ||
          precio_unitario <= 0
        ) {
          throw new Error(
            `El precio para el artículo '${articuloExistente.descripcion}' debe ser un número válido mayor a cero.`,
          );
        }

        totalVenta += precio_unitario * cantidad;
      }

      // ── Calcular monto real a cobrar (descontando saldo a favor) ──
      const montoPagoReal = Math.max(0, totalVenta - montoSaldoFavor);

      const id_orden_venta = await ordenModel.create(
        {
          id_cliente,
          estado,
          fecha: fechaFormat,
          total: totalVenta,
          monto: montoPagoReal,
          id_pedido: id_pedido || null,
        },
        connection,
      );

      for (const detalle of detalles) {
        await inventarioModel.processInventoryMovement(
          {
            id_articulo: Number(detalle.id_articulo),
            cantidad_movida: Number(detalle.cantidad),
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
            tipo_origen_movimiento:
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.VENTA,
            observaciones: `Salida por orden de venta #${id_orden_venta}`,
            referencia_documento_id: id_orden_venta,
            referencia_documento_tipo: "orden_venta",
          },
          connection,
        );

        await detalleOrdenModel.create(
          {
            id_orden_venta,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: "",
            precio_unitario: detalle.precio_unitario,
          },
          connection,
        );
      }

      // ── Aplicar saldo a favor si se indicó ──
      if (montoSaldoFavor > 0) {
        const saldoActual = await clienteModel.getSaldoFavor(
          id_cliente,
          connection,
        );
        if (saldoActual < montoSaldoFavor) {
          throw new Error(
            `El cliente no tiene suficiente saldo a favor. Disponible: ${saldoActual}, solicitado: ${montoSaldoFavor}`,
          );
        }
        await clienteModel.decrementarSaldoFavor(
          id_cliente,
          montoSaldoFavor,
          connection,
        );
        // Si no hay observaciones del usuario, poner texto por defecto
        if (!observaciones_pago) {
          observaciones_pago = "Descuento de saldo a favor aplicado";
        }
      }

      // Resolver id_metodo_pago por nombre si no se proporcionó
      let resolvedMetodoId = id_metodo_pago;
      if (
        (!resolvedMetodoId || resolvedMetodoId == null) &&
        req.body.metodo_nombre
      ) {
        resolvedMetodoId = await metodosDePagoModel.getIdByName(
          req.body.metodo_nombre,
        );
      }

      // ── Movimiento de tesorería por saldo a favor usado ──
      if (montoSaldoFavor > 0) {
        // Usar el mismo método de pago del abono a saldo a favor
        const [ultimoAbono] = await connection.query(
          `SELECT id_metodo_pago FROM movimientos_tesoreria
           WHERE tipo_documento = 'saldo_favor'
             AND id_documento = ?
           ORDER BY fecha_movimiento DESC
           LIMIT 1`,
          [id_cliente],
        );
        const metodoSaldo = ultimoAbono[0]?.id_metodo_pago || resolvedMetodoId;

        await tesoreriaModel.insertarMovimiento(
          {
            id_documento: id_orden_venta,
            tipo_documento: "saldo_favor_usado",
            monto: -Math.abs(montoSaldoFavor),
            id_metodo_pago: metodoSaldo,
            referencia: `OV-${id_orden_venta}`,
            observaciones: `Saldo usado en OV-${id_orden_venta}`,
          },
          connection,
        );
      }

      // Si el método resuelto corresponde a 'credito', crear crédito y actualizar id_metodo_pago a 4
      const creditoMetodoId = await metodosDePagoModel.getIdByName("credito");
      if (
        resolvedMetodoId &&
        creditoMetodoId &&
        Number(resolvedMetodoId) === Number(creditoMetodoId)
      ) {
        if (montoPagoReal > 0) {
          await ventasCreditoModel.crearVentaCredito(
            {
              id_orden_venta,
              id_cliente,
              monto_total: montoPagoReal,
              saldo_pendiente: montoPagoReal,
              estado: "pendiente",
              observaciones: observaciones_pago || null,
            },
            connection,
          );
        }
        // Forzar id_metodo_pago a 4 (CREDITO)
        await ordenModel.update(
          id_orden_venta,
          { id_metodo_pago: creditoMetodoId },
          connection,
        );
      } else if (montoPagoReal > 0) {
        // Movimiento real en tesorería (monto restante después de saldo)
        const movimientoData = {
          id_documento: id_orden_venta,
          tipo_documento: "orden_venta",
          monto: montoPagoReal,
          id_metodo_pago: resolvedMetodoId,
          referencia,
          observaciones: observaciones_pago,
          // No pasar fecha_movimiento: el modelo usará la fecha de la OV por defecto
          fecha_movimiento: null,
        };
        await tesoreriaModel.insertarMovimiento(movimientoData, connection);
      }

      // Solo completar el pedido si existe un id_pedido
      if (id_pedido) {
        await pedidoModel.completar(id_pedido, connection);
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        message: "Orden de venta y movimiento de tesorería creados.",
        id_orden_venta,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Detalles del error al crear orden de venta:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
      });
      return res
        .status(500)
        .json({ error: error.message || "Error al crear la orden de venta." });
    }
  },

  update: async (req, res) => {
    let connection;
    try {
      const id = +req.params.id;
      const {
        id_cliente,
        estado,
        detalles,
        id_metodo_pago,
        referencia,
        observaciones_pago,
        monto_saldo_favor: montoSaldoFavorRaw,
      } = req.body;

      const montoSaldoFavor = Math.max(0, Number(montoSaldoFavorRaw) || 0);

      connection = await db.getConnection();
      await connection.beginTransaction();

      const ordenActual = await ordenModel.getById(id, connection);
      if (!ordenActual) {
        throw new Error("Orden de venta no encontrada.");
      }

      // Validar que la fecha de la orden no esté en un período cerrado
      // Excepto si es crédito con saldo pendiente (puede modificarse aunque el período esté cerrado)
      const creditoMetodoId = await metodosDePagoModel.getIdByName("credito");
      const esOCredito =
        Number(ordenActual.id_metodo_pago) === Number(creditoMetodoId) ||
        (id_metodo_pago && Number(id_metodo_pago) === Number(creditoMetodoId));
      const eraCredito =
        Number(ordenActual.id_metodo_pago) === Number(creditoMetodoId);

      // Si el período está cerrado, solo permitir editar créditos (sin cambiar a contado)
      const fechaCerrada = await cierresCajaModel.validarFechaCerrada(
        ordenActual.fecha,
      );
      if (fechaCerrada) {
        if (!esOCredito) {
          return res.status(400).json({
            error:
              "No se pueden modificar órdenes de venta de períodos cerrados. La fecha de esta orden está en un período cerrado de caja.",
          });
        }
        if (
          eraCredito &&
          id_metodo_pago &&
          Number(id_metodo_pago) !== Number(creditoMetodoId)
        ) {
          return res.status(400).json({
            error:
              "No se puede cambiar el método de pago de una orden a crédito en un período cerrado.",
          });
        }
      }

      if (!id_cliente || !estado) {
        throw new Error("Faltan campos obligatorios.");
      }
      if (!(await clienteExists(id_cliente, connection))) {
        throw new Error("Cliente no existe.");
      }
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`,
        );
      }

      if (ordenActual.estado !== "anulada" && estado === "anulada") {
        const detalles = await detalleOrdenModel.getByVenta(id, connection);
        for (const detalle of detalles) {
          await inventarioModel.processInventoryMovement(
            {
              id_articulo: detalle.id_articulo,
              cantidad_movida: detalle.cantidad,
              tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
              tipo_origen_movimiento:
                inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.ANULACION_VENTA,
              observaciones: `Reintegro por anulación de orden de venta #${id}`,
              referencia_documento_id: id,
              referencia_documento_tipo: "anulacion_orden_venta",
            },
            connection,
          );
          console.log(
            `Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`,
          );
        }

        // Revertir saldo a favor si se usó
        if (Number(ordenActual.monto) < Number(ordenActual.total)) {
          const montoSaldoUsado =
            Number(ordenActual.total) - Number(ordenActual.monto);
          await clienteModel.incrementarSaldoFavor(
            ordenActual.id_cliente,
            montoSaldoUsado,
            connection,
          );
          await tesoreriaModel.deleteByDocumentoAndTipo(
            id,
            "saldo_favor_usado",
            connection,
          );
        }

        // Eliminar movimiento de tesorería
        await tesoreriaModel.deleteByDocumentoAndTipo(
          id,
          "orden_venta",
          connection,
        );

        // Eliminar crédito si existe
        const creditoId = await metodosDePagoModel.getIdByName("credito");
        if (Number(ordenActual.id_metodo_pago) === Number(creditoId)) {
          await connection.query(
            "DELETE FROM ventas_credito WHERE id_orden_venta = ?",
            [id],
          );
        }
      }

      // Actualizar detalles si se proporcionan
      if (detalles && Array.isArray(detalles) && detalles.length > 0) {
        // Obtener detalles antiguos antes de eliminarlos (para ajustar inventario)
        const oldDetalles = await detalleOrdenModel.getByVenta(id, connection);

        // Eliminar detalles antiguos
        await detalleOrdenModel.deleteByVenta(id, connection);

        // Insertar nuevos detalles
        for (const detalle of detalles) {
          await detalleOrdenModel.create(
            {
              id_orden_venta: id,
              id_articulo: detalle.id_articulo,
              cantidad: detalle.cantidad,
              precio_unitario: detalle.precio_unitario,
            },
            connection,
          );
        }

        // Comparar y ajustar inventario por diferencia
        const diffMap = {};
        // Restar cantidades viejas
        for (const old of oldDetalles) {
          diffMap[old.id_articulo] =
            (diffMap[old.id_articulo] || 0) - Number(old.cantidad);
        }
        // Sumar cantidades nuevas
        for (const nuevo of detalles) {
          diffMap[nuevo.id_articulo] =
            (diffMap[nuevo.id_articulo] || 0) + Number(nuevo.cantidad);
        }

        for (const [idArticulo, diff] of Object.entries(diffMap)) {
          if (diff === 0) continue;
          const tipo =
            diff < 0
              ? inventarioModel.TIPOS_MOVIMIENTO.ENTRADA
              : inventarioModel.TIPOS_MOVIMIENTO.SALIDA;
          const obs =
            diff < 0
              ? `Reintegro por edición de orden de venta #${id}`
              : `Salida adicional por edición de orden de venta #${id}`;
          await inventarioModel.processInventoryMovement(
            {
              id_articulo: Number(idArticulo),
              cantidad_movida: Math.abs(diff),
              tipo_movimiento: tipo,
              tipo_origen_movimiento:
                inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.VENTA,
              observaciones: obs,
              referencia_documento_id: id,
              referencia_documento_tipo: "orden_venta",
            },
            connection,
          );
        }
      }

      // Calcular nuevo total
      const nuevoTotal = detalles
        ? detalles.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)
        : ordenActual.total;

      // ── Manejar cambio en saldo a favor ──
      const saldoUsadoActual = Math.max(
        0,
        Number(ordenActual.total) - Number(ordenActual.monto),
      );
      const nuevoMonto = Math.max(0, nuevoTotal - montoSaldoFavor);
      const clienteCambio =
        Number(id_cliente) !== Number(ordenActual.id_cliente);

      if (montoSaldoFavor !== saldoUsadoActual || clienteCambio) {
        if (saldoUsadoActual > 0) {
          // Revertir saldo anterior al cliente original
          await clienteModel.incrementarSaldoFavor(
            ordenActual.id_cliente,
            saldoUsadoActual,
            connection,
          );
          await tesoreriaModel.deleteByDocumentoAndTipo(
            id,
            "saldo_favor_usado",
            connection,
          );
        }
        if (montoSaldoFavor > 0) {
          // Validar saldo suficiente en el nuevo cliente
          const saldoActualCliente = await clienteModel.getSaldoFavor(
            id_cliente,
            connection,
          );
          if (saldoActualCliente < montoSaldoFavor) {
            throw new Error(
              `El cliente no tiene suficiente saldo a favor. Disponible: ${saldoActualCliente}, solicitado: ${montoSaldoFavor}`,
            );
          }
          // Aplicar nuevo saldo al nuevo cliente
          await clienteModel.decrementarSaldoFavor(
            id_cliente,
            montoSaldoFavor,
            connection,
          );
          // Buscar método de pago del último abono a saldo a favor del cliente
          const [ultimoAbonoUpd] = await connection.query(
            `SELECT id_metodo_pago FROM movimientos_tesoreria
             WHERE tipo_documento = 'saldo_favor'
               AND id_documento = ?
             ORDER BY fecha_movimiento DESC
             LIMIT 1`,
            [id_cliente],
          );
          let metodoSaldoUpd =
            ultimoAbonoUpd[0]?.id_metodo_pago ||
            id_metodo_pago ||
            ordenActual.id_metodo_pago;
          if (!metodoSaldoUpd) {
            const [mp] = await connection.query(
              "SELECT id_metodo_pago FROM metodos_pago ORDER BY id_metodo_pago ASC LIMIT 1",
            );
            metodoSaldoUpd = mp[0]?.id_metodo_pago;
          }
          await tesoreriaModel.insertarMovimiento(
            {
              id_documento: id,
              tipo_documento: "saldo_favor_usado",
              monto: -Math.abs(montoSaldoFavor),
              id_metodo_pago: metodoSaldoUpd,
              referencia: `OV-${id}`,
              observaciones: `Saldo usado en OV-${id}`,
            },
            connection,
          );
        }
      }

      console.log("Actualizando orden de venta:", {
        id,
        id_cliente,
        estado,
        total: nuevoTotal,
        ordenActual: { estado: ordenActual.estado, total: ordenActual.total },
      });

      const updatedRows = await ordenModel.update(
        id,
        {
          id_cliente,
          estado,
          total: nuevoTotal,
          monto: nuevoMonto,
        },
        connection,
      );

      console.log("Filas actualizadas:", updatedRows);

      // ── Actualizar movimiento de tesorería ──
      const [movTes] = await connection.query(
        `SELECT id_movimiento, monto FROM movimientos_tesoreria
         WHERE id_documento = ? AND tipo_documento = 'orden_venta'
         LIMIT 1`,
        [id],
      );
      const movimientoOV = movTes[0] || null;

      if (movimientoOV) {
        const montoMovActual = Number(movimientoOV.monto || 0);
        const nuevoMontoMov = Number(nuevoMonto);
        if (
          montoMovActual !== nuevoMontoMov ||
          (id_metodo_pago &&
            Number(id_metodo_pago) !== Number(ordenActual.id_metodo_pago))
        ) {
          await tesoreriaModel.actualizarMovimiento(
            movimientoOV.id_movimiento,
            {
              monto: nuevoMontoMov,
              id_metodo_pago: id_metodo_pago || undefined,
              referencia: referencia || null,
              observaciones: observaciones_pago || null,
            },
            connection,
          );
        }
      } else if (id_metodo_pago && Number(nuevoMonto) > 0) {
        await tesoreriaModel.insertarMovimiento(
          {
            id_documento: id,
            tipo_documento: "orden_venta",
            monto: Number(nuevoMonto),
            id_metodo_pago,
            referencia: referencia || null,
            observaciones: observaciones_pago || null,
            fecha_movimiento: null,
          },
          connection,
        );
      }

      if (updatedRows === 0) {
        throw new Error("No se pudo actualizar la orden de venta.");
      }

      // ── Manejar crédito: transiciones entre crédito y contado ──
      const esCredito =
        id_metodo_pago && Number(id_metodo_pago) === Number(creditoMetodoId);

      // Si era crédito y ya no → eliminar crédito y crear movimiento tesorería
      if (eraCredito && !esCredito) {
        await connection.query(
          `DELETE FROM ventas_credito WHERE id_orden_venta = ?`,
          [id],
        );
        if (Number(nuevoMonto) > 0 && id_metodo_pago) {
          await tesoreriaModel.insertarMovimiento(
            {
              id_documento: id,
              tipo_documento: "orden_venta",
              monto: Number(nuevoMonto),
              id_metodo_pago,
              referencia: referencia || null,
              observaciones: observaciones_pago || null,
              fecha_movimiento: null,
            },
            connection,
          );
        }
      } else if (!eraCredito && esCredito) {
        // No era crédito y ahora sí → eliminar movimiento tesorería, crear crédito
        await tesoreriaModel.deleteByDocumentoAndTipo(
          id,
          "orden_venta",
          connection,
        );
        await ventasCreditoModel.crearVentaCredito(
          {
            id_orden_venta: id,
            id_cliente,
            monto_total: nuevoTotal,
            saldo_pendiente: nuevoTotal,
            estado: "pendiente",
            observaciones: observaciones_pago || null,
          },
          connection,
        );
      } else if (esCredito) {
        // Ambos son crédito → actualizar crédito existente
        const credito = await ventasCreditoModel.getByOrdenVentaId(
          id,
          connection,
        );
        if (credito) {
          // Buscar abonos realizados
          const AbonosCreditoModel = require("../models/AbonosCredito");
          const resumen = await AbonosCreditoModel.obtenerResumenCredito(
            credito.id_venta_credito,
          );
          const totalAbonado = resumen ? Number(resumen.total_abonado) : 0;
          let nuevoEstado;
          let nuevoSaldo;
          if (totalAbonado >= nuevoTotal) {
            nuevoEstado = "pagado";
            nuevoSaldo = 0;
          } else if (totalAbonado > 0) {
            nuevoEstado = "parcial";
            nuevoSaldo = Math.max(nuevoTotal - totalAbonado, 0);
          } else {
            nuevoEstado = "pendiente";
            nuevoSaldo = nuevoTotal;
          }
          await connection.query(
            `UPDATE ventas_credito SET monto_total = ?, saldo_pendiente = ?, estado = ? WHERE id_orden_venta = ?`,
            [nuevoTotal, nuevoSaldo, nuevoEstado, id],
          );
          // Forzar id_metodo_pago a 4 (CREDITO) si hay crédito
          await ordenModel.update(
            id,
            { id_metodo_pago: creditoMetodoId },
            connection,
          );
        }
      }

      await connection.commit();
      connection.release();
      res.json({ message: "Orden de venta actualizada." });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al actualizar la orden de venta:", err);
      res.status(500).json({
        error: err.message || "Error al actualizar la orden de venta.",
      });
    }
  },

  delete: async (req, res) => {
    let connection;
    try {
      const id = +req.params.id;

      connection = await db.getConnection();
      await connection.beginTransaction();

      const orden = await ordenModel.getById(id, connection);
      if (!orden) {
        throw new Error("Orden de venta no encontrada.");
      }

      // Permitir anular órdenes en cualquier estado

      await ordenModel.update(id, { estado: "anulada" }, connection);

      const detalles = await detalleOrdenModel.getByVenta(id, connection);
      for (const detalle of detalles) {
        await inventarioModel.processInventoryMovement(
          {
            id_articulo: detalle.id_articulo,
            cantidad_movida: detalle.cantidad,
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
            tipo_origen_movimiento:
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.ANULACION_VENTA,
            observaciones: `Reintegro por anulación de orden de venta #${id}`,
            referencia_documento_id: id,
            referencia_documento_tipo: "anulacion_orden_venta",
          },
          connection,
        );
        console.log(
          `Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`,
        );
      }

      // Revertir saldo a favor si se usó
      if (Number(orden.monto) < Number(orden.total)) {
        const montoSaldoUsado = Number(orden.total) - Number(orden.monto);
        await clienteModel.incrementarSaldoFavor(
          orden.id_cliente,
          montoSaldoUsado,
          connection,
        );
        // Eliminar movimiento de tesorería del saldo usado
        await tesoreriaModel.deleteByDocumentoAndTipo(
          id,
          "saldo_favor_usado",
          connection,
        );
      }

      // Eliminar movimiento de tesorería asociado a la venta
      const tesoreriaDeleted = await tesoreriaModel.deleteByDocumentoAndTipo(
        id,
        "orden_venta",
        connection,
      );

      await connection.commit();
      connection.release();
      res.json({
        message: "Orden de venta anulada y stock reintegrado correctamente.",
        tesoreriaEliminada: tesoreriaDeleted > 0,
      });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error anulando la orden de venta:", err);
      res
        .status(500)
        .json({ error: err.message || "Error al anular la orden de venta." });
    }
  },
  getArticulosConStock: async (req, res) => {
    try {
      const articulos = await ordenModel.getArticulosConStock();
      res.json(articulos);
    } catch (error) {
      console.error("Error al obtener artículos con stock:", error);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },
};
