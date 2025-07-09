const db = require('../database/db');

const getTotalArticulos = async () => {
  const [rows] = await db.query('SELECT COUNT(*) AS total FROM articulos');
  return rows[0].total;
};

const getOrdenesPendientes = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM ordenes_venta WHERE estado = 'pendiente'");
  return rows[0].total;
};

const getTrabajadoresActivos = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM trabajadores Where activo = 1");
  return rows[0].total;
};

const getTotalClientes = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM clientes ");
  return rows[0].total;
};

const getCostosIndirectos = async () => {
  const [rows] = await db.query("SELECT IFNULL(SUM(valor), 0) AS total FROM costos_indirectos WHERE MONTH(fecha) = MONTH(CURDATE()) ");
  return rows[0].total;
};
const getpagosTrabajadores = async () => {
  const [rows] = await db.query("SELECT IFNULL(SUM(monto_total), 0) AS total_semana FROM pagos_trabajadores WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(CURDATE(), 1)");
  return rows[0].total_semana;
};

const getIngresosMes = async () => {
  const [rows] = await db.query(`
    SELECT IFNULL(SUM(dov.precio_unitario * dov.cantidad), 0) AS ingresos
    FROM ordenes_venta ov
    JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    WHERE MONTH(ov.fecha) = MONTH(CURDATE())
      AND YEAR(ov.fecha) = YEAR(CURDATE())
      AND ov.estado != 'anulada'
  `);
  return rows[0].ingresos;
}

const getPagosTrabajadoresMes = async () => {
  const [[{ total_pagos }]] = await db.query(`
    SELECT IFNULL(SUM(monto_total), 0) AS total_pagos
    FROM pagos_trabajadores
    WHERE MONTH(fecha_pago) = MONTH(CURDATE())
      AND YEAR(fecha_pago) = YEAR(CURDATE())
  `);
  return total_pagos
}

  const getServiciosTercerosMes = async () => {
  const [[{ total_servicios }]] = await db.query(`
    SELECT IFNULL(SUM(costo), 0) AS total_servicios
    FROM servicios_tercerizados
    WHERE MONTH(fecha_inicio) = MONTH(CURDATE())
      AND YEAR(fecha_inicio) = YEAR(CURDATE())
  `);
 return  total_servicios;
};

const getProduccionMensual = async () => {
  const [rows] = await db.query(`
    SELECT 
  MONTH(fecha_registro) AS mes,
  SUM(cantidad) AS total
FROM 
  avance_etapas_produccion
GROUP BY 
  MONTH(fecha_registro)
ORDER BY 
  mes ASC
  `);
  return rows;
};

module.exports = {
  getTotalArticulos,
  getOrdenesPendientes,
  getTrabajadoresActivos,
  getTotalClientes,
  getCostosIndirectos, 
  getpagosTrabajadores,
  getPagosTrabajadoresMes,
 getServiciosTercerosMes,
 getIngresosMes,
 getProduccionMensual
};
