const db = require('../database/db');



const Articulo = {
  async getAll() {
      const [rows] = await db.query(`
    SELECT 
      a.*, 
      c.nombre AS nombre_categoria
    FROM 
      articulos a
    LEFT JOIN 
      categorias c ON a.id_categoria = c.id_categoria
  `);
  return rows;
  },

  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM articulos WHERE id_articulo = ?",
      [id]
    );
    return rows[0];
  },
  async create({referencia,descripcion,precio_venta, precio_costo, id_categoria}) {
    const [result] = await db.query(
      "INSERT INTO articulos (referencia, descripcion, precio_venta, id_categoria, precio_costo) VALUES (?, ?, ?, ?, ?)",
      [referencia, descripcion, precio_venta,  id_categoria, precio_costo]
    );
    return result.insertId;
  },
  async update(id, { referencia, descripcion, precio_venta, precio_costo, id_categoria}
  ) {
   const [result] = await db.query( 'UPDATE articulos SET referencia=?, descripcion=?, precio_venta=?,precio_costo=?, id_categoria=? WHERE id_articulo=?',
      [referencia, descripcion, precio_venta, precio_costo, id_categoria, id]
    );
    return result;
  },
  async delete(id) {
    const [result] = await db.query("DELETE FROM articulos WHERE id_articulo=?",[id]);
    return result;
  },

 async buscarArticulos (filtro) {
  const [rows] = await db.query(`
    SELECT a.*, c.nombre AS nombre_categoria
    FROM articulos a
    LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
    WHERE a.referencia LIKE ? OR a.descripcion LIKE ? OR c.nombre LIKE ?
  `, [`%${filtro}%`, `%${filtro}%`, `%${filtro}%`]);

  return rows;
  }
};

module.exports = Articulo;

