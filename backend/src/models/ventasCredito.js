const db = require('../database/db')

module.exports = {

crearVentaCredito: async (data, connection = db) => {
        const executor = connection;
        
      
        const [result] = await executor.query(
            `INSERT INTO ventas_credito (id_orden_venta, id_cliente, monto_total, saldo_pendiente, fecha, estado, observaciones)
             VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
            [
                data.id_orden_venta,
                data.id_cliente,
                data.monto_total,
                data.monto_total, // saldo_pendiente se inicializa con monto_total
                "pendiente", // Estado que ya usas
                data.observaciones || null
            ]
        );
        return result.insertId;
    },

  obtenerVentasCredito: async () => {
    const [rows] = await db.query(`
      SELECT 
        vc.id_venta_credito,
        vc.id_orden_venta,
        vc.id_cliente,
        c.nombre AS cliente_nombre,
        vc.monto_total,
        vc.saldo_pendiente,
        vc.fecha,
        vc.estado,
        vc.observaciones
      FROM ventas_credito vc
      JOIN clientes c ON vc.id_cliente = c.id_cliente
      ORDER BY vc.id_venta_credito DESC
    `);
    return rows;
  },

  obtenerVentaCreditoPorId: async (id) => {
    const [rows] = await db.query(
      `SELECT 
        vc.id_venta_credito,
        vc.id_orden_venta,
        vc.id_cliente,
        c.nombre AS cliente_nombre,
        vc.monto_total,
        vc.saldo_pendiente,
        vc.fecha,
        vc.estado,
        vc.observaciones
       FROM ventas_credito vc
       JOIN clientes c ON vc.id_cliente = c.id_cliente
       WHERE vc.id_venta_credito = ?`,
      [id]
    );
    return rows[0];
  },

};