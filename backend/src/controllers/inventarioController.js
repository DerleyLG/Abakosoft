const MovimientoInventario = require('../models/movimientosInventarioModel');
const Inventario = require('../models/inventarioModel');
const db = require('../database/db');

const registrarMovimiento = async (req, res) => {
  const {id,
    id_articulo,
    cantidad,
    tipo_movimiento,
    descripcion,
    origen,
    stock_minimo
  } = req.body;

 const articulo = await db.query('SELECT * FROM inventario WHERE id_articulo = ?', [id]);
   if (articulo.length === 0) {
    return res.status(404).json({ message: 'No encontrado' });
  }
  try {
    // Buscar si ya existe el artículo en inventario
 const resultado = await Inventario.agregarActualizarInventario(id_articulo, cantidad, stock_minimo);
if (resultado === 'error') {
      return res.status(500).json({ error: 'Error al actualizar inventario' });
    }
    // Registrar el movimiento
    await MovimientoInventario.create({
      id_articulo,
      cantidad,
      tipo_movimiento,
      descripcion,
      origen,
      fecha: new Date()
    });

   res.status(201).json({
  mensaje: 'Movimiento registrado con éxito',
  inventario: `Inventario ${resultado} correctamente`
})
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

const obtenerInventario = async (req, res) => {
  try {
    const inventario = await Inventario.obtenerTodo();
    res.json(inventario);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const articulo = await Inventario.getById(id);

    if (!articulo) {
      return res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
    }

    res.status(200).json(articulo);
  } catch (error) {
    console.error('Error al obtener artículo del inventario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};



const actualizarInventario = async (req, res) => {
  try {
    const { id_articulo, stock, stock_minimo } = req.body;

    if (!id_articulo || stock == null || stock_minimo == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existe = await Inventario.obtenerStock(id_articulo);
    if (!existe) {
      return res.status(404).json({ error: 'Artículo no encontrado en inventario' });
    }

    await Inventario.actualizarStock(id_articulo, stock, stock_minimo);
    res.json({ message: 'Inventario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    res.status(500).json({ error: 'Error al actualizar inventario' });
  }
};

const eliminarArticulo = async (req, res) => {
  try {
    const { id_articulo } = req.params;
    console.log('ID recibido para eliminar:', id_articulo);  

    const eliminado = await Inventario.eliminarDelInventario(id_articulo);

    if (eliminado) {
      res.status(200).json({ mensaje: 'Artículo eliminado del inventario' });
    } else {
      res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
    }
  } catch (error) {
    console.error('Error al eliminar artículo del inventario:', error);
    res.status(500).json({ mensaje: 'Error interno al eliminar el artículo' });
  }
};


module.exports = {
  registrarMovimiento,
  obtenerInventario,
  actualizarInventario,
  eliminarArticulo,
  getById
};
