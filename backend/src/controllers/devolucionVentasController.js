const db = require("../database/db");
const devolucionesModel = require("../models/DevolucionesVenta");
const detalleDevolucionModel = require("../models/DetalleDevolucionVentaModel");
const ordenModel = require("../models/ordenesVentaModel");
const detalleOrdenModel = require("../models/detalleOrdenVentaModel");
const inventarioModel = require("../models/inventarioModel");
const tesoreriaModel = require("../models/tesoreriaModel");
const Cliente = require("../models/clientesModel");

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        estado,
        buscar = "",
        page = 1,
        pageSize = 20,
        sortBy = "fecha",
        sortDir = "desc",
      } = req.query;

      const estados =
        estado === "anulada" ? ["anulada"] : ["pendiente", "aprobada"];
      const { data, total } = await devolucionesModel.getAllPaginated({
        estados,
        buscar,
        page,
        pageSize,
        sortBy,
        sortDir,
      });

      const totalPages =
        Math.ceil(total / Math.max(1, parseInt(pageSize, 10) || 20)) || 1;

      // Enriquecer cada devolución con detalles, flags de inventario y tesorería
      if (data.length > 0) {
        const ids = data.map((r) => r.id_devolucion_venta);

        // Obtener detalles de artículos
        const [detallesRows] = await db.query(
          `SELECT ddv.id_devolucion_venta, ddv.id_articulo, ddv.cantidad,
                  ddv.precio_unitario, ddv.observaciones, a.descripcion, a.referencia
           FROM detalle_devolucion_venta ddv
           LEFT JOIN articulos a ON ddv.id_articulo = a.id_articulo
           WHERE ddv.id_devolucion_venta IN (?)`,
          [ids],
        );

        // Agrupar detalles por id_devolucion_venta
        const detallesMap = {};
        for (const d of detallesRows) {
          const id = d.id_devolucion_venta;
          if (!detallesMap[id]) detallesMap[id] = [];
          detallesMap[id].push({
            id_articulo: d.id_articulo,
            descripcion: d.descripcion,
            referencia: d.referencia || "",
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            observaciones: d.observaciones || null,
          });
        }

        // Obtener flags de inventario
        const [invRows] = await db.query(
          `SELECT DISTINCT referencia_documento_id
           FROM movimientos_inventario
           WHERE referencia_documento_id IN (?)
             AND referencia_documento_tipo = 'devolucion_cliente'`,
          [ids],
        );
        const invSet = new Set(
          invRows.map((r) => Number(r.referencia_documento_id)),
        );

        // Obtener flags de tesorería
        const [tesRows] = await db.query(
          `SELECT DISTINCT id_documento
           FROM movimientos_tesoreria
           WHERE id_documento IN (?)
             AND tipo_documento = 'devolucion_cliente'`,
          [ids],
        );
        const tesSet = new Set(tesRows.map((r) => Number(r.id_documento)));

        // Fusionar
        for (const row of data) {
          const id = row.id_devolucion_venta;
          row.detalles = detallesMap[id] || [];
          row.inventario_actualizado = invSet.has(Number(id));
          row.tesoreria_movimiento = tesSet.has(Number(id));
        }
      }

      return res.json({
        data,
        page: Math.max(1, parseInt(page, 10) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20)),
        total,
        totalPages,
        hasNext: Math.max(1, parseInt(page, 10) || 1) < totalPages,
        hasPrev: Math.max(1, parseInt(page, 10) || 1) > 1,
      });
    } catch (error) {
      console.error("Error al obtener devoluciones:", error);
      return res
        .status(500)
        .json({ error: "No fue posible cargar las devoluciones." });
    }
  },

  getById: async (req, res) => {
    try {
      const devolucion = await devolucionesModel.getById(req.params.id);
      if (!devolucion) {
        return res.status(404).json({ error: "Devolución no encontrada." });
      }

      const detalles = await detalleDevolucionModel.getByDevolucion(
        req.params.id,
      );
      return res.json({ ...devolucion, detalles });
    } catch (error) {
      console.error("Error al obtener la devolución:", error);
      return res
        .status(500)
        .json({ error: "No fue posible cargar la devolución." });
    }
  },

  getPreviewVenta: async (req, res) => {
    try {
      const venta = await ordenModel.getById(req.params.id);
      if (!venta) {
        return res.status(404).json({ error: "Orden de venta no encontrada." });
      }

      // Si la venta no tiene id_metodo_pago, buscarlo en movimientos_tesoreria
      if (!venta.id_metodo_pago) {
        try {
          const [rows] = await db.query(
            `SELECT id_metodo_pago FROM movimientos_tesoreria
             WHERE id_documento = ? AND tipo_documento = 'orden_venta'
             ORDER BY id_movimiento DESC LIMIT 1`,
            [req.params.id],
          );
          if (rows.length > 0) {
            venta.id_metodo_pago = rows[0].id_metodo_pago;
          }
        } catch (_) {
          // Silencioso — no bloquear si falla
        }
      }

      const detallesBase = await detalleOrdenModel.getByVenta(req.params.id);
      const detalles = await Promise.all(
        detallesBase.map(async (detalle) => {
          const cantidadDevuelta =
            await detalleDevolucionModel.getCantidadDevuelta(
              req.params.id,
              detalle.id_articulo,
            );
          const disponible = Math.max(
            0,
            Number(detalle.cantidad) - Number(cantidadDevuelta),
          );
          return {
            ...detalle,
            cantidad_devuelta: Number(cantidadDevuelta),
            disponible,
            subtotal:
              Number(detalle.cantidad) * Number(detalle.precio_unitario || 0),
          };
        }),
      );

      return res.json({ venta, detalles });
    } catch (error) {
      console.error("Error al preparar la devolución:", error);
      return res
        .status(500)
        .json({ error: "No fue posible preparar la devolución." });
    }
  },

  create: async (req, res) => {
    let connection;

    try {
      const {
        id_orden_venta,
        motivo,
        detalles,
        devolver_dinero = false,
        como_saldo_favor = false,
        id_metodo_pago = null,
        referencia = null,
      } = req.body;

      if (!id_orden_venta) {
        throw new Error("Debe indicar la orden de venta.");
      }

      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe enviar al menos un artículo.");
      }

      if (devolver_dinero && como_saldo_favor) {
        throw new Error(
          "No puede devolver dinero y registrar como saldo a favor simultáneamente.",
        );
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const venta = await ordenModel.getById(id_orden_venta, connection);
      if (!venta) {
        throw new Error("La orden de venta no existe.");
      }

      if (venta.estado === "anulada") {
        throw new Error("No es posible devolver una venta anulada.");
      }

      let totalDevuelto = 0;

      for (const item of detalles) {
        if (!item.id_articulo) {
          throw new Error("Cada detalle debe incluir un artículo.");
        }

        const detalleVenta = await detalleOrdenModel.getArticuloEnVenta(
          id_orden_venta,
          item.id_articulo,
          connection,
        );

        if (!detalleVenta) {
          throw new Error(
            `El artículo ${item.id_articulo} no pertenece a esta venta.`,
          );
        }

        const cantidadDevuelta =
          await detalleDevolucionModel.getCantidadDevuelta(
            id_orden_venta,
            item.id_articulo,
            connection,
          );

        const disponible =
          Number(detalleVenta.cantidad) - Number(cantidadDevuelta);

        if (Number(item.cantidad) <= 0) {
          throw new Error("La cantidad debe ser mayor que cero.");
        }

        if (Number(item.cantidad) > disponible) {
          throw new Error(
            `Solo quedan ${disponible} unidades disponibles para devolución del artículo ${detalleVenta.descripcion}.`,
          );
        }

        totalDevuelto +=
          Number(detalleVenta.precio_unitario) * Number(item.cantidad);
      }

      const id_devolucion_venta = await devolucionesModel.create(
        {
          id_cliente: venta.id_cliente,
          id_orden_venta,
          estado: "aprobada",
          fecha: new Date(),
          motivo,
          monto: devolver_dinero || como_saldo_favor ? totalDevuelto : 0,
          total: totalDevuelto,
          id_metodo_pago,
        },
        connection,
      );

      for (const item of detalles) {
        const detalleVenta = await detalleOrdenModel.getArticuloEnVenta(
          id_orden_venta,
          item.id_articulo,
          connection,
        );

        await detalleDevolucionModel.create(
          {
            id_devolucion_venta,
            id_articulo: item.id_articulo,
            cantidad: item.cantidad,
            precio_unitario: detalleVenta.precio_unitario,
            observaciones: item.observaciones || null,
          },
          connection,
        );

        await inventarioModel.processInventoryMovement(
          {
            id_articulo: item.id_articulo,
            cantidad_movida: item.cantidad,
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
            tipo_origen_movimiento:
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE,
            observaciones: `Devolución venta #${id_orden_venta}`,
            referencia_documento_id: id_devolucion_venta,
            referencia_documento_tipo: "devolucion_cliente",
          },
          connection,
        );
      }

      if (devolver_dinero) {
        if (!id_metodo_pago) {
          throw new Error(
            "Debe indicar el método de pago para devolver el dinero.",
          );
        }

        await tesoreriaModel.insertarMovimiento(
          {
            id_documento: id_devolucion_venta,
            tipo_documento: "devolucion_cliente",
            monto: -Math.abs(totalDevuelto),
            id_metodo_pago,
            referencia,
            observaciones: `Devolución de venta #${id_orden_venta}`,
          },
          connection,
        );
      }

      if (como_saldo_favor && totalDevuelto > 0) {
        await Cliente.incrementarSaldoFavor(
          venta.id_cliente,
          totalDevuelto,
          connection,
        );
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: "Devolución registrada correctamente.",
        id_devolucion_venta,
        total_devuelto: totalDevuelto,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }

      console.error(error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },

  cancelar: async (req, res) => {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      const devolucion = await devolucionesModel.getById(
        req.params.id,
        connection,
      );
      if (!devolucion) {
        throw new Error("Devolución no encontrada.");
      }

      if (devolucion.estado === "anulada") {
        throw new Error("La devolución ya está anulada.");
      }

      // 1. Revertir inventario: los artículos que habían sido devueltos (reingresados)
      //    deben salir del stock nuevamente
      const detalles = await detalleDevolucionModel.getByDevolucion(
        req.params.id,
        connection,
      );

      for (const detalle of detalles) {
        await inventarioModel.processInventoryMovement(
          {
            id_articulo: detalle.id_articulo,
            cantidad_movida: detalle.cantidad,
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
            tipo_origen_movimiento:
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE,
            observaciones: `Anulación devolución #${req.params.id} (venta #${devolucion.id_orden_venta})`,
            referencia_documento_id: req.params.id,
            referencia_documento_tipo: "anulacion_devolucion_cliente",
          },
          connection,
        );
      }

      // 2. Verificar si hay movimiento de tesorería (antes de eliminarlo)
      const [movTes] = await connection.query(
        `SELECT id_movimiento FROM movimientos_tesoreria
         WHERE id_documento = ? AND tipo_documento = 'devolucion_cliente'`,
        [req.params.id],
      );
      const tieneMovimientoTes = movTes.length > 0;

      // 3. Si la devolución tenía saldo a favor y no hay movimiento tesorería, revertirlo
      if (Number(devolucion.monto) > 0 && !tieneMovimientoTes) {
        await Cliente.decrementarSaldoFavor(
          devolucion.id_cliente,
          Number(devolucion.monto),
          connection,
        );
      }

      // 4. Eliminar movimiento de tesorería de tipo devolucion_cliente si existe
      if (tieneMovimientoTes) {
        await tesoreriaModel.deleteByDocumentoAndTipo(
          req.params.id,
          "devolucion_cliente",
          connection,
        );
      }

      // 5. Marcar como anulada
      await devolucionesModel.cancelar(req.params.id, connection);

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message:
          "Devolución anulada correctamente. Inventario y tesorería revertidos.",
        inventarioRevertido: detalles.length,
        tesoreriaRevertida: tieneMovimientoTes,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al anular la devolución:", error);
      return res.status(500).json({
        error: error.message || "No fue posible anular la devolución.",
      });
    }
  },
};
