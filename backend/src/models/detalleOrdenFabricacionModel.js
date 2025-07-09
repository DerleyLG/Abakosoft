// src/models/detalleOrdenFabricacionModel.js
const db = require('../database/db');


module.exports = {
  // Obtener todos los detalles
getAll: async (id) => {
  const [rows] = await db.query(`
    SELECT d.id_detalle_fabricacion, d.id_orden_fabricacion, d.cantidad,
           a.descripcion AS descripcion
    FROM detalle_orden_fabricacion d
    JOIN articulos a ON d.id_articulo = a.id_articulo
    WHERE d.id_orden_fabricacion = ?;
   
  `, [id]); 
  return rows;
},

  // Obtener detalles por ID de orden de fabricación
  getById: async (id) => {
     const [rows] = await db.query(`
SELECT 
  dof.*, 
  a.descripcion,
  dof.id_etapa_final, 
  e.nombre AS nombre_etapa_final
FROM detalle_orden_fabricacion dof
JOIN articulos a ON dof.id_articulo = a.id_articulo
LEFT JOIN etapas_produccion e ON dof.id_etapa_final = e.id_etapa
WHERE dof.id_orden_fabricacion = ?

  `, [id]); 
  return rows;
  },

  // Crear un nuevo detalle
  create: async ({ id_orden_fabricacion, id_articulo, cantidad, id_etapa_final  }) => {
    const [result] = await db.query(
      `INSERT INTO detalle_orden_fabricacion 
       (id_orden_fabricacion, id_articulo, cantidad, id_etapa_final) 
       VALUES (?, ?, ?, ?)`,
      [id_orden_fabricacion, id_articulo,  cantidad, id_etapa_final]
    );
    return result.insertId;
  },

  // Actualizar un detalle existente
  update: async (id, { id_orden_fabricacion,id_articulo, id_etapa_final, cantidad }) => {
    await db.query(
      `UPDATE detalle_orden_fabricacion 
       SET id_orden_fabricacion = ? ,id_articulo = ?, id_etapa_final = ?, cantidad = ? 
       WHERE id_detalle_fabricacion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_final, cantidad, id]
    );
  },

  // Eliminar un detalle
  delete: async (id) => {
    await db.query(
      'DELETE FROM detalle_orden_fabricacion WHERE id_detalle_fabricacion = ?',
      [id]
    );
  }
};
