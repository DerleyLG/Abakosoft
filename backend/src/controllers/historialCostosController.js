const historialCostosModel = require('../models/historialCostosModel');
const etapasProduccionModel = require('../models/etapasProduccionModel');
const articulosModel = require('../models/articulosModel');



const historialCostosController = {
  getAll: async (req, res) => {
    try {
      const historial = await historialCostosModel.getAll();
      res.json(historial);
    } catch (error) {
      console.error('Error obteniendo historial de costos:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const registro = await historialCostosModel.getById(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }
      res.json(registro);
    } catch (error) {
      console.error('Error obteniendo registro:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  create: async (req, res) => {
    try {
        console.log('Body recibido:', req.body);
      const {id_articulo, id_etapa, costo_unitario, fecha_inicio} = req.body;

        // Validación básica de campos obligatorios
      if (!id_articulo|| !id_etapa || !costo_unitario || !fecha_inicio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      // Validación: etapa de producción debe existir
      const etapa = await etapasProduccionModel.getById(id_etapa);
      if (!etapa) {
        return res.status(400).json({ error: 'La etapa de producción no existe' });
      }

        const articulo = await articulosModel.getById(id_articulo);
      if (!articulo) {
        return res.status(400).json({ error: 'el articulo no existe' });
      }
      const nuevoId = await historialCostosModel.create({
        id_etapa,
        id_articulo,
        costo_unitario,
        fecha_inicio
      });

      res.status(201).json({ message: 'Registro creado correctamente', id_historial: nuevoId });
    } catch (error) {
      console.error('Error creando historial:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  update: async (req, res) => {
    try {
    const { id } = req.params;
      const { id_articulo, id_etapa, costo_unitario, fecha_inicio } = req.body;

            // Validación básica de campos obligatorios
      if (!id_articulo|| !id_etapa || !costo_unitario || !fecha_inicio) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      // Validación: etapa de producción debe existir
      const etapa = await etapasProduccionModel.getById(id_etapa);
      if (!etapa) {
        return res.status(400).json({ error: 'La etapa de producción no existe' });
      }

        const articulo = await articulosModel.getById(id_articulo);
      if (!articulo) {
        return res.status(400).json({ error: 'el articulo no existe' });
      }
    
      const registro = await historialCostosModel.getById(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      await historialCostosModel.update(id, {
        id_articulo,
        id_etapa,
         costo_unitario,
        fecha_inicio
    
      });

      res.json({ message: 'Registro actualizado correctamente' });
    } catch (error) {
      console.error('Error actualizando historial:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const registro = await historialCostosModel.getById(id);
      if (!registro) {
        return res.status(404).json({ error: 'Registro no encontrado' });
      }

      await historialCostosModel.delete(id);
      res.json({ message: 'Registro eliminado correctamente' });
    } catch (error) {
      console.error('Error eliminando historial:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
};

module.exports = historialCostosController;
