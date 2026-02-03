const db = require("../database/db");

module.exports = {
  getAll: async (connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM detalle_orden_compra",
    );
    return rows;
  },

  // JOIN con artículos para obtener descripción, precio y precio_costo actual
  getByOrdenCompra: async (id_orden_compra, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT doc.*, a.descripcion AS descripcion_articulo, a.precio_venta, a.precio_costo AS precio_costo_articulo
       FROM detalle_orden_compra doc
       JOIN articulos a ON doc.id_articulo = a.id_articulo
       WHERE doc.id_orden_compra = ?`,
      [id_orden_compra],
    );
    return rows;
  },

  // Crear nuevo detalle de orden de compra
  create: async (
    { id_orden_compra, id_articulo, cantidad, precio_unitario },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `INSERT INTO detalle_orden_compra
       (id_orden_compra, id_articulo, cantidad, precio_unitario)
       VALUES (?, ?, ?, ?)`,
      [id_orden_compra, id_articulo, cantidad, precio_unitario],
    );
    return result.insertId;
  },

  // Actualizar detalle de orden
  update: async (
    id_detalle_compra,
    { id_orden_compra, id_articulo, cantidad, precio_unitario },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `UPDATE detalle_orden_compra
       SET id_orden_compra = ?, id_articulo = ?, cantidad = ?, precio_unitario = ?
       WHERE id_detalle_compra = ?`,
      [
        id_orden_compra,
        id_articulo,
        cantidad,
        precio_unitario,
        id_detalle_compra,
      ],
    );
    return result.affectedRows;
  },

  // Eliminar por ID de detalle
  delete: async (id_detalle_compra, connection = db) => {
    const [result] = await (connection || db).query(
      "DELETE FROM detalle_orden_compra WHERE id_detalle_compra = ?",
      [id_detalle_compra],
    );
    return result.affectedRows;
  },

  // Eliminar todos los detalles por orden de compra
  deleteByOrdenCompraId: async (id_orden_compra, connection = db) => {
    const [result] = await (connection || db).query(
      "DELETE FROM detalle_orden_compra WHERE id_orden_compra = ?",
      [id_orden_compra],
    );
    return result.affectedRows;
  },
};
