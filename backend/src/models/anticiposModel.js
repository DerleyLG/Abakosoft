const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
    SELECT 
      a.id_anticipo,
      a.id_trabajador,
      t.nombre AS trabajador,
      a.id_orden_fabricacion,
      c.nombre AS cliente,
      a.fecha,
      a.monto,
      a.monto_usado,
      a.estado,
      a.observaciones
    FROM anticipos_trabajadores a
    JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
    LEFT JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion

    LEFT JOIN pedidos p ON o.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY a.fecha DESC
  `);

    return rows;
  },

  getAllPaginated: async ({
    page = 1,
    pageSize = 20,
    sortBy = "fecha",
    sortDir = "desc",
  } = {}) => {
    const SORT_MAP = {
      fecha: "a.fecha",
      monto: "a.monto",
      trabajador: "t.nombre",
      estado: "a.estado",
    };
    const col = SORT_MAP[sortBy] || "a.fecha";
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";
    const pg = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const offset = (pg - 1) * ps;

    const [rows] = await db.query(
      `SELECT 
        a.id_anticipo,
        a.id_trabajador,
        t.nombre AS trabajador,
        a.id_orden_fabricacion,
        c.nombre AS cliente,
        a.fecha,
        a.monto,
        a.monto_usado,
        a.estado,
        a.observaciones
      FROM anticipos_trabajadores a
      JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
      LEFT JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion
      LEFT JOIN pedidos p ON o.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      ORDER BY ${col} ${dir}
      LIMIT ? OFFSET ?`,
      [ps, offset],
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM anticipos_trabajadores a
       JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
       LEFT JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion`,
    );

    return { data: rows, total };
  },

  // Alias para compatibilidad
  create: async ({
    id_trabajador,
    fecha,
    id_orden_fabricacion,
    monto,
    observaciones,
  }) => {
    const [result] = await db.query(
      `INSERT INTO anticipos_trabajadores
      (id_trabajador,  id_orden_fabricacion,fecha, monto,  observaciones)
      VALUES (?, ?, ?, ?, ?)`,
      [id_trabajador, id_orden_fabricacion, fecha, monto, observaciones],
    );
    return result.insertId;
  },

  crear: async ({
    id_trabajador,
    fecha,
    id_orden_fabricacion,
    monto,
    observaciones,
  }) => {
    const [result] = await db.query(
      `INSERT INTO anticipos_trabajadores
      (id_trabajador,  id_orden_fabricacion,fecha, monto,  observaciones)
      VALUES (?, ?, ?, ?, ?)`,
      [id_trabajador, id_orden_fabricacion, fecha, monto, observaciones],
    );
    return result.insertId;
  },

  getActivo: async (id_trabajador, id_orden_fabricacion) => {
    if (id_orden_fabricacion) {
      const [rows] = await db.query(
        `SELECT * FROM anticipos_trabajadores
         WHERE id_trabajador = ? AND id_orden_fabricacion = ? AND estado != 'saldado'
         LIMIT 1`,
        [id_trabajador, id_orden_fabricacion],
      );
      return rows[0];
    }
    const [rows] = await db.query(
      `SELECT * FROM anticipos_trabajadores
       WHERE id_trabajador = ? AND estado != 'saldado'
       ORDER BY fecha ASC
       LIMIT 1`,
      [id_trabajador],
    );
    return rows[0];
  },

  getDisponiblesByTrabajador: async (
    id_trabajador,
    preferOrderId = null,
    connection = null,
  ) => {
    const conn = connection || db;
    const sql = `SELECT * FROM anticipos_trabajadores
                 WHERE id_trabajador = ? AND estado != 'saldado'
                 ORDER BY (id_orden_fabricacion = ?) DESC, fecha ASC`;
    const params = [id_trabajador, preferOrderId];
    const [rows] = await conn.query(sql, params);
    return rows;
  },

  descontar: async (id_anticipo, montoAplicado, connection = null) => {
    const conn = connection || db;
    // Obtener anticipo actual
    const [rows] = await conn.query(
      `SELECT monto, monto_usado FROM anticipos_trabajadores WHERE id_anticipo = ?`,
      [id_anticipo],
    );
    const anticipo = rows[0];
    const nuevoMontoUsado =
      Number(anticipo.monto_usado || 0) + Number(montoAplicado);

    let nuevoEstado = "parcial";
    if (nuevoMontoUsado >= Number(anticipo.monto)) {
      nuevoEstado = "saldado";
    }

    await conn.query(
      `UPDATE anticipos_trabajadores
       SET monto_usado = ?, estado = ?
       WHERE id_anticipo = ?`,
      [nuevoMontoUsado, nuevoEstado, id_anticipo],
    );
  },
};
