const detallePagoModel = require("../models/detallePagoTrabajadorModel");
const pagosTrabajadoresModel = require("../models/pagosTrabajadoresModel");
const avanceEtapasModel = require("../models/avanceEtapasModel");

module.exports = {
  // Crear nuevo detalle de pago
  create: async (req, res) => {
    try {
      const { id_pago, id_avance_etapa, cantidad, pago_unitario } = req.body;
      if (!id_pago || !id_avance_etapa || !cantidad || !pago_unitario) {
        return res.status(400).json({ message: "Faltan campos obligatorios" });
      }

      const pago = await pagosTrabajadoresModel.getById(id_pago);
      if (!pago) {
        return res
          .status(400)
          .json({ error: `No existe pago con id ${id_pago}` });
      }

      const avance = await avanceEtapasModel.getById(id_avance_etapa);
      if (!avance) {
        return res
          .status(400)
          .json({
            error: `No existe avance de etapa con id ${id_avance_etapa}`,
          });
      }

      const insertId = await detallePagoModel.create({
        id_pago,
        id_avance_etapa,
        cantidad,
        pago_unitario,
      });
     
      res.status(201).json({
        id_detalle_pago: insertId,
        message: "Detalle de pago creado correctamente",
      });
    } catch (error) {
      console.error("Error inesperado:", error);
    }
  },

  // Obtener todos los detalles
  getAll: async (req, res) => {
    try {
      const detalles = await detallePagoModel.getAll();
      res.json(detalles);
    } catch (error) {
      console.error("Error al obtener detalles:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  },

  // Obtener detalle por ID
  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const detalle = await detallePagoModel.getById(id);
      if (!detalle) {
        return res.status(404).json({ message: "Detalle no encontrado" });
      }
      res.json(detalle);
    } catch (error) {
      console.error("Error al obtener detalle:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  },

  // Actualizar detalle por ID
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const { id_pago, id_avance_etapa, cantidad, pago_unitario } = req.body;
      const pago = await pagosTrabajadoresModel.getById(id_pago);
      if (!pago) {
        return res
          .status(400)
          .json({ error: `No existe pago con id ${id_pago}` });
      }
      const existente = await detallePagoModel.getById(id);
      if (!existente) {
        return res.status(404).json({ message: "Detalle no encontrado" });
      }

      // Validar existencia de id_avance_etapa
      const avance = await avanceEtapasModel.getById(id_avance_etapa);
      if (!avance) {
        return res.status(400).json({
          error: `No existe avance de etapa con id ${id_avance_etapa}`,
        });
      }

      await detallePagoModel.update(id, {
        id_pago,
        id_avance_etapa,
        cantidad,
        pago_unitario,
      });
      res.json({ message: "Detalle actualizado correctamente" });
    } catch (error) {
      console.error("Error al actualizar detalle:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  },

  // Eliminar detalle por ID
  delete: async (req, res) => {
    try {
      const id = req.params.id;
      const existente = await detallePagoModel.getById(id);
      if (!existente) {
        return res.status(404).json({ message: "Detalle no encontrado" });
      }

      await detallePagoModel.delete(id);
      res.json({ message: "Detalle eliminado correctamente" });
    } catch (error) {
      console.error("Error al eliminar detalle:", error);
      res.status(500).json({ message: "Error del servidor" });
    }
  },
};
