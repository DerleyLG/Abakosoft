const db = require('../database/db');


module.exports = {

  getAll: async (estadosToFilter = ['pendiente', 'completada']) => { 
    const placeholders = estadosToFilter.map(() => '?').join(',');
    const [rows] = await db.query(`
      SELECT oc.id_orden_compra, oc.fecha, oc.id_proveedor, p.nombre AS proveedor_nombre,
             oc.categoria_costo, oc.id_orden_fabricacion, oc.estado,
             SUM(doc.cantidad * doc.precio_unitario) AS monto_total
      FROM ordenes_compra oc
      JOIN proveedores p ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
      WHERE oc.estado IN (${placeholders})
      GROUP BY oc.id_orden_compra
      ORDER BY oc.fecha DESC;
    `, estadosToFilter); 
    return rows;
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query('SELECT * FROM ordenes_compra WHERE id_orden_compra = ?', [id]);
    return rows[0];
  },

  create: async (id_proveedor, categoria_costo, id_orden_fabricacion, estado, connection = db) => {
    const [result] = await (connection || db).query(
      `INSERT INTO ordenes_compra (id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_proveedor, categoria_costo, id_orden_fabricacion, estado]
    );
    return result.insertId;
  },

 update: async (id, { id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha }, connection = db) => {
  const [result] = await (connection || db).query(
   `UPDATE ordenes_compra
   SET id_proveedor = COALESCE(?, id_proveedor),
     categoria_costo = COALESCE(?, categoria_costo),
     id_orden_fabricacion = COALESCE(?, id_orden_fabricacion),
     estado = COALESCE(?, estado),
     fecha = COALESCE(?, fecha) 
   WHERE id_orden_compra = ?`,
   [id_proveedor, categoria_costo, id_orden_fabricacion, estado, fecha, id]
  );
  return result.affectedRows;
 },
  delete: async (id_orden_compra, connection = db) => {
    const [result] = await (connection || db).query('DELETE FROM ordenes_compra WHERE id_orden_compra = ?', [id_orden_compra]);
    return result.affectedRows > 0;
  }
};
