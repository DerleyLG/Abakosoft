const db = require('../database/db');

module.exports = {
  // MODIFICADO: Acepta 'connection' opcional
  getAll: async (connection = db) => {
    const [rows] = await (connection || db).query('SELECT * FROM detalle_orden_venta');
    return rows;
  },

  // MODIFICADO: Acepta 'connection' opcional
  getByVenta: async (id_orden_venta, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT dov.*, a.descripcion
       FROM detalle_orden_venta dov
       JOIN articulos a ON dov.id_articulo = a.id_articulo
       WHERE dov.id_orden_venta = ?`,
      [id_orden_venta]
    );
    return rows;
  },

  // MODIFICADO: Acepta 'observaciones' y 'connection' opcional
  create: async ({ id_orden_venta, id_articulo, cantidad, precio_unitario, observaciones = null }, connection = db) => {
    const [result] = await (connection || db).query(
      `INSERT INTO detalle_orden_venta
       (id_orden_venta, id_articulo, cantidad, precio_unitario, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [id_orden_venta, id_articulo, cantidad, precio_unitario, observaciones]
    );
    return result.insertId;
  },

  // MODIFICADO: Acepta 'connection' opcional
  update: async (id, { id_orden_venta, id_articulo, cantidad, precio_unitario, observaciones = null }, connection = db) => {
    const [result] = await (connection || db).query(
      `UPDATE detalle_orden_venta
       SET id_orden_venta = ?, id_articulo = ?, cantidad = ?, precio_unitario = ?, observaciones = ?
       WHERE id_detalle_venta = ?`,
      [id_orden_venta, id_articulo, cantidad, precio_unitario, observaciones, id]
    );
    return result.affectedRows;
  },

  // MODIFICADO: Acepta 'connection' opcional
  delete: async (id, connection = db) => {
    const [result] = await (connection || db).query('DELETE FROM detalle_orden_venta WHERE id_detalle_venta = ?', [id]);
    return result.affectedRows;
  }
};
