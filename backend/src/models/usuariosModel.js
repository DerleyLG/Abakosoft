const db = require('../database/db')
module.exports = {
  // Obtiene todos los usuarios
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT 
        u.id_usuario,
        u.nombre_usuario,
        u.id_trabajador,
        t.nombre AS nombre_trabajador,
        u.id_rol,
        r.nombre AS nombre_rol
      FROM usuarios u
      JOIN trabajadores t ON u.id_trabajador = t.id_trabajador
      JOIN roles r ON u.id_rol = r.id_rol
      ORDER BY u.nombre_usuario
    `);
    return rows;
  },

  // Obtiene un usuario por su ID
  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
          u.id_usuario,
          u.nombre_usuario,
          u.id_trabajador,
          t.nombre AS nombre_trabajador,
          u.id_rol,
          r.nombre_rol 
        FROM usuarios u
        JOIN trabajadores t ON u.id_trabajador = t.id_trabajador
        JOIN roles r ON u.id_rol = r.id_rol
        WHERE u.id_usuario = ?`,
      [id]
    );
    return rows[0];
  },

  // Obtiene un usuario por su nombre de usuario (para login y validación)
  getByUsername: async (nombre_usuario) => {
    const [rows] = await db.query(`
      SELECT 
        u.*, 
        r.nombre_rol 
      FROM usuarios u
      JOIN roles r ON u.id_rol = r.id_rol
      WHERE u.nombre_usuario = ?
    `, [nombre_usuario]);

    return rows[0];
  },

  // Crea un nuevo usuario
  create: async ({ nombre_usuario, pin, id_trabajador, id_rol }) => {
    const [result] = await db.query(
      `INSERT INTO usuarios
          (nombre_usuario, pin, id_trabajador, id_rol)
        VALUES (?, ?, ?, ?)`,
      [nombre_usuario, pin, id_trabajador, id_rol]
    );
    return result.insertId;
  },

  // Actualiza un usuario existente
  update: async (id, { nombre_usuario, pin, id_trabajador, id_rol }) => {
    if (pin) {
      await db.query(
        `UPDATE usuarios
           SET nombre_usuario = ?, pin = ?, id_trabajador = ?, id_rol = ?
           WHERE id_usuario = ?`,
        [nombre_usuario, pin, id_trabajador, id_rol, id]
      );
    } else {
      await db.query(
        `UPDATE usuarios
           SET nombre_usuario = ?, id_trabajador = ?, id_rol = ?
           WHERE id_usuario = ?`,
        [nombre_usuario, id_trabajador, id_rol, id]
      );
    }
  },

  // Elimina un usuario
  delete: async (id) => {
    await db.query(
      `DELETE FROM usuarios WHERE id_usuario = ?`,
      [id]
    );
  }
};