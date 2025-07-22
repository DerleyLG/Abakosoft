// src/models/pagosTrabajadoresModel.js
const db = require('../database/db');

module.exports = {
  // Obtener todos los pagos
getAll: async () => {
  const [rows] = await db.query(`
    SELECT 
      p.id_pago,
      p.id_trabajador,
      t.nombre AS trabajador,
      p.fecha_pago,
      p.monto_total as total,
      p.observaciones
    FROM pagos_trabajadores p
    JOIN trabajadores t ON p.id_trabajador = t.id_trabajador
    LEFT JOIN detalle_pago_trabajador d ON p.id_pago = d.id_pago
    GROUP BY p.id_pago
    ORDER BY p.fecha_pago DESC
  `);

  return rows;
},



  // Obtener un pago por ID
  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
         p.id_pago,
         p.id_trabajador,
         t.nombre AS trabajador,
         p.monto_total,
         p.fecha_pago,
         p.observaciones
       FROM pagos_trabajadores p
       JOIN trabajadores t ON p.id_trabajador = t.id_trabajador
       WHERE p.id_pago = ?`,
      [id]
    );
    return rows[0];
  },

  // Crear un nuevo pago
  create: async ({ id_trabajador, monto_total, observaciones }) => {
    const [result] = await db.query(
      `INSERT INTO pagos_trabajadores
         (id_trabajador, monto_total, observaciones)
       VALUES (?, ?, ?)`,
      [id_trabajador, monto_total,  observaciones]
    );
    return result.insertId;
  },

calcularMonto: async (id_pago) => {
  const [result] = await db.query(
    `SELECT SUM(subtotal) AS total
     FROM detalle_pago_trabajador
     WHERE id_pago = ?`,
    [id_pago]
  );

  const total = result[0]?.total || 0;

  await db.query(
    `UPDATE pagos_trabajadores SET monto_total = ? WHERE id_pago = ?`,
    [total, id_pago]
  );
},


  // Actualizar un pago existente
  update: async (id, { id_trabajador, monto_total,  observaciones }) => {
    await db.query(
      `UPDATE pagos_trabajadores
       SET id_trabajador = ? , monto_total = ?,  observaciones = ?
       WHERE id_pago = ?`,
      [id_trabajador, monto_total,  observaciones, id]
    );
  },
 updateMontoTotal: async (id_pago, monto_total) => {
  await db.query(
    `UPDATE pagos_trabajadores SET monto_total = ? WHERE id_pago = ?`,
    [monto_total, id_pago]
  );
},

  // Eliminar un pago
  delete: async (id) => {
    await db.query(
      `DELETE FROM pagos_trabajadores WHERE id_pago = ?`,
      [id]
    );
  }
};
