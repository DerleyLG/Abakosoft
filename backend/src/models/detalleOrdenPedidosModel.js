const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM detalle_pedido');
    return rows;
  },

  getByPedido: async (id_pedido, connection = db) => {
    console.log("Buscando detalles para id_pedido:", id_pedido);
    const [rows] = await (connection || db).query( // Usa la conexión pasada o db por defecto
      `SELECT dp.*, a.descripcion
       FROM detalle_pedido dp
       JOIN articulos a ON dp.id_articulo = a.id_articulo
       WHERE dp.id_pedido = ?`,
      [id_pedido]
    );
    console.log("Filas obtenidas:", rows);
    return rows;
  },

  // MODIFICADO: Acepta 'connection' opcional
  create: async ({ id_pedido, id_articulo, cantidad, observaciones, precio_unitario }, connection = db) => {
    const [result] = await (connection || db).query( // Usa la conexión pasada o db por defecto
      `INSERT INTO detalle_pedido
       (id_pedido, id_articulo, cantidad, observaciones, precio_unitario)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pedido, id_articulo, cantidad, observaciones, precio_unitario]
    );
    return result.insertId;
  },

  update: async (id, { id_pedido, id_articulo,cantidad, observaciones, precio_unitario }) => {
    await db.query(
      `UPDATE detalle_pedido
       SET id_pedido = ?, id_articulo = ?, cantidad = ?, precio_unitario = ?
       WHERE id_detalle_pedido = ?`,
      [id_pedido, id_articulo,cantidad, observaciones, precio_unitario , id]
    );
  },

  delete: async (id) => {
    await db.query('DELETE FROM detalle_pedido WHERE id_detalle_pedido = ?', [id]);
  },

  async getArticuloFinalFromPedido(id_pedido) {
       
            const [rows] = await db.query(
                `SELECT id_articulo, cantidad FROM detalle_pedido WHERE id_pedido = ?`,
                [id_pedido]
            );
            return rows.length > 0 ? rows[0] : null;
        
    },
    
};
