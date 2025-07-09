const db = require('../database/db');

const Movimientos = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM movimientos_inventario');
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query('SELECT * FROM movimientos_inventario WHERE id_movimiento = ?', [id]);
    return rows[0];
  },

  async create({ id_articulo, cantidad, tipo_movimiento, descripcion, origen }) {
    const [result] = await db.query(
      'INSERT INTO movimientos_inventario (id_articulo, cantidad, tipo_movimiento, descripcion, origen) VALUES (?, ?, ?, ?, ?)',
      [id_articulo, cantidad, tipo_movimiento, descripcion, origen]
    );
    return result.insertId;
  },

  async update(id, { cantidad, tipo_movimiento, descripcion, origen }) {
    const [result] = await db.query(
      'UPDATE movimientos_inventario SET cantidad = ?, tipo_movimiento = ?, descripcion = ?, origen = ? WHERE id_movimiento = ?',
      [cantidad, tipo_movimiento, descripcion, origen, id]
    );
    return result;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM movimientos_inventario WHERE id_movimiento = ?', [id]);
    return result;
  },

  async calcularStock(id_articulo) {
    const [[{ stock_actual }]] = await db.query(
      `SELECT 
         SUM(CASE WHEN tipo_movimiento = 'entrada' THEN cantidad ELSE -cantidad END) AS stock_actual
       FROM movimientos_inventario
       WHERE id_articulo = ?`,
      [id_articulo]
    );
    return stock_actual ?? 0;
  }
};

module.exports = Movimientos;
