// Actualiza el monto_total y saldo_pendiente de un crédito existente

const db = require("../database/db");

module.exports = {
  actualizarMontoCreditoPorOrden: async (
    id_orden_venta,
    nuevo_monto,
    connection = db
  ) => {
    const executor = connection || db;
    const [result] = await executor.query(
      `UPDATE ventas_credito SET monto_total = ?, saldo_pendiente = ? WHERE id_orden_venta = ?`,
      [nuevo_monto, nuevo_monto, id_orden_venta]
    );
    return result.affectedRows;
  },

  crearVentaCredito: async (data, connection = db) => {
    const executor = connection;

    const [result] = await executor.query(
      `INSERT INTO ventas_credito (id_orden_venta, id_cliente, monto_total, saldo_pendiente, fecha, estado, observaciones)
             VALUES (?, ?, ?, ?, CURDATE(), ?, ?)`,
      [
        data.id_orden_venta,
        data.id_cliente,
        data.monto_total,
        data.monto_total,
        "pendiente",
        data.observaciones || null,
      ]
    );
    return result.insertId;
  },

  getByOrdenVentaId: async (id_orden_venta, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM ventas_credito WHERE id_orden_venta = ?",
      [id_orden_venta]
    );
    return rows[0] || null;
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
