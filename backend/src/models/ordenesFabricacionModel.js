const db = require('../database/db');

module.exports = {
getAll: async (estados = ['pendiente', 'en proceso', 'completada']) => {
  const placeholders = estados.map(() => '?').join(',');
  console.log("Estados recibidos:", estados);

  const [rows] = await db.query(`
    SELECT 
      ofab.*, 
      p.id_pedido, 
      cli.nombre AS nombre_cliente
    FROM ordenes_fabricacion ofab
    LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
    LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
    WHERE ofab.estado IN (${placeholders})
    ORDER BY ofab.id_orden_fabricacion DESC;
  `, estados);
  return rows;
},


getById: async (id) => {
    const [rows] = await db.query(`
     SELECT 
      ofab.*, 
      p.id_pedido, 
      cli.nombre AS nombre_cliente
    FROM ordenes_fabricacion ofab
    LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
    LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
      WHERE ofab.id_orden_fabricacion = ?
    `, [id]);

    return rows[0] || null;
  },

  create: async ({ id_orden_venta, fecha_inicio, fecha_fin_estimada , estado, id_pedido }) => {
    const [result] = await db.query(
      `INSERT INTO ordenes_fabricacion (id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido)
       VALUES (?, ?, ?, ?,?)`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido]
    );
    return result.insertId;
  },

  update: async (id, { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado  }) => {
    await db.query(
      `UPDATE ordenes_fabricacion 
       SET id_orden_venta = ?, fecha_inicio = ?, fecha_fin_estimada = ?, estado = ? 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id]
    );
  },

  delete: async (id) => {
  const query = `
    UPDATE ordenes_fabricacion 
    SET estado = 'cancelada' 
    WHERE id_orden_fabricacion = ?
  `;
  await db.query(query, [id]);
}
};
