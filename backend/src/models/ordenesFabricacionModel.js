const db = require("../database/db");
const LoteModel = require("../models/lotesFabricadosModel");

module.exports = {
  getAll: async (estados = ["pendiente", "en proceso", "completada"]) => {
    const placeholders = estados.map(() => "?").join(",");

    const [rows] = await db.query(
      `
    SELECT 
      ofab.*, 
      p.id_pedido, 
      cli.nombre AS nombre_cliente
    FROM ordenes_fabricacion ofab
    LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
    LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
    WHERE ofab.estado IN (${placeholders})
    ORDER BY ofab.id_orden_fabricacion DESC;
  `,
      estados
    );
    return rows;
  },
  checkIfExistsByPedidoId: async (idPedido) => {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM ordenes_fabricacion WHERE id_pedido = ?`,
      [idPedido]
    );
    return rows[0].count > 0;
  },

  getById: async (id) => {
    const [rows] = await db.query(
      `SELECT 
       ofab.*, 
        p.id_pedido, 
        cli.nombre AS nombre_cliente
        FROM ordenes_fabricacion ofab
        LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
        LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
        WHERE ofab.id_orden_fabricacion = ?
 `,
      [id]
    );

    return rows[0] || null;
  },

  async getPedidoIdByOrdenId(idOrdenFabricacion) {
    try {
      const [rows] = await db.query(
        `SELECT id_pedido FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
        [idOrdenFabricacion]
      );
      return rows.length > 0 ? rows[0].id_pedido : null;
    } catch (error) {
      console.error("Error en OrdenesModel.getPedidoIdByOrdenId:", error);
      throw error;
    }
  },

  create: async ({
    id_orden_venta,
    fecha_inicio,
    fecha_fin_estimada,
    estado,
    id_pedido,
  }) => {
    const [result] = await db.query(
      `INSERT INTO ordenes_fabricacion (id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido)
       VALUES (?, ?, ?, ?,?)`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido]
    );
    return result.insertId;
  },

  update: async (
    id,
    { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado }
  ) => {
    await db.query(
      `UPDATE ordenes_fabricacion 
       SET id_orden_venta = ?, fecha_inicio = ?, fecha_fin_estimada = ?, estado = ? 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id]
    );
  },

  delete: async (id) => {
    const query = `
    UPDATE ordenes_fabricacion 
    SET estado = 'cancelada' 
    WHERE id_orden_fabricacion = ?
  `;

    await db.query(query, [id]);

    try {
      await LoteModel.deleteByOrdenId(id);
      console.log(
        `Lotes fabricados asociados a la orden ${id} eliminados físicamente.`
      );
    } catch (error) {
      console.error(
        `Error al eliminar lotes fabricados para la orden ${id}:`,
        error
      );
    }
  },

  async getPedidoIdByOrdenId(idOrdenFabricacion) {
    try {
      const [rows] = await db.query(
        `SELECT id_pedido FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
        [idOrdenFabricacion]
      );
      return rows.length > 0 ? rows[0].id_pedido : null;
    } catch (error) {
      console.error("Error en OrdenesModel.getPedidoIdByOrdenId:", error);
      throw error;
    }
  },
};
