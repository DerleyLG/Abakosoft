const pedidoModel = require("../models/ordenPedidosModel");
const detallePedidoModel = require("../models/detalleOrdenPedidosModel");
const clienteModel = require("../models/clientesModel");
const articuloModel = require("../models/articulosModel");
const db = require("../database/db");

const ESTADOS_VALIDOS = [
  "pendiente",
  "en fabricacion",
  "listo para entrega",
  "completado",
  "cancelado",
];

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        estado,
        buscar = "",
        page = 1,
        pageSize = 25,
        sortBy = "fecha",
        sortDir = "desc",
      } = req.query;

      const ALL = [
        "pendiente",
        "en fabricacion",
        "listo para entrega",
        "completado",
        "cancelado",
      ];
      const ACTIVAS = [
        "pendiente",
        "en fabricacion",
        "listo para entrega",
        "completado",
      ];

      let estados = ACTIVAS;
      if (ALL.includes(estado)) {
        estados = [estado];
      }

      const { data, total } = await pedidoModel.getAllPaginated({
        estados,
        buscar,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 25,
        sortBy,
        sortDir,
      });

      const p = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
      const totalPages = Math.max(1, Math.ceil(total / ps));

      res.status(200).json({
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
      console.error("Error al obtener pedidos:", error);
      res
        .status(500)
        .json({ error: "Error interno del servidor al obtener pedidos." });
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
    let connection;
    try {
      const { id_cliente, estado, observaciones, detalles } = req.body;

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Validaciones iniciales
      const cliente = await clienteModel.getById(id_cliente, connection);
      if (!cliente) {
        throw new Error("Cliente no encontrado."); // Lanzamos error para que la transacción se revierta
      }

      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`
        );
      }

      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe incluir al menos un detalle.");
      }

      // Validar detalles y establecer precio_unitario (si viene desde el front, usarlo; si no, usar el del artículo)
      for (const detalle of detalles) {
        const { id_articulo, cantidad, precio_unitario } = detalle;
        const articuloExistente = await articuloModel.getById(
          id_articulo,
          connection
        );
        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }

        if (cantidad <= 0) {
          throw new Error(
            `Cantidad inválida para el artículo ${articuloExistente.descripcion}.`
          );
        }

        // Determinar el precio a usar: priorizar el enviado por el front si es válido
        const precioDesdeFront = Number(precio_unitario);
        const precioArticulo = Number(articuloExistente.precio_venta);
        const precioValidoFront =
          !isNaN(precioDesdeFront) && precioDesdeFront >= 0;

        const precioUsar = precioValidoFront
          ? precioDesdeFront
          : precioArticulo;
        if (isNaN(precioUsar) || precioUsar < 0) {
          throw new Error(
            `El artículo ${articuloExistente.descripcion} no tiene un precio válido.`
          );
        }

        // Asignar el precio definitivo al detalle que se insertará
        detalle.precio_unitario = precioUsar;
      }

      // Crear pedido (pasando la conexión)
      const id_pedido = await pedidoModel.create(
        { id_cliente, estado, observaciones },
        connection
      );

      for (const detalle of detalles) {
        await detallePedidoModel.create(
          {
            id_pedido,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: detalle.observaciones || "",
            precio_unitario: detalle.precio_unitario,
          },
          connection
        );
      }

      await connection.commit();
      connection.release();

      res
        .status(201)
        .json({ message: "Pedido creado correctamente.", id_pedido });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al crear el pedido:", err);
      res
        .status(500)
        .json({ error: err.message || "Error al crear el pedido." });
    }
  },

  update: async (req, res) => {
    let connection;
    try {
      const id = +req.params.id;
      const { id_cliente, estado, observaciones, detalles } = req.body;

      connection = await db.getConnection();
      await connection.beginTransaction();

      const pedido = await pedidoModel.getById(id, connection);
      if (!pedido) {
        connection.release();
        return res.status(404).json({ error: "Pedido no encontrado." });
      }

      if (!id_cliente || !estado) {
        throw new Error("Faltan campos obligatorios (cliente o estado).");
      }
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(
          `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`
        );
      }
      const cliente = await clienteModel.getById(id_cliente, connection);
      if (!cliente) {
        throw new Error("Cliente no encontrado.");
      }
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe incluir al menos un detalle.");
      }

      for (const detalle of detalles) {
        const { id_articulo, cantidad, precio_unitario } = detalle;
        const articuloExistente = await articuloModel.getById(
          id_articulo,
          connection
        );

        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }
        if (cantidad <= 0 || precio_unitario < 0) {
          throw new Error(
            `Cantidad o Precio inválido para el artículo ${articuloExistente.descripcion}.`
          );
        }
      }

      await pedidoModel.update(id, { id_cliente, estado, observaciones });

      await detallePedidoModel.deleteByPedido(id, connection);

      for (const detalle of detalles) {
        await detallePedidoModel.create(
          {
            id_pedido: id,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: detalle.observaciones || null,
            precio_unitario: detalle.precio_unitario,
          },
          connection
        );
      }

      await connection.commit();
      connection.release();

      res.json({ message: "Pedido y detalles actualizados correctamente." });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al actualizar el pedido:", err);
      res
        .status(500)
        .json({ error: err.message || "Error al actualizar el pedido." });
    }
  },

  complete: async (req, res) => {
    const { id } = req.params;
    try {
      const result = await PedidoModel.completar(id);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Pedido no encontrado" });
      }

      res.json({ message: "Pedido marcado como completado" });
    } catch (err) {
      console.error("Error al completar pedido:", err);
      res.status(500).json({ error: "Error al completar pedido" });
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
        return res
          .status(400)
          .json({ error: "Solo se pueden anular pedidos pendientes." });
      }

      await pedidoModel.update(id, { estado: "cancelado" });

      res.json({ message: "Pedido anulado correctamente." });
    } catch (err) {
      console.error("Error al anular el pedido:", err);
      res.status(500).json({ error: "Error al cancelar el pedido." });
    }
  },
};
