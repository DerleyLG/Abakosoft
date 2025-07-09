const db = require('../database/db');
const detalleOrdenModel = require('../models/detalleOrdenVentaModel');

module.exports = {
 getAll: async (estados = ['pendiente', 'completada']) => {
  const placeholders = estados.map(() => '?').join(',');
  const [rows] = await db.query(`
    SELECT ov.id_orden_venta, ov.fecha, ov.id_cliente, c.nombre AS cliente_nombre, ov.estado,
      SUM(dov.cantidad * dov.precio_unitario) AS monto_total
    FROM ordenes_venta ov
    JOIN clientes c ON ov.id_cliente = c.id_cliente
    LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    WHERE ov.estado IN (${placeholders})
    GROUP BY ov.id_orden_venta;
  `, estados);
  return rows;
},


  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM ordenes_venta WHERE id_orden_venta = ?', [id]);
    return rows[0];
  },

  create: async ({ id_cliente, estado}) => {
    const [result] = await db.query(
      `INSERT INTO ordenes_venta (id_cliente, estado)
       VALUES (?, ?)`,
      [id_cliente,  estado]
    );
    return result.insertId;
  },

update: async (id, { id_cliente, estado }) => {
  // Actualizar solo si la orden está pendiente
  const [result] = await db.query(
    `UPDATE ordenes_venta
     SET id_cliente = COALESCE(?, id_cliente), estado = COALESCE(?, estado)
     WHERE id_orden_venta = ? AND estado = 'pendiente'`,
    [id_cliente, estado, id]
  );
  return result.affectedRows; // Nos dirá si se actualizó o no
},

  delete: async (id) => {
    const detalles = await detalleOrdenModel.getByVenta(id);
for (const detalle of detalles) {
  await db.query(
    'UPDATE inventario SET stock = stock + ? WHERE id_articulo = ?',
    [detalle.cantidad, detalle.id_articulo]
  );
}
  }
};
