const db = require("../database/db");

module.exports = {
  getAll: async (estados = ["pendiente", "completada"]) => {
    const placeholders = estados.map(() => "?").join(",");

    const [rows] = await db.query(
      `
    SELECT 
      ov.id_orden_venta, 
      vc.id_venta_credito,
      ov.fecha, 
      ov.id_cliente, 
      c.nombre AS cliente_nombre, 
      ov.estado,
      mp.nombre AS metodo_pago,
      vc.estado AS estado_credito,
      vc.saldo_pendiente,
      SUM(dov.cantidad * dov.precio_unitario) AS monto_total
    FROM ordenes_venta ov
    JOIN clientes c 
      ON ov.id_cliente = c.id_cliente
    
  
    LEFT JOIN movimientos_tesoreria mt 
      ON mt.id_documento = ov.id_orden_venta 
     AND mt.tipo_documento = 'orden_venta'
    
    -- Desde el movimiento sacamos el método de pago
    LEFT JOIN metodos_pago mp 
      ON mt.id_metodo_pago = mp.id_metodo_pago
    
    -- Si es crédito, mostramos estado y saldo
    LEFT JOIN ventas_credito vc 
      ON ov.id_orden_venta = vc.id_orden_venta
    
    LEFT JOIN detalle_orden_venta dov 
      ON ov.id_orden_venta = dov.id_orden_venta
    
    WHERE ov.estado IN (${placeholders})
    GROUP BY 
      ov.id_orden_venta,
      vc.id_venta_credito,
      ov.fecha,
      ov.id_cliente,
      c.nombre,
      ov.estado,
      mp.nombre,
      vc.estado,
      vc.saldo_pendiente
    ORDER BY ov.id_orden_venta DESC;
  `,
      estados
    );

    return rows;
  },

  getArticulosConStock: async () => {
    const [rows] = await db.query(
      `SELECT
         a.id_articulo,
         a.descripcion,
         a.precio_venta,
         i.stock
       FROM articulos AS a
       JOIN inventario AS i ON a.id_articulo = i.id_articulo
       WHERE i.stock > 0
       ORDER BY a.descripcion ASC`
    );
    return rows;
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM ordenes_venta WHERE id_orden_venta = ?",
      [id]
    );
    return rows[0];
  },

  create: async (
    { id_cliente, estado, fecha, monto, total } = {},
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      `INSERT INTO ordenes_venta (id_cliente, estado, fecha, monto, total)
       VALUES (?, ?, ?, ?, ?)`,
      [id_cliente, estado, fecha, monto, total]
    );
    return result.insertId;
  },

  update: async (id, { id_cliente, estado }, connection = db) => {
    const [result] = await (connection || db).query(
      `UPDATE ordenes_venta
       SET id_cliente = COALESCE(?, id_cliente), estado = COALESCE(?, estado)
       WHERE id_orden_venta = ? AND estado = 'pendiente'`,
      [id_cliente, estado, id]
    );
    return result.affectedRows;
  },

  delete: async (id, connection = db) => {
    await (connection || db).query(
      "DELETE FROM detalle_orden_venta WHERE id_orden_venta = ?",
      [id]
    );

    const [result] = await (connection || db).query(
      "DELETE FROM ordenes_venta WHERE id_orden_venta = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};
