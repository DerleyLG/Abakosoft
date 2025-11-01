const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query("SELECT * FROM costos_indirectos_asignados");
    return rows;
  },
  getById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM costos_indirectos_asignados WHERE id_asignacion = ?",
      [id]
    );
    return rows[0];
  },
  sumByCostoIds: async (ids = []) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    const placeholders = ids.map(() => "?").join(",");
    const [rows] = await db.query(
      `SELECT id_costo_indirecto, COALESCE(SUM(valor_asignado),0) AS total_asignado
       FROM costos_indirectos_asignados
       WHERE id_costo_indirecto IN (${placeholders})
       GROUP BY id_costo_indirecto`,
      ids
    );
    return rows;
  },

  create: async ({
    id_costo_indirecto,
    id_orden_fabricacion,
    anio,
    mes,
    valor_asignado,
    observaciones = null,
  }) => {
    const [result] = await db.query(
      `INSERT INTO costos_indirectos_asignados 
       (id_costo_indirecto, id_orden_fabricacion, anio, mes, valor_asignado, observaciones) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_costo_indirecto,
        id_orden_fabricacion,
        anio,
        mes,
        valor_asignado,
        observaciones,
      ]
    );
    return result.insertId;
  },

  update: async (
    id,
    {
      id_costo_indirecto,
      id_orden_fabricacion,
      anio,
      mes,
      valor_asignado,
      observaciones = null,
    }
  ) => {
    await db.query(
      `UPDATE costos_indirectos_asignados 
       SET id_costo_indirecto = ?, id_orden_fabricacion = ?, anio = ?, mes = ?, valor_asignado = ?, observaciones = ?
       WHERE id_asignacion = ?`,
      [
        id_costo_indirecto,
        id_orden_fabricacion,
        anio,
        mes,
        valor_asignado,
        observaciones,
        id,
      ]
    );
  },

  delete: async (id) => {
    await db.query(
      "DELETE FROM costos_indirectos_asignados WHERE id_asignacion = ?",
      [id]
    );
  },
};
