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
    const [rows] = await db.query("SELECT COUNT(*) AS total FROM trabajadores WHERE activo = 1");
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

    const egresos = parseFloat(total_pagos) + parseFloat(total_costos_indirectos) + parseFloat(total_servicios);
    return egresos;
};

const getPagosTrabajadoresSemana = async () => {
    const [rows] = await db.query("SELECT IFNULL(SUM(monto_total), 0) AS total_semana FROM pagos_trabajadores WHERE YEARWEEK(fecha_pago, 1) = YEARWEEK(CURDATE(), 1)");
    return rows[0].total_semana;
};


const getProduccionMensual = async () => {
    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(fecha_registro, '%Y-%m') AS mes,
        SUM(cantidad) AS total
      FROM 
        avance_etapas_produccion
      GROUP BY 
        mes
      ORDER BY 
        mes ASC
    `);
    return rows;
};

const getArticulosBajoStock = async (limit = 4) => {
    const [rows] = await db.query(`
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
    `, [limit]);
    return rows;
};

const getOrdenesEnProceso = async (limit = 3) => {
    const [rows] = await db.query(`
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
    `, [limit]);
    return rows;
};

module.exports = {
    getTotalArticulos,
    getOrdenesPendientes,
    getTrabajadoresActivos,
    getTotalClientes,
    getIngresosMes,
    getEgresosMes,
    getPagosTrabajadoresSemana,
    getProduccionMensual,
    getArticulosBajoStock,
    getOrdenesEnProceso
};