/** const db = require('../database/db');

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
*/
const db = require("../database/db");

module.exports = {
  /**
   * Crea un nuevo registro de movimiento de inventario.
   * Esta función solo inserta el registro del movimiento. La actualización del stock
   * en la tabla 'inventario' es manejada por InventarioModel.processInventoryMovement.
   * @param {object} movimientoData - Datos del movimiento a insertar.
   * @param {number} movimientoData.id_articulo - ID del artículo.
   * @param {number} movimientoData.cantidad_movida - Cantidad de unidades movidas (siempre positiva).
   * @param {string} movimientoData.tipo_movimiento - Tipo de movimiento ('entrada', 'salida', 'ajuste').
   * @param {string} movimientoData.tipo_origen_movimiento - Origen específico (ej. 'produccion', 'venta', 'inicial').
   * @param {string} [movimientoData.observaciones] - Observaciones del movimiento.
   * @param {number} [movimientoData.referencia_documento_id] - ID del documento de referencia.
   * @param {string} [movimientoData.referencia_documento_tipo] - Tipo del documento de referencia.
   * @param {Date} [movimientoData.fecha_movimiento] - Fecha del movimiento (si no se provee, usará DEFAULT CURRENT_TIMESTAMP de la DB).
   * @returns {Promise<number>} El ID del movimiento insertado.
   */
  create: async ({
    id_articulo,
    cantidad_movida,
    tipo_movimiento,
    tipo_origen_movimiento,
    observaciones = null,
    referencia_documento_id = null,
    referencia_documento_tipo = null,
    fecha_movimiento = new Date() // Asegura que siempre haya una fecha
  }) => {
    const [result] = await db.query(
      `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo, fecha_movimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_articulo,
        cantidad_movida,
        tipo_movimiento,
        tipo_origen_movimiento,
        observaciones,
        referencia_documento_id,
        referencia_documento_tipo,
        fecha_movimiento
      ]
    );
    return result.insertId;
  },

  /**
   * Obtiene todos los movimientos de inventario con los detalles del artículo.
   * @returns {Promise<Array>} Un array de objetos de movimientos.
   */
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT mi.id_movimiento, mi.id_articulo, a.descripcion AS articulo_descripcion,
             mi.cantidad_movida, mi.tipo_movimiento, mi.tipo_origen_movimiento,
             mi.observaciones, mi.referencia_documento_id, mi.referencia_documento_tipo, mi.fecha_movimiento
      FROM movimientos_inventario mi
      JOIN articulos a ON mi.id_articulo = a.id_articulo
      ORDER BY mi.fecha_movimiento DESC;
    `);
    return rows;
  },

  /**
   * Obtiene un movimiento de inventario por su ID.
   * @param {number} id - ID del movimiento.
   * @returns {Promise<object|null>} El objeto del movimiento o null si no existe.
   */
  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM movimientos_inventario WHERE id_movimiento = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  // La función 'calcularStock' que tenías en tu MovimientosInventarioController
  // (y que parecía estar en este modelo) se ELIMINA porque el stock actual
  // ahora se mantiene en la tabla 'inventario' y es actualizado transaccionalmente
  // por InventarioModel.processInventoryMovement.
};
