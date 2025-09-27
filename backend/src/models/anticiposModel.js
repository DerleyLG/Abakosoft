
const db = require('../database/db');

module.exports = {

    getAll: async () => {
  const [rows] = await db.query(`
    SELECT 
      a.id_anticipo,
      a.id_trabajador,
      t.nombre AS trabajador,
      a.id_orden_fabricacion,
      c.nombre AS cliente,
      a.fecha,
      a.monto,
      a.monto_usado,
      a.estado,
      a.observaciones
    FROM anticipos_trabajadores a
    JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
    JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion

    LEFT JOIN pedidos p ON o.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY a.fecha DESC
  `);

  return rows;
},


  crear: async ({ id_trabajador, fecha, id_orden_fabricacion, monto, observaciones }) => {
    const [result] = await db.query(
      `INSERT INTO anticipos_trabajadores
      (id_trabajador,  id_orden_fabricacion,fecha, monto,  observaciones)
      VALUES (?, ?, ?, ?, ?)`,
      [id_trabajador, id_orden_fabricacion,fecha, monto, observaciones]
    );
    return result.insertId;
  },


  getActivo: async (id_trabajador, id_orden_fabricacion) => {
    const [rows] = await db.query(
      `SELECT * FROM anticipos_trabajadores
       WHERE id_trabajador = ? AND id_orden_fabricacion = ? AND estado != 'saldado'
       LIMIT 1`,
      [id_trabajador, id_orden_fabricacion]
    );
    return rows[0];
  },

 
  descontar: async (id_anticipo, montoAplicado) => {
    // Obtener anticipo actual
    const [rows] = await db.query(
      `SELECT monto, monto_usado FROM anticipos_trabajadores WHERE id_anticipo = ?`,
      [id_anticipo]
    );
    const anticipo = rows[0];
    const nuevoMontoUsado = Number(anticipo.monto_usado) + Number(montoAplicado);

    let nuevoEstado = 'parcial';
    if (nuevoMontoUsado >= Number(anticipo.monto)) {
      nuevoEstado = 'saldado';
    }

    await db.query(
      `UPDATE anticipos_trabajadores
       SET monto_usado = ?, estado = ?
       WHERE id_anticipo = ?`,
      [nuevoMontoUsado, nuevoEstado, id_anticipo]
    );
  }
};
