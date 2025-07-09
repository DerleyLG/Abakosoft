const db = require('../database/db');

const etapasProduccionModel = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM etapas_produccion ORDER BY orden ASC');
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM etapas_produccion WHERE id_etapa = ?', [id]);
    return rows[0];
  },

  create: async ({ nombre, descripcion }) => {
    const [result] = await db.query(
      'INSERT INTO etapas_produccion (nombre, descripcion) VALUES (?, ?)',
      [nombre, descripcion || null]
    );
    return result.insertId;
  },

  update: async (id, { nombre_etapa, descripcion }) => {
    await db.query(
      'UPDATE etapas_produccion SET nombre_etapa = ?, descripcion = ? WHERE id_etapa = ?',
      [nombre_etapa, descripcion || null, id]
    );
  },

  delete: async (id) => {
    await db.query('DELETE FROM etapas_produccion WHERE id_etapa = ?', [id]);
  }
};

module.exports = etapasProduccionModel;
