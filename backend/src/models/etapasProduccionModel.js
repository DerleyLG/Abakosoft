const db = require("../database/db");

const etapasProduccionModel = {
  getAll: async () => {
    const [rows] = await db.query(
      "SELECT * FROM etapas_produccion ORDER BY orden ASC",
    );
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM etapas_produccion WHERE id_etapa = ?",
      [id],
    );
    return rows[0];
  },

  async existsByOrden(orden) {
    const [rows] = await db.query(
      "SELECT 1 FROM etapas_produccion WHERE orden = ? LIMIT 1",
      [orden],
    );
    return rows.length > 0;
  },

  async shiftOrdenUp(desdeOrden) {
    await db.query(
      "UPDATE etapas_produccion SET orden = orden + 1 WHERE orden >= ? ORDER BY orden DESC",
      [desdeOrden],
    );
  },

  async shiftOrdenDown(desdeOrden) {
    await db.query(
      "UPDATE etapas_produccion SET orden = orden - 1 WHERE orden > ? ORDER BY orden ASC",
      [desdeOrden],
    );
  },

  create: async ({ nombre, descripcion, orden, cargo }) => {
    const [result] = await db.query(
      "INSERT INTO etapas_produccion (nombre, descripcion, orden, cargo) VALUES (?, ?, ?, ?)",
      [nombre, descripcion || null, orden, cargo || null],
    );
    return result.insertId;
  },

  update: async (id, { nombre, descripcion, orden, cargo }) => {
    await db.query(
      "UPDATE etapas_produccion SET nombre = ?, descripcion = ?, orden = ?, cargo = ? WHERE id_etapa = ?",
      [nombre, descripcion || null, orden, cargo || null, id],
    );
  },

  delete: async (id) => {
    await db.query("DELETE FROM etapas_produccion WHERE id_etapa = ?", [id]);
  },
};

module.exports = etapasProduccionModel;
