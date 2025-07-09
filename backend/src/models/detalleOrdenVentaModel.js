const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM detalle_orden_venta');
    return rows;
  },

  getByVenta: async (id_orden_venta) => {
  const [rows] = await db.query(
    `SELECT dov.*, a.descripcion
     FROM detalle_orden_venta dov
     JOIN articulos a ON dov.id_articulo = a.id_articulo
     WHERE dov.id_orden_venta = ?`,
    [id_orden_venta]
  );
  return rows;
},


  create: async ({ id_orden_venta, id_articulo, cantidad, precio_unitario }) => {
    const [result] = await db.query(
      `INSERT INTO detalle_orden_venta
       (id_orden_venta, id_articulo, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [id_orden_venta, id_articulo, cantidad, precio_unitario]
    );
    return result.insertId;
  },

  update: async (id, { id_orden_venta, id_articulo, cantidad, precio_unitario }) => {
    await db.query(
      `UPDATE detalle_orden_venta
       SET id_orden_venta = ?, id_articulo = ?, cantidad = ?, precio_unitario = ?
       WHERE id_detalle_venta = ?`,
      [id_orden_venta, id_articulo, cantidad, precio_unitario, id]
    );
  },

  delete: async (id) => {
    await db.query('DELETE FROM detalle_orden_venta WHERE id_detalle_venta = ?', [id]);
  }
};
