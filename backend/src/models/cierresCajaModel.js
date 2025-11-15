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
        -- Totales generales (suma de todos los métodos) - Forzar conversión a DECIMAL
        CAST(SUM(COALESCE(d.saldo_inicial, 0)) AS DECIMAL(15,2)) AS saldo_inicial_total,
        CAST(SUM(COALESCE(d.total_ingresos, 0)) AS DECIMAL(15,2)) AS total_ingresos_total,
        CAST(SUM(COALESCE(d.total_egresos, 0)) AS DECIMAL(15,2)) AS total_egresos_total,
        CAST(SUM(COALESCE(d.saldo_inicial, 0) + COALESCE(d.total_ingresos, 0) - COALESCE(d.total_egresos, 0)) AS DECIMAL(15,2)) AS saldo_final_total
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
          const saldoInicialTotal = parseFloat(cierre.saldo_inicial_total) || 0;

          cierre.total_ingresos_total = ingresosTotal;
          cierre.total_egresos_total = egresosTotal;
          cierre.saldo_final_total =
            saldoInicialTotal + ingresosTotal - egresosTotal;
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
        COALESCE(d.saldo_inicial, 0) as saldo_inicial,
        COALESCE(d.total_ingresos, 0) as total_ingresos,
        COALESCE(d.total_egresos, 0) as total_egresos,
        (COALESCE(d.saldo_inicial, 0) + COALESCE(d.total_ingresos, 0) - COALESCE(d.total_egresos, 0)) as saldo_final
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
      // Calcular saldos finales correctamente (saldo_inicial + ingresos - egresos)
      const [saldosFinales] = await connection.query(
        `SELECT 
          id_metodo_pago, 
          saldo_inicial,
          COALESCE(total_ingresos, 0) as total_ingresos,
          COALESCE(total_egresos, 0) as total_egresos,
          (saldo_inicial + COALESCE(total_ingresos, 0) - COALESCE(total_egresos, 0)) as saldo_final
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

      // Insertar saldos iniciales del nuevo período usando el saldo final calculado
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

  /**
   * Actualizar saldos iniciales de un período de caja
   */
  actualizarSaldosIniciales: async (id_cierre, saldos_iniciales) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Actualizar cada saldo inicial en detalle_cierre_caja
      for (const saldo of saldos_iniciales) {
        const { id_metodo_pago, saldo_inicial } = saldo;

        const query = `
          UPDATE detalle_cierre_caja 
          SET saldo_inicial = ? 
          WHERE id_cierre = ? AND id_metodo_pago = ?
        `;

        await connection.query(query, [
          saldo_inicial,
          id_cierre,
          id_metodo_pago,
        ]);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  /**
   * Validar un período antes de cerrarlo
   * Retorna objetos con errores críticos y warnings
   */
  validarCierrePeriodo: async (id_cierre, fecha_fin) => {
    const errores = [];
    const warnings = [];

    try {
      // Obtener datos del cierre
      const cierre = await cierresCajaModel.getById(id_cierre);
      if (!cierre) {
        errores.push({ campo: "cierre", mensaje: "Cierre no encontrado" });
        return { errores, warnings };
      }

      const fecha_inicio = cierre.fecha_inicio;

      // 1. Validar que existan movimientos en el período
      const queryMovimientos = `
        SELECT COUNT(*) as total
        FROM movimientos_tesoreria
        WHERE DATE(fecha_movimiento) >= ? 
          AND DATE(fecha_movimiento) <= ?
      `;
      const [rowsMovimientos] = await db.query(queryMovimientos, [
        fecha_inicio,
        fecha_fin,
      ]);
      const totalMovimientos = rowsMovimientos[0].total;

      if (totalMovimientos === 0) {
        warnings.push({
          tipo: "sin_movimientos",
          mensaje: "No se encontraron movimientos en este período",
        });
      }

      // 2. Validar que fecha_fin >= última fecha de movimiento
      const queryUltimoMovimiento = `
        SELECT MAX(DATE(fecha_movimiento)) as ultima_fecha
        FROM movimientos_tesoreria
        WHERE DATE(fecha_movimiento) >= ?
      `;
      const [rowsUltimo] = await db.query(queryUltimoMovimiento, [
        fecha_inicio,
      ]);
      const ultimaFecha = rowsUltimo[0].ultima_fecha;

      if (ultimaFecha && new Date(fecha_fin) < new Date(ultimaFecha)) {
        errores.push({
          campo: "fecha_fin",
          mensaje: `La fecha de fin (${fecha_fin}) es anterior a la última fecha de movimiento (${ultimaFecha})`,
          fecha_sugerida: ultimaFecha,
        });
      }

      // 3. Validar coherencia de saldos calculados
      // Para cada método de pago, verificar: saldo_final = saldo_inicial + ingresos - egresos
      const queryValidarSaldos = `
        SELECT 
          dcc.id_metodo_pago,
          mp.nombre as nombre_metodo,
          CAST(dcc.saldo_inicial AS DECIMAL(15,2)) as saldo_inicial,
          CAST(COALESCE(SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END), 0) AS DECIMAL(15,2)) as total_ingresos,
          CAST(COALESCE(SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END), 0) AS DECIMAL(15,2)) as total_egresos,
          CAST((dcc.saldo_inicial + 
           COALESCE(SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END), 0)) AS DECIMAL(15,2)) as saldo_calculado
        FROM detalle_cierre_caja dcc
        LEFT JOIN movimientos_tesoreria mt 
          ON dcc.id_metodo_pago = mt.id_metodo_pago
          AND DATE(mt.fecha_movimiento) >= ?
          AND DATE(mt.fecha_movimiento) <= ?
        JOIN metodos_pago mp ON dcc.id_metodo_pago = mp.id_metodo_pago
        WHERE dcc.id_cierre = ?
        GROUP BY dcc.id_metodo_pago, dcc.saldo_inicial, mp.nombre
      `;

      const [rowsSaldos] = await db.query(queryValidarSaldos, [
        fecha_inicio,
        fecha_fin,
        id_cierre,
      ]);

      console.log(
        "[validarCierrePeriodo] Saldos calculados:",
        JSON.stringify(rowsSaldos, null, 2)
      );

      // Verificar cada método de pago
      for (const metodo of rowsSaldos) {
        // El saldo_calculado YA tiene la fórmula aplicada en la query
        // Solo verificamos si hay valores inconsistentes entre los campos
        const saldoEsperado =
          parseFloat(metodo.saldo_inicial) +
          parseFloat(metodo.total_ingresos) -
          parseFloat(metodo.total_egresos);
        const diferencia = Math.abs(
          parseFloat(metodo.saldo_calculado) - saldoEsperado
        );

        console.log(`[validarCierrePeriodo] ${metodo.nombre_metodo}:`, {
          saldo_inicial: metodo.saldo_inicial,
          total_ingresos: metodo.total_ingresos,
          total_egresos: metodo.total_egresos,
          saldo_calculado: metodo.saldo_calculado,
          saldoEsperado,
          diferencia,
        });

        // Tolerancia de 1 peso por errores de redondeo
        if (diferencia > 1) {
          warnings.push({
            tipo: "saldo_inconsistente",
            metodo_pago: metodo.nombre_metodo,
            mensaje: `El saldo calculado para ${metodo.nombre_metodo} presenta inconsistencias`,
            saldo_inicial: metodo.saldo_inicial,
            ingresos: metodo.total_ingresos,
            egresos: metodo.total_egresos,
            saldo_esperado:
              metodo.saldo_inicial +
              metodo.total_ingresos -
              metodo.total_egresos,
            saldo_calculado: metodo.saldo_calculado,
            diferencia: diferencia,
          });
        }
      }

      // 4. Validar que no haya saldos negativos
      for (const metodo of rowsSaldos) {
        if (metodo.saldo_calculado < 0) {
          warnings.push({
            tipo: "saldo_negativo",
            metodo_pago: metodo.nombre_metodo,
            mensaje: `El saldo final de ${metodo.nombre_metodo} es negativo: ${metodo.saldo_calculado}`,
            saldo_final: metodo.saldo_calculado,
          });
        }
      }

      return { errores, warnings };
    } catch (error) {
      console.error("Error validando período:", error);
      throw error;
    }
  },
};

module.exports = cierresCajaModel;
