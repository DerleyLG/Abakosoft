const db = require("../database/db");

const ESTADOS = {
  REGISTRADA: "registrada",
  DIAGNOSTICADA: "diagnosticada",
  EN_REPARACION: "en_reparacion",
  LISTA_ENTREGA: "lista_entrega",
  ENTREGADA: "entregada",
  CANCELADA: "cancelada",
};

module.exports = {
  ESTADOS,

  getAllPaginated: async ({
    estados = [],
    buscar = "",
    page = 1,
    pageSize = 20,
    sortBy = "fecha_ingreso",
    sortDir = "desc",
  } = {}) => {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (p - 1) * ps;

    const params = [];
    const filters = [];

    if (Array.isArray(estados) && estados.length > 0) {
      const placeholders = estados.map(() => "?").join(",");
      filters.push(`r.estado IN (${placeholders})`);
      params.push(...estados);
    }

    if (buscar && String(buscar).trim() !== "") {
      filters.push(
        "(r.id_reparacion LIKE ? OR c.nombre LIKE ? OR a.descripcion LIKE ?)",
      );
      const like = `%${String(buscar).trim()}%`;
      params.push(like, like, like);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const sortColumn =
      sortBy === "estado"
        ? "r.estado"
        : sortBy === "cliente"
          ? "c.nombre"
          : "r.fecha_ingreso";
    const direction = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const dataQuery = `
      SELECT
        r.id_reparacion,
        r.id_cliente,
        c.nombre AS cliente_nombre,
        r.id_articulo,
        a.descripcion AS articulo_descripcion,
        a.referencia AS articulo_referencia,
        r.id_devolucion_venta,
        r.motivo,
        r.diagnostico,
        r.fecha_ingreso,
        r.fecha_estimada,
        r.fecha_entrega,
        r.requiere_pago,
        r.subtotal_materiales,
        r.mano_obra,
        r.descuento,
        r.total,
        r.id_metodo_pago,
        r.observaciones,
        r.estado,
        r.created_at,
        r.id_trabajador,
        t.nombre AS trabajador_nombre,
        mp.nombre AS metodo_pago_nombre,
        COALESCE(i.stock, 0) AS stock_actual,
        COALESCE(i.stock_reparacion, 0) AS stock_reparacion
      FROM reparaciones r
      LEFT JOIN clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN articulos a ON r.id_articulo = a.id_articulo
      LEFT JOIN trabajadores t ON r.id_trabajador = t.id_trabajador
      LEFT JOIN metodos_pago mp ON r.id_metodo_pago = mp.id_metodo_pago
      LEFT JOIN inventario i ON r.id_articulo = i.id_articulo
      ${whereClause}
      ORDER BY ${sortColumn} ${direction}
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(dataQuery, [...params, ps, offset]);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM reparaciones r
      LEFT JOIN clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN articulos a ON r.id_articulo = a.id_articulo
      ${whereClause}
    `;

    const [countRows] = await db.query(countQuery, params);

    return {
      data: rows,
      total: Number(countRows[0]?.total || 0),
    };
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `
      SELECT
        r.*,
        c.nombre AS cliente_nombre,
        c.identificacion AS cliente_identificacion,
        c.telefono AS cliente_telefono,
        a.descripcion AS articulo_descripcion,
        a.referencia AS articulo_referencia,
        t.nombre AS trabajador_nombre,
        mp.nombre AS metodo_pago_nombre
      FROM reparaciones r
      LEFT JOIN clientes c ON r.id_cliente = c.id_cliente
      LEFT JOIN articulos a ON r.id_articulo = a.id_articulo
      LEFT JOIN trabajadores t ON r.id_trabajador = t.id_trabajador
      LEFT JOIN metodos_pago mp ON r.id_metodo_pago = mp.id_metodo_pago
      WHERE r.id_reparacion = ?
      `,
      [id],
    );
    return rows[0] || null;
  },

  create: async (
    {
      id_devolucion_venta = null,
      id_cliente,
      id_articulo,
      motivo,
      fecha_ingreso,
      fecha_estimada = null,
      id_trabajador = null,
      requiere_pago = false,
      observaciones = null,
    },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `
      INSERT INTO reparaciones
        (id_devolucion_venta, id_cliente, id_articulo, motivo,
         fecha_ingreso, fecha_estimada, id_trabajador,
         requiere_pago, observaciones, estado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'registrada')
      `,
      [
        id_devolucion_venta,
        id_cliente,
        id_articulo,
        motivo,
        fecha_ingreso,
        fecha_estimada,
        id_trabajador,
        requiere_pago ? 1 : 0,
        observaciones,
      ],
    );
    return result.insertId;
  },

  update: async (id, fields = {}, connection = db) => {
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      updates.push(`${key} = ?`);
      params.push(value);
    }

    if (updates.length === 0) return 0;

    params.push(id);
    const [result] = await (connection || db).query(
      `UPDATE reparaciones SET ${updates.join(", ")} WHERE id_reparacion = ?`,
      params,
    );
    return result.affectedRows;
  },

  updateEstado: async (id, estado, connection = db) => {
    const [result] = await (connection || db).query(
      `UPDATE reparaciones SET estado = ? WHERE id_reparacion = ?`,
      [estado, id],
    );
    return result.affectedRows;
  },
};
