
const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT * 
        FROM historial_costos
       ORDER BY fecha_inicio DESC
    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT * FROM historial_costos WHERE id_historial = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({id_articulo, id_etapa, costo_unitario, fecha_inicio }) => {
    const [result] = await db.query(
      `INSERT INTO historial_costos
         (id_articulo, id_etapa, costo_unitario, fecha_inicio)
       VALUES (?, ?, ?, ?)`,
      [id_articulo, id_etapa, costo_unitario, fecha_inicio]
    );
    return result.insertId;
  },

  update: async (id, { id_articulo, id_etapa, costo_unitario, fecha_inicio }) => {
    await db.query(
      `UPDATE historial_costos
         SET id_articulo = ?, id_etapa = ?, costo_unitario = ?, fecha_inicio = ?
       WHERE id_historial = ?`,
      [id_articulo, id_etapa, costo_unitario, fecha_inicio, id]
    );
  },

  delete: async (id) => {
    await db.query(`DELETE FROM historial_costos WHERE id_historial = ?`, [id]);
  }
};
