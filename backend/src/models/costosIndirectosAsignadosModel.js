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

  getByCostoIndirecto: async (idCosto) => {
    const [rows] = await db.query(
      `SELECT 
        cia.*, 
        ofa.fecha_inicio,
        ofa.fecha_fin_estimada,
        ofa.fecha_entrega,
        ofa.estado,
        dof.cantidad,
        dof.id_articulo,
        a.referencia as referencia_articulo,
        a.descripcion as descripcion_articulo,
        COALESCE(c1.nombre, c2.nombre) as nombre_cliente,
        COALESCE(ov.id_cliente, p.id_cliente) as id_cliente
       FROM costos_indirectos_asignados cia
       LEFT JOIN ordenes_fabricacion ofa ON cia.id_orden_fabricacion = ofa.id_orden_fabricacion
       LEFT JOIN detalle_orden_fabricacion dof ON ofa.id_orden_fabricacion = dof.id_orden_fabricacion
       LEFT JOIN articulos a ON dof.id_articulo = a.id_articulo
       LEFT JOIN ordenes_venta ov ON ofa.id_orden_venta = ov.id_orden_venta
       LEFT JOIN clientes c1 ON ov.id_cliente = c1.id_cliente
       LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
       LEFT JOIN clientes c2 ON p.id_cliente = c2.id_cliente
       WHERE cia.id_costo_indirecto = ?
       ORDER BY cia.id_orden_fabricacion`,
      [idCosto]
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
