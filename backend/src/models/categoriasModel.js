const db = require('../database/db');



const Categoria = {
  async getAll() {
    const [rows] = await db.query("SELECT * FROM categorias");
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM categorias WHERE id_categoria = ?",
      [id]
    );
    return rows[0];
  },
  async create({nombre}) {
    const [result] = await db.query(
      "INSERT INTO categorias (nombre) VALUES (?)",
      [nombre]
    );
    return result.insertId;
  },
  async update(id, { nombre }
  ) {
   const [result] = await db.query( 'UPDATE categorias SET nombre=? WHERE id_categoria=?',
      [nombre, id]
    );
    return result;
  },
  async delete(id) {
    const [result] = await db.query("DELETE FROM categorias WHERE id_categoria=?",[id]);
    return result;
  },
};

module.exports = Categoria;

