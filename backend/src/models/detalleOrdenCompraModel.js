const db = require('../database/db');

module.exports = {
  getAll: async (connection = db) => {
    const [rows] = await (connection || db).query('SELECT * FROM detalle_orden_compra');
    return rows;
  },

  // MODIFICADO: Ahora usa id_articulo y hace JOIN con articulos para obtener la descripción
  getByOrdenCompra: async (id_orden_compra, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT doc.*, a.descripcion AS descripcion_articulo, a.precio_venta
       FROM detalle_orden_compra doc
       JOIN articulos a ON doc.id_articulo = a.id_articulo
       WHERE doc.id_orden_compra = ?`,
      [id_orden_compra]
    );
    return rows;
  },

  // MODIFICADO: Ahora acepta id_articulo en lugar de descripcion_articulo
  create: async ({ id_orden_compra, id_articulo, cantidad, precio_unitario }, connection = db) => {
    const [result] = await (connection || db).query(
      `INSERT INTO detalle_orden_compra
       (id_orden_compra, id_articulo, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [id_orden_compra, id_articulo, cantidad, precio_unitario]
    );
    return result.insertId;
  },

  // MODIFICADO: Ahora usa id_articulo en lugar de descripcion_articulo
  update: async (id_detalle_compra, { id_orden_compra, id_articulo, cantidad, precio_unitario }, connection = db) => {
    const [result] = await (connection || db).query(
      `UPDATE detalle_orden_compra
       SET id_orden_compra = ?, id_articulo = ?, cantidad = ?, precio_unitario = ?
       WHERE id_detalle_compra = ?`,
      [id_orden_compra, id_articulo, cantidad, precio_unitario, id_detalle_compra]
    );
    return result.affectedRows;
  },

  // MODIFICADO: Acepta 'connection' opcional
  delete: async (id_detalle_compra, connection = db) => {
    const [result] = await (connection || db).query('DELETE FROM detalle_orden_compra WHERE id_detalle_compra = ?', [id_detalle_compra]);
    return result.affectedRows;
  },

  // Añadido: Eliminar todos los detalles de una orden de compra específica
  deleteByOrdenCompraId: async (id_orden_compra, connection = db) => {
    const [result] = await (connection || db).query('DELETE FROM detalle_orden_compra WHERE id_orden_compra = ?', [id_orden_compra]);
    return result.affectedRows;
  }
};
