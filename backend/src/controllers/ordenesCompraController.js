const db = require("../database/db");
const ordenCompras = require("../models/ordenesCompraModel");
const detalleOrdenCompra = require("../models/detalleOrdenCompraModel");
const proveedorModel = require("../models/proveedoresModel");
const articuloModel = require("../models/articulosModel");
const inventarioModel = require("../models/inventarioModel");
const tesoreriaModel = require("../models/tesoreriaModel");
const cierresCajaModel = require("../models/cierresCajaModel");

const proveedorExiste = async (id_proveedor, connection = db) => {
  const proveedor = await proveedorModel.getById(id_proveedor, connection);
  return !!proveedor;
};

const ordenFabricacionExiste = async (
  id_orden_fabricacion,
  connection = db
) => {
  if (!id_orden_fabricacion) return true;
  const [rows] = await (connection || db).query(
    "SELECT 1 FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?",
    [id_orden_fabricacion]
  );
  return rows.length > 0;
};

const getOrdenesCompra = async (req, res) => {
  try {
    const {
      estado,
      buscar = "",
      proveedorId = null,
      page = 1,
      pageSize = 25,
      sortBy = "fecha",
      sortDir = "desc",
    } = req.query;

    let estadosToFilter = ["pendiente", "completada"];
    if (estado === "cancelada") {
      estadosToFilter = ["cancelada"];
    } else if (estado === "pendiente" || estado === "completada") {
      estadosToFilter = [estado];
    }

    const { data, total } = await ordenCompras.getAllPaginated({
      estados: estadosToFilter,
      buscar,
      proveedorId,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 25,
      sortBy,
      sortDir,
    });

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const totalPages = Math.max(1, Math.ceil(total / ps));

    res.json({
      data,
      page: p,
      pageSize: ps,
      total,
      totalPages,
      hasNext: p < totalPages,
      hasPrev: p > 1,
      sortBy,
      sortDir: String(sortDir).toLowerCase() === "asc" ? "asc" : "desc",
    });
  } catch (error) {
    console.error("Error al obtener las órdenes de compra:", error);
    res.status(500).json({ error: "Error al obtener las órdenes de compra" });
  }
};

const getOrdenCompraById = async (req, res) => {
  const { id } = req.params;
  try {
    const orden = await ordenCompras.getById(id);
    if (!orden) {
      return res.status(404).json({ error: "Orden de compra no encontrada" });
    }
    const detalles = await detalleOrdenCompra.getByOrdenCompra(id);
    console.log("getOrdenCompraById - Orden:", orden);
    console.log("getOrdenCompraById - Detalles:", detalles);
    const response = { ...orden, detalles };
    console.log("getOrdenCompraById - Response:", response);
    res.json(response);
  } catch (error) {
    console.error("Error al obtener la orden de compra:", error);
    res.status(500).json({ error: "Error al obtener la orden de compra" });
  }
};

async function createOrdenCompra(req, res) {
  let connection;
  try {
    const {
      id_proveedor,
      categoria_costo,
      id_orden_fabricacion,
      items,
      id_metodo_pago,
      referencia,
      observaciones_pago,
    } = req.body;

    // Validar que la fecha actual no esté en un período cerrado
    const fechaHoy = new Date().toISOString().split("T")[0];
    const fechaCerrada = await cierresCajaModel.validarFechaCerrada(fechaHoy);
    if (fechaCerrada) {
      return res.status(400).json({
        error:
          "No se pueden crear órdenes de compra en períodos cerrados. La fecha actual está en un período cerrado de caja.",
      });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    if (!id_proveedor || !Array.isArray(items) || items.length === 0) {
      throw new Error("Faltan datos obligatorios: id_proveedor o items.");
    }

    if (!(await proveedorExiste(id_proveedor, connection))) {
      throw new Error("El proveedor especificado no existe.");
    }

    if (
      id_orden_fabricacion &&
      !(await ordenFabricacionExiste(id_orden_fabricacion, connection))
    ) {
      throw new Error("La orden de fabricación especificada no existe.");
    }

    const estadoFinal = "pendiente";

    const itemsMap = new Map();
    let totalCompra = 0;
    for (const item of items) {
      const { id_articulo, cantidad, precio_unitario } = item;

      if (
        !id_articulo ||
        isNaN(cantidad) ||
        cantidad <= 0 ||
        isNaN(precio_unitario) ||
        precio_unitario < 0
      ) {
        throw new Error(
          "Cada item requiere un id_articulo, cantidad positiva y precio_unitario válido."
        );
      }

      const articuloInfo = await articuloModel.getById(id_articulo, connection);
      if (!articuloInfo) {
        throw new Error(
          `El artículo con ID ${id_articulo} no existe en la base de datos de artículos.`
        );
      }

      const inventarioArticulo =
        await inventarioModel.obtenerInventarioPorArticulo(
          id_articulo,
          connection
        );
      if (!inventarioArticulo) {
        await connection.rollback();
        connection.release();
        console.log(
          `[OrdenCompraController] Artículo ${id_articulo} no inicializado en inventario. Enviando 409.`
        );
        return res.status(409).json({
          message: `El artículo "${articuloInfo.descripcion}" (ID: ${id_articulo}) no está inicializado en el inventario.`,
          needsInitialization: true,
          articulo: {
            id: id_articulo,
            descripcion: articuloInfo.descripcion,
          },
        });
      }

      if (itemsMap.has(id_articulo)) {
        const existente = itemsMap.get(id_articulo);
        existente.cantidad += cantidad;
        existente.precio_unitario = precio_unitario;
        itemsMap.set(id_articulo, existente);
      } else {
        itemsMap.set(id_articulo, { id_articulo, cantidad, precio_unitario });
      }
      totalCompra += cantidad * precio_unitario;
    }

    const ordenId = await ordenCompras.create(
      id_proveedor,
      categoria_costo || null,
      id_orden_fabricacion || null,
      estadoFinal,
      connection
    );
    if (!ordenId) {
      throw new Error(
        "Error desconocido al crear la cabecera de la orden de compra."
      );
    }

    for (const [id_articulo, item] of itemsMap) {
      const { cantidad, precio_unitario } = item;

      await detalleOrdenCompra.create(
        {
          id_orden_compra: ordenId,
          id_articulo: id_articulo,
          cantidad: cantidad,
          precio_unitario: precio_unitario,
        },
        connection
      );
    }
    const movimientoData = {
      id_documento: ordenId,
      tipo_documento: "orden_compra",
      monto: -totalCompra,
      id_metodo_pago: id_metodo_pago,
      referencia: referencia,
      observaciones: observaciones_pago,
    };
    await tesoreriaModel.insertarMovimiento(movimientoData, connection);

    await connection.commit();
    connection.release();

    return res.status(201).json({
      message: "Orden de compra creada correctamente.",
      id_orden_compra: ordenId,
    });
  } catch (error) {
    if (connection) {
      console.log(
        "[OrdenCompraController] Error detectado. Intentando ROLLBACK de la transacción..."
      );
      await connection.rollback();
      connection.release();
      console.log(
        "[OrdenCompraController] Transacción ROLLEADA y conexión liberada."
      );
    }
    console.error("Error creando orden de compra:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: error.message || "Error al crear la orden de compra",
      });
    }
  }
}

async function confirmarRecepcion(req, res) {
  let connection;
  try {
    const { id } = req.params;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const orden = await ordenCompras.getById(id, connection);
    if (!orden) {
      throw new Error("Orden de compra no encontrada.");
    }
    if (orden.estado !== "pendiente") {
      throw new Error(
        `La orden de compra #${id} no está en estado 'pendiente'. Estado actual: ${orden.estado}.`
      );
    }

    const detalles = await detalleOrdenCompra.getByOrdenCompra(id, connection);
    if (detalles.length === 0) {
      throw new Error("La orden de compra no tiene detalles para recibir.");
    }

    for (const detalle of detalles) {
      await inventarioModel.processInventoryMovement(
        {
          id_articulo: Number(detalle.id_articulo),
          cantidad_movida: Number(detalle.cantidad),
          tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
          tipo_origen_movimiento:
            inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.COMPRA,
          observaciones: `Entrada por recepción de orden de compra #${id}`,
          referencia_documento_id: id,
          referencia_documento_tipo: "orden_compra",
        },
        connection
      );
      console.log(
        `[OrdenCompraController] Stock sumado para artículo ${detalle.id_articulo}.`
      );
    }

    await ordenCompras.update(id, { estado: "completada" }, connection);

    await connection.commit();
    connection.release();
    res.status(200).json({
      message:
        "Recepción de mercancía confirmada y stock actualizado correctamente.",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error al confirmar recepción de mercancía:", error);
    res.status(500).json({
      message: error.message || "Error al confirmar la recepción de mercancía.",
    });
  }
}

async function updateOrdenCompra(req, res) {
  let connection;
  try {
    const id_orden_compra = req.params.id;

    const {
      id_proveedor,
      categoria_costo,
      id_orden_fabricacion,
      estado,
      fecha,
      detalles,

      id_metodo_pago,
      referencia,
      observaciones_pago,
    } = req.body;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const ordenActual = await ordenCompras.getById(id_orden_compra, connection);
    if (!ordenActual) {
      throw new Error("Orden de compra no encontrada.");
    }

    // Validar que la fecha actual de la orden no esté en un período cerrado
    const fechaActualCerrada = await cierresCajaModel.validarFechaCerrada(
      ordenActual.fecha
    );
    if (fechaActualCerrada) {
      return res.status(400).json({
        error:
          "No se pueden modificar órdenes de compra de períodos cerrados. La fecha actual de esta orden está en un período cerrado de caja.",
      });
    }

    // Si se está cambiando la fecha, validar que la nueva fecha tampoco esté cerrada
    if (fecha && fecha !== ordenActual.fecha) {
      const nuevaFechaCerrada = await cierresCajaModel.validarFechaCerrada(
        fecha
      );
      if (nuevaFechaCerrada) {
        return res.status(400).json({
          error:
            "No se puede cambiar la fecha a un período cerrado. La nueva fecha está en un período cerrado de caja.",
        });
      }
    }

    if (ordenActual.estado !== "pendiente") {
      throw new Error(
        `Solo se pueden actualizar órdenes de compra en estado 'pendiente'. Estado actual: ${ordenActual.estado}.`
      );
    }

    if (!Array.isArray(detalles) || detalles.length === 0) {
      throw new Error(
        "Debe proporcionar al menos un detalle de orden de compra."
      );
    }

    const detallesAgrupados = new Map();
    let totalCompra = 0;

    for (const item of detalles) {
      const { id_articulo, cantidad, precio_unitario } = item;

      if (
        !id_articulo ||
        isNaN(cantidad) ||
        cantidad <= 0 ||
        isNaN(precio_unitario) ||
        precio_unitario < 0
      ) {
        throw new Error(
          "Cada detalle requiere un artículo, cantidad positiva y precio unitario válido."
        );
      }

      const articuloInfo = await articuloModel.getById(id_articulo, connection);
      if (!articuloInfo) {
        throw new Error(`El artículo con ID ${id_articulo} no existe.`);
      }

      const inventarioArticulo =
        await inventarioModel.obtenerInventarioPorArticulo(
          id_articulo,
          connection
        );
      if (!inventarioArticulo) {
        await connection.rollback();
        connection.release();

        return res.status(409).json({
          message: `El artículo "${articuloInfo.descripcion}" (ID: ${id_articulo}) no está inicializado en el inventario.`,
          needsInitialization: true,
          articulo: {
            id: id_articulo,
            descripcion: articuloInfo.descripcion,
          },
        });
      }

      if (detallesAgrupados.has(id_articulo)) {
        const existente = detallesAgrupados.get(id_articulo);
        existente.cantidad += cantidad;

        detallesAgrupados.set(id_articulo, existente);
      } else {
        detallesAgrupados.set(id_articulo, {
          id_articulo,
          cantidad,
          precio_unitario,
        });
      }

      totalCompra += cantidad * precio_unitario;
    }

    const ordenData = {
      id_proveedor,
      categoria_costo,
      id_orden_fabricacion,
      estado: ordenActual.estado,
      fecha,
    };
    await ordenCompras.update(id_orden_compra, ordenData, connection);

    await detalleOrdenCompra.deleteByOrdenCompraId(id_orden_compra, connection);

    for (const item of detallesAgrupados.values()) {
      await detalleOrdenCompra.create(
        {
          id_orden_compra,
          id_articulo: item.id_articulo,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
        },
        connection
      );
    }

    if (id_metodo_pago && id_metodo_pago !== "0") {
      const movimientoData = {
        id_documento: id_orden_compra,
        tipo_documento: "orden_compra",
        monto: -totalCompra,
        id_metodo_pago: id_metodo_pago,
        referencia: referencia || null,
        observaciones: observaciones_pago || null,
      };

      await tesoreriaModel.updateOrCreateMovimiento(movimientoData, connection);
    } else {
      console.log(
        `[OrdenCompraController] No se actualizó el pago para OC #${id_orden_compra} porque no se proporcionó id_metodo_pago.`
      );
    }

    await connection.commit();
    connection.release();
    return res.status(200).json({
      message:
        "Orden de compra y movimiento de tesorería actualizados correctamente.",
      id_orden_compra: id_orden_compra,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error actualizando orden de compra:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message: error.message || "Error al actualizar la orden de compra",
      });
    }
  }
}

const deleteOrdenCompra = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const ordenExistente = await ordenCompras.getById(id, connection);
    if (!ordenExistente) {
      throw new Error("Orden de compra no encontrada.");
    }

    if (ordenExistente.estado === "pendiente") {
      await ordenCompras.update(id, { estado: "cancelada" }, connection);
      console.log(
        `Orden de compra #${id} marcada como 'cancelada' (estaba pendiente).`
      );
    } else if (ordenExistente.estado === "completada") {
      const detalles = await detalleOrdenCompra.getByOrdenCompra(
        id,
        connection
      );
      for (const detalle of detalles) {
        await inventarioModel.processInventoryMovement(
          {
            id_articulo: Number(detalle.id_articulo),
            cantidad_movida: Number(detalle.cantidad),
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
            tipo_origen_movimiento:
              inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_PROVEEDOR,
            observaciones: `Reversión por cancelación de orden de compra completada #${id}`,
            referencia_documento_id: id,
            referencia_documento_tipo: "cancelacion_orden_compra",
          },
          connection
        );
        console.log(
          `Stock revertido para artículo ${detalle.id_articulo} por cancelación de orden de compra ${id}: -${detalle.cantidad}`
        );
      }
      await ordenCompras.update(id, { estado: "cancelada" }, connection);
      console.log(
        `Orden de compra #${id} marcada como 'cancelada' y stock revertido (estaba completada).`
      );
    } else if (ordenExistente.estado === "cancelada") {
      throw new Error(
        `La orden de compra #${id} ya está cancelada y no puede ser modificada.`
      );
    }

    await connection.commit();
    connection.release();
    res.json({
      message: `Orden de compra #${id} cancelada y stock ${
        ordenExistente.estado === "completada" ? "revertido" : "no afectado"
      } correctamente.`,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Error al eliminar/cancelar la orden de compra:", error);
    if (!res.headersSent) {
      res.status(500).json({
        message:
          error.message || "Error al eliminar/cancelar la orden de compra",
      });
    }
  }
};

module.exports = {
  getOrdenesCompra,
  getOrdenCompraById,
  createOrdenCompra,
  updateOrdenCompra,
  deleteOrdenCompra,
  confirmarRecepcion,
};
