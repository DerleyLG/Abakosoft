const UnidadesModel = require("../models/unidadesModel");

const unidadesController = {
  getAll: async (req, res) => {
    try {
      const unidades = await UnidadesModel.getAll();
      res.json(unidades);
    } catch (error) {
      console.error("Error al obtener unidades:", error);
      res.status(500).json({ error: "Error al obtener unidades" });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const unidad = await UnidadesModel.getById(id);
      if (!unidad) {
        return res.status(404).json({ error: "Unidad no encontrada" });
      }
      res.json(unidad);
    } catch (error) {
      console.error("Error al obtener unidad:", error);
      res.status(500).json({ error: "Error al obtener unidad" });
    }
  },

  create: async (req, res) => {
    try {
      const { nombre, abreviatura } = req.body;
      if (!nombre || !abreviatura) {
        return res
          .status(400)
          .json({ error: "Nombre y abreviatura son obligatorios" });
      }
      const id = await UnidadesModel.create({ nombre, abreviatura });
      res.status(201).json({ id_unidad: id, nombre, abreviatura });
    } catch (error) {
      console.error("Error al crear unidad:", error);
      res.status(500).json({ error: "Error al crear unidad" });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, abreviatura } = req.body;
      if (!nombre || !abreviatura) {
        return res
          .status(400)
          .json({ error: "Nombre y abreviatura son obligatorios" });
      }
      const result = await UnidadesModel.update(id, { nombre, abreviatura });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Unidad no encontrada" });
      }
      res.json({ message: "Unidad actualizada correctamente" });
    } catch (error) {
      console.error("Error al actualizar unidad:", error);
      res.status(500).json({ error: "Error al actualizar unidad" });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await UnidadesModel.delete(id);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Unidad no encontrada" });
      }
      res.json({ message: "Unidad eliminada correctamente" });
    } catch (error) {
      console.error("Error al eliminar unidad:", error);
      res.status(500).json({ error: "Error al eliminar unidad" });
    }
  },
};

module.exports = unidadesController;
