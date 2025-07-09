const db = require('../database/db');

const CostosIndirectos = {
  getAll: () => {
    return db.query('SELECT * FROM costos_indirectos ORDER BY fecha DESC');
  },

  getById: (id) => {
    return db.query('SELECT * FROM costos_indirectos WHERE id_costo_indirecto = ?', [id]);
  },

  create: (data) => {
    const { tipo_costo, fecha, valor, observaciones } = data;
    return db.query(
      'INSERT INTO costos_indirectos (tipo_costo, fecha, valor, observaciones) VALUES (?, ?, ?, ?)',
      [tipo_costo, fecha, valor, observaciones]
    );
  },

  update: (id, data) => {
    const { tipo_costo, fecha, valor, observaciones } = data;
    return db.query(
      'UPDATE costos_indirectos SET tipo_costo = ?, fecha = ?, valor = ?, observaciones = ? WHERE id_costo_indirecto = ?',
      [tipo_costo, fecha, valor, observaciones, id]
    );
  },

  delete: (id) => {
    return db.query('DELETE FROM costos_indirectos WHERE id_costo_indirecto = ?', [id]);
  }
};

module.exports = CostosIndirectos;
