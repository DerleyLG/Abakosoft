const model = require('../models/serviciosTercerizadosModel');
const proveedoresModel = require('../models/proveedoresModel'); // para validación

module.exports = {
  async create(req, res) {
    try {
      const { id_proveedor, descripcion, estado, costo } = req.body;

      if (!id_proveedor || !descripcion || !costo) {
        return res.status(400).json({ error: 'Campos obligatorios faltantes' });
      }
        if (isNaN(costo) || costo < 0) {
        return res.status(400).json({ error: "Costo inválido" });
        }

      const proveedor = await proveedoresModel.getById(id_proveedor);
      if (!proveedor) {
        return res.status(400).json({ error: 'Proveedor no existe' });
      }

      if (!['pendiente', 'finalizado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const id = await model.create({ id_proveedor, descripcion, estado, costo });
      res.status(201).json({ message: 'Servicio registrado', id_servicio: id });

    } catch (error) {
      console.error('Error al crear servicio:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async getAll(req, res) {
    try {
      const servicios = await model.getAll();
      res.json(servicios);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener servicios' });
    }
  },

  async getById(req, res) {
    try {
      const servicio = await model.getById(req.params.id);
      if (!servicio) return res.status(404).json({ error: 'No encontrado' });
      res.json(servicio);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener servicio' });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { id_proveedor, descripcion, estado, costo } = req.body;

      if (!id_proveedor || !descripcion || !estado || !costo) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
      }
        if (isNaN(costo) || costo < 0) {
        return res.status(400).json({ error: "Costo inválido" });
        }

      if (!['pendiente', 'finalizado'].includes(estado)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }
      const proveedor = await proveedoresModel.getById(id_proveedor);
      if (!proveedor) {
        return res.status(400).json({ error: "Proveedor no existe" });
      }
      const updated = await model.update(id, { id_proveedor, descripcion, estado, costo });
      if (!updated) return res.status(404).json({ error: 'Servicio no encontrado' });

      res.json({ message: 'Servicio actualizado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar servicio' });
    }
  },

  async delete(req, res) {
    try {
      const deleted = await model.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Servicio no encontrado' });
      res.json({ message: 'Servicio eliminado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar servicio' });
    }
  }
};
