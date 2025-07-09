const Model = require('../models/costosIndirectosAsignadosModel');

const isValidMes = (mes) => mes >= 1 && mes <= 12;
const isValidAnio = (anio) => anio >= 2020 && anio <= new Date().getFullYear();


module.exports = {
  getAll: async (req, res) => {
    try {
      const datos = await Model.getAll();
      res.json(datos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: async (req, res) => {
    const { id_costo_indirecto, id_orden_fabricacion, anio, mes, valor_asignado } = req.body;

    if (!id_costo_indirecto || !id_orden_fabricacion || !anio || !mes || !valor_asignado) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!isValidMes(mes)) {
      return res.status(400).json({ error: 'Mes inválido (1-12)' });
    }

    if (!isValidAnio(anio)) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    try {
      const id = await Model.create(req.body);
      res.status(201).json({ message: 'Asignación creada', id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  update: async (req, res) => {
    const id = req.params.id;
    const { id_costo_indirecto, id_orden_fabricacion, anio, mes, valor_asignado } = req.body;

    if (!id_costo_indirecto || !id_orden_fabricacion || !anio || !mes || !valor_asignado) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    if (!isValidMes(mes)) {
      return res.status(400).json({ error: 'Mes inválido (1-12)' });
    }

    if (!isValidAnio(anio)) {
      return res.status(400).json({ error: 'Año inválido' });
    }

    try {
      await Model.update(id, req.body);
      res.json({ message: 'Asignación actualizada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  delete: async (req, res) => {
    const id = req.params.id;
    try {
      await Model.delete(id);
      res.json({ message: 'Asignación eliminada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};
