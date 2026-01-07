
const db = require("../database/db");

module.exports = {

  create: async ({
    id_articulo,
    cantidad_movida,
    tipo_movimiento,
    tipo_origen_movimiento,
    observaciones = null,
    referencia_documento_id = null,
    referencia_documento_tipo = null,
    fecha_movimiento = new Date() 
  }) => {
    const [result] = await db.query(
      `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo, fecha_movimiento)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_articulo,
        cantidad_movida,
        tipo_movimiento,
        tipo_origen_movimiento,
        observaciones,
        referencia_documento_id,
        referencia_documento_tipo,
        fecha_movimiento
      ]
    );
    return result.insertId;
  },

  
  getAll: async () => {
    const [rows] = await db.query(`
      SELECT mi.id_movimiento, mi.id_articulo, a.descripcion AS articulo_descripcion,
             mi.cantidad_movida, mi.tipo_movimiento, mi.tipo_origen_movimiento,
             mi.observaciones, mi.referencia_documento_id, mi.referencia_documento_tipo, mi.fecha_movimiento
      FROM movimientos_inventario mi
      JOIN articulos a ON mi.id_articulo = a.id_articulo
      ORDER BY mi.fecha_movimiento DESC;
    `);
    return rows;
  },


  getById: async (id) => {
    const [rows] = await db.query('SELECT * FROM movimientos_inventario WHERE id_movimiento = ?', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

};
