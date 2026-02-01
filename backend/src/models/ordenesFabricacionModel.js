const db = require("../database/db");
const LoteModel = require("../models/lotesFabricadosModel");

// Obtiene varias órdenes por un array de IDs
async function getByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await db.query(
    `SELECT ofab.*, p.id_pedido, cli.nombre AS nombre_cliente
     FROM ordenes_fabricacion ofab
     LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
     LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
     WHERE ofab.id_orden_fabricacion IN (${placeholders})`,
    ids,
  );
  return rows;
}

module.exports = {
  getByIds,
  getAll: async (estados = ["pendiente", "en proceso", "completada"]) => {
    const placeholders = estados.map(() => "?").join(",");

    const [rows] = await db.query(
      `
    SELECT 
      ofab.*, 
      p.id_pedido, 
      cli.nombre AS nombre_cliente
    FROM ordenes_fabricacion ofab
    LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
    LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
    WHERE ofab.estado IN (${placeholders})
    ORDER BY ofab.id_orden_fabricacion DESC;
  `,
      estados,
    );
    return rows;
  },

  async getAllPaginated({
    estados = ["pendiente", "en proceso", "completada"],
    buscar = "",
    page = 1,
    pageSize = 25,
    sortBy = "id",
    sortDir = "desc",
  }) {
    const SORT_MAP = {
      id: "ofab.id_orden_fabricacion",
      fecha_inicio: "ofab.fecha_inicio",
      cliente: "cli.nombre",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.id;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const estadoPlaceholders = estados.map(() => "?").join(",");
    const whereParts = [`ofab.estado IN (${estadoPlaceholders})`];
    const params = [...estados];
    if (buscar) {
      // Si empieza con #, buscar por ID de orden de fabricación
      if (buscar.startsWith("#")) {
        const idBuscar = buscar.substring(1).trim();
        if (idBuscar) {
          whereParts.push("ofab.id_orden_fabricacion = ?");
          params.push(idBuscar);
        }
      } else {
        // Búsqueda normal por artículo
        whereParts.push(`ofab.id_orden_fabricacion IN (
          SELECT dof.id_orden_fabricacion 
          FROM detalle_orden_fabricacion dof
          JOIN articulos a ON dof.id_articulo = a.id_articulo
          WHERE a.descripcion LIKE ?
        )`);
        params.push(`%${buscar}%`);
      }
    }
    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const base = `
      FROM ordenes_fabricacion ofab
      LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
      LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
      ${whereSQL}
    `;

    const [rows] = await db.query(
      `SELECT 
         ofab.*, 
         p.id_pedido, 
         cli.nombre AS nombre_cliente
       ${base}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset],
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total ${base}`,
      params,
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },
  checkIfExistsByPedidoId: async (idPedido) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM ordenes_fabricacion WHERE id_pedido = ?`,
      [idPedido],
    );
    return rows[0].count > 0;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
       ofab.*, 
        p.id_pedido, 
        cli.nombre AS nombre_cliente
        FROM ordenes_fabricacion ofab
        LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
        LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
        WHERE ofab.id_orden_fabricacion = ?
 `,
      [id],
    );

    return rows[0] || null;
  },

  async getPedidoIdByOrdenId(idOrdenFabricacion) {
    try {
      const [rows] = await db.query(
        `SELECT id_pedido FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
        [idOrdenFabricacion],
      );
      return rows.length > 0 ? rows[0].id_pedido : null;
    } catch (error) {
      console.error("Error en OrdenesModel.getPedidoIdByOrdenId:", error);
      throw error;
    }
  },

  create: async ({
    id_orden_venta,
    fecha_inicio,
    fecha_fin_estimada,
    estado,
    id_pedido,
  }) => {
    const [result] = await db.query(
      `INSERT INTO ordenes_fabricacion (id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido)
       VALUES (?, ?, ?, ?,?)`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido],
    );
    return result.insertId;
  },

  update: async (
    id,
    { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado },
  ) => {
    await db.query(
      `UPDATE ordenes_fabricacion 
       SET id_orden_venta = ?, fecha_inicio = ?, fecha_fin_estimada = ?, estado = ? 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id],
    );
  },

  delete: async (id) => {
    const query = `
    UPDATE ordenes_fabricacion 
    SET estado = 'cancelada' 
    WHERE id_orden_fabricacion = ?
  `;

    await db.query(query, [id]);

    try {
      await LoteModel.deleteByOrdenId(id);
      console.log(
        `Lotes fabricados asociados a la orden ${id} eliminados físicamente.`,
      );
    } catch (error) {
      console.error(
        `Error al eliminar lotes fabricados para la orden ${id}:`,
        error,
      );
    }
  },

  async getPedidoIdByOrdenId(idOrdenFabricacion) {
    try {
      const [rows] = await db.query(
        `SELECT id_pedido FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
        [idOrdenFabricacion],
      );
      return rows.length > 0 ? rows[0].id_pedido : null;
    } catch (error) {
      console.error("Error en OrdenesModel.getPedidoIdByOrdenId:", error);
      throw error;
    }
  },

  getEstadoByPedidoId: async (id_pedido) => {
    const [rows] = await db.query(
      `SELECT estado 
       FROM ordenes_fabricacion 
       WHERE id_pedido = ? 
       ORDER BY id_orden_fabricacion DESC 
       LIMIT 1`,
      [id_pedido],
    );

    if (rows.length === 0) {
      return "no existe";
    }
    return rows[0].estado;
  },
};
