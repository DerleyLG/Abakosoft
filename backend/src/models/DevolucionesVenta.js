const db = require("../database/db");

module.exports = {
  getAllPaginated: async ({
    estados = ["pendiente", "aprobada"],
    buscar = "",
    page = 1,
    pageSize = 25,
    sortBy = "fecha",
    sortDir = "desc",
  } = {}) => {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 25));
    const offset = (p - 1) * ps;

    const estadosValidos =
      Array.isArray(estados) && estados.length
        ? estados
        : ["pendiente", "aprobada"];
    const placeholders = estadosValidos.map(() => "?").join(",");

    const filters = [`dv.estado IN (${placeholders})`];
    const params = [...estadosValidos];

    if (buscar && String(buscar).trim() !== "") {
      filters.push(
        "(dv.id_devolucion_venta LIKE ? OR dv.id_orden_venta LIKE ? OR c.nombre LIKE ?)",
      );
      const like = `%${String(buscar).trim()}%`;
      params.push(like, like, like);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const sortColumn =
      sortBy === "id"
        ? "dv.id_devolucion_venta"
        : sortBy === "cliente"
          ? "cliente_nombre"
          : "dv.fecha";
    const direction = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const dataQuery = `
      SELECT
        dv.id_devolucion_venta,
        dv.id_orden_venta,
        dv.fecha,
        dv.id_cliente,
        c.nombre AS cliente_nombre,
        dv.estado,
        dv.monto,
        dv.motivo,
        mp.nombre AS metodo_pago,
        COALESCE(SUM(ddv.cantidad * ddv.precio_unitario), 0) AS monto_total
      FROM devoluciones_venta dv
      LEFT JOIN clientes c ON dv.id_cliente = c.id_cliente
      LEFT JOIN metodos_pago mp ON dv.id_metodo_pago = mp.id_metodo_pago
      LEFT JOIN detalle_devolucion_venta ddv ON dv.id_devolucion_venta = ddv.id_devolucion_venta
      ${whereClause}
      GROUP BY
        dv.id_devolucion_venta,
        dv.id_orden_venta,
        dv.fecha,
        dv.id_cliente,
        c.nombre,
        dv.estado,
        dv.monto,
        dv.motivo,
        mp.nombre
      ORDER BY ${sortColumn} ${direction}
      LIMIT ? OFFSET ?;
    `;

    const [rows] = await db.query(dataQuery, [...params, ps, offset]);

    const countQuery = `
      SELECT COUNT(*) AS total FROM (
        SELECT dv.id_devolucion_venta
        FROM devoluciones_venta dv
        LEFT JOIN clientes c ON dv.id_cliente = c.id_cliente
        ${whereClause}
        GROUP BY dv.id_devolucion_venta
      ) AS t;
    `;

    const [countRows] = await db.query(countQuery, params);

    return {
      data: rows,
      total: Number(countRows[0]?.total || 0),
    };
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      `
      SELECT
        dv.*,
        c.nombre AS cliente_nombre,
        mp.nombre AS metodo_pago
      FROM devoluciones_venta dv
      LEFT JOIN clientes c ON dv.id_cliente = c.id_cliente
      LEFT JOIN metodos_pago mp ON dv.id_metodo_pago = mp.id_metodo_pago
      WHERE dv.id_devolucion_venta = ?
      `,
      [id],
    );

    return rows[0];
  },

  create: async (
    {
      id_cliente,
      id_orden_venta = null,
      estado,
      fecha,
      motivo,
      monto,
      total,
      id_metodo_pago,
    },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `
      INSERT INTO devoluciones_venta
      (
        id_cliente,
        id_orden_venta,
        estado,
        fecha,
        motivo,
        monto,
        total,
        id_metodo_pago
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id_cliente,
        id_orden_venta,
        estado,
        fecha,
        motivo,
        monto,
        total,
        id_metodo_pago,
      ],
    );

    return result.insertId;
  },

  update: async (
    id,
    {
      id_cliente,
      id_orden_venta,
      estado,
      motivo,
      total,
      monto,
      id_metodo_pago,
    },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `
      UPDATE devoluciones_venta
      SET
        id_cliente = COALESCE(?, id_cliente),
        id_orden_venta = COALESCE(?, id_orden_venta),
        estado = COALESCE(?, estado),
        motivo = COALESCE(?, motivo),
        total = COALESCE(?, total),
        monto = COALESCE(?, monto),
        id_metodo_pago = COALESCE(?, id_metodo_pago)
      WHERE id_devolucion_venta = ?
      `,
      [
        id_cliente,
        id_orden_venta,
        estado,
        motivo,
        total,
        monto,
        id_metodo_pago,
        id,
      ],
    );

    return result.affectedRows;
  },

  cancelar: async (id, connection = db) => {
    const [result] = await (connection || db).query(
      `
      UPDATE devoluciones_venta
      SET estado = 'anulada'
      WHERE id_devolucion_venta = ?
      `,
      [id],
    );

    return result.affectedRows;
  },
};
