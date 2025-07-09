const db = require('../database/db');
const detalleOrdenModel = require('../models/detalleOrdenPedidosModel');

module.exports = {
 getAll: async (estados = ['pendiente', 'completada']) => {
  const placeholders = estados.map(() => '?').join(',');
  const [rows] = await db.query(`
    SELECT p.id_pedido, p.fecha_pedido, p.id_cliente, c.nombre AS cliente_nombre, p.estado,
      SUM(dp.cantidad * dp.precio_unitario) AS monto_total
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    LEFT JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
    WHERE p.estado IN (${placeholders})
    GROUP BY p.id_pedido
    ORDER BY p.fecha_pedido DESC;
  `, estados);
  return rows;
},

  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM pedidos WHERE id_pedido = ?', [id]);
    return rows[0];
  },

  create: async ({ id_cliente, estado, observaciones}) => {
    const [result] = await db.query(
      `INSERT INTO pedidos (id_cliente, estado, observaciones)
       VALUES (?, ?,?)`,
      [id_cliente,  estado, observaciones]
    );
    return result.insertId;
  },

update: async (id, { id_cliente, estado, observaciones }) => {
  
  const [result] = await db.query(
    `UPDATE pedidos
     SET id_cliente = COALESCE(?, id_cliente),
         estado = COALESCE(?, estado),
         observaciones = COALESCE(?, observaciones)
     WHERE id_pedido = ? AND estado = 'pendiente'`,
    [id_cliente, estado, observaciones, id]
  );
  return result.affectedRows;
},


  delete: async (id) => {
    const detalles = await detalleOrdenModel.getByPedido(id);
for (const detalle of detalles) {
  await db.query(
    'UPDATE inventario SET stock = stock + ? WHERE id_articulo = ?',
    [detalle.cantidad, detalle.id_articulo]
  );
}
  }
};
