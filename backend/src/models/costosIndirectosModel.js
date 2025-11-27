const db = require("../database/db");

const CostosIndirectos = {
  getAll: () => {
    return db.query("SELECT * FROM costos_indirectos ORDER BY fecha DESC");
  },

  getById: (id) => {
    return db.query(
      "SELECT * FROM costos_indirectos WHERE id_costo_indirecto = ?",
      [id]
    );
  },

  create: (data) => {
    const { tipo_costo, fecha, valor, observaciones, fecha_inicio, fecha_fin } =
      data;
    return db.query(
      "INSERT INTO costos_indirectos (tipo_costo, fecha, valor, observaciones, fecha_inicio, fecha_fin) VALUES (?, ?, ?, ?, ?, ?)",
      [
        tipo_costo,
        fecha,
        valor,
        observaciones,
        fecha_inicio || null,
        fecha_fin || null,
      ]
    );
  },

  update: (id, data) => {
    const { tipo_costo, fecha, valor, observaciones, fecha_inicio, fecha_fin } =
      data;
    return db.query(
      "UPDATE costos_indirectos SET tipo_costo = ?, fecha = ?, valor = ?, observaciones = ?, fecha_inicio = ?, fecha_fin = ? WHERE id_costo_indirecto = ?",
      [
        tipo_costo,
        fecha,
        valor,
        observaciones,
        fecha_inicio || null,
        fecha_fin || null,
        id,
      ]
    );
  },

  delete: (id) => {
    return db.query(
      "DELETE FROM costos_indirectos WHERE id_costo_indirecto = ?",
      [id]
    );
  },
};

module.exports = CostosIndirectos;
