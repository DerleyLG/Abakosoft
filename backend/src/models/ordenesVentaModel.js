const db = require('../database/db');


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
      GROUP BY ov.id_orden_venta
      ORDER BY ov.fecha DESC; -- Añadido para un ordenamiento consistente
    `, estados);
    return rows;
  },
  
getArticulosConStock: async () => {
    const [rows] = await db.query(
      `SELECT
         a.id_articulo,
         a.descripcion,
         i.stock
       FROM articulos AS a
       JOIN inventario AS i ON a.id_articulo = i.id_articulo
       WHERE i.stock > 0
       ORDER BY a.descripcion ASC`
    );
    return rows;
  },

  // MODIFICADO: Acepta 'connection' opcional
  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query('SELECT * FROM ordenes_venta WHERE id_orden_venta = ?', [id]);
    return rows[0];
  },

  // MODIFICADO: Acepta 'connection' opcional
  create: async ({ id_cliente, estado, fecha }, connection = db) => { // Añadido 'fecha' como parámetro
    const [result] = await (connection || db).query(
      `INSERT INTO ordenes_venta (id_cliente, estado, fecha)
       VALUES (?, ?, ?)`,
      [id_cliente, estado, fecha] // Se usa la fecha proporcionada
    );
    return result.insertId;
  },

  // MODIFICADO: Acepta 'connection' opcional
  update: async (id, { id_cliente, estado }, connection = db) => {
    // Actualizar solo si la orden está pendiente
    const [result] = await (connection || db).query(
      `UPDATE ordenes_venta
       SET id_cliente = COALESCE(?, id_cliente), estado = COALESCE(?, estado)
       WHERE id_orden_venta = ? AND estado = 'pendiente'`, // Solo se actualiza si está pendiente
      [id_cliente, estado, id]
    );
    return result.affectedRows;
  },

  // MODIFICADO: Acepta 'connection' opcional y delega la lógica de inventario al controlador
  // Este 'delete' en el modelo ya no manipula el inventario directamente.
  // Su propósito principal es eliminar los detalles y la orden en caso de un rollback completo.
  // La lógica de "devolver stock" se manejará en el controlador al anular/eliminar.
  delete: async (id, connection = db) => {
    // Eliminar los detalles de la orden de venta
    await (connection || db).query('DELETE FROM detalle_orden_venta WHERE id_orden_venta = ?', [id]);
    // Eliminar la orden de venta
    const [result] = await (connection || db).query('DELETE FROM ordenes_venta WHERE id_orden_venta = ?', [id]);
    return result.affectedRows > 0;
  }
};
