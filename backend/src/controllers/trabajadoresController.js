// src/controllers/trabajadoresController.js
const trabajadoresModel = require('../models/trabajadoresModel');

module.exports = {
  getAll: async (req, res) => {
    try {
      const trabajadores = await trabajadoresModel.getAll();
      res.json(trabajadores);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener trabajadores' });
    }
  },

  getById: async (req, res) => {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const trabajador = await trabajadoresModel.getById(id);
    if (!trabajador) return res.status(404).json({ error: 'Trabajador no encontrado' });

    res.json(trabajador);
  },

  create: async (req, res) => {
    const { nombre, telefono, cargo } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es obligatorio' });

    const id_trabajador = await trabajadoresModel.create({ nombre, telefono, cargo });
    res.status(201).json({ message: 'Trabajador creado', id_trabajador });
  },

  update: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    const { nombre, telefono, cargo, activo } = req.body;
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!nombre) return res.status(400).json({ error: 'El campo nombre es obligatorio' });

    const existing = await trabajadoresModel.getById(id);
    if (!existing) return res.status(404).json({ error: 'Trabajador no encontrado' });

    await trabajadoresModel.update(id, { nombre, telefono, cargo, activo });
    res.json({ message: 'Trabajador actualizado' });
  },

  delete: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const existing = await trabajadoresModel.getById(id);
    if (!existing) return res.status(404).json({ error: 'Trabajador no encontrado' });

    // Soft delete
    await trabajadoresModel.deactivate(id);
    res.json({ message: 'Trabajador inhabilitado' });
  }
};
