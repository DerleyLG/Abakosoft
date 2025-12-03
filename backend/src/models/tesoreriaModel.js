const db = require("../database/db");

// models/TesoreriaModel.js

function getTodayYMDForTZ(timeZone) {
  const tz =
    timeZone || process.env.APP_TZ || process.env.TZ || "America/Bogota";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value || "1970";
  const m = parts.find((p) => p.type === "month")?.value || "01";
  const d = parts.find((p) => p.type === "day")?.value || "01";
  return `${y}-${m}-${d}`;
}

const TesoreriaModel = {
  deleteByDocumentoAndTipo: async (
    id_documento,
    tipo_documento,
    connection = db
  ) => {
    const conn = connection || db;
    const [result] = await conn.query(
      "DELETE FROM movimientos_tesoreria WHERE id_documento = ? AND tipo_documento = ?",
      [id_documento, tipo_documento]
    );
    return result.affectedRows;
  },

  getMetodosPago: async () => {
    const [rows] = await db.query("SELECT * FROM metodos_pago");
    return rows;
  },

  getMovimientosTesoreria: async (tipo_documento = null) => {
    let query = `SELECT id_movimiento, id_documento, tipo_documento, fecha_movimiento, monto, id_metodo_pago, referencia, observaciones FROM movimientos_tesoreria`;
    let params = [];
    if (tipo_documento) {
      query += ` WHERE tipo_documento = ?`;
      params.push(tipo_documento);
    }
    query += ` ORDER BY fecha_movimiento DESC, id_movimiento DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  },

  getByDocumentoIdAndTipo: async (idDocumento, tipoDocumento) => {
    if (!idDocumento || !tipoDocumento) {
      throw new Error("Se requiere idDocumento y tipoDocumento.");
    }

    const query = `
    SELECT 
      id_movimiento, 
      id_documento, 
      tipo_documento, 
      DATE(fecha_movimiento) AS fecha_movimiento, 
      monto, 
      id_metodo_pago, 
      referencia, 
      observaciones 
    FROM movimientos_tesoreria 
        WHERE id_documento = ? 
        AND tipo_documento = ?
        LIMIT 1
    `;

    const [rows] = await db.query(query, [idDocumento, tipoDocumento]);

    return rows.length > 0 ? rows[0] : null;
  },
  insertarMovimiento: async (movimientoData, connection = db) => {
    const conn = connection || db;
    const {
      id_documento = null,
      tipo_documento,
      monto,
      id_metodo_pago,
      referencia = null,
      observaciones = null,
      fecha_movimiento = null,
    } = movimientoData;
    if (!tipo_documento) {
      throw new Error(
        "El tipo_documento es obligatorio para registrar un movimiento de tesorería."
      );
    }

    const query = `
      INSERT INTO movimientos_tesoreria (
        id_documento,
        tipo_documento,
        fecha_movimiento,
        monto,
        id_metodo_pago,
        referencia,
        observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?) `;

    // Normalizamos fecha_movimiento: si no viene, y es una venta (orden_venta/venta), tomamos la fecha de la OV asociada
    // Determinar fecha final del movimiento
    let fechaFinal = fecha_movimiento;
    // Si viene string con hora, quedarnos con YYYY-MM-DD
    if (typeof fechaFinal === "string") {
      const m = fechaFinal.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) {
        fechaFinal = m[1];
      }
    }
    if (!fechaFinal) {
      // Por defecto: hoy según TZ definida (no UTC) para todos los movimientos
      fechaFinal = getTodayYMDForTZ();
    }

    const [result] = await conn.query(query, [
      id_documento,
      tipo_documento,
      fechaFinal,
      monto,
      id_metodo_pago,
      referencia,
      observaciones,
    ]);

    return result.insertId;
  },

  getIngresosSummary: async (connection = db) => {
    const [totalMesResult] = await connection.query(`
      SELECT SUM(mt.monto) AS total
      FROM movimientos_tesoreria mt
      JOIN ordenes_venta ov ON mt.id_documento = ov.id_orden_venta
      WHERE mt.fecha_movimiento >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND mt.fecha_movimiento <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%'
        AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada')
    `);

    const [ventasMensualResult] = await connection.query(`
      SELECT COUNT(*) AS total
      FROM movimientos_tesoreria mt
      JOIN ordenes_venta ov ON mt.id_documento = ov.id_orden_venta
      WHERE mt.fecha_movimiento >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND mt.fecha_movimiento <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%'
        AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada')
    `);

    const totalMes = totalMesResult[0].total || 0;
    const ventasMensual = ventasMensualResult[0].total || 0;

    return {
      totalMes: totalMes,
      ventasMensual: ventasMensual,
    };
  },

  getEgresosSummary: async () => {
    try {
      const [pagosTrabajadores] = await db.query(`
        SELECT SUM(monto_total) AS totalPagosTrabajadores
        FROM pagos_trabajadores
        WHERE DATE_FORMAT(fecha_pago, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [ordenesCompra] = await db.query(`
        SELECT SUM(doc.cantidad * doc.precio_unitario) AS totalOrdenesCompra
        FROM detalle_orden_compra doc
        JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
        WHERE DATE_FORMAT(oc.fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [costosIndirectos] = await db.query(`
        SELECT SUM(valor) AS totalCostos
        FROM costos_indirectos
        WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [comprasMateriaPrima] = await db.query(`
        SELECT SUM(cantidad * precio_unitario) AS totalMateriaPrima
        FROM compras_materia_prima
        WHERE DATE_FORMAT(fecha_compra, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const summary = {
        totalPagosTrabajadores: Number(
          pagosTrabajadores[0].totalPagosTrabajadores || 0
        ),
        totalOrdenesCompra: Number(ordenesCompra[0].totalOrdenesCompra || 0),
        totalCostos: Number(costosIndirectos[0].totalCostos || 0),
        totalMateriaPrima: Number(
          comprasMateriaPrima[0].totalMateriaPrima || 0
        ),
      };

      summary.totalEgresos =
        summary.totalPagosTrabajadores +
        summary.totalOrdenesCompra +
        summary.totalCostos +
        summary.totalMateriaPrima;

      return summary;
    } catch (error) {
      console.error("Error fetching egresos summary:", error);
      throw error;
    }
  },

  actualizarMovimiento: async (
    id_movimiento,
    movimientoData,
    connection = db
  ) => {
    const conn = connection || db;
    const {
      id_documento,
      tipo_documento,
      monto,
      id_metodo_pago,
      referencia,
      observaciones,
      fecha_movimiento,
    } = movimientoData;

    const query = `
            UPDATE movimientos_tesoreria
            SET id_documento = COALESCE(?, id_documento),
                tipo_documento = COALESCE(?, tipo_documento),
                fecha_movimiento = COALESCE(?, fecha_movimiento),
                monto = COALESCE(?, monto),
                id_metodo_pago = COALESCE(?, id_metodo_pago),
                referencia = COALESCE(?, referencia),
                observaciones = COALESCE(?, observaciones)
            WHERE id_movimiento = ?`;

    const [result] = await conn.query(query, [
      id_documento,
      tipo_documento,
      fecha_movimiento,
      monto,
      id_metodo_pago,
      referencia,
      observaciones,
      id_movimiento,
    ]);

    return result.affectedRows;
  },

  updateOrCreateMovimiento: async (movimientoData, connection = db) => {
    const conn = connection || db;
    const { id_documento, tipo_documento, monto } = movimientoData;

    if (!id_documento || !tipo_documento) {
      throw new Error(
        "Se requiere id_documento y tipo_documento para buscar el movimiento asociado."
      );
    }

    const [existingRows] = await conn.query(
      "SELECT id_movimiento FROM movimientos_tesoreria WHERE id_documento = ? AND tipo_documento = ?",
      [id_documento, tipo_documento]
    );

    if (existingRows.length > 0) {
      const id_movimiento = existingRows[0].id_movimiento;

      const updatedData = { ...movimientoData };

      if (typeof monto === "undefined" || monto === null) {
        throw new Error(
          "El monto es obligatorio para actualizar el movimiento."
        );
      }

      const affected = await TesoreriaModel.actualizarMovimiento(
        id_movimiento,
        updatedData,
        conn
      );
      return id_movimiento;
    } else {
      // 3. Si no existe, lo insertamos
      return await TesoreriaModel.insertarMovimiento(movimientoData, conn);
    }
  },

  getPagosTrabajadoresCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM pagos_trabajadores
      WHERE DATE_FORMAT(fecha_pago, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getOrdenesCompraCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM ordenes_compra
      WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getCostosIndirectosCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM costos_indirectos
      WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getMateriaPrimaCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM compras_materia_prima
      WHERE DATE_FORMAT(fecha_compra, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  async getVentasCobrosReport({ desde, hasta, id_cliente, estado_pago }) {
    const paramsOV = [];
    const whereOV = ["1=1"]; // filtros sobre OV

    if (desde) {
      whereOV.push("ov.fecha >= ?");
      paramsOV.push(desde);
    }
    if (hasta) {
      whereOV.push("ov.fecha <= ?");
      paramsOV.push(hasta);
    }
    if (id_cliente) {
      whereOV.push("ov.id_cliente = ?");
      paramsOV.push(id_cliente);
    }

    const paramsCR = [];
    const whereCR = ["vc.id_orden_venta IS NULL"]; // solo créditos manuales
    if (desde) {
      whereCR.push("vc.fecha >= ?");
      paramsCR.push(desde);
    }
    if (hasta) {
      whereCR.push("vc.fecha <= ?");
      paramsCR.push(hasta);
    }
    if (id_cliente) {
      whereCR.push("vc.id_cliente = ?");
      paramsCR.push(id_cliente);
    }

    const sql = `
      /* Documentos basados en OV */
      SELECT 
        ov.id_orden_venta,
        CONCAT('OV #', ov.id_orden_venta) AS documento,
        MAX(ov.fecha) AS fecha,
        MAX(c.nombre) AS cliente,
        COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) AS total_factura,
        COALESCE(MAX(pd.total_pagado), 0) + COALESCE(MAX(ab.total_abonos), 0) AS total_pagado,
        GREATEST(
          COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) - (COALESCE(MAX(pd.total_pagado), 0) + COALESCE(MAX(ab.total_abonos), 0)),
          0
        ) AS saldo,
        TRIM(BOTH ', ' FROM CONCAT_WS(
          ', ',
          MAX(pd.formas_pago),
          MAX(ab.formas_pago),
          CASE WHEN MAX(CASE WHEN vc.id_venta_credito IS NULL THEN 0 ELSE 1 END) = 1 THEN 'Crédito' ELSE NULL END
        )) AS formas_pago,
        CASE 
          WHEN GREATEST(
                 COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) - (COALESCE(MAX(pd.total_pagado), 0) + COALESCE(MAX(ab.total_abonos), 0)),
                 0
               ) <= 0 THEN 'saldado'
          ELSE 'pendiente'
        END AS estado_pago
      FROM ordenes_venta ov
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
      LEFT JOIN ventas_credito vc ON vc.id_orden_venta = ov.id_orden_venta
      LEFT JOIN (
        SELECT 
          mt.id_documento AS id_orden_venta,
          SUM(mt.monto) AS total_pagado,
          GROUP_CONCAT(DISTINCT mp.nombre ORDER BY mp.nombre SEPARATOR ', ') AS formas_pago
        FROM movimientos_tesoreria mt
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = mt.id_metodo_pago
        WHERE mt.tipo_documento = 'orden_venta'
        GROUP BY mt.id_documento
      ) pd ON pd.id_orden_venta = ov.id_orden_venta
      LEFT JOIN (
        SELECT 
          vc2.id_orden_venta,
          SUM(mt2.monto) AS total_abonos,
          GROUP_CONCAT(DISTINCT mp2.nombre ORDER BY mp2.nombre SEPARATOR ', ') AS formas_pago
        FROM ventas_credito vc2
        LEFT JOIN movimientos_tesoreria mt2 
          ON mt2.id_documento = vc2.id_venta_credito AND mt2.tipo_documento = 'abono_credito'
        LEFT JOIN metodos_pago mp2 ON mp2.id_metodo_pago = mt2.id_metodo_pago
        GROUP BY vc2.id_orden_venta
      ) ab ON ab.id_orden_venta = ov.id_orden_venta
      WHERE ${whereOV.join(" AND ")}
      GROUP BY ov.id_orden_venta

      UNION ALL

      /* Créditos manuales (sin OV) */
      SELECT 
        NULL AS id_orden_venta,
        CONCAT('CR #', vc.id_venta_credito) AS documento,
        MAX(vc.fecha) AS fecha,
        MAX(c.nombre) AS cliente,
        MAX(vc.monto_total) AS total_factura,
        COALESCE(MAX(ac.total_abonos), 0) AS total_pagado,
        GREATEST(MAX(vc.monto_total) - COALESCE(MAX(ac.total_abonos), 0), 0) AS saldo,
        MAX(ac.formas_pago) AS formas_pago,
        CASE 
          WHEN GREATEST(MAX(vc.monto_total) - COALESCE(MAX(ac.total_abonos), 0), 0) <= 0 THEN 'saldado'
          ELSE 'pendiente'
        END AS estado_pago
      FROM ventas_credito vc
      JOIN clientes c ON vc.id_cliente = c.id_cliente
      LEFT JOIN (
        SELECT 
          mt.id_documento AS id_venta_credito,
          SUM(mt.monto) AS total_abonos,
          GROUP_CONCAT(DISTINCT mp.nombre ORDER BY mp.nombre SEPARATOR ', ') AS formas_pago
        FROM movimientos_tesoreria mt
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = mt.id_metodo_pago
        WHERE mt.tipo_documento = 'abono_credito'
        GROUP BY mt.id_documento
      ) ac ON ac.id_venta_credito = vc.id_venta_credito
      WHERE ${whereCR.join(" AND ")}
      GROUP BY vc.id_venta_credito

      ORDER BY fecha DESC`;

    const [rows] = await db.query(sql, [...paramsOV, ...paramsCR]);

    // filtrar por estado_pago en HAVING equivalente (post-procesado para simplicidad)
    if (
      estado_pago &&
      ["pendiente", "saldado"].includes(String(estado_pago).toLowerCase())
    ) {
      return rows.filter(
        (r) =>
          String(r.estado_pago).toLowerCase() ===
          String(estado_pago).toLowerCase()
      );
    }
    return rows;
  },
};

module.exports = TesoreriaModel;
