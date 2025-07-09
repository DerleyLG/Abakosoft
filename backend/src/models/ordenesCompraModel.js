const db = require('../database/db');

const ordenCompras = {

   //obtener ordenes
  async getAll(){
    const [rows] = await db.query('SELECT * FROM ordenes_compra');
    return rows
  },

  //obtener ordenes por id
  async getById(id) {
    const [rows] = await db.query('SELECT * FROM ordenes_compra WHERE id_orden_compra=?', [id]);
    return rows[0]
  },

  //Insertar una nueva orden de compra
  async create( id_proveedor, categoria_costo, id_orden_fabricacion ){
    console.log('==> INSERTANDO EN ordenes_compra');
      const [result] = await db.query('INSERT INTO ordenes_compra (id_proveedor, categoria_costo, id_orden_fabricacion) VALUES (?,?,?)', [id_proveedor, categoria_costo, id_orden_fabricacion]);
      return result.insertId
  },

   //Actualizar una orden de compra
  async update(id, {id_proveedor, categoria_costo, id_orden_fabricacion}){
      const [result] = await db.query('UPDATE ordenes_compra SET id_proveedor=?, categoria_costo=?, id_orden_fabricacion=? WHERE id_orden_compra =?', [id_proveedor, categoria_costo, id_orden_fabricacion,id ]);
      return result
   
  },

  async delete(id){
      const [result] = await db.query('DELETE FROM ordenes_compra WHERE id_orden_compra =?', [id]);
      return result
  }
};

module.exports = ordenCompras;