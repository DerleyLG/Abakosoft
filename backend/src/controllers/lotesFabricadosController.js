const lotesmodel = require('../models/lotesFabricadosModel');

const getAll = async (req, res) => {
  try {
    const lotes = await lotesmodel.getAll();
    res.json(lotes);
  } catch (error) {
    console.error('Error al obtener lotes:', error);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
};

const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const orden = await lotesmodel.getById(id);

    if (!orden) {
      return res.status(404).json({ mensaje: 'orden de fabricacion no encontrada' });
    }

    res.status(200).json(orden);
  } catch (error) {
    console.error('Error al obtener lote:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

const eliminar = async (req, res) => {

  try {
    const { id_lote } = req.params;
    console.log('ID recibido para eliminar:', id_lote);  

    const eliminado = await lotesmodel.eliminar(id_lote);

    if (eliminado) {
      res.status(200).json({ mensaje: 'Lote eliminado ' });
    } else {
      res.status(404).json({ mensaje: 'Orden no encontrada' });
    }
  } catch (error) {
    console.error('Error al eliminar Lote ', error);
    res.status(500).json({ mensaje: 'Error interno al eliminar lote' });
  }
};


module.exports = {
    getById,
    getAll,
   eliminar
};