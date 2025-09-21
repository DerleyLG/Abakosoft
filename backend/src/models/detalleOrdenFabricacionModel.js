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

  async esArticuloCompuesto(id_orden_fabricacion) {
        
        const [rows] = await db.query(
            `SELECT 1
             FROM ordenes_fabricacion ofab
             JOIN detalle_pedido dp ON ofab.id_pedido = dp.id_pedido
             JOIN articulos a ON dp.id_articulo = a.id_articulo
             WHERE ofab.id_orden_fabricacion = ? AND a.es_compuesto = 1`,
            [id_orden_fabricacion]
        );
        return rows.length > 0;
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

  getByOrdenes: async (ids_orden_fabricacion) => {
    if (!ids_orden_fabricacion || ids_orden_fabricacion.length === 0) {
      return [];
    }
    const placeholders = ids_orden_fabricacion.map(() => '?').join(',');
    const query = `
      SELECT dof.*, a.descripcion, e.nombre AS nombre_etapa_final
      FROM detalle_orden_fabricacion dof
      JOIN articulos a ON dof.id_articulo = a.id_articulo
      LEFT JOIN etapas_produccion e ON dof.id_etapa_final = e.id_etapa
      WHERE dof.id_orden_fabricacion IN (${placeholders});
    `;
    const [rows] = await db.query(query, ids_orden_fabricacion);
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
