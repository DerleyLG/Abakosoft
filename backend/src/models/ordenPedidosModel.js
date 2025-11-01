const db = require("../database/db");
const detalleOrdenModel = require("../models/detalleOrdenPedidosModel");

module.exports = {
  getAll: async (estadoQueryParam) => {
    const ALL_STATUSES = [
      "pendiente",
      "en fabricacion",
      "listo para entrega",
      "completado",
      "cancelado",
    ];

    const ACTIVE_STATUSES = [
      "pendiente",
      "en fabricacion",
      "listo para entrega",
      "completado",
    ];

    let estadosToFilter = [];

    if (ALL_STATUSES.includes(estadoQueryParam)) {
      estadosToFilter = [estadoQueryParam];
    } else {
      estadosToFilter = ACTIVE_STATUSES;
    }

    const placeholders = estadosToFilter.map(() => "?").join(",");
    const [rows] = await db.query(
      `
      SELECT p.id_pedido, p.fecha_pedido, p.id_cliente, c.nombre AS cliente_nombre, p.estado,
        SUM(dp.cantidad * dp.precio_unitario) AS monto_total
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
      WHERE p.estado IN (${placeholders})
      GROUP BY p.id_pedido
      ORDER BY p.fecha_pedido DESC;
    `,
      estadosToFilter
    );

    return rows;
  },

  async getAllPaginated({
    estados = [
      "pendiente",
      "en fabricacion",
      "listo para entrega",
      "completado",
    ],
    buscar = "",
    page = 1,
    pageSize = 25,
    sortBy = "fecha",
    sortDir = "desc",
  }) {
    const SORT_MAP = {
      id: "p.id_pedido",
      fecha: "p.fecha_pedido",
      cliente: "c.nombre",
      monto_total: "monto_total",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.fecha;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const pNum = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const offset = (pNum - 1) * ps;

    const estadoPlaceholders = estados.map(() => "?").join(",");
    const whereParts = [`p.estado IN (${estadoPlaceholders})`];
    const params = [...estados];

    if (buscar) {
      whereParts.push("c.nombre LIKE ?");
      params.push(`%${buscar}%`);
    }
    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const base = `
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
      ${whereSQL}
      GROUP BY p.id_pedido
    `;

    const [rows] = await db.query(
      `SELECT 
         p.id_pedido,
         p.fecha_pedido,
         p.id_cliente,
         c.nombre AS cliente_nombre,
         p.estado,
         SUM(dp.cantidad * dp.precio_unitario) AS monto_total
       ${base}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT p.id_pedido ${base}
       ) AS sub`,
      params
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },
  create: async ({ id_cliente, estado, observaciones }, connection = db) => {
    const [result] = await (connection || db).query(
      `INSERT INTO pedidos (id_cliente, estado, observaciones) VALUES (?, ?, ?)`,
      [id_cliente, estado, observaciones || null]
    );
    return result.insertId;
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM pedidos WHERE id_pedido = ?",
      [id]
    );
    return rows[0] || null;
  },

  completar: async (id, connection = db) => {
    const [result] = await (connection || db).query(
      `UPDATE pedidos SET estado = 'completado' WHERE id_pedido = ?`,
      [id]
    );
    return result;
  },

  update: async (id, { id_cliente, estado, observaciones }) => {
    const [result] = await db.query(
      `UPDATE pedidos
     SET id_cliente = COALESCE(?, id_cliente),
         estado = COALESCE(?, estado),
         observaciones = COALESCE(?, observaciones)
     WHERE id_pedido = ? `,
      [id_cliente, estado, observaciones, id]
    );
    return result.affectedRows;
  },

  delete: async (id) => {
    const detalles = await detalleOrdenModel.getByPedido(id);
    for (const detalle of detalles) {
      await db.query(
        "UPDATE inventario SET stock = stock + ? WHERE id_articulo = ?",
        [detalle.cantidad, detalle.id_articulo]
      );
    }
  },
};
