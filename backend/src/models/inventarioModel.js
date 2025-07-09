const db = require('../database/db');

const obtenerStock = async (id_articulo) => {
  const [rows] = await db.query('SELECT * FROM inventario WHERE id_articulo = ?', [id_articulo]);
  return rows.length > 0 ? rows[0] : null;
};

const crearInventario = async (id_articulo, stock, stock_minimo = 0) => {
  const sql = `INSERT INTO inventario (id_articulo, stock, stock_minimo) VALUES (?, ?, ?)`;
  await db.query(sql, [id_articulo, stock, stock_minimo]);
};


const actualizarStock = async (id_articulo, stock, stock_minimo) => {
  const sql = `UPDATE inventario SET stock = ?, stock_minimo = ? WHERE id_articulo = ?`;
  const [result] = await db.query(sql, [stock, stock_minimo, id_articulo]);
  return result.affectedRows; 
};

const agregarActualizarInventario = async (id_articulo, stockNuevo, stock_minimo = 0) => {
  // Asegúrate que stockNuevo sea número válido
  stockNuevo = Number(stockNuevo);
  stock_minimo = Number(stock_minimo);

  if (isNaN(stockNuevo)) throw new Error('stockNuevo debe ser un número válido');
  if (isNaN(stock_minimo)) stock_minimo = 0;

  const inventarioExistente = await obtenerStock(id_articulo);

  if (inventarioExistente) {
    const nuevoStock = inventarioExistente.stock + stockNuevo;
    const nuevoStockMinimo = stock_minimo || inventarioExistente.stock_minimo;
    const result = await actualizarStock(id_articulo, nuevoStock, nuevoStockMinimo);
    return result > 0 ? 'actualizado' : 'error';
  } else {
    await crearInventario(id_articulo, stockNuevo, stock_minimo);
    return 'creado';
  }
};

const getById = async(id) =>{
  const [rows] = await db.query('SELECT * FROM inventario WHERE id_articulo= ?', [id]);
  return rows[0]
}

const obtenerTodo = async () => {
  const sql = `SELECT i.id_inventario, i.id_articulo, a.descripcion, i.stock, i.stock_minimo, i.ultima_actualizacion
               FROM inventario i
               JOIN articulos a ON i.id_articulo = a.id_articulo`;
  const [rows] = await db.query(sql);
  return rows;
};

const eliminarDelInventario = async (id_articulo) => {
  
  const [result] = await db.query('DELETE FROM inventario WHERE id_articulo = ?', [id_articulo]);
  return result.affectedRows > 0;
};

module.exports = {
  obtenerStock,
  crearInventario,
  actualizarStock,
  obtenerTodo,
  agregarActualizarInventario,
  eliminarDelInventario,
  getById
};