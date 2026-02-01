const db = require("../database/db");

const UnidadesModel = {
  getAll: async () => {
    const [rows] = await db.query(
      "SELECT id_unidad, nombre, abreviatura FROM unidades ORDER BY nombre ASC",
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      "SELECT id_unidad, nombre, abreviatura FROM unidades WHERE id_unidad = ?",
      [id],
    );
    return rows[0] || null;
  },

  create: async ({ nombre, abreviatura }) => {
    const [result] = await db.query(
      "INSERT INTO unidades (nombre, abreviatura) VALUES (?, ?)",
      [nombre, abreviatura],
    );
    return result.insertId;
  },

  update: async (id, { nombre, abreviatura }) => {
    const [result] = await db.query(
      "UPDATE unidades SET nombre = ?, abreviatura = ? WHERE id_unidad = ?",
      [nombre, abreviatura, id],
    );
    return result;
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM unidades WHERE id_unidad = ?",
      [id],
    );
    return result;
  },
};

module.exports = UnidadesModel;
