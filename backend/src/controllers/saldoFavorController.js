const db = require("../database/db");
const Cliente = require("../models/clientesModel");
const tesoreriaModel = require("../models/tesoreriaModel");

module.exports = {
  // Obtener saldo a favor de un cliente
  getSaldoFavor: async (req, res) => {
    try {
      const saldo = await Cliente.getSaldoFavor(req.params.id);
      return res.json({ saldo_favor: saldo });
    } catch (error) {
      console.error("Error al obtener saldo a favor:", error);
      return res.status(500).json({ error: "Error al obtener saldo a favor." });
    }
  },

  // Registrar un abono a saldo a favor (el cliente deposita dinero)
  abonarSaldoFavor: async (req, res) => {
    let connection;
    try {
      const {
        monto,
        id_metodo_pago,
        referencia = null,
        observaciones = null,
      } = req.body;
      const id_cliente = req.params.id;

      if (!monto || monto <= 0) {
        return res
          .status(400)
          .json({ error: "El monto debe ser mayor a cero." });
      }
      if (!id_metodo_pago) {
        return res
          .status(400)
          .json({ error: "Debe indicar el método de pago." });
      }

      const cliente = await Cliente.getById(id_cliente);
      if (!cliente) {
        return res.status(404).json({ error: "Cliente no encontrado." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Incrementar saldo a favor del cliente
      await Cliente.incrementarSaldoFavor(id_cliente, monto, connection);

      // Registrar movimiento en tesorería (ingreso)
      await tesoreriaModel.insertarMovimiento(
        {
          id_documento: id_cliente,
          tipo_documento: "saldo_favor",
          monto: Math.abs(monto),
          id_metodo_pago,
          referencia,
          observaciones:
            observaciones || `Abono a saldo a favor - ${cliente.nombre}`,
        },
        connection,
      );

      await connection.commit();
      connection.release();

      const nuevoSaldo = await Cliente.getSaldoFavor(id_cliente);

      return res.json({
        success: true,
        message: "Saldo a favor registrado correctamente.",
        saldo_favor: nuevoSaldo,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al abonar saldo a favor:", error);
      return res
        .status(500)
        .json({ error: error.message || "No fue posible registrar el saldo." });
    }
  },

  // Usar saldo a favor en una venta
  usarSaldoFavor: async (req, res) => {
    let connection;
    try {
      const { monto, id_metodo_pago, referencia = null } = req.body;
      const id_cliente = req.params.id;

      if (!monto || monto <= 0) {
        return res
          .status(400)
          .json({ error: "El monto debe ser mayor a cero." });
      }

      const saldoActual = await Cliente.getSaldoFavor(id_cliente);
      if (saldoActual < monto) {
        return res.status(400).json({
          error: `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString()}`,
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      await Cliente.decrementarSaldoFavor(id_cliente, monto, connection);

      await tesoreriaModel.insertarMovimiento(
        {
          id_documento: id_cliente,
          tipo_documento: "saldo_favor_usado",
          monto: -Math.abs(monto),
          id_metodo_pago,
          referencia,
          observaciones: `Uso de saldo a favor - Cliente #${id_cliente}`,
        },
        connection,
      );

      await connection.commit();
      connection.release();

      const nuevoSaldo = await Cliente.getSaldoFavor(id_cliente);

      return res.json({
        success: true,
        message: "Saldo a favor aplicado correctamente.",
        saldo_favor: nuevoSaldo,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al usar saldo a favor:", error);
      return res
        .status(500)
        .json({ error: error.message || "No fue posible usar el saldo." });
    }
  },

  // Obtener el total acumulado de saldo a favor de todos los clientes
  getTotalSaldo: async (req, res) => {
    try {
      const total = await Cliente.getTotalSaldoFavor();
      return res.json({ total_saldo_favor: total });
    } catch (error) {
      console.error("Error al obtener total saldo a favor:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener total saldo a favor." });
    }
  },

  // Obtener historial de movimientos de saldo a favor de un cliente
  getHistorial: async (req, res) => {
    try {
      const { id } = req.params;
      const { desde, hasta } = req.query;

      let sql = `
        SELECT * FROM (
          -- Movimientos de tesorería (abonos desde drawer y usos en ventas)
          SELECT
            CONCAT('MT-', mt.id_movimiento) AS id_unico,
            CASE
              WHEN mt.tipo_documento = 'saldo_favor' THEN 'abono'
              WHEN mt.tipo_documento = 'saldo_favor_usado' THEN 'usado'
            END AS tipo,
            mt.monto,
            DATE_FORMAT(mt.fecha_movimiento, '%Y-%m-%d') AS fecha,
            mt.referencia,
            mt.observaciones,
            mp.nombre AS metodo_pago
          FROM movimientos_tesoreria mt
          LEFT JOIN metodos_pago mp ON mt.id_metodo_pago = mp.id_metodo_pago
          WHERE mt.tipo_documento IN ('saldo_favor', 'saldo_favor_usado')
            AND (
              mt.id_documento = ?
              OR (
                mt.tipo_documento = 'saldo_favor_usado'
                AND mt.id_documento IN (
                  SELECT id_orden_venta FROM ordenes_venta WHERE id_cliente = ?
                )
              )
            )

          UNION ALL

          -- Devoluciones como saldo a favor (no tienen movimiento en tesorería)
          SELECT
            CONCAT('DV-', dv.id_devolucion_venta) AS id_unico,
            'abono' AS tipo,
            dv.total AS monto,
            DATE_FORMAT(dv.fecha, '%Y-%m-%d') AS fecha,
            CONCAT('DV-', dv.id_devolucion_venta) AS referencia,
            CONCAT('Saldo a favor por devolución de venta #', dv.id_orden_venta) AS observaciones,
            NULL AS metodo_pago
          FROM devoluciones_venta dv
          WHERE dv.id_cliente = ?
            AND dv.monto > 0
            AND dv.estado <> 'anulada'
            AND NOT EXISTS (
              SELECT 1 FROM movimientos_tesoreria mt2
              WHERE mt2.id_documento = dv.id_devolucion_venta
                AND mt2.tipo_documento = 'devolucion_cliente'
            )
        ) AS historial
      `;
      const params = [id, id, id];

      if (desde) {
        sql += ` WHERE historial.fecha >= ?`;
        params.push(desde);
      } else {
        sql += ` WHERE 1=1`;
      }

      if (hasta) {
        sql += ` AND historial.fecha <= ?`;
        params.push(hasta);
      }

      sql += ` ORDER BY historial.fecha DESC, historial.id_unico DESC`;

      const [rows] = await db.query(sql, params);

      const saldoActual = await Cliente.getSaldoFavor(id);

      return res.json({
        movimientos: rows,
        saldo_actual: saldoActual,
      });
    } catch (error) {
      console.error("Error al obtener historial de saldo a favor:", error);
      return res
        .status(500)
        .json({ error: "Error al obtener el historial." });
    }
  },
};
