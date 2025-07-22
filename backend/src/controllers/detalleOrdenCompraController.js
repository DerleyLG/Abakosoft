const detalleOrdenCompraModel = require('../models/detalleOrdenCompraModel');

// Obtener todos los detalles de una orden de compra
const obtenerDetallesPorOrden = async (req, res) => {
  try {
    const { id_orden_compra } = req.params;
    const detalles = await detalleOrdenCompraModel.getByOrdenCompra(id_orden_compra);
    res.json(detalles);
  } catch (error) {
    console.error('Error al obtener los detalles de la orden:', error);
    res.status(500).json({ error: 'Error al obtener los detalles de la orden' });
  }
};

// Crear un nuevo detalle de orden de compra
const crearDetalle = async (req, res) => {
  try {
    const nuevoDetalle = req.body;
    const insertId = await detalleOrdenCompraModel.create(nuevoDetalle);
    res.status(201).json({ message: 'Detalle creado correctamente', id: insertId });
  } catch (error) {
    console.error('Error al crear detalle:', error);
    res.status(400).json({ error: error.message || 'Error al crear detalle' });
  }
};

// Actualizar un detalle de orden de compra
const actualizarDetalle = async (req, res) => {
  try {
    const { id_detalle_compra } = req.params;
    const camposActualizados = req.body;
    await detalleOrdenCompraModel.update(id_detalle_compra, camposActualizados);
    res.json({ message: 'Detalle actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar detalle:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar detalle' });
  }
};

// Eliminar un detalle de orden de compra
const eliminarDetalle = async (req, res) => {
  try {
    const { id_detalle_compra } = req.params;
    await detalleOrdenCompraModel.delete(id_detalle_compra);
    res.json({ message: 'Detalle eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar detalle:', error);
    res.status(500).json({ error: 'Error al eliminar detalle' });
  }
};

module.exports = {
  obtenerDetallesPorOrden,
  crearDetalle,
  actualizarDetalle,
  eliminarDetalle,
};
