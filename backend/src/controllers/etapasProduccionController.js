const etapasModel = require('../models/etapasProduccionModel');
const db = require ('../database/db');

const etapasProduccionController = {
  getAll: async (req, res) => {
    try {
      const etapas = await etapasModel.getAll();
      res.json(etapas);
    } catch (error) {
      console.error("Error al obtener etapas:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  getById: async (req, res) => {
    try {
      const etapa = await etapasModel.getById(req.params.id);
      if (!etapa) return res.status(404).json({ error: "Etapa no encontrada" });
      res.json(etapa);
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  create: async (req, res) => {
    try {
      const { nombre, descripcion } = req.body;
      if (!nombre)
        return res
          .status(400)
          .json({ error: "El nombre de la etapa es obligatorio" });

      const id = await etapasModel.create({ nombre, descripcion });
      res.status(201).json({ message: "Etapa creada", id });
    } catch (error) {
      console.error("Error al crear etapa:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  update: async (req, res) => {
    try {
      const etapa = await etapasModel.getById(req.params.id);
      if (!etapa) return res.status(404).json({ error: "Etapa no encontrada" });
      const { nombre_etapa, descripcion } = req.body;
      await etapasModel.update(req.params.id, { nombre_etapa, descripcion });
      res.json({ message: "Etapa actualizada" });
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;

    const [etapaUsada] = await db.query(
        `SELECT 1 FROM detalle_orden_fabricacion WHERE id_etapa_final = ? LIMIT 1`,
        [id]
      );

      if (etapaUsada.length > 0) {
        return res.status(400).json({
          error: 'La etapa está siendo utilizada',
        });
      }
    try {
      const etapa = await etapasModel.getById(req.params.id);
      if (!etapa) return res.status(404).json({ error: "Etapa no encontrada" });
      await etapasModel.delete(req.params.id);
      res.json({ message: "Etapa eliminada" });
    } catch (error) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
};

module.exports = etapasProduccionController;
