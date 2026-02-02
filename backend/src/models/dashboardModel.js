const db = require("../database/db");

// Zona horaria para métricas mensuales (evita que el mes cambie por UTC)
const DEFAULT_TZ = process.env.APP_TZ || process.env.TZ || "America/Bogota";

function _datePartsForTZ(tz = DEFAULT_TZ, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value || 1970);
  const m = Number(parts.find((p) => p.type === "month")?.value || 1);
  const d = Number(parts.find((p) => p.type === "day")?.value || 1);
  return { y, m, d };
}

function _pad2(n) {
  return String(n).padStart(2, "0");
}

function _monthRange(offsetMonths = 0, tz = DEFAULT_TZ) {
  const { y, m } = _datePartsForTZ(tz);
  const startDate = new Date(y, m - 1 + offsetMonths, 1);
  const nextDate = new Date(y, m - 1 + offsetMonths + 1, 1);
  const start = `${startDate.getFullYear()}-${_pad2(
    startDate.getMonth() + 1,
  )}-01`;
  const next = `${nextDate.getFullYear()}-${_pad2(nextDate.getMonth() + 1)}-01`;
  return { start, next };
}

const getTotalArticulos = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM articulos");
  return rows[0].total;
};

const getOrdenesPendientes = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM ordenes_venta WHERE estado = 'pendiente'",
  );
  return rows[0].total;
};

const getTrabajadoresActivos = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM trabajadores WHERE activo = 1",
  );
  return rows[0].total;
};

const getTotalClientes = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM clientes");
  return rows[0].total;
};

const getIngresosMes = async () => {
  // Ingresos por caja del mes (en TZ definida) usando rango [inicioMes, inicioMesSiguiente)
  const { start, next } = _monthRange(0, DEFAULT_TZ);
  const [rows] = await db.query(
    `
      SELECT IFNULL(SUM(mt.monto), 0) AS total_ingresos
      FROM movimientos_tesoreria mt
      LEFT JOIN ordenes_venta ov 
        ON mt.id_documento = ov.id_orden_venta
      WHERE mt.fecha_movimiento >= ?
        AND mt.fecha_movimiento <  ?
        AND (
          (TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%' AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada'))
          OR TRIM(LOWER(mt.tipo_documento)) = 'abono_credito'
        )
    `,
    [start, next],
  );
  return rows[0].total_ingresos;
};

const getEgresosMes = async () => {
  // Egresos del mes (caja operativa) en TZ definida, usando rangos de fecha
  const { start, next } = _monthRange(0, DEFAULT_TZ);
  const [[{ total_pagos }]] = await db.query(
    `
      SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
      FROM pagos_trabajadores
      WHERE fecha_pago >= ? AND fecha_pago < ?
    `,
    [start, next],
  );

  const [[{ total_costos_indirectos }]] = await db.query(
    `
      SELECT IFNULL(SUM(valor), 0) AS total_costos_indirectos
      FROM costos_indirectos
      WHERE fecha >= ? AND fecha < ?
    `,
    [start, next],
  );

  const [[{ total_servicios }]] = await db.query(
    `
      SELECT IFNULL(SUM(costo), 0) AS total_servicios
      FROM servicios_tercerizados
      WHERE fecha_inicio >= ? AND fecha_inicio < ?
    `,
    [start, next],
  );

  const [[{ total_compras }]] = await db.query(
    `
      SELECT IFNULL(SUM(doc.precio_unitario * doc.cantidad), 0) AS total_compras
      FROM detalle_orden_compra doc
      JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
      WHERE oc.fecha >= ? AND oc.fecha < ?
        AND oc.estado != 'cancelada'
    `,
    [start, next],
  );

  const [[{ total_materia_prima }]] = await db.query(
    `
      SELECT IFNULL(SUM(cantidad * precio_unitario), 0) AS total_materia_prima
      FROM compras_materia_prima
      WHERE fecha_compra >= ? AND fecha_compra < ?
    `,
    [start, next],
  );

  const egresos =
    parseFloat(total_pagos) +
    parseFloat(total_costos_indirectos) +
    parseFloat(total_servicios) +
    parseFloat(total_compras) +
    parseFloat(total_materia_prima);
  return egresos;
};

const getPagosTrabajadoresSemana = async () => {
  const [rows] = await db.query(
    "SELECT IFNULL(SUM(monto_total), 0) AS total_semana FROM pagos_trabajadores WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(CURDATE(), 1)",
  );
  return rows[0].total_semana;
};

// Ventas y compras de la semana (para dashboard semanal)
const getVentasSemana = async () => {
  const [rows] = await db.query(`
      SELECT IFNULL(SUM(mt.monto), 0) AS total_ventas
      FROM movimientos_tesoreria mt
      LEFT JOIN ordenes_venta ov 
        ON mt.id_documento = ov.id_orden_venta
      WHERE YEARWEEK(mt.fecha_movimiento, 1) = YEARWEEK(CURDATE(), 1)
        AND (
          (TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%' AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada'))
          OR TRIM(LOWER(mt.tipo_documento)) = 'abono_credito'
        )
    `);
  return rows[0].total_ventas;
};

const getComprasSemana = async () => {
  // Sumar todos los egresos de la semana (pagos reales)
  const [[{ total_pagos }]] = await db.query(
    `
      SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
      FROM pagos_trabajadores
      WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(CURDATE(), 1)
    `,
  );

  const [[{ total_costos_indirectos }]] = await db.query(
    `
      SELECT IFNULL(SUM(valor), 0) AS total_costos_indirectos
      FROM costos_indirectos
      WHERE YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)
    `,
  );

  const [[{ total_servicios }]] = await db.query(
    `
      SELECT IFNULL(SUM(costo), 0) AS total_servicios
      FROM servicios_tercerizados
      WHERE YEARWEEK(fecha_inicio, 1) = YEARWEEK(CURDATE(), 1)
    `,
  );

  const [[{ total_compras }]] = await db.query(
    `
      SELECT IFNULL(SUM(doc.precio_unitario * doc.cantidad), 0) AS total_compras
      FROM detalle_orden_compra doc
      JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
      WHERE YEARWEEK(oc.fecha, 1) = YEARWEEK(CURDATE(), 1)
        AND oc.estado != 'cancelada'
    `,
  );

  const [[{ total_materia_prima }]] = await db.query(
    `
      SELECT IFNULL(SUM(cantidad * precio_unitario), 0) AS total_materia_prima
      FROM compras_materia_prima
      WHERE YEARWEEK(fecha_compra, 1) = YEARWEEK(CURDATE(), 1)
    `,
  );

  const compras =
    parseFloat(total_pagos) +
    parseFloat(total_costos_indirectos) +
    parseFloat(total_servicios) +
    parseFloat(total_compras) +
    parseFloat(total_materia_prima);
  return compras;
};

const getAnticiposSemana = async () => {
  const [rows] = await db.query(
    `SELECT IFNULL(SUM(monto), 0) AS total_anticipos
     FROM anticipos_trabajadores
     WHERE YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)`,
  );
  return rows[0].total_anticipos;
};

const getDescuentosSemana = async () => {
  const [rows] = await db.query(
    `SELECT IFNULL(SUM(d.cantidad * d.pago_unitario), 0) AS total_descuentos
     FROM detalle_pago_trabajador d
     JOIN pagos_trabajadores p ON p.id_pago = d.id_pago
     WHERE d.es_descuento = 1
       AND YEARWEEK(p.fecha_pago, 1) = YEARWEEK(CURDATE(), 1)`,
  );
  return rows[0].total_descuentos;
};

const getProduccionMensual = async (year = null) => {
  const y = year || new Date().getFullYear();
  const [rows] = await db.query(
    `
      SELECT 
        MONTH(fecha_registro) AS mes,
        SUM(cantidad) AS total
      FROM 
        avance_etapas_produccion
      WHERE YEAR(fecha_registro) = ?
      GROUP BY 
        MONTH(fecha_registro)
      ORDER BY 
        MONTH(fecha_registro) ASC
    `,
    [y],
  );
  return rows;
};

const getProduccionAnual = async (yearsBack = 5) => {
  const [rows] = await db.query(
    `
      SELECT YEAR(fecha_registro) AS anio, SUM(cantidad) AS total
      FROM avance_etapas_produccion
      WHERE fecha_registro >= DATE_SUB(CURDATE(), INTERVAL ? YEAR)
      GROUP BY YEAR(fecha_registro)
      ORDER BY YEAR(fecha_registro) ASC
    `,
    [yearsBack],
  );
  return rows;
};

const getArticulosBajoStock = async (limit = 4) => {
  const [rows] = await db.query(
    `
      SELECT 
        a.descripcion,
        i.stock,
        i.stock_minimo
      FROM 
        inventario i
      JOIN 
        articulos a ON i.id_articulo = a.id_articulo
      WHERE 
        i.stock <= i.stock_minimo
        LIMIT ?
    `,
    [limit],
  );
  return rows;
};

const getOrdenesEnProceso = async (limit = 3) => {
  const [rows] = await db.query(
    `
      SELECT
        id_orden_fabricacion,
        fecha_inicio
      FROM
        ordenes_fabricacion
      WHERE
        estado = 'en proceso'
      ORDER BY 
        fecha_inicio DESC
      LIMIT ?
    `,
    [limit],
  );
  return rows;
};

// Nuevas métricas comparativas y tops
const getIngresosMesAnterior = async () => {
  const { start, next } = _monthRange(-1, DEFAULT_TZ);
  const [rows] = await db.query(
    `
      SELECT IFNULL(SUM(mt.monto), 0) AS total_ingresos
      FROM movimientos_tesoreria mt
      LEFT JOIN ordenes_venta ov 
        ON mt.id_documento = ov.id_orden_venta
      WHERE mt.fecha_movimiento >= ?
        AND mt.fecha_movimiento <  ?
        AND (
          (TRIM(LOWER(mt.tipo_documento)) LIKE '%venta%' AND (ov.estado IS NULL OR LOWER(TRIM(ov.estado)) <> 'anulada'))
          OR TRIM(LOWER(mt.tipo_documento)) = 'abono_credito'
        )
    `,
    [start, next],
  );
  return rows[0].total_ingresos;
};

const getEgresosMesAnterior = async () => {
  const { start, next } = _monthRange(-1, DEFAULT_TZ);
  const [[{ total_pagos }]] = await db.query(
    `
      SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
      FROM pagos_trabajadores
      WHERE fecha_pago >= ? AND fecha_pago < ?
    `,
    [start, next],
  );
  const [[{ total_costos_indirectos }]] = await db.query(
    `
      SELECT IFNULL(SUM(valor), 0) AS total_costos_indirectos
      FROM costos_indirectos
      WHERE fecha >= ? AND fecha < ?
    `,
    [start, next],
  );
  const [[{ total_servicios }]] = await db.query(
    `
      SELECT IFNULL(SUM(costo), 0) AS total_servicios
      FROM servicios_tercerizados
      WHERE fecha_inicio >= ? AND fecha_inicio < ?
    `,
    [start, next],
  );
  return (
    parseFloat(total_pagos) +
    parseFloat(total_costos_indirectos) +
    parseFloat(total_servicios)
  );
};

const getPagosTrabajadoresSemanaAnterior = async () => {
  const [rows] = await db.query(`
      SELECT IFNULL(SUM(monto_total), 0) AS total_semana
      FROM pagos_trabajadores 
      WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(DATE_SUB(CURDATE(), INTERVAL 1 WEEK), 1)
    `);
  return rows[0].total_semana;
};

const getTopVendidosMes = async (
  limit = 5,
  { year = null, month = null } = {},
) => {
  const y = year || new Date().getFullYear();
  const params = [y];
  let monthFilter = "";
  if (month && Number(month) >= 1 && Number(month) <= 12) {
    monthFilter = " AND MONTH(ov.fecha) = ?";
    params.push(Number(month));
  }
  params.push(limit);
  const [rows] = await db.query(
    `
      SELECT a.descripcion, SUM(dov.cantidad) AS total
      FROM detalle_orden_venta dov
      JOIN ordenes_venta ov ON ov.id_orden_venta = dov.id_orden_venta
      JOIN articulos a ON a.id_articulo = dov.id_articulo
      WHERE YEAR(ov.fecha) = ? ${monthFilter} AND ov.estado != 'anulada'
      GROUP BY a.descripcion
      ORDER BY total DESC
      LIMIT ?
    `,
    params,
  );
  return rows;
};

const getTopFabricadosMes = async (
  limit = 5,
  { year = null, month = null } = {},
) => {
  const y = year || new Date().getFullYear();
  const params = [y];
  let monthFilter = "";
  if (month && Number(month) >= 1 && Number(month) <= 12) {
    monthFilter = " AND MONTH(aep.fecha_registro) = ?";
    params.push(Number(month));
  }
  params.push(limit);
  const [rows] = await db.query(
    `
      SELECT a.descripcion, SUM(aep.cantidad) AS total
      FROM avance_etapas_produccion aep
      JOIN articulos a ON a.id_articulo = aep.id_articulo
      WHERE YEAR(aep.fecha_registro) = ? ${monthFilter}
      GROUP BY a.descripcion
      ORDER BY total DESC
      LIMIT ?
    `,
    params,
  );
  return rows;
};

module.exports = {
  getTotalArticulos,
  getOrdenesPendientes,
  getTrabajadoresActivos,
  getTotalClientes,
  getIngresosMes,
  getIngresosMesAnterior,
  getEgresosMes,
  getEgresosMesAnterior,
  getPagosTrabajadoresSemana,
  getAnticiposSemana,
  getDescuentosSemana,
  getPagosTrabajadoresSemanaAnterior,
  getVentasSemana,
  getComprasSemana,
  getProduccionMensual,
  getProduccionAnual,
  getArticulosBajoStock,
  getOrdenesEnProceso,
  getTopVendidosMes,
  getTopFabricadosMes,
};
