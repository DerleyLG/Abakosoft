const db = require('../database/db');

module.exports = {
  // Obtener todos los roles
  async getAll() {
    const [rows] = await db.query(`SELECT * FROM roles ORDER BY id_rol ASC`);
    return rows;
  },

  // Obtener un rol por ID
  async getById(id) {
    const [rows] = await db.query(`SELECT * FROM roles WHERE id_rol = ?`, [id]);
    return rows[0];
  },

  // Crear un nuevo rol
  async create(nombre) {
    const [result] = await db.query(`INSERT INTO roles (nombre) VALUES (?)`, [nombre]);
    return result.insertId;
  },

  // Actualizar el nombre de un rol
  async update(id, nombre) {
    const [result] = await db.query(`UPDATE roles SET nombre = ? WHERE id_rol = ?`, [nombre, id]);
    return result.affectedRows;
  },

  // Eliminar un rol
  async delete(id) {
    const [result] = await db.query(`DELETE FROM roles WHERE id_rol = ?`, [id]);
    return result.affectedRows;
  }
};
