const db = require("../database/db");

const detalleOrdenCompra = {
  // Obtener todos los detalles de una orden de compra
  async getByOrdenCompra(id_orden_compra) {
    const [rows] = await db.query(
      "SELECT *, (cantidad * precio_unitario) AS total FROM detalle_orden_compra WHERE id_orden_compra = ?",
      [id_orden_compra]
    );
    return rows;
  },

  // Insertar un detalle de orden de compra
  async create({ id_orden_compra, descripcion_articulo, cantidad, precio_unitario }) {
    if (!id_orden_compra || !descripcion_articulo || !cantidad || !precio_unitario) {
      throw new Error("Todos los campos son obligatorios: id_orden_compra, descripcion_articulo, cantidad, precio_unitario");
    }
    const [result] = await db.query(
      'INSERT INTO detalle_orden_compra (id_orden_compra, descripcion_articulo, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [id_orden_compra, descripcion_articulo, cantidad, precio_unitario]
    );
    return result.insertId;
  },

  // Actualizar un detalle de orden de compra
  async update(id_detalle_compra, { cantidad, precio_unitario }) {
    if (cantidad === undefined || precio_unitario === undefined) {
      throw new Error("Todos los campos son obligatorios: cantidad, precio_unitario");
    }
    const [result] = await db.query(
      "UPDATE detalle_orden_compra SET cantidad = ?, precio_unitario = ? WHERE id_detalle_compra = ?",
      [cantidad, precio_unitario, id_detalle_compra]
    );
    return result;
  },

  // Eliminar un detalle de orden de compra
  async delete(id_detalle_compra) {
    const [result] = await db.query(
      "DELETE FROM detalle_orden_compra WHERE id_detalle_compra = ?",
      [id_detalle_compra]
    );
    return result;
  },
};

module.exports = detalleOrdenCompra;
