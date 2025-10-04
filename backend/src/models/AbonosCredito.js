const db = require("../database/db");
const TesoreriaModel = require("../models/tesoreriaModel");

const AbonosCreditoModel = {
  registrarAbono: async (idVentaCredito, data, connection = db) => {
    // connection may be a pool or a connection. If it's a pool we must get a connection from it.
    let conn;
    let releaseConn = false;
    try {
      if (connection && connection.getConnection) {
        // passed a pool-like object
        conn = await connection.getConnection();
        releaseConn = true;
      } else if (connection && connection.beginTransaction) {
        // passed a connection
        conn = connection;
      } else {
        // fallback to default pool
        conn = await db.getConnection();
        releaseConn = true;
      }

      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO abonos_credito (id_venta_credito, fecha, monto, observaciones, id_metodo_pago, referencia)
         VALUES (?, CURDATE(), ?, ?, ?, ?)`,
        [
          idVentaCredito,
          data.monto,
          data.observaciones || null,
          data.id_metodo_pago || null,
          data.referencia || null,
        ]
      );

      const id_abono = result.insertId;

      // Calcular el nuevo saldo de forma segura y evitar marcar 'pagado'
      // si por algún motivo el cálculo produce un valor negativo o por
      // problemas de precisión. Usamos GREATEST(..., 0) y evaluamos el
      // estado en base al nuevo saldo y al monto_total de la venta.
      await conn.query(
        `UPDATE ventas_credito
         SET saldo_pendiente = GREATEST(saldo_pendiente - ?, 0),
             estado = CASE
               WHEN GREATEST(saldo_pendiente - ?, 0) = 0 THEN 'pagado'
               WHEN GREATEST(saldo_pendiente - ?, 0) < monto_total THEN 'parcial'
               ELSE 'pendiente'
             END
         WHERE id_venta_credito = ?`,
        [data.monto, data.monto, data.monto, idVentaCredito]
      );

      await TesoreriaModel.insertarMovimiento(
        {
          id_documento: idVentaCredito,
          tipo_documento: "abono_credito",
          monto: data.monto,
          id_metodo_pago: data.id_metodo_pago,
          referencia: data.referencia || null,
          observaciones: data.observaciones || null,
          fecha_movimiento: new Date(),
        },
        conn
      );

      await conn.commit();
      return id_abono;
    } catch (error) {
      try {
        if (conn && conn.rollback) await conn.rollback();
      } catch (e) {
        // ignore
      }
      throw error;
    } finally {
      try {
        if (releaseConn && conn && conn.release) conn.release();
      } catch (e) {}
    }
  },

  obtenerAbonosPorVenta: async (idVentaCredito) => {
    const [rows] = await db.query(
      `SELECT a.id_abono, a.fecha, a.monto, a.observaciones, a.referencia, a.id_metodo_pago, mp.nombre AS metodo_nombre
       FROM abonos_credito a
       LEFT JOIN metodos_pago mp ON a.id_metodo_pago = mp.id_metodo_pago
       WHERE a.id_venta_credito = ?
       ORDER BY a.fecha DESC`,
      [idVentaCredito]
    );
    return rows;
  },
  obtenerResumenCredito: async (idVentaCredito) => {
    const [rows] = await db.query(
      `SELECT 
          vc.id_venta_credito,
          vc.monto_total,
          vc.saldo_pendiente,
          vc.estado,
          IFNULL(SUM(a.monto), 0) AS total_abonado
       FROM ventas_credito vc
       LEFT JOIN abonos_credito a ON vc.id_venta_credito = a.id_venta_credito
       WHERE vc.id_venta_credito = ?
       GROUP BY vc.id_venta_credito`,
      [idVentaCredito]
    );

    if (rows.length === 0) return null;

    // Obtener los abonos detallados
    const [abonos] = await db.query(
      `SELECT id_abono, fecha, monto, observaciones
       FROM abonos_credito
       WHERE id_venta_credito = ?
       ORDER BY fecha DESC`,
      [idVentaCredito]
    );

    return {
      ...rows[0],
      abonos,
      restante: rows[0].saldo_pendiente,
    };
  },
};

module.exports = AbonosCreditoModel;
