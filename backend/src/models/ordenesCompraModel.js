const db = require("../database/db");

module.exports = {
  getAll: async (estadosToFilter = ["pendiente", "completada"]) => {
    const placeholders = estadosToFilter.map(() => "?").join(",");
    const [rows] = await db.query(
      `
      SELECT oc.id_orden_compra, oc.fecha, oc.id_proveedor, p.nombre AS proveedor_nombre,
             oc.categoria_costo, oc.id_orden_fabricacion, oc.estado,
             SUM(doc.cantidad * doc.precio_unitario) AS monto_total
      FROM ordenes_compra oc
      JOIN proveedores p ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
      WHERE oc.estado IN (${placeholders})
      GROUP BY oc.id_orden_compra
      ORDER BY oc.fecha DESC;
    `,
      estadosToFilter
    );
    return rows;
  },

  async getAllPaginated({
    estados = ["pendiente", "completada"],
    buscar = "",
    proveedorId = null,
    page = 1,
    pageSize = 25,
    sortBy = "fecha",
    sortDir = "desc",
  }) {
    const SORT_MAP = {
      id: "oc.id_orden_compra",
      fecha: "oc.fecha",
      proveedor: "p.nombre",
      monto_total: "monto_total",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.fecha;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const estadoPlaceholders = estados.map(() => "?").join(",");
    const whereParts = [`oc.estado IN (${estadoPlaceholders})`];
    const params = [...estados];
    if (buscar) {
      whereParts.push("p.nombre LIKE ?");
      params.push(`%${buscar}%`);
    }
    if (proveedorId) {
      whereParts.push("oc.id_proveedor = ?");
      params.push(Number(proveedorId));
    }
    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const base = `
      FROM ordenes_compra oc
      JOIN proveedores p ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
      LEFT JOIN movimientos_tesoreria mt ON oc.id_orden_compra = mt.id_documento AND mt.tipo_documento = 'compra'
      LEFT JOIN metodos_pago mp ON mt.id_metodo_pago = mp.id_metodo_pago
      ${whereSQL}
      GROUP BY oc.id_orden_compra
    `;

    const [rows] = await db.query(
      `SELECT 
         oc.id_orden_compra, oc.fecha, oc.id_proveedor, p.nombre AS proveedor_nombre,
         oc.categoria_costo, oc.id_orden_fabricacion, oc.estado,
         SUM(doc.cantidad * doc.precio_unitario) AS monto_total,
         mp.nombre AS metodo_pago,
         mp.tipo AS tipo_pago
       ${base}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT oc.id_orden_compra ${base}
       ) AS sub`,
      params
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM ordenes_compra WHERE id_orden_compra = ?",
      [id]
    );
    return rows[0];
  },

  create: async (
    id_proveedor,
    categoria_costo,
    id_orden_fabricacion,
    estado,
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      `INSERT INTO ordenes_compra (id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_proveedor, categoria_costo, id_orden_fabricacion, estado]
    );
    return result.insertId;
  },

  update: async (
    id,
    { id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha },
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      `UPDATE ordenes_compra
   SET id_proveedor = COALESCE(?, id_proveedor),
     categoria_costo = COALESCE(?, categoria_costo),
     id_orden_fabricacion = COALESCE(?, id_orden_fabricacion),
     estado = COALESCE(?, estado),
     fecha = COALESCE(?, fecha) 
   WHERE id_orden_compra = ?`,
      [id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha, id]
    );
    return result.affectedRows;
  },
  delete: async (id_orden_compra, connection = db) => {
    const [result] = await (connection || db).query(
      "DELETE FROM ordenes_compra WHERE id_orden_compra = ?",
      [id_orden_compra]
    );
    return result.affectedRows > 0;
  },
};
