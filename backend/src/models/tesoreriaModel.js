const db = require("../database/db");

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
    connection = db,
  ) => {
    const conn = connection || db;
    const [result] = await conn.query(
      "DELETE FROM movimientos_tesoreria WHERE id_documento = ? AND tipo_documento = ?",
      [id_documento, tipo_documento],
    );
    return result.affectedRows;
  },

  // Actualiza el monto de un movimiento de tesorería por documento y tipo
  actualizarMovimientoPorDocumento: async (
    { id_documento, tipo_documento, monto, id_metodo_pago, referencia },
    connection = db,
  ) => {
    const conn = connection || db;
    const sets = ["monto = ?"];
    const params = [monto];
    if (id_metodo_pago !== undefined) {
      sets.push("id_metodo_pago = ?");
      params.push(id_metodo_pago || null);
    }
    if (referencia !== undefined) {
      sets.push("referencia = ?");
      params.push(referencia || null);
    }
    params.push(id_documento, tipo_documento);
    const [result] = await conn.query(
      `UPDATE movimientos_tesoreria
       SET ${sets.join(", ")}
       WHERE id_documento = ? AND tipo_documento = ?`,
      params,
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

  getByDocumentoIdAndTipo: async (
    idDocumento,
    tipoDocumento,
    connection = null,
  ) => {
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

    const dbConn = connection || db;
    const [rows] = await dbConn.query(query, [idDocumento, tipoDocumento]);

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
        "El tipo_documento es obligatorio para registrar un movimiento de tesorería.",
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
    let fechaFinal = fecha_movimiento;
    // Si viene string con hora, quedarnos con YYYY-MM-DD
    if (typeof fechaFinal === "string") {
      const m = fechaFinal.match(/^(\d{4}-\d{2}-\d{2})/);
      if (m) {
        fechaFinal = m[1];
      }
    }
    if (!fechaFinal) {
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
    // Una sola query obtiene SUM y COUNT al mismo tiempo
    const [result] = await connection.query(`
      SELECT SUM(mt.monto) AS total, COUNT(*) AS cantidad
      FROM movimientos_tesoreria mt
      JOIN ordenes_venta ov ON mt.id_documento = ov.id_orden_venta
      WHERE mt.fecha_movimiento >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND mt.fecha_movimiento <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        AND TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%'
        AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada')
    `);

    return {
      totalMes: result[0].total || 0,
      ventasMensual: result[0].cantidad || 0,
    };
  },

  getEgresosSummary: async () => {
    try {
      // 5 queries independientes en paralelo + rango de mes para usar índices
      const [
        [pagosTrabajadores],
        [ordenesCompra],
        [costosIndirectos],
        [comprasMateriaPrima],
        [anticipos],
      ] = await Promise.all([
        db.query(`
          SELECT SUM(monto_total) AS totalPagosTrabajadores
          FROM pagos_trabajadores
          WHERE fecha_pago >= DATE_FORMAT(NOW(), '%Y-%m-01')
            AND fecha_pago <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        `),
        db.query(`
          SELECT SUM(doc.cantidad * doc.precio_unitario) AS totalOrdenesCompra
          FROM detalle_orden_compra doc
          JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
          WHERE oc.fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
            AND oc.fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
            AND oc.estado != 'cancelada'
        `),
        db.query(`
          SELECT SUM(valor) AS totalCostos
          FROM costos_indirectos
          WHERE fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
            AND fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        `),
        db.query(`
          SELECT SUM(cantidad * precio_unitario) AS totalMateriaPrima
          FROM compras_materia_prima
          WHERE fecha_compra >= DATE_FORMAT(NOW(), '%Y-%m-01')
            AND fecha_compra <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        `),
        db.query(`
          SELECT SUM(monto) AS totalAnticipos
          FROM anticipos_trabajadores
          WHERE fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
            AND fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
        `),
      ]);

      const summary = {
        totalPagosTrabajadores: Number(
          pagosTrabajadores[0].totalPagosTrabajadores || 0,
        ),
        totalOrdenesCompra: Number(ordenesCompra[0].totalOrdenesCompra || 0),
        totalCostos: Number(costosIndirectos[0].totalCostos || 0),
        totalMateriaPrima: Number(
          comprasMateriaPrima[0].totalMateriaPrima || 0,
        ),
        totalAnticipos: Number(anticipos[0].totalAnticipos || 0),
      };

      summary.totalEgresos =
        summary.totalPagosTrabajadores +
        summary.totalOrdenesCompra +
        summary.totalCostos +
        summary.totalMateriaPrima +
        summary.totalAnticipos;

      return summary;
    } catch (error) {
      console.error("Error fetching egresos summary:", error);
      throw error;
    }
  },

  actualizarMovimiento: async (
    id_movimiento,
    movimientoData,
    connection = db,
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
        "Se requiere id_documento y tipo_documento para buscar el movimiento asociado.",
      );
    }

    const [existingRows] = await conn.query(
      "SELECT id_movimiento FROM movimientos_tesoreria WHERE id_documento = ? AND tipo_documento = ?",
      [id_documento, tipo_documento],
    );

    if (existingRows.length > 0) {
      const id_movimiento = existingRows[0].id_movimiento;

      const updatedData = { ...movimientoData };

      if (typeof monto === "undefined" || monto === null) {
        throw new Error(
          "El monto es obligatorio para actualizar el movimiento.",
        );
      }

      const affected = await TesoreriaModel.actualizarMovimiento(
        id_movimiento,
        updatedData,
        conn,
      );
      return id_movimiento;
    } else {
      return await TesoreriaModel.insertarMovimiento(movimientoData, conn);
    }
  },

  getPagosTrabajadoresCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM pagos_trabajadores
      WHERE fecha_pago >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND fecha_pago <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
    `);
    return result[0].count;
  },

  getOrdenesCompraCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM ordenes_compra
      WHERE fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
    `);
    return result[0].count;
  },

  getCostosIndirectosCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM costos_indirectos
      WHERE fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
    `);
    return result[0].count;
  },

  getMateriaPrimaCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM compras_materia_prima
      WHERE fecha_compra >= DATE_FORMAT(NOW(), '%Y-%m-01')
        AND fecha_compra <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')
    `);
    return result[0].count;
  },
  getAnticiposCount: async () => {
    const [result] = await db.query(
      `SELECT COUNT(*) as count FROM anticipos_trabajadores
       WHERE fecha >= DATE_FORMAT(NOW(), '%Y-%m-01')
         AND fecha <  DATE_FORMAT(DATE_ADD(NOW(), INTERVAL 1 MONTH), '%Y-%m-01')`,
    );
    return result[0].count;
  },

  getResumenTarjetasDesdeCierre: async () => {
    const [cierreRows] = await db.query(
      `
        SELECT
          c.id_cierre,
          c.fecha_inicio,
          CAST(
            COALESCE(
              SUM(
                CASE
                  WHEN LOWER(mp.nombre) LIKE '%efectivo%'
                    THEN COALESCE(d.saldo_inicial, 0)
                  ELSE 0
                END
              ),
              0
            ) AS DECIMAL(15,2)
          ) AS saldo_inicial_efectivo,
          CAST(
            COALESCE(
              SUM(
                CASE
                  WHEN LOWER(mp.nombre) LIKE '%transferencia%'
                    THEN COALESCE(d.saldo_inicial, 0)
                  ELSE 0
                END
              ),
              0
            ) AS DECIMAL(15,2)
          ) AS saldo_inicial_transferencia
        FROM cierres_caja c
        LEFT JOIN detalle_cierre_caja d ON d.id_cierre = c.id_cierre
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = d.id_metodo_pago
        WHERE c.estado = 'abierto'
        GROUP BY c.id_cierre, c.fecha_inicio
        ORDER BY c.fecha_inicio DESC
        LIMIT 1
      `,
    );

    const cierre = cierreRows[0] || null;
    const fechaInicio = cierre?.fecha_inicio || "1970-01-01";

    const [movimientos] = await db.query(
      `
        SELECT
          mt.monto,
          mt.tipo_documento,
          mp.nombre AS metodo_pago
        FROM movimientos_tesoreria mt
        LEFT JOIN metodos_pago mp ON mp.id_metodo_pago = mt.id_metodo_pago
        WHERE DATE(mt.fecha_movimiento) >= DATE(?)
      `,
      [fechaInicio],
    );

    const resumen = {
      fecha_inicio_periodo: fechaInicio,
      id_cierre: cierre?.id_cierre || null,
      saldoInicialEfectivo: Number(cierre?.saldo_inicial_efectivo || 0),
      saldoInicialTransferencia: Number(
        cierre?.saldo_inicial_transferencia || 0,
      ),
      ventasEfectivo: 0,
      ventasTransferencia: 0,
      comprasEfectivo: 0,
      comprasTransferencia: 0,
      costosEfectivo: 0,
      costosTransferencia: 0,
      pagosEfectivo: 0,
      pagosTransferencia: 0,
      anticiposEfectivo: 0,
      anticiposTransferencia: 0,
      abonosEfectivo: 0,
      abonosTransferencia: 0,
      transferenciasIngresoEfectivo: 0,
      transferenciasEgresoEfectivo: 0,
      transferenciasIngresoTransferencia: 0,
      transferenciasEgresoTransferencia: 0,
      saldoFavorEfectivo: 0,
      saldoFavorTransferencia: 0,
      saldoUsadoEfectivo: 0,
      saldoUsadoTransferencia: 0,
      totalSaldoUsado: 0,
      ventasReparacionesEfectivo: 0,
      ventasReparacionesTransferencia: 0,
    };

    const tipoNormalizado = (tipoDocumento) => {
      const tipo = String(tipoDocumento || "").toLowerCase();
      if (tipo.includes("venta")) return "venta";
      if (tipo.includes("compra")) return "compra";
      if (tipo === "abono_credito" || tipo.includes("abono"))
        return "abono_credito";
      if (tipo === "reparacion") return "reparacion";
      if (tipo === "costo_indirecto" || tipo.includes("costo"))
        return "costo_indirecto";
      if (tipo === "pago_trabajador" || tipo.includes("pago"))
        return "pago_trabajador";
      if (tipo === "anticipo" || tipo.includes("anticipo")) return "anticipo";
      if (tipo === "saldo_favor_usado" || tipo === "saldo_favor") return tipo;
      if (tipo === "transferencia_fondos" || tipo.includes("transferencia"))
        return "transferencia_fondos";
      return "otro";
    };

    const esEfectivo = (metodo) =>
      String(metodo || "")
        .toLowerCase()
        .includes("efectivo");
    const esTransferencia = (metodo) =>
      String(metodo || "")
        .toLowerCase()
        .includes("transferencia");

    movimientos.forEach((mov) => {
      const tipo = tipoNormalizado(mov.tipo_documento);
      const metodo = mov.metodo_pago;
      const monto = Number(mov.monto) || 0;
      const montoAbs = Math.abs(monto);

      if (tipo === "transferencia_fondos") {
        if (esEfectivo(metodo)) {
          if (monto > 0) resumen.transferenciasIngresoEfectivo += monto;
          else resumen.transferenciasEgresoEfectivo += montoAbs;
        } else if (esTransferencia(metodo)) {
          if (monto > 0) resumen.transferenciasIngresoTransferencia += monto;
          else resumen.transferenciasEgresoTransferencia += montoAbs;
        }
        return;
      }

      if (tipo === "venta") {
        if (esEfectivo(metodo)) resumen.ventasEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.ventasTransferencia += montoAbs;
        return;
      }

      if (tipo === "reparacion") {
        if (esEfectivo(metodo)) {
          resumen.ventasEfectivo += montoAbs;
          resumen.ventasReparacionesEfectivo += montoAbs;
        } else if (esTransferencia(metodo)) {
          resumen.ventasTransferencia += montoAbs;
          resumen.ventasReparacionesTransferencia += montoAbs;
        }
        return;
      }

      if (tipo === "compra") {
        if (esEfectivo(metodo)) resumen.comprasEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.comprasTransferencia += montoAbs;
        return;
      }

      if (tipo === "costo_indirecto") {
        if (esEfectivo(metodo)) resumen.costosEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.costosTransferencia += montoAbs;
        return;
      }

      if (tipo === "pago_trabajador") {
        if (esEfectivo(metodo)) resumen.pagosEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.pagosTransferencia += montoAbs;
        return;
      }

      if (tipo === "anticipo") {
        if (esEfectivo(metodo)) resumen.anticiposEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.anticiposTransferencia += montoAbs;
        return;
      }

      if (tipo === "abono_credito") {
        if (esEfectivo(metodo)) resumen.abonosEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.abonosTransferencia += montoAbs;
        return;
      }

      if (tipo === "saldo_favor") {
        if (esEfectivo(metodo)) resumen.saldoFavorEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.saldoFavorTransferencia += montoAbs;
        return;
      }

      if (tipo === "saldo_favor_usado") {
        resumen.totalSaldoUsado += montoAbs;
        if (esEfectivo(metodo)) resumen.saldoUsadoEfectivo += montoAbs;
        else if (esTransferencia(metodo))
          resumen.saldoUsadoTransferencia += montoAbs;
        return;
      }
    });

    return resumen;
  },

  async getVentasCobrosReport({ desde, hasta, id_cliente, estado_pago }) {
    const paramsOV = [];
    const whereOV = ["1=1"];

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
    const whereCR = ["vc.id_orden_venta IS NULL"];
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

    // filtrar por estado_pago en HAVING equivalente
    if (
      estado_pago &&
      ["pendiente", "saldado"].includes(String(estado_pago).toLowerCase())
    ) {
      return rows.filter(
        (r) =>
          String(r.estado_pago).toLowerCase() ===
          String(estado_pago).toLowerCase(),
      );
    }
    return rows;
  },

  // ── Conciliación bancaria ──────────────────────────────────────────
  // Lista movimientos de tesorería con filtros (rango de fechas, estado de
  // conciliación, método de pago, tipo de documento) e info del usuario que
  // validó cada movimiento.
  getMovimientosConciliacion: async ({
    desde = null,
    hasta = null,
    estado = "todos",
    page = 1,
    pageSize = 25,
  } = {}) => {
    // La conciliación bancaria valida únicamente ventas pagadas por
    // transferencia bancaria (verificar que el pago realmente llegó).
    const where = [
      "m.tipo_documento = 'orden_venta'",
      "LOWER(mp.nombre) LIKE '%transferencia%'",
    ];
    const params = [];

    if (desde) {
      where.push("DATE(m.fecha_movimiento) >= ?");
      params.push(desde);
    }
    if (hasta) {
      where.push("DATE(m.fecha_movimiento) <= ?");
      params.push(hasta);
    }
    if (estado === "pendiente") {
      where.push("m.conciliado = 0");
    } else if (estado === "validado") {
      where.push("m.conciliado = 1");
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const baseSelect = `
      SELECT
        m.id_movimiento,
        m.id_documento,
        m.tipo_documento,
        m.fecha_movimiento,
        m.monto,
        m.id_metodo_pago,
        mp.nombre AS nombre_metodo,
        m.referencia,
        m.observaciones,
        m.conciliado,
        m.fecha_conciliacion,
        m.id_usuario_conciliacion,
        u.nombre_usuario AS usuario_conciliacion,
        cl.nombre AS nombre_cliente
      FROM movimientos_tesoreria m
      LEFT JOIN metodos_pago mp ON m.id_metodo_pago = mp.id_metodo_pago
      LEFT JOIN usuarios u ON m.id_usuario_conciliacion = u.id_usuario
      LEFT JOIN ordenes_venta ov ON m.tipo_documento = 'orden_venta'
        AND ov.id_orden_venta = m.id_documento
      LEFT JOIN clientes cl ON cl.id_cliente = ov.id_cliente
      ${whereSql}
    `;

    // Total de registros que cumplen el filtro (para paginar)
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM (${baseSelect}) AS sub`,
      params,
    );

    const pg = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(200, Math.max(1, parseInt(pageSize) || 25));
    const offset = (pg - 1) * ps;

    const [rows] = await db.query(
      `${baseSelect}
       ORDER BY m.fecha_movimiento DESC, m.id_movimiento DESC
       LIMIT ? OFFSET ?`,
      [...params, ps, offset],
    );

    return { data: rows, total: Number(total || 0) };
  },

  // Marca (o desmarca) un movimiento como conciliado/validado, registrando
  // quién lo validó y cuándo.
  // - Solo permite marcar movimientos que sean ventas pagadas por transferencia
  //   bancaria (mismo criterio que la lista), para no validar compras/pagos.
  // - fecha_conciliacion usa NOW() de MySQL (el contenedor corre en
  //   America/Bogota), evitando el desfase UTC de new Date() de Node.
  marcarConciliado: async (id_movimiento, id_usuario, conciliado) => {
    if (!id_usuario) {
      throw new Error("Se requiere un usuario autenticado para conciliar.");
    }

    if (conciliado) {
      // Validar que el movimiento sea una venta pagada por transferencia
      const [[mov]] = await db.query(
        `SELECT m.id_movimiento
         FROM movimientos_tesoreria m
         JOIN metodos_pago mp ON m.id_metodo_pago = mp.id_metodo_pago
         WHERE m.id_movimiento = ?
           AND m.tipo_documento = 'orden_venta'
           AND LOWER(mp.nombre) LIKE '%transferencia%'
         LIMIT 1`,
        [id_movimiento],
      );
      if (!mov) {
        throw new Error(
          "El movimiento no es una venta por transferencia bancaria y no puede validarse.",
        );
      }
    }

    const [result] = await db.query(
      `UPDATE movimientos_tesoreria
       SET conciliado = ?,
           fecha_conciliacion = CASE WHEN ? THEN NOW() ELSE NULL END,
           id_usuario_conciliacion = ?
       WHERE id_movimiento = ?`,
      [
        conciliado ? 1 : 0,
        conciliado ? 1 : 0,
        conciliado ? id_usuario : null,
        id_movimiento,
      ],
    );
    return result.affectedRows;
  },
};

module.exports = TesoreriaModel;
