const db = require("../database/db");

const cierresCajaModel = {
  /**
   * Obtener todos los cierres de caja (histórico)
   */
  getAll: async () => {
    const query = `
      SELECT 
        c.id_cierre,
        c.fecha_inicio,
        c.fecha_fin,
        c.estado,
        c.fecha_cierre,
        c.observaciones,
        u.nombre_usuario AS usuario_cierre,
        -- Totales generales (suma de todos los métodos)
        SUM(d.saldo_inicial) AS saldo_inicial_total,
        SUM(d.total_ingresos) AS total_ingresos_total,
        SUM(d.total_egresos) AS total_egresos_total,
        SUM(d.saldo_final) AS saldo_final_total
      FROM cierres_caja c
      LEFT JOIN usuarios u ON c.id_usuario_cierre = u.id_usuario
      LEFT JOIN detalle_cierre_caja d ON c.id_cierre = d.id_cierre
      GROUP BY c.id_cierre, u.nombre_usuario
      ORDER BY c.fecha_inicio DESC
    `;

    const [rows] = await db.query(query);

    // Calcular totales dinámicos para cierres abiertos
    for (let cierre of rows) {
      if (cierre.estado === "abierto") {
        const queryTotales = `
          SELECT 
            SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END) AS total_ingresos,
            SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END) AS total_egresos
          FROM movimientos_tesoreria mt
          WHERE DATE(mt.fecha_movimiento) >= ?
            AND (? IS NULL OR DATE(mt.fecha_movimiento) <= ?)
        `;

        const [totales] = await db.query(queryTotales, [
          cierre.fecha_inicio,
          cierre.fecha_fin,
          cierre.fecha_fin,
        ]);

        if (totales && totales.length > 0) {
          const ingresosTotal = parseFloat(totales[0].total_ingresos) || 0;
          const egresosTotal = parseFloat(totales[0].total_egresos) || 0;

          cierre.total_ingresos_total = ingresosTotal;
          cierre.total_egresos_total = egresosTotal;
          cierre.saldo_final_total =
            (cierre.saldo_inicial_total || 0) + ingresosTotal - egresosTotal;
        }
      }
    }

    return rows;
  },

  /**
   * Obtener cierre abierto actual
   */
  getCierreAbierto: async () => {
    const query = `
      SELECT 
        c.id_cierre,
        c.fecha_inicio,
        c.fecha_fin,
        c.estado,
        c.observaciones
      FROM cierres_caja c
      WHERE c.estado = 'abierto'
      LIMIT 1
    `;

    const [rows] = await db.query(query);
    return rows[0] || null;
  },

  /**
   * Obtener detalle completo de un cierre específico
   */
  getById: async (id_cierre) => {
    // Datos principales del cierre
    const queryCierre = `
      SELECT 
        c.id_cierre,
        c.fecha_inicio,
        c.fecha_fin,
        c.estado,
        c.fecha_cierre,
        c.observaciones,
        u.nombre_usuario AS usuario_cierre
      FROM cierres_caja c
      LEFT JOIN usuarios u ON c.id_usuario_cierre = u.id_usuario
      WHERE c.id_cierre = ?
    `;

    const [cierre] = await db.query(queryCierre, [id_cierre]);

    if (!cierre || cierre.length === 0) {
      return null;
    }

    // Detalle por método de pago
    const queryDetalle = `
      SELECT 
        d.id_detalle,
        d.id_metodo_pago,
        mp.nombre AS metodo_nombre,
        d.saldo_inicial,
        d.total_ingresos,
        d.total_egresos,
        d.saldo_final
      FROM detalle_cierre_caja d
      JOIN metodos_pago mp ON d.id_metodo_pago = mp.id_metodo_pago
      WHERE d.id_cierre = ?
      ORDER BY mp.nombre
    `;

    const [detalle] = await db.query(queryDetalle, [id_cierre]);

    // Si el cierre está abierto, calcular totales dinámicamente desde movimientos
    if (cierre[0].estado === "abierto") {
      // Calcular totales reales desde movimientos de tesorería
      const { fecha_inicio, fecha_fin } = cierre[0];
      const queryTotales = `
        SELECT 
          mt.id_metodo_pago,
          SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END) AS total_ingresos,
          SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END) AS total_egresos
        FROM movimientos_tesoreria mt
        WHERE DATE(mt.fecha_movimiento) >= ?
          AND (? IS NULL OR DATE(mt.fecha_movimiento) <= ?)
        GROUP BY mt.id_metodo_pago
      `;

      const [totalesReales] = await db.query(queryTotales, [
        fecha_inicio,
        fecha_fin,
        fecha_fin,
      ]);

      // Crear un mapa de totales por método de pago
      const totalesMap = {};
      totalesReales.forEach((total) => {
        totalesMap[total.id_metodo_pago] = {
          total_ingresos: parseFloat(total.total_ingresos) || 0,
          total_egresos: parseFloat(total.total_egresos) || 0,
        };
      });

      // Actualizar detalle con totales reales
      detalle.forEach((d) => {
        const totales = totalesMap[d.id_metodo_pago] || {
          total_ingresos: 0,
          total_egresos: 0,
        };
        d.total_ingresos = totales.total_ingresos;
        d.total_egresos = totales.total_egresos;
        // Recalcular saldo_final
        d.saldo_final = d.saldo_inicial + d.total_ingresos - d.total_egresos;
      });
    }

    return {
      ...cierre[0],
      detalle_metodos: detalle,
    };
  },

  /**
   * Crear nuevo período de cierre (apertura)
   */
  create: async (fecha_inicio, saldos_iniciales) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Crear registro principal
      const [result] = await connection.query(
        `INSERT INTO cierres_caja (fecha_inicio, estado) 
         VALUES (?, 'abierto')`,
        [fecha_inicio]
      );

      const id_cierre = result.insertId;

      // 2. Insertar detalle por cada método de pago
      if (saldos_iniciales && saldos_iniciales.length > 0) {
        for (const saldo of saldos_iniciales) {
          await connection.query(
            `INSERT INTO detalle_cierre_caja 
             (id_cierre, id_metodo_pago, saldo_inicial) 
             VALUES (?, ?, ?)`,
            [id_cierre, saldo.id_metodo_pago, saldo.saldo_inicial]
          );
        }
      }

      await connection.commit();
      return id_cierre;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Calcular totales del período para un cierre
   */
  calcularTotalesPeriodo: async (id_cierre) => {
    // Obtener fechas del cierre
    const [cierre] = await db.query(
      `SELECT fecha_inicio, fecha_fin FROM cierres_caja WHERE id_cierre = ?`,
      [id_cierre]
    );

    if (!cierre || cierre.length === 0) {
      throw new Error("Cierre no encontrado");
    }

    const { fecha_inicio, fecha_fin } = cierre[0];

    // Calcular totales por método de pago
    const query = `
      SELECT 
        mt.id_metodo_pago,
        mp.nombre AS metodo_nombre,
        SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END) AS total_ingresos,
        SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END) AS total_egresos
      FROM movimientos_tesoreria mt
      JOIN metodos_pago mp ON mt.id_metodo_pago = mp.id_metodo_pago
      WHERE DATE(mt.fecha_movimiento) BETWEEN ? AND ?
      GROUP BY mt.id_metodo_pago, mp.nombre
    `;

    const [totales] = await db.query(query, [
      fecha_inicio,
      fecha_fin || fecha_inicio,
    ]);
    return totales;
  },

  /**
   * Obtener movimientos detallados del período
   */
  getMovimientosPeriodo: async (id_cierre) => {
    // Obtener fechas del cierre
    const [cierre] = await db.query(
      `SELECT fecha_inicio, fecha_fin FROM cierres_caja WHERE id_cierre = ?`,
      [id_cierre]
    );

    if (!cierre || cierre.length === 0) {
      throw new Error("Cierre no encontrado");
    }

    const { fecha_inicio, fecha_fin } = cierre[0];

    console.log("[getMovimientosPeriodo] id_cierre:", id_cierre);
    console.log("[getMovimientosPeriodo] fecha_inicio:", fecha_inicio);
    console.log("[getMovimientosPeriodo] fecha_fin:", fecha_fin);

    const query = `
      SELECT 
        mt.id_movimiento,
        DATE(mt.fecha_movimiento) AS fecha,
        CASE 
          WHEN mt.monto > 0 THEN 'ingreso'
          ELSE 'egreso'
        END AS tipo_movimiento,
        mt.tipo_documento,
        mt.id_documento,
        mt.monto,
        mt.referencia,
        mt.observaciones,
        mp.nombre AS metodo_pago
      FROM movimientos_tesoreria mt
      JOIN metodos_pago mp ON mt.id_metodo_pago = mp.id_metodo_pago
      WHERE DATE(mt.fecha_movimiento) >= ?
        AND (? IS NULL OR DATE(mt.fecha_movimiento) <= ?)
      ORDER BY mt.fecha_movimiento DESC, tipo_movimiento
    `;

    const [movimientos] = await db.query(query, [
      fecha_inicio,
      fecha_fin,
      fecha_fin,
    ]);

    console.log(
      "[getMovimientosPeriodo] movimientos encontrados:",
      movimientos.length
    );

    return movimientos;
  },

  /**
   * Cerrar período
   */
  cerrar: async (
    id_cierre,
    fecha_fin,
    id_usuario_cierre,
    observaciones,
    totales_calculados
  ) => {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Actualizar totales en detalle_cierre_caja
      for (const total of totales_calculados) {
        await connection.query(
          `UPDATE detalle_cierre_caja 
           SET total_ingresos = ?, total_egresos = ?
           WHERE id_cierre = ? AND id_metodo_pago = ?`,
          [
            total.total_ingresos,
            total.total_egresos,
            id_cierre,
            total.id_metodo_pago,
          ]
        );
      }

      // 2. Cerrar el período
      await connection.query(
        `UPDATE cierres_caja 
         SET fecha_fin = ?, 
             estado = 'cerrado', 
             fecha_cierre = NOW(),
             id_usuario_cierre = ?,
             observaciones = ?
         WHERE id_cierre = ?`,
        [fecha_fin, id_usuario_cierre, observaciones, id_cierre]
      );

      // 3. Crear siguiente período automáticamente
      // Obtener saldos finales del cierre actual
      const [saldosFinales] = await connection.query(
        `SELECT id_metodo_pago, saldo_final 
         FROM detalle_cierre_caja 
         WHERE id_cierre = ?`,
        [id_cierre]
      );

      // Calcular fecha inicio del siguiente período (día siguiente)
      const fechaSiguiente = new Date(fecha_fin);
      fechaSiguiente.setDate(fechaSiguiente.getDate() + 1);
      const fechaSiguienteStr = fechaSiguiente.toISOString().split("T")[0];

      // Crear nuevo período
      const [resultNuevo] = await connection.query(
        `INSERT INTO cierres_caja (fecha_inicio, estado) 
         VALUES (?, 'abierto')`,
        [fechaSiguienteStr]
      );

      const id_nuevo_cierre = resultNuevo.insertId;

      // Insertar saldos iniciales del nuevo período
      for (const saldo of saldosFinales) {
        await connection.query(
          `INSERT INTO detalle_cierre_caja 
           (id_cierre, id_metodo_pago, saldo_inicial) 
           VALUES (?, ?, ?)`,
          [id_nuevo_cierre, saldo.id_metodo_pago, saldo.saldo_final]
        );
      }

      await connection.commit();
      return { id_cierre_cerrado: id_cierre, id_nuevo_cierre };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Validar si una fecha está en un período cerrado
   */
  validarFechaCerrada: async (fecha) => {
    const query = `
      SELECT id_cierre, fecha_inicio, fecha_fin 
      FROM cierres_caja 
      WHERE estado = 'cerrado' 
        AND DATE(?) BETWEEN fecha_inicio AND fecha_fin
      LIMIT 1
    `;

    const [rows] = await db.query(query, [fecha]);
    return rows.length > 0;
  },
};

module.exports = cierresCajaModel;
