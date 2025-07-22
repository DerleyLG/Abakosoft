const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
    SELECT 
      l.id_lote,
      l.id_orden_fabricacion,
      a.descripcion AS descripcion_articulo,
      t.nombre AS nombre_trabajador,
      l.cantidad,
      l.fecha,
      l.observaciones,
      c.nombre AS nombre_cliente
    FROM lotes_fabricados l
    INNER JOIN articulos a ON l.id_articulo = a.id_articulo
    INNER JOIN trabajadores t ON l.id_trabajador = t.id_trabajador
    INNER JOIN ordenes_fabricacion ofa ON l.id_orden_fabricacion = ofa.id_orden_fabricacion
    LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY l.fecha DESC
  `);
    return rows;
  },

 getById: async (id) => {
  const [rows] = await db.query(`
SELECT * FROM lotes_fabricados WHERE id_orden = ?
  `, [id_pago]);
  return rows;
},

createLote: async ({ id_orden_fabricacion, id_articulo, id_trabajador, cantidad, observaciones }) => {
    const [result] = await db.query(
      `INSERT INTO lotes_fabricados 
       (id_orden_fabricacion, id_articulo, id_trabajador, cantidad, observaciones)
       VALUES (?, ?, ?, ?, ?)`,
      [id_orden_fabricacion, id_articulo, id_trabajador, cantidad, observaciones || null]
    );
    return result.insertId;
  },

 eliminar: async (id_lote) => {  
  const [result] = await db.query('DELETE FROM lotes_fabricados WHERE id_lote = ?', [id_lote]);
    return result.affectedRows > 0;
},

 deleteByOrdenId: async (idOrden) => {
    await db.query(
      `DELETE FROM lotes_fabricados WHERE id_orden_fabricacion = ?`,
      [idOrden]
    );
  },
};