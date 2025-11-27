const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
    SELECT 
      l.id_lote,
      l.id_orden_fabricacion,
      a.descripcion AS descripcion_articulo,
      t.nombre AS nombre_trabajador,
      l.cantidad,
      l.fecha,
      l.observaciones,
      c.nombre AS nombre_cliente
    FROM lotes_fabricados l
    INNER JOIN articulos a ON l.id_articulo = a.id_articulo
    INNER JOIN trabajadores t ON l.id_trabajador = t.id_trabajador
    INNER JOIN ordenes_fabricacion ofa ON l.id_orden_fabricacion = ofa.id_orden_fabricacion
    LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY l.fecha DESC
  `);
    return rows;
  },

  getAllPaginated: async ({
    page = 1,
    pageSize = 10,
    buscar = "",
    sortBy = "fecha",
    sortDir = "desc",
  }) => {
    const offset = (page - 1) * pageSize;
    const validSortColumns = [
      "fecha",
      "cantidad",
      "nombre_trabajador",
      "descripcion_articulo",
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : "fecha";
    const sortDirection = sortDir.toLowerCase() === "asc" ? "ASC" : "DESC";

    let whereClause = "";
    const params = [];

    if (buscar && buscar.trim()) {
      whereClause = `WHERE (
        a.descripcion LIKE ? OR
        t.nombre LIKE ? OR
        c.nombre LIKE ? OR
        l.observaciones LIKE ?
      )`;
      const searchTerm = `%${buscar.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Query para contar total
    const [countResult] = await db.query(
      `
      SELECT COUNT(*) as total
      FROM lotes_fabricados l
      INNER JOIN articulos a ON l.id_articulo = a.id_articulo
      INNER JOIN trabajadores t ON l.id_trabajador = t.id_trabajador
      INNER JOIN ordenes_fabricacion ofa ON l.id_orden_fabricacion = ofa.id_orden_fabricacion
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      ${whereClause}
    `,
      params
    );

    const total = countResult[0].total;

    // Query para datos paginados
    const [rows] = await db.query(
      `
      SELECT 
        l.id_lote,
        l.id_orden_fabricacion,
        a.descripcion AS descripcion_articulo,
        t.nombre AS nombre_trabajador,
        l.cantidad,
        l.fecha,
        l.observaciones,
        c.nombre AS nombre_cliente
      FROM lotes_fabricados l
      INNER JOIN articulos a ON l.id_articulo = a.id_articulo
      INNER JOIN trabajadores t ON l.id_trabajador = t.id_trabajador
      INNER JOIN ordenes_fabricacion ofa ON l.id_orden_fabricacion = ofa.id_orden_fabricacion
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      ${whereClause}
      ORDER BY l.${sortColumn} ${sortDirection}
      LIMIT ? OFFSET ?
    `,
      [...params, pageSize, offset]
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      data: rows,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
SELECT * FROM lotes_fabricados WHERE id_orden = ?
  `,
      [id]
    );
    return rows;
  },

  createLote: async (
    {
      id_orden_fabricacion,
      id_articulo,
      id_trabajador,
      cantidad,
      observaciones,
    },
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      // Usa la conexión pasada o db por defecto
      `INSERT INTO lotes_fabricados 
       (id_orden_fabricacion, id_articulo, id_trabajador, cantidad, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id_orden_fabricacion,
        id_articulo,
        id_trabajador,
        cantidad,
        observaciones || null,
      ]
    );
    return result.insertId;
  },

  eliminar: async (id_lote) => {
    const [result] = await db.query(
      "DELETE FROM lotes_fabricados WHERE id_lote = ?",
      [id_lote]
    );
    return result.affectedRows > 0;
  },

  deleteByOrdenId: async (idOrden) => {
    await db.query(
      `DELETE FROM lotes_fabricados WHERE id_orden_fabricacion = ?`,
      [idOrden]
    );
  },
};
