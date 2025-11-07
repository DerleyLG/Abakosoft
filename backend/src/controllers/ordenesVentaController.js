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
    [id_cliente]
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
        observaciones_pago,
        id_pedido,
      } = req.body;

      // Validar que la fecha actual no esté en un período cerrado
      const fechaHoy = new Date().toISOString().split("T")[0];
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
        connection
      );
      if (!clienteExistente) {
        throw new Error("El cliente especificado no existe.");
      }
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`
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
          connection
        );
        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }
        const inventarioArticulo =
          await inventarioModel.obtenerInventarioPorArticulo(
            id_articulo,
            connection
          );
        if (!inventarioArticulo || inventarioArticulo.stock < cantidad) {
          throw new Error(
            `Stock insuficiente para el artículo ${
              articuloExistente.descripcion
            }. Stock disponible: ${
              inventarioArticulo?.stock || 0
            }, solicitado: ${cantidad}`
          );
        }

        if (
          precio_unitario == null ||
          isNaN(precio_unitario) ||
          precio_unitario <= 0
        ) {
          throw new Error(
            `El precio para el artículo '${articuloExistente.descripcion}' debe ser un número válido mayor a cero.`
          );
        }

        totalVenta += precio_unitario * cantidad;
      }

      const id_orden_venta = await ordenModel.create(
        {
          id_cliente,
          estado,
          fecha: fechaFormat,
          total: totalVenta,
          monto: totalVenta,
          id_pedido: id_pedido || null,
        },
        connection
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
          connection
        );

        await detalleOrdenModel.create(
          {
            id_orden_venta,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: "",
            precio_unitario: detalle.precio_unitario,
          },
          connection
        );
      }
      // Resolver id_metodo_pago por nombre si no se proporcionó
      let resolvedMetodoId = id_metodo_pago;
      if (
        (!resolvedMetodoId || resolvedMetodoId == null) &&
        req.body.metodo_nombre
      ) {
        resolvedMetodoId = await metodosDePagoModel.getIdByName(
          req.body.metodo_nombre
        );
      }

      // Si el método resuelto corresponde a 'credito' (búsqueda por nombre), tratamos como venta a crédito
      const creditoMetodoId = await metodosDePagoModel.getIdByName("credito");
      if (
        resolvedMetodoId &&
        creditoMetodoId &&
        Number(resolvedMetodoId) === Number(creditoMetodoId)
      ) {
        await ventasCreditoModel.crearVentaCredito(
          {
            id_orden_venta,
            id_cliente,
            monto_total: totalVenta,
            saldo_pendiente: totalVenta,
            estado: "pendiente",
            observaciones: observaciones_pago || null,
          },
          connection
        );
      } else {
        // Movimiento real en tesorería
        const movimientoData = {
          id_documento: id_orden_venta,
          tipo_documento: "orden_venta",
          monto: totalVenta,
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
      } = req.body;

      connection = await db.getConnection();
      await connection.beginTransaction();

      const ordenActual = await ordenModel.getById(id, connection);
      if (!ordenActual) {
        throw new Error("Orden de venta no encontrada.");
      }

      // Validar que la fecha de la orden no esté en un período cerrado
      const fechaCerrada = await cierresCajaModel.validarFechaCerrada(
        ordenActual.fecha
      );
      if (fechaCerrada) {
        return res.status(400).json({
          error:
            "No se pueden modificar órdenes de venta de períodos cerrados. La fecha de esta orden está en un período cerrado de caja.",
        });
      }

      if (!id_cliente || !estado) {
        throw new Error("Faltan campos obligatorios.");
      }
      if (!(await clienteExists(id_cliente, connection))) {
        throw new Error("Cliente no existe.");
      }
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`
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
                inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE,
              observaciones: `Reintegro por anulación de orden de venta #${id}`,
              referencia_documento_id: id,
              referencia_documento_tipo: "anulacion_orden_venta",
            },
            connection
          );
          console.log(
            `Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`
          );
        }
      }

      // Actualizar detalles si se proporcionan
      if (detalles && Array.isArray(detalles) && detalles.length > 0) {
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
            connection
          );
        }
      }

      // Calcular nuevo total
      const nuevoTotal = detalles
        ? detalles.reduce((sum, d) => sum + d.cantidad * d.precio_unitario, 0)
        : ordenActual.total;

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
        },
        connection
      );

      console.log("Filas actualizadas:", updatedRows);

      // Actualizar movimiento de tesorería si se proporcionan datos de pago
      if (id_metodo_pago && ordenActual.id_movimiento_tesoreria) {
        await tesoreriaModel.actualizarMovimiento(
          ordenActual.id_movimiento_tesoreria,
          {
            monto: nuevoTotal,
            id_metodo_pago,
            referencia: referencia || null,
            observaciones: observaciones_pago || null,
          },
          connection
        );
      }

      if (updatedRows === 0) {
        throw new Error("No se pudo actualizar la orden de venta.");
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
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE,
            observaciones: `Reintegro por anulación de orden de venta #${id}`,
            referencia_documento_id: id,
            referencia_documento_tipo: "anulacion_orden_venta",
          },
          connection
        );
        console.log(
          `Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`
        );
      }

      await connection.commit();
      connection.release();
      res.json({
        message: "Orden de venta anulada y stock reintegrado correctamente.",
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
