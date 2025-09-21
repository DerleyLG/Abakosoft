// models/compraMateriaPrimaModel.js
const db = require('../database/db');

module.exports = {

  getAll: async () => {
    const [rows] = await db.query(`
      SELECT
          cmp.id_compra_materia_prima,
          cmp.descripcion_gasto, 
          cmp.cantidad,
          cmp.precio_unitario,
          (cmp.cantidad * cmp.precio_unitario) AS valor_total,
          cmp.fecha_compra,
          cmp.id_proveedor,
          p.nombre AS nombre_proveedor,
          cmp.observaciones
      FROM compras_materia_prima cmp
      LEFT JOIN proveedores p ON cmp.id_proveedor = p.id_proveedor
      ORDER BY cmp.fecha_compra DESC;
    `);
    return rows;
  },


  create: async ({ descripcion_gasto, cantidad, precio_unitario, id_proveedor, observaciones }) => {
    const [result] = await db.query(
      `INSERT INTO compras_materia_prima
       (descripcion_gasto, cantidad, precio_unitario, fecha_compra, id_proveedor, observaciones)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [descripcion_gasto, cantidad, precio_unitario, id_proveedor || null, observaciones || null]
    );
    return result.insertId;
  },

 
  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM compras_materia_prima WHERE id_compra_materia_prima = ?', [id]);
    return rows[0];
  },


  update: async (id, { descripcion_gasto, cantidad, precio_unitario, id_proveedor, observaciones }) => {
    const [result] = await db.query(
      `UPDATE compras_materia_prima
       SET descripcion_gasto = ?, cantidad = ?, precio_unitario = ?, id_proveedor = ?, observaciones = ?
       WHERE id_compra_materia_prima = ?`,
      [descripcion_gasto, cantidad, precio_unitario, id_proveedor || null, observaciones || null, id]
    );
    return result.affectedRows;
  },


  delete: async (id) => {
    const [result] = await db.query('DELETE FROM compras_materia_prima WHERE id_compra_materia_prima = ?', [id]);
    return result.affectedRows;
  }
};
