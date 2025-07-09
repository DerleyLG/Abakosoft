
const db = require('../database/db');

module.exports = {
  async create({id_proveedor, descripcion, estado, costo}) {
  
    const [result] = await db.query(
      `INSERT INTO servicios_tercerizados (id_proveedor, descripcion, estado, costo)
       VALUES (?, ?, ?, ?)`,
      [id_proveedor, descripcion, estado, costo]
    );
    return result.insertId;
  },

  async getAll() {
    const [rows] = await db.query(`
      SELECT s.*, p.nombre AS proveedor
      FROM servicios_tercerizados s
      JOIN proveedores p ON s.id_proveedor = p.id_proveedor
      ORDER BY s.fecha_inicio DESC
    `);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`SELECT * FROM servicios_tercerizados WHERE id_servicio = ?`, [id]);
    return rows[0];
  },

  async update(id,{id_proveedor, descripcion, estado, costo}) {
    const [result] = await db.query(
      `UPDATE servicios_tercerizados
       SET id_proveedor = ?, descripcion = ?, estado = ?, costo = ?
       WHERE id_servicio = ?`,
      [id_proveedor, descripcion, estado, costo, id]
    );
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.query(`DELETE FROM servicios_tercerizados WHERE id_servicio = ?`, [id]);
    return result.affectedRows;
  }
};
