const pedidoModel = require("../models/ordenPedidosModel");
const detallePedidoModel = require("../models/detalleOrdenPedidosModel");
const clienteModel = require("../models/clientesModel");
const articuloModel = require("../models/articulosModel");
const db = require("../database/db");

const ESTADOS_VALIDOS = ["pendiente", "completado", "cancelado"];

module.exports = {
 getAll: async (req, res) => {
    try {
      const { estado } = req.query; 

    
      const pedidos = await pedidoModel.getAll(estado);
      
      res.status(200).json(pedidos);
    } catch (error) {
      console.error("Error al obtener pedidos:", error);
      res.status(500).json({ error: "Error interno del servidor al obtener pedidos." });
    }
  },
  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const pedido = await pedidoModel.getById(id);
      if (!pedido) {
        return res.status(404).json({ error: "Pedido no encontrado." });
      }

      const detalles = await detallePedidoModel.getByPedido(id);
      res.json({ ...pedido, detalles });
    } catch (err) {
      console.error("Error al obtener el pedido:", err);
      res.status(500).json({ error: "Error al obtener el pedido." });
    }
  },

  create: async (req, res) => {
    try {
      const { id_cliente, estado, observaciones, detalles } = req.body;

      // Validaciones
      const cliente = await clienteModel.getById(id_cliente);
      if (!cliente) {
        return res.status(400).json({ error: "Cliente no encontrado." });
      }

      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
      }

      if (!Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({ error: "Debe incluir al menos un detalle." });
      }

      // Validar detalles
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


      const precio_unitario = articuloExistente.precio_venta;
      if (precio_unitario == null) {
        return res.status(400).json({
          error: `El artículo con ID ${id_articulo} no tiene precio de venta definido.`,
        });
      }
    
        const articulo = await articuloModel.getById(id_articulo);
        if (!articulo) {
          return res.status(400).json({ error: `Artículo con ID ${id_articulo} no encontrado.` });
        }

        if (cantidad <= 0) {
          return res.status(400).json({ error: `Cantidad inválida para el artículo ${articulo.descripcion}.` });
        }

        if (articulo.precio_venta == null) {
          return res.status(400).json({ error: `El artículo ${articulo.descripcion} no tiene precio de venta definido.` });
        }
      }

      // Crear pedido
      const id_pedido = await pedidoModel.create({ id_cliente, estado, observaciones });

      for (const detalle of detalles) {
        const { id_articulo, cantidad, observaciones } = detalle;
        const articulo = await articuloModel.getById(id_articulo);
        await detallePedidoModel.create({
          id_pedido,
          id_articulo,
          cantidad,
          observaciones: observaciones || "",
          precio_unitario: articulo.precio_venta
        });
      }

      res.status(201).json({ message: "Pedido creado correctamente.", id_pedido });
    } catch (err) {
      console.error("Error al crear el pedido:", err);
      res.status(500).json({ error: "Error al crear el pedido." });
    }
  },

  update: async (req, res) => {
    try {
      const id = +req.params.id;
      const { id_cliente, estado, observaciones } = req.body;

      const pedido = await pedidoModel.getById(id);
      if (!pedido) {
        return res.status(404).json({ error: "Pedido no encontrado." });
      }

      if (pedido.estado !== "pendiente") {
        return res.status(400).json({ error: "Solo se pueden actualizar pedidos en estado pendiente." });
      }

      if (!id_cliente || !estado) {
        return res.status(400).json({ error: "Faltan campos obligatorios." });
      }

      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}` });
      }

      const cliente = await clienteModel.getById(id_cliente);
      if (!cliente) {
        return res.status(400).json({ error: "Cliente no encontrado." });
      }

      const updatedRows = await pedidoModel.update(id, { id_cliente, estado, observaciones });

      if (updatedRows === 0) {
        return res.status(400).json({ error: "No se pudo actualizar el pedido." });
      }

      res.json({ message: "Pedido actualizado correctamente." });
    } catch (err) {
      console.error("Error al actualizar el pedido:", err);
      res.status(500).json({ error: "Error al actualizar el pedido." });
    }
  },

  delete: async (req, res) => {
    try {
      const id = +req.params.id;

      const pedido = await pedidoModel.getById(id);
      if (!pedido) {
        return res.status(404).json({ error: "Pedido no encontrado." });
      }
console.log("Estado pedido:", pedido.estado);

      if (pedido.estado.toLowerCase().trim() !== "pendiente") {
  return res.status(400).json({ error: "Solo se pueden anular pedidos pendientes." });
}


      await pedidoModel.update(id, { estado: "cancelado" });

      res.json({ message: "Pedido anulado correctamente." });
    } catch (err) {
      console.error("Error al anular el pedido:", err);
      res.status(500).json({ error: "Error al cancelar el pedido." });
    }
  }
};
