// src/models/ordenesModel.js

const db = require('../database/db'); // ajusta según tu configuración

const getResumenCompra = async () => {
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
    FROM ordenes_compra;
  `;
  const [rows] = await db.query(query);
return rows[0];

};

const getResumenFabricacion = async () => {
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
    FROM ordenes_fabricacion;
  `;
  const [rows] = await db.query(query);
return rows[0];

};

const getResumenVenta = async () => {
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes
    FROM ordenes_venta;
  `;
  const [rows] = await db.query(query);
return rows[0];

};

module.exports = {
  getResumenCompra,
  getResumenFabricacion,
  getResumenVenta,
};
