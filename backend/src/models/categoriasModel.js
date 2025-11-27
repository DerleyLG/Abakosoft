const db = require("../database/db");

const Categoria = {
  async getAll() {
    const [rows] = await db.query(
      "SELECT * FROM categorias ORDER BY tipo, nombre"
    );
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM categorias WHERE id_categoria = ?",
      [id]
    );
    return rows[0];
  },
  async create({ nombre, tipo }) {
    const [result] = await db.query(
      "INSERT INTO categorias (nombre, tipo) VALUES (?, ?)",
      [nombre, tipo || "articulo_fabricable"]
    );
    return result.insertId;
  },
  async update(id, { nombre, tipo }) {
    const fields = [];
    const values = [];

    if (nombre !== undefined) {
      fields.push("nombre = ?");
      values.push(nombre);
    }
    if (tipo !== undefined) {
      fields.push("tipo = ?");
      values.push(tipo);
    }

    if (fields.length === 0) {
      return { affectedRows: 0 };
    }

    values.push(id);
    const [result] = await db.query(
      `UPDATE categorias SET ${fields.join(", ")} WHERE id_categoria = ?`,
      values
    );
    return result;
  },
  async delete(id) {
    const [result] = await db.query(
      "DELETE FROM categorias WHERE id_categoria=?",
      [id]
    );
    return result;
  },
};

module.exports = Categoria;
