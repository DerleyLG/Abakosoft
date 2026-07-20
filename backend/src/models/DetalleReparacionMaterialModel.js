const db = require("../database/db");

module.exports = {
  create: async (
    { id_reparacion, id_articulo, cantidad, costo_unitario = 0 },
    connection = db,
  ) => {
    const subtotal = Number(cantidad) * Number(costo_unitario);
    const [result] = await (connection || db).query(
      `
      INSERT INTO detalle_reparacion_material
        (id_reparacion, id_articulo, cantidad, costo_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?)
      `,
      [id_reparacion, id_articulo, cantidad, costo_unitario, subtotal],
    );
    return result.insertId;
  },

  getById: async (id_detalle, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT * FROM detalle_reparacion_material WHERE id_detalle = ?`,
      [id_detalle],
    );
    return rows[0] || null;
  },

  getByReparacion: async (id_reparacion, connection = db) => {
    const [rows] = await (connection || db).query(
      `
      SELECT
        drm.*,
        a.descripcion AS articulo_descripcion,
        a.referencia AS articulo_referencia
      FROM detalle_reparacion_material drm
      LEFT JOIN articulos a ON drm.id_articulo = a.id_articulo
      WHERE drm.id_reparacion = ?
      ORDER BY drm.id_detalle ASC
      `,
      [id_reparacion],
    );
    return rows;
  },

  delete: async (id_detalle, connection = db) => {
    const [result] = await (connection || db).query(
      `DELETE FROM detalle_reparacion_material WHERE id_detalle = ?`,
      [id_detalle],
    );
    return result.affectedRows;
  },

  getSubtotalByReparacion: async (id_reparacion, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT COALESCE(SUM(subtotal), 0) AS total
       FROM detalle_reparacion_material WHERE id_reparacion = ?`,
      [id_reparacion],
    );
    return Number(rows[0]?.total || 0);
  },
};
