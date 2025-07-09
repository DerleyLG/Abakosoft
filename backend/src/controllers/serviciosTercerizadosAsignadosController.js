const model = require('../models/serviciosTercerizadosAsignadosModel');
const serviciosModel = require('../models/serviciosTercerizadosModel');
const ordenesFabricacionModel = require('../models/ordenesFabricacionModel');
const etapasProduccionModel = require('../models/etapasProduccionModel');

module.exports = {
  async getAll(req, res) {
    try {
      const asignados = await model.getAll();
      res.json(asignados);
    } catch (error) {
      console.error('Error al obtener servicios asignados:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  },

  async getById(req, res) {
    try {
      const asignado = await model.getById(req.params.id);
      if (!asignado) return res.status(404).json({ error: 'No encontrado' });
      res.json(asignado);
    } catch (error) {
      res.status(500).json({ error: 'Error interno' });
    }
  },

  async create(req, res) {
    try {
      const { id_servicio, id_orden_fabricacion, id_etapa_produccion } = req.body;
      if (!id_servicio || !id_orden_fabricacion || !id_etapa_produccion) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      // Validar existencia de cada entidad
      const servicio = await serviciosModel.getById(id_servicio);
      if (!servicio) return res.status(400).json({ error: 'Servicio no existe' });

      const orden = await ordenesFabricacionModel.getById(id_orden_fabricacion);
      if (!orden) return res.status(400).json({ error: 'Orden de fabricación no existe' });

      const etapa = await etapasProduccionModel.getById(id_etapa_produccion);
      if (!etapa) return res.status(400).json({ error: 'Etapa de producción no existe' });

      const id = await model.create({ id_servicio, id_orden_fabricacion, id_etapa_produccion });
      res.status(201).json({ message: 'Asignación creada', id_asignacion: id });
    } catch (error) {
      console.error('Error al crear asignación:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { id_servicio, id_orden_fabricacion, id_etapa_produccion } = req.body;
      if (!id_servicio || !id_orden_fabricacion || !id_etapa_produccion) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }

      const updated = await model.update(id, { id_servicio, id_orden_fabricacion, id_etapa_produccion });
      if (!updated) return res.status(404).json({ error: 'Asignación no encontrada' });

      res.json({ message: 'Asignación actualizada' });
    } catch (error) {
      console.error('Error al actualizar asignación:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await model.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Asignación no encontrada' });
      res.json({ message: 'Asignación eliminada' });
    } catch (error) {
      console.error('Error al eliminar asignación:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  }
};
