const ordenModel = require("../models/ordenesVentaModel");
const detalleOrdenModel = require("../models/detalleOrdenVentaModel");
const clienteModel = require("../models/clientesModel");
const articuloModel = require("../models/articulosModel");
const db = require("../database/db");

async function clienteExists(id_cliente) {
  const [rows] = await db.query(
    "SELECT 1 FROM clientes WHERE id_cliente = ? LIMIT 1",
    [id_cliente]
  );
  return rows.length > 0;
}

async function ordenExists(id_orden_venta) {
  const [rows] = await db.query(
    "SELECT 1 FROM ordenes_venta WHERE id_orden_venta = ? LIMIT 1",
    [id_orden_venta]
  );
  return rows.length > 0;
}

const ESTADOS_VALIDOS = ["pendiente", "completada", "anulada"];

module.exports = {
  // Órdenes de Venta
  getAll: async (req, res) => {
    try {
      const estado = req.query.estado;
      let estados;
      if (estado === "anulada") {
        estados = ["anulada"];
      } else {
        estados = ["pendiente", "completada"];
      }
      const data = await ordenModel.getAll(estados);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener órdenes de venta." });
    }
  },

  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const orden = await ordenModel.getById(id);
      if (!orden)
        return res.status(404).json({ error: "Orden de venta no encontrada." });
      res.json(orden);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener la orden." });
    }
  },

  create: async (req, res) => {
  try {
    const { id_cliente, estado, fecha, detalles } = req.body;

    // Validar cliente
    const clienteExistente = await clienteModel.getById(id_cliente);
    if (!clienteExistente) {
      return res
        .status(400)
        .json({ error: "El cliente especificado no existe." });
    }

    // Validar estado
    const ESTADOS_VALIDOS = ["pendiente", "anulada", "completada"];
    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return res.status(400).json({
        error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`,
      });
    }

    // Validar fecha
    if (!fecha || isNaN(Date.parse(fecha))) {
      return res
        .status(400)
        .json({ error: "Fecha inválida o no proporcionada." });
    }

    // Validar detalles
    if (!Array.isArray(detalles) || detalles.length === 0) {
      return res
        .status(400)
        .json({ error: "Debe incluir al menos un detalle." });
    }

    // 🔍 Validar cada detalle antes de crear la orden
    for (const detalle of detalles) {
      const { id_articulo, cantidad } = detalle;

      const articuloExistente = await articuloModel.getById(id_articulo);
      if (!articuloExistente) {
        return res.status(400).json({
          error: `El artículo con ID ${id_articulo} no existe.`,
        });
      }

      const [inventarioRow] = await db.query(
        "SELECT stock FROM inventario WHERE id_articulo = ?",
        [id_articulo]
      );

      if (inventarioRow.length === 0) {
        return res.status(400).json({
          error: `No hay inventario registrado para el artículo ${articuloExistente.descripcion}.`,
        });
      }

      const stockDisponible = inventarioRow[0].stock;

      if (cantidad > stockDisponible) {
        return res.status(400).json({
          error: `Stock insuficiente para el artículo ${articuloExistente.descripcion}. Stock disponible: ${stockDisponible}, solicitado: ${cantidad}`,
        });
      }

      const precio_unitario = articuloExistente.precio_venta;
      if (precio_unitario == null) {
        return res.status(400).json({
          error: `El artículo con ID ${id_articulo} no tiene precio de venta definido.`,
        });
      }
    }

    // Todas las validaciones pasaron, crea la orden
    const id_orden_venta = await ordenModel.create({
      id_cliente,
      estado,
      fecha,
    });

    for (const detalle of detalles) {
      const { id_articulo, cantidad } = detalle;

      const articulo = await articuloModel.getById(id_articulo);
      const precio_unitario = articulo.precio_venta;

      await detalleOrdenModel.create({
        id_orden_venta,
        id_articulo,
        cantidad,
        precio_unitario,
      });

      // Descontar stock
      await db.query(
        "UPDATE inventario SET stock = stock - ? WHERE id_articulo = ?",
        [cantidad, id_articulo]
      );
    }

    return res.status(201).json({
      message: "Orden de venta creada con sus detalles.",
      id_orden_venta,
    });
  } catch (error) {
    console.error("Detalles del error:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });
    return res
      .status(500)
      .json({ error: "Error al crear la orden de venta." });
  }
},


  update: async (req, res) => {
    try {
      const id = +req.params.id;
      const { id_cliente, estado } = req.body;

      if (!(await ordenExists(id))) {
        return res.status(404).json({ error: "Orden de venta no encontrada." });
      }

      if (!id_cliente || !estado) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
      }

      if (!(await clienteExists(id_cliente))) {
        return res.status(400).json({ error: "Cliente no existe." });
      }

      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({
          error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(
            ", "
          )}.`,
        });
      }

      const updatedRows = await ordenModel.update(id, { id_cliente, estado });

      if (updatedRows === 0) {
        // No se actualizó porque la orden no estaba pendiente
        return res
          .status(400)
          .json({
            error: "Solo se pueden actualizar órdenes en estado pendiente.",
          });
      }

      res.json({ message: "Orden de venta actualizada." });
    } catch (err) {
      console.error("Error updating order:", err);
      res.status(500).json({ error: "Error al actualizar la orden de venta." });
    }
  },

  delete: async (req, res) => {
    try {
      const id = +req.params.id;

      if (!(await ordenExists(id))) {
        return res.status(404).json({ error: "Orden de venta no encontrada." });
      }

      const orden = await ordenModel.getById(id);
      if (!["pendiente"].includes(orden.estado)) {
        return res
          .status(400)
          .json({ error: "Solo se pueden anular órdenes pendientes " });
      }

      await ordenModel.update(id, { estado: "anulada" });

      res.json({ message: "Orden de venta anulada." });
    } catch (err) {
      console.error("Error anulando la orden de venta:", err);
      res.status(500).json({ error: "Error al anular la orden de venta." });
    }
  },
};
