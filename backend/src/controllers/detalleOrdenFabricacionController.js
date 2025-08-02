// src/controllers/detalleOrdenFabricacionController.js
const detalleModel = require('../models/detalleOrdenFabricacionModel');
const db = require('../database/db');


async function validarExistenciaDetallePago(id, detalleModel, res){
 const existente = await model.getById(id);
  if (!existente) {
    res.status(404).json({ message: 'Detalle no encontrado' });
    return null;
  }
  return existente;
}

async function ordenFabricacionExists(id) {
  const [rows] = await db.query('SELECT 1 FROM ordenes_fabricacion WHERE id_orden_fabricacion = ? LIMIT 1', [id]);
  return rows.length > 0;
}


module.exports = {
  getAll: async (req, res) => {
    try {
      const detalles = await detalleModel.getAll();
      res.json(detalles);
    } catch (error) {
       console.error('Error al obtener detalles:', error);
      res.status(500).json({ error: 'Error al obtener detalles.' });
    }
  },

  getById: async (req, res) => {
    const { id } = req.params;
    try {
      const detalles = await detalleModel.getById(id);
      res.json(detalles);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener detalles por orden.' });
    }
  },

  create: async (req, res) => {
    const { id_orden_fabricacion, id_articulo, cantidad, id_etapa_final } = req.body;
    try {
         if (
           !id_orden_fabricacion ||
           !id_articulo||
           !cantidad   ||
           !id_etapa_final
       
         ) {
           return res
             .status(400)
             .json({ error: "Faltan campos obligatorios." });
         }
         if (!(await ordenFabricacionExists(id_orden_fabricacion))) {
           return res
             .status(400)
             .json({ error: "Orden de fabricación no existe." });
         }
        

      const insertId = await detalleModel.create({ id_orden_fabricacion, id_articulo, cantidad, id_etapa_final});

      res.status(201).json({ message: 'Detalle creado', id: insertId });
    } catch (error) {
      res.status(500).json({ error: 'Error al crear detalle.' });
    }
  },

  update: async (req, res) => {
    const { id } = req.params;
    const { id_orden_fabricacion, id_articulo, cantidad , id_etapa_final } = req.body;

  const existente = await validarExistenciaDetallePago(id, detalleModel, res);
    if (!existente) return; // Ya respondió el error
    try {
      const id = req.params.id;


         if (
           !id_orden_fabricacion ||
           !id_articulo ||
           !cantidad ||
           !id_etapa_final
         ) {
           return res
             .status(400)
             .json({ error: "Faltan campos obligatorios." });
         }
         if (!(await ordenFabricacionExists(id_orden_fabricacion))) {
           return res
             .status(400)
             .json({ error: "Orden de fabricación no existe." });
         }
         if (!(await etapaProduccionExists(id_etapa_final))) {
           return res
             .status(400)
             .json({ error: "Etapa de producción no existe." });
         }

      await detalleModel.update(id, { id_orden_fabricacion, id_articulo, cantidad, id_etapa_final});
      res.json({ message: 'Detalle actualizado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar detalle.' });
    }
  },

  delete: async (req, res) => {
    const { id } = req.params;
    try {
        const existente = await validarExistenciaDetallePago(id, detalleModel, res);
    if (!existente) return; 
      await detalleModel.delete(id);
      res.json({ message: 'Detalle eliminado' });
    } catch (error) {
      res.status(500).json({ error: 'Error al eliminar detalle.' });
    }
  },
 
};
