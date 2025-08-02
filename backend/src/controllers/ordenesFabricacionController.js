const ordenesFabricacionModel = require('../models/ordenesFabricacionModel');
const detalleOrdenFabricacionModel = require('../models/detalleOrdenFabricacionModel');
const inventarioModel = require('../models/inventarioModel');

module.exports = {
 getAll: async (req, res) => {
    try {
      const { estados } = req.query; 

      let estadosToFilter = [];
      if (estados) {
        estadosToFilter = estados.split(','); 
      } else {
        
        estadosToFilter = ['pendiente', 'en proceso', 'completada'];
      }

    
      const ordenes = await ordenesFabricacionModel.getAll(estadosToFilter);

      res.status(200).json(ordenes);
    } catch (error) {
      console.error("Error al obtener órdenes de fabricación:", error);
      res.status(500).json({ error: "Error interno del servidor al obtener órdenes de fabricación." });
    }
  },

  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const orden = await ordenesFabricacionModel.getById(id);

      if (!orden) {
        return res.status(404).json({ error: 'Orden de fabricación no encontrada.' });
      }

      const detalles = await detalleOrdenFabricacionModel.getAll(id);
      res.json({ ...orden, detalles });
    } catch (error) {
      console.error('Error en getById:', error);
      res.status(500).json({ error: 'Error al obtener la orden de fabricación.' });
    }
  },

create: async (req, res) => {
   try {
    const { orden, detalles } = req.body;

    if (!orden || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({ error: 'Datos incompletos: se requiere orden y al menos un detalle.' });
    }

    const { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado, id_pedido } = orden;

    if (!estado || !['pendiente', 'en proceso', 'completado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido.' });
    }

    // Crear orden de fabricación
    const id_orden_fabricacion = await ordenesFabricacionModel.create({
      id_orden_venta,
      fecha_inicio,
      fecha_fin_estimada,
      estado,
      id_pedido
    });

    // Crear cada detalle de fabricación
    for (const detalle of detalles) {
      const { id_articulo, cantidad, id_etapa_final } = detalle;

      if (!id_etapa_final || !id_articulo || !cantidad) {
        return res.status(400).json({ error: 'Faltan campos en uno o más detalles.' });
      }
console.log("Detalles a guardar:", detalles);
      await detalleOrdenFabricacionModel.create({
        id_orden_fabricacion,
        id_articulo,
        cantidad,
        id_etapa_final
      });
    }
    res.status(201).json({
      message: 'Orden de fabricación y detalles creados correctamente.',
      id_orden_fabricacion
    });
  } catch (error) {
    console.error('Error al crear orden de fabricación:', error);
    res.status(500).json({ error: 'Error interno al crear la orden de fabricación.' });
  }
},
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado } = req.body;

      await ordenesFabricacionModel.update(id, {
        id_orden_venta,
        fecha_inicio,
        fecha_fin_estimada,
        estado
      });

      res.json({ message: 'Orden de fabricación actualizada correctamente.' });
    } catch (error) {
      console.error('Error en update:', error);
      res.status(500).json({ error: 'Error al actualizar la orden de fabricación.' });
    }
  },


delete: async (req, res) => {
  try {
    const id = req.params.id;

    // Verificar si la orden ya está cancelada
    const orden = await ordenesFabricacionModel.getById(id);
    if (!orden) {
      return res.status(404).json({ error: 'Orden no encontrada.' });
    }
    if (orden.estado === 'cancelada') {
      return res.status(400).json({ error: 'La orden ya está cancelada.' });
    }

    // Marcar como cancelada (ya no eliminamos detalles)
    await ordenesFabricacionModel.delete(id);

    res.json({ message: 'Orden de fabricación cancelada correctamente.' });
  } catch (error) {
    console.error('Error al cancelar la orden de fabricación:', error);
    res.status(500).json({ error: 'Error al cancelar la orden de fabricación.' });
  }
},
 existe: async  (req, res) => {
  try {
    const { id_pedido } = req.params;
    const existe = await ordenesFabricacionModel.checkIfExistsByPedidoId(id_pedido);
    res.json({ existe });
  } catch (error) {
    console.error('Error al verificar la orden de fabricación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
 }
};