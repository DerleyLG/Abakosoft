const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
    SELECT 
      p.id_pago,
      p.id_trabajador,
      t.nombre AS trabajador,
      p.fecha_pago,
      p.monto_total as total,
      p.observaciones
    FROM pagos_trabajadores p
    JOIN trabajadores t ON p.id_trabajador = t.id_trabajador
    LEFT JOIN detalle_pago_trabajador d ON p.id_pago = d.id_pago
    GROUP BY p.id_pago
    ORDER BY p.fecha_pago DESC
  `);

    return rows;
  },

  async getAllPaginated({
    buscar = "",
    trabajadorId = null,
    page = 1,
    pageSize = 25,
    sortBy = "fecha_pago",
    sortDir = "desc",
  }) {
    const SORT_MAP = {
      fecha_pago: "p.fecha_pago",
      total: "p.monto_total",
      trabajador: "t.nombre",
      id_pago: "p.id_pago",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.fecha_pago;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const whereClauses = [];
    const params = [];
    if (buscar) {
      whereClauses.push("(t.nombre LIKE ? OR p.observaciones LIKE ?)");
      const like = `%${buscar}%`;
      params.push(like, like);
    }
    if (trabajadorId) {
      whereClauses.push("p.id_trabajador = ?");
      params.push(Number(trabajadorId));
    }
    const whereSQL = whereClauses.length
      ? `WHERE ${whereClauses.join(" AND ")}`
      : "";

    const sqlBase = `
      FROM pagos_trabajadores p
      JOIN trabajadores t ON p.id_trabajador = t.id_trabajador
      LEFT JOIN detalle_pago_trabajador d ON p.id_pago = d.id_pago
      ${whereSQL}
      GROUP BY p.id_pago
    `;

    const [rows] = await db.query(
      `SELECT 
         p.id_pago,
         p.id_trabajador,
         t.nombre AS trabajador,
         p.fecha_pago,
         p.monto_total AS total,
         p.observaciones
       ${sqlBase}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT p.id_pago ${sqlBase}
       ) AS sub`,
      params
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
         p.id_pago,
         p.id_trabajador,
         t.nombre AS trabajador,
         p.monto_total,
         p.fecha_pago,
         p.observaciones
       FROM pagos_trabajadores p
       JOIN trabajadores t ON p.id_trabajador = t.id_trabajador
       WHERE p.id_pago = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({
    id_trabajador,
    monto_total,
    observaciones,
    fecha_pago = null,
  }) => {
    const [result] = await db.query(
      `INSERT INTO pagos_trabajadores
         (id_trabajador, monto_total, observaciones, fecha_pago)
       VALUES (?, ?, ?, ?)`,
      [id_trabajador, monto_total, observaciones, fecha_pago]
    );
    return result.insertId;
  },

  calcularMonto: async (id_pago) => {
    const [result] = await db.query(
      `SELECT SUM(subtotal) AS total
     FROM detalle_pago_trabajador
     WHERE id_pago = ?`,
      [id_pago]
    );

    const total = result[0]?.total || 0;

    await db.query(
      `UPDATE pagos_trabajadores SET monto_total = ? WHERE id_pago = ?`,
      [total, id_pago]
    );
  },

  update: async (id, { id_trabajador, monto_total, observaciones }) => {
    await db.query(
      `UPDATE pagos_trabajadores
       SET id_trabajador = ? , monto_total = ?,  observaciones = ?
       WHERE id_pago = ?`,
      [id_trabajador, monto_total, observaciones, id]
    );
  },
  updateMontoTotal: async (id_pago, monto_total) => {
    await db.query(
      `UPDATE pagos_trabajadores SET monto_total = ? WHERE id_pago = ?`,
      [monto_total, id_pago]
    );
  },

  delete: async (id) => {
    await db.query(`DELETE FROM pagos_trabajadores WHERE id_pago = ?`, [id]);
  },
};
