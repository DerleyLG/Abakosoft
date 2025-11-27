const db = require("../database/db");

/**
 * Calcular el lunes anterior a una fecha dada
 */
function calcularLunesAnterior(fecha) {
  if (!fecha) {
    throw new Error("Fecha no puede ser null o undefined");
  }

  let d;

  // Si es un objeto Date, usarlo directamente
  if (fecha instanceof Date) {
    d = new Date(fecha);
  } else if (typeof fecha === "string") {
    // Si la fecha ya tiene hora, la usamos directamente, sino agregamos T00:00:00
    const fechaStr = fecha.includes("T") ? fecha : fecha + "T00:00:00";
    d = new Date(fechaStr);
  } else {
    throw new Error(`Tipo de fecha no soportado: ${typeof fecha}`);
  }

  if (isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: ${fecha}`);
  }

  const dia = d.getDay(); // 0=dom, 1=lun, ..., 6=sáb

  // Si es lunes (1), retornar esa fecha
  // Si es domingo (0), retroceder 6 días
  // Si es otro día, retroceder (dia - 1) días
  const diasARetroceder = dia === 0 ? 6 : dia === 1 ? 0 : dia - 1;

  d.setDate(d.getDate() - diasARetroceder);
  return d.toISOString().split("T")[0];
}

/**
 * Calcular el siguiente lunes después de una fecha
 */
function calcularSiguienteLunes(fecha) {
  const d = new Date(fecha + "T00:00:00");
  const dia = d.getDay(); // 0=dom, 1=lun, ..., 6=sáb

  // Si cerró domingo (0) → siguiente lunes es +1 día
  // Si cerró lunes (1) → siguiente lunes es +7 días
  // Si cerró martes-sábado → calcular días hasta siguiente lunes
  const diasHastaLunes = dia === 0 ? 1 : 8 - dia;

  d.setDate(d.getDate() + diasHastaLunes);
  return d.toISOString().split("T")[0];
}

/**
 * Calcular número de semana del año
 */
function calcularNumeroSemana(fecha) {
  const d = new Date(fecha + "T00:00:00");

  // Configurar al jueves de la semana actual (ISO 8601)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));

  // Obtener primer día del año
  const primerDia = new Date(d.getFullYear(), 0, 1);

  // Calcular número de semana
  const numeroSemana = Math.ceil(((d - primerDia) / 86400000 + 1) / 7);

  return numeroSemana;
}

/**
 * Verificar si el sistema necesita migración
 */
async function necesitaMigracion() {
  try {
    // 1. Verificar si hay cierres
    const [cierres] = await db.query(
      "SELECT COUNT(*) as count FROM cierres_caja"
    );

    // Si hay cierres, no necesita migración
    if (cierres[0].count > 0) {
      return {
        necesita: false,
        razon: "Ya existen cierres en el sistema",
        cierres_existentes: cierres[0].count,
      };
    }

    // 2. Verificar si hay movimientos de tesorería
    const [movimientos] = await db.query(
      "SELECT COUNT(*) as count, MIN(DATE(fecha_movimiento)) as primera_fecha FROM movimientos_tesoreria"
    );

    if (movimientos[0].count === 0) {
      return {
        necesita: false,
        razon: "No hay movimientos de tesorería para migrar",
      };
    }

    // Calcular períodos que se crearían
    const primeraFecha = movimientos[0].primera_fecha;

    if (!primeraFecha) {
      return {
        necesita: false,
        razon: "No se pudo determinar la fecha del primer movimiento",
      };
    }

    const primerLunes = calcularLunesAnterior(primeraFecha);
    const hoy = new Date();

    let fechaActual = new Date(primerLunes + "T00:00:00");
    let cantidadPeriodos = 0;

    while (fechaActual <= hoy) {
      cantidadPeriodos++;
      fechaActual.setDate(fechaActual.getDate() + 7);
    }

    return {
      necesita: true,
      razon: "Hay movimientos sin períodos asociados",
      primera_fecha_movimiento: primeraFecha,
      primer_lunes: primerLunes,
      cantidad_movimientos: movimientos[0].count,
      periodos_a_crear: cantidadPeriodos,
    };
  } catch (error) {
    console.error("Error verificando necesidad de migración:", error);
    throw error;
  }
}

/**
 * Migrar períodos históricos basados en movimientos existentes
 */
async function migrarPeriodosHistoricos() {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();



    // 1. Verificar si ya hay cierres
    const [cierresExistentes] = await connection.query(
      "SELECT COUNT(*) as count FROM cierres_caja"
    );

    if (cierresExistentes[0].count > 0) {
      throw new Error("Ya existen cierres en el sistema. No se puede migrar.");
    }

    // 2. Encontrar fecha del primer movimiento
    const [primerMovimiento] = await connection.query(`
      SELECT MIN(DATE(fecha_movimiento)) as primera_fecha
      FROM movimientos_tesoreria
    `);

    if (!primerMovimiento[0].primera_fecha) {
      throw new Error("No hay movimientos de tesorería para migrar.");
    }

    const fechaInicio = primerMovimiento[0].primera_fecha;
    const primerLunes = calcularLunesAnterior(fechaInicio);

    console.log(` Primer movimiento: ${fechaInicio}`);
    console.log(` Primer período iniciará: ${primerLunes}`);

    // 3. Obtener métodos de pago
    const [metodosPago] = await connection.query(
      "SELECT id_metodo_pago FROM metodos_pago ORDER BY id_metodo_pago"
    );

    if (metodosPago.length === 0) {
      throw new Error("No hay métodos de pago configurados en el sistema.");
    }

    // 4. Crear períodos semanales hasta hoy
    const hoy = new Date();
    let fechaActual = new Date(primerLunes + "T00:00:00");
    let numeroPeriodo = 1;
    let saldosAcumulados = {};

    // Inicializar saldos en 0 para primer período
    metodosPago.forEach((m) => {
      saldosAcumulados[m.id_metodo_pago] = 0;
    });

    const periodosCreados = [];

    while (fechaActual <= hoy) {
      const fecha_inicio = fechaActual.toISOString().split("T")[0];

      // Calcular domingo de esa semana
      const fecha_fin_semana = new Date(fechaActual);
      fecha_fin_semana.setDate(fecha_fin_semana.getDate() + 6); // +6 días = domingo

      // Si el domingo es futuro, dejar período abierto
      const esPeriodoActual = fecha_fin_semana > hoy;
      const fecha_fin = esPeriodoActual
        ? null
        : fecha_fin_semana.toISOString().split("T")[0];
      const estado = esPeriodoActual ? "abierto" : "cerrado";

      const numero_semana = calcularNumeroSemana(fecha_inicio);
      const anio_semana = fechaActual.getFullYear();

      console.log(` Creando período ${numeroPeriodo}:`);
      console.log(`   ${fecha_inicio} al ${fecha_fin || "Actual"} (${estado})`);

      // Crear período
      const [resultPeriodo] = await connection.query(
        `
        INSERT INTO cierres_caja 
        (fecha_inicio, fecha_fin, estado, fecha_cierre, observaciones, es_primer_periodo, 
         saldos_iniciales_confirmados, tipo_cierre, numero_semana, anio_semana)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          fecha_inicio,
          fecha_fin,
          estado,
          estado === "cerrado" ? fecha_fin + " 23:59:59" : null,
          `Migración automática - Período ${numeroPeriodo}`,
          numeroPeriodo === 1, // es_primer_periodo
          numeroPeriodo === 1, // saldos_iniciales_confirmados (primer período en 0)
          "migracion",
          numero_semana,
          anio_semana,
        ]
      );

      const id_cierre = resultPeriodo.insertId;

      // Calcular movimientos de este período
      const queryMovimientos = `
        SELECT 
          mt.id_metodo_pago,
          SUM(CASE WHEN mt.monto > 0 THEN mt.monto ELSE 0 END) AS total_ingresos,
          SUM(CASE WHEN mt.monto < 0 THEN ABS(mt.monto) ELSE 0 END) AS total_egresos
        FROM movimientos_tesoreria mt
        WHERE DATE(mt.fecha_movimiento) >= ?
          ${fecha_fin ? "AND DATE(mt.fecha_movimiento) <= ?" : ""}
        GROUP BY mt.id_metodo_pago
      `;

      const params = fecha_fin ? [fecha_inicio, fecha_fin] : [fecha_inicio];
      const [movimientos] = await connection.query(queryMovimientos, params);

      // Crear mapa de movimientos
      const movimientosMap = {};
      movimientos.forEach((m) => {
        movimientosMap[m.id_metodo_pago] = {
          ingresos: parseFloat(m.total_ingresos) || 0,
          egresos: parseFloat(m.total_egresos) || 0,
        };
      });

      // Insertar detalle por cada método de pago
      for (const metodo of metodosPago) {
        const id_metodo = metodo.id_metodo_pago;
        const saldo_inicial = saldosAcumulados[id_metodo] || 0;
        const movs = movimientosMap[id_metodo] || { ingresos: 0, egresos: 0 };

        // Solo insertar totales si el período está cerrado
        const total_ingresos = estado === "cerrado" ? movs.ingresos : null;
        const total_egresos = estado === "cerrado" ? movs.egresos : null;

        await connection.query(
          `
          INSERT INTO detalle_cierre_caja 
          (id_cierre, id_metodo_pago, saldo_inicial, total_ingresos, total_egresos)
          VALUES (?, ?, ?, ?, ?)
        `,
          [id_cierre, id_metodo, saldo_inicial, total_ingresos, total_egresos]
        );

        // Actualizar saldo acumulado para siguiente período
        if (estado === "cerrado") {
          const saldo_final = saldo_inicial + movs.ingresos - movs.egresos;
          saldosAcumulados[id_metodo] = saldo_final;
        }
      }

      periodosCreados.push({
        id_cierre,
        fecha_inicio,
        fecha_fin,
        estado,
        numero_semana,
        anio_semana,
      });

      // Avanzar al siguiente lunes
      fechaActual.setDate(fechaActual.getDate() + 7);
      numeroPeriodo++;
    }

    // Marcar sistema como configurado
    await connection.query(`
      INSERT INTO configuracion_cierres (clave, valor, tipo_dato)
      VALUES ('primer_periodo_configurado', 'true', 'boolean')
      ON DUPLICATE KEY UPDATE valor = 'true'
    `);

    await connection.commit();

    console.log(" Migración completada exitosamente");
    console.log(` Períodos creados: ${periodosCreados.length}`);

    return {
      success: true,
      mensaje: "Migración completada exitosamente",
      periodos_creados: periodosCreados.length,
      primer_periodo: primerLunes,
      periodo_actual: periodosCreados.length,
      periodos: periodosCreados,
    };
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error durante la migración:", error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  calcularLunesAnterior,
  calcularSiguienteLunes,
  calcularNumeroSemana,
  necesitaMigracion,
  migrarPeriodosHistoricos,
};
