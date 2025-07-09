const db = require('../database/db');

module.exports = {
  async getAll() {
    const [rows] = await db.query(`
    SELECT 
    sta.id_asignacion,
  s.descripcion AS servicio, 
  ofab.id_orden_fabricacion, 
  ep.nombre AS etapa,
  sta.fecha_asignacion,
  sta.id_asignacion
FROM servicios_tercerizados_asignados sta
JOIN servicios_tercerizados s ON sta.id_servicio = s.id_servicio
JOIN ordenes_fabricacion ofab ON sta.id_orden_fabricacion = ofab.id_orden_fabricacion
JOIN etapas_produccion ep ON sta.id_etapa_produccion = ep.id_etapa
ORDER BY sta.fecha_asignacion DESC

    `);
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(`
  SELECT 
  s.descripcion AS servicio, 
  ofab.id_orden_fabricacion, 
  ep.nombre AS etapa,
  sta.fecha_asignacion,
  sta.id_asignacion
FROM servicios_tercerizados_asignados sta
JOIN servicios_tercerizados s ON sta.id_servicio = s.id_servicio
JOIN ordenes_fabricacion ofab ON sta.id_orden_fabricacion = ofab.id_orden_fabricacion
JOIN etapas_produccion ep ON sta.id_etapa_produccion = ep.id_etapa
ORDER BY sta.fecha_asignacion DESC



    `, [id]);
    return rows[0];
  },

  async create({ id_servicio, id_orden_fabricacion, id_etapa_produccion }) {
    const [result] = await db.query(`
      INSERT INTO servicios_tercerizados_asignados 
      (id_servicio, id_orden_fabricacion, id_etapa_produccion) 
      VALUES (?, ?, ?)
    `, [id_servicio, id_orden_fabricacion, id_etapa_produccion]);
    return result.insertId;
  },

  async update(id, { id_servicio, id_orden_fabricacion, id_etapa_produccion }) {
    const [result] = await db.query(`
      UPDATE servicios_tercerizados_asignados
      SET id_servicio = ?, id_orden_fabricacion = ?, id_etapa_produccion = ?
      WHERE id_asignacion = ?
    `, [id_servicio, id_orden_fabricacion, id_etapa_produccion, id]);
    return result.affectedRows;
  },

  async delete(id) {
    const [result] = await db.query(`
      DELETE FROM servicios_tercerizados_asignados WHERE id_asignacion = ?
    `, [id]);
    return result.affectedRows;
  }
};
