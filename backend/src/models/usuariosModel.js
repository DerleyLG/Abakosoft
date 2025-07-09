const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.id_trabajador,
        u.id_rol,
        t.nombre AS trabajador
      FROM usuarios u
      JOIN trabajadores t ON u.id_trabajador = t.id_trabajador
      ORDER BY u.nombre_usuario
    `);
    return rows;
  },

   async getByUsername(nombre_usuario) {
    const [rows] = await db.query(`
      SELECT u.*, r.nombre_rol 
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.nombre_usuario = ?
    `, [nombre_usuario]);

    return rows[0];
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
         u.id_usuario,
         u.nombre_usuario,
         u.rol,
         u.id_trabajador,
         t.nombre AS trabajador
       FROM usuarios u
       JOIN trabajadores t ON u.id_trabajador = t.id_trabajador
       WHERE u.id_usuario = ?`,
      [id]
    );
    return rows[0];
  },

  getByUsername: async (nombre_usuario) => {
    const [rows] = await db.query(
      `SELECT * FROM usuarios WHERE nombre_usuario = ?`,
      [nombre_usuario]
    );
    return rows[0];
  },

  create: async ({ nombre_usuario, pin, id_trabajador, id_rol }) => {
    const [result] = await db.query(
      `INSERT INTO usuarios
         (nombre_usuario, pin, id_trabajador, id_rol)
       VALUES (?, ?, ?, ?)`,
      [nombre_usuario, pin, id_trabajador, id_rol]
    );
    return result.insertId;
  },

  update: async (id, { nombre_usuario, pin, rol }) => {
    // Si pin viene definido, lo actualizamos; si no, solo nombre_usuario y rol
    if (pin) {
      await db.query(
       `UPDATE usuarios
         SET nombre_usuario = ?, pin = ?, id_trabajador =?, id_rol = ?
         WHERE id_usuario = ?`,
        [nombre_usuario, pin, id_trabajador, id_rol, id]
      );
    } else {
      await db.query(
        `UPDATE usuarios
         SET nombre_usuario = ?, rol = ?
         WHERE id_usuario = ?`,
        [nombre_usuario, rol, id]
      );
    }
  },

  delete: async (id) => {
    await db.query(
      `DELETE FROM usuarios WHERE id_usuario = ?`,
      [id]
    );
  }
};
