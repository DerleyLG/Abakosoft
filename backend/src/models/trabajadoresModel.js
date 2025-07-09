// src/models/trabajadoresModel.js
const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT id_trabajador, nombre, telefono, cargo, activo
      FROM trabajadores
      WHERE activo = 1
      ORDER BY nombre

    `);
    return rows;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT id_trabajador, nombre, telefono, cargo, activo
       FROM trabajadores
       WHERE id_trabajador = ?`,
      [id]
    );
    return rows[0];
  },

  create: async ({ nombre, telefono, cargo }) => {
    const [result] = await db.query(
      `INSERT INTO trabajadores (nombre, telefono, cargo, activo)
       VALUES (?, ?, ?, 1)`,
      [nombre, telefono || null, cargo || null]
    );
    return result.insertId;
  },

  update: async (id, { nombre, telefono, cargo, activo }) => {
    await db.query(
      `UPDATE trabajadores
       SET nombre = ?, telefono = ?, cargo = ?, activo = ?
       WHERE id_trabajador = ?`,
      [nombre, telefono || null, cargo || null, activo ? 1 : 0, id]
    );
  },

  // Nuevo método para soft delete
  deactivate: async (id) => {
    await db.query(
      `UPDATE trabajadores
       SET activo = 0
       WHERE id_trabajador = ?`,
      [id]
    );
  }
};
