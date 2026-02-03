// src/models/etapasDetalleFabricacionModel.js
const db = require("../database/db");

module.exports = {
  // Obtener etapas personalizadas por detalle de fabricación
  getByDetalle: async (id_detalle_fabricacion) => {
    const [rows] = await db.query(
      `
      SELECT edf.*, ep.nombre AS nombre_etapa
      FROM etapas_detalle_fabricacion edf
      JOIN etapas_produccion ep ON edf.id_etapa = ep.id_etapa
      WHERE edf.id_detalle_fabricacion = ?
      ORDER BY edf.orden ASC
    `,
      [id_detalle_fabricacion],
    );
    return rows;
  },

  // Obtener etapas personalizadas para múltiples detalles
  getByDetalles: async (ids_detalles) => {
    if (!ids_detalles || ids_detalles.length === 0) return [];
    const placeholders = ids_detalles.map(() => "?").join(",");
    const [rows] = await db.query(
      `
      SELECT edf.*, ep.nombre AS nombre_etapa
      FROM etapas_detalle_fabricacion edf
      JOIN etapas_produccion ep ON edf.id_etapa = ep.id_etapa
      WHERE edf.id_detalle_fabricacion IN (${placeholders})
      ORDER BY edf.id_detalle_fabricacion, edf.orden ASC
    `,
      ids_detalles,
    );
    return rows;
  },

  // Crear etapas personalizadas para un detalle
  createMultiple: async (id_detalle_fabricacion, etapas) => {
    if (!etapas || etapas.length === 0) return;

    const values = etapas.map((e) => [
      id_detalle_fabricacion,
      e.id_etapa,
      e.orden,
    ]);
    await db.query(
      `
      INSERT INTO etapas_detalle_fabricacion (id_detalle_fabricacion, id_etapa, orden)
      VALUES ?
    `,
      [values],
    );
  },

  // Eliminar etapas personalizadas de un detalle
  deleteByDetalle: async (id_detalle_fabricacion) => {
    await db.query(
      `
      DELETE FROM etapas_detalle_fabricacion 
      WHERE id_detalle_fabricacion = ?
    `,
      [id_detalle_fabricacion],
    );
  },

  // Actualizar etapas personalizadas (eliminar y recrear)
  updateByDetalle: async (id_detalle_fabricacion, etapas) => {
    await module.exports.deleteByDetalle(id_detalle_fabricacion);
    if (etapas && etapas.length > 0) {
      await module.exports.createMultiple(id_detalle_fabricacion, etapas);
    }
  },

  // Verificar si un detalle tiene flujo personalizado
  tieneFlujoPesonalizado: async (id_detalle_fabricacion) => {
    const [rows] = await db.query(
      `
      SELECT COUNT(*) as count 
      FROM etapas_detalle_fabricacion 
      WHERE id_detalle_fabricacion = ?
    `,
      [id_detalle_fabricacion],
    );
    return rows[0].count > 0;
  },
};
