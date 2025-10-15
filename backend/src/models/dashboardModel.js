const db = require("../database/db");

const getTotalArticulos = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM articulos");
  return rows[0].total;
};

const getOrdenesPendientes = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM ordenes_venta WHERE estado = 'pendiente'"
  );
  return rows[0].total;
};

const getTrabajadoresActivos = async () => {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM trabajadores WHERE activo = 1"
  );
  return rows[0].total;
};

const getTotalClientes = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM clientes");
  return rows[0].total;
};

const getIngresosMes = async () => {
  const [rows] = await db.query(`
      SELECT IFNULL(SUM(dov.precio_unitario * dov.cantidad), 0) AS total_ingresos
      FROM ordenes_venta ov
      JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
      WHERE MONTH(ov.fecha) = MONTH(CURDATE())
        AND YEAR(ov.fecha) = YEAR(CURDATE())
        AND ov.estado != 'anulada'
    `);
  return rows[0].total_ingresos;
};

const getEgresosMes = async () => {
  const [[{ total_pagos }]] = await db.query(`
        SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
        FROM pagos_trabajadores
        WHERE MONTH(fecha_pago) = MONTH(CURDATE()) AND YEAR(fecha_pago) = YEAR(CURDATE())
    `);

  const [[{ total_costos_indirectos }]] = await db.query(`
        SELECT IFNULL(SUM(valor), 0) AS total_costos_indirectos
        FROM costos_indirectos
        WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
    `);

  const [[{ total_servicios }]] = await db.query(`
        SELECT IFNULL(SUM(costo), 0) AS total_servicios
        FROM servicios_tercerizados
        WHERE MONTH(fecha_inicio) = MONTH(CURDATE()) AND YEAR(fecha_inicio) = YEAR(CURDATE())
    `);

  const egresos =
    parseFloat(total_pagos) +
    parseFloat(total_costos_indirectos) +
    parseFloat(total_servicios);
  return egresos;
};

const getPagosTrabajadoresSemana = async () => {
  const [rows] = await db.query(
    "SELECT IFNULL(SUM(monto_total), 0) AS total_semana FROM pagos_trabajadores WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(CURDATE(), 1)"
  );
  return rows[0].total_semana;
};

const getAnticiposSemana = async () => {
  const [rows] = await db.query(
    `SELECT IFNULL(SUM(monto), 0) AS total_anticipos
     FROM anticipos_trabajadores
     WHERE YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)`
  );
  return rows[0].total_anticipos;
};

const getDescuentosSemana = async () => {
  const [rows] = await db.query(
    `SELECT IFNULL(SUM(d.cantidad * d.pago_unitario), 0) AS total_descuentos
     FROM detalle_pago_trabajador d
     JOIN pagos_trabajadores p ON p.id_pago = d.id_pago
     WHERE d.es_descuento = 1
       AND YEARWEEK(p.fecha_pago, 1) = YEARWEEK(CURDATE(), 1)`
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
    [y]
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
    [yearsBack]
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
    [limit]
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
    [limit]
  );
  return rows;
};

// Nuevas métricas comparativas y tops
const getIngresosMesAnterior = async () => {
  const [rows] = await db.query(`
      SELECT IFNULL(SUM(dov.precio_unitario * dov.cantidad), 0) AS total_ingresos
      FROM ordenes_venta ov
      JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
      WHERE MONTH(ov.fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND YEAR(ov.fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        AND ov.estado != 'anulada'
    `);
  return rows[0].total_ingresos;
};

const getEgresosMesAnterior = async () => {
  const [[{ total_pagos }]] = await db.query(`
        SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
        FROM pagos_trabajadores
        WHERE MONTH(fecha_pago) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
          AND YEAR(fecha_pago) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `);
  const [[{ total_costos_indirectos }]] = await db.query(`
        SELECT IFNULL(SUM(valor), 0) AS total_costos_indirectos
        FROM costos_indirectos
        WHERE MONTH(fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
          AND YEAR(fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `);
  const [[{ total_servicios }]] = await db.query(`
        SELECT IFNULL(SUM(costo), 0) AS total_servicios
        FROM servicios_tercerizados
        WHERE MONTH(fecha_inicio) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
          AND YEAR(fecha_inicio) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
    `);
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
  { year = null, month = null } = {}
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
    params
  );
  return rows;
};

const getTopFabricadosMes = async (
  limit = 5,
  { year = null, month = null } = {}
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
    params
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
  getProduccionMensual,
  getProduccionAnual,
  getArticulosBajoStock,
  getOrdenesEnProceso,
  getTopVendidosMes,
  getTopFabricadosMes,
};
