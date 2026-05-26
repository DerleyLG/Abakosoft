const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM metodos_pago");
    return rows;
  },

  getIdByName: async (name) => {
    if (!name) return null;
    const like = `%${name}%`;
    const [rows] = await db.query(
      "SELECT id_metodo_pago FROM metodos_pago WHERE nombre LIKE ? LIMIT 1",
      [like],
    );
    return rows.length ? rows[0].id_metodo_pago : null;
  },

  create: async ({ nombre, tipo }) => {
    const [result] = await db.query(
      "INSERT INTO metodos_pago (nombre, tipo) VALUES (?, ?)",
      [nombre, tipo || "contado"],
    );
    return { id: result.insertId, nombre };
  },

  update: async (id, { nombre, tipo }) => {
    const fields = ["nombre = ?"];
    const values = [nombre];
    if (tipo) {
      fields.push("tipo = ?");
      values.push(tipo);
    }
    values.push(id);
    const [result] = await db.query(
      `UPDATE metodos_pago SET ${fields.join(", ")} WHERE id_metodo_pago = ?`,
      values,
    );
    return result;
  },

  delete: async (id) => {
    const [result] = await db.query(
      "DELETE FROM metodos_pago WHERE id_metodo_pago = ?",
      [id],
    );
    return result;
  },
};
