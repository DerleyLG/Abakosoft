const db = require("../database/db");

module.exports = {
  // Obtener todos los roles
  async getAll() {
    const [rows] = await db.query(
      `SELECT id_rol, nombre_rol FROM roles ORDER BY id_rol ASC`
    );
    return rows;
  },

  // Obtener un rol por ID
  async getById(id) {
    const [rows] = await db.query(
      `SELECT id_rol, nombre_rol FROM roles WHERE id_rol = ?`,
      [id]
    );
    return rows[0];
  },

  // Crear un nuevo rol
  async create(nombre_rol) {
    const [result] = await db.query(
      `INSERT INTO roles (nombre_rol) VALUES (?)`,
      [nombre_rol]
    );
    return result.insertId;
  },

  // Actualizar el nombre de un rol
  async update(id, nombre_rol) {
    const [result] = await db.query(
      `UPDATE roles SET nombre_rol = ? WHERE id_rol = ?`,
      [nombre_rol, id]
    );
    return result.affectedRows;
  },

  // Eliminar un rol
  async delete(id) {
    const [result] = await db.query(`DELETE FROM roles WHERE id_rol = ?`, [id]);
    return result.affectedRows;
  },
};
