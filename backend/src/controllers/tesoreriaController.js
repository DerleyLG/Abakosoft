const TesoreriaModel = require("../models/tesoreriaModel");

const tesoreriaController = {
 
  getMetodosPago: async (req, res) => {
    try {
      const metodos = await TesoreriaModel.getMetodosPago();
      res.json(metodos);
    } catch (error) {
      console.error("Error al obtener métodos de pago:", error);
      res.status(500).json({ error: "Error interno del servidor al obtener métodos de pago." });
    }
  },


  getMovimientosTesoreria: async (req, res) => {
    try {
      const movimientos = await TesoreriaModel.getMovimientosTesoreria();
      res.json(movimientos);
    } catch (error) {
      console.error("Error al obtener movimientos de tesorería:", error);
      res.status(500).json({ error: "Error interno del servidor al obtener movimientos de tesorería." });
    }
  },
  getIngresosSummary: async (req, res) => {
    try {
      const summary = await TesoreriaModel.getIngresosSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error al obtener el resumen de ingresos:", error);
      res.status(500).json({ error: "Error interno del servidor al obtener el resumen de ingresos." });
    }
  },

   getEgresosSummary: async (req, res) => {
    try {
      const egresosSummary = await TesoreriaModel.getEgresosSummary();
      res.json(egresosSummary);
    } catch (error) {
      console.error('Error al obtener el resumen de egresos:', error);
      res.status(500).json({ error: 'Error al obtener el resumen de egresos' });
    }
  },
  getPagosTrabajadoresCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getPagosTrabajadoresCount();
      res.json({ count });
    } catch (error) {
      console.error('Error al obtener el conteo de pagos a trabajadores:', error);
      res.status(500).json({ error: 'Error al obtener el conteo de pagos a trabajadores' });
    }
  },

  getOrdenesCompraCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getOrdenesCompraCount();
      res.json({ count });
    } catch (error) {
      console.error('Error al obtener el conteo de órdenes de compra:', error);
      res.status(500).json({ error: 'Error al obtener el conteo de órdenes de compra' });
    }
  },

  getCostosIndirectosCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getCostosIndirectosCount();
      res.json({ count });
    } catch (error) {
      console.error('Error al obtener el conteo de costos indirectos:', error);
      res.status(500).json({ error: 'Error al obtener el conteo de costos indirectos' });
    }
  },
  
  getMateriaPrimaCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getMateriaPrimaCount();
      res.json({ count });
    } catch (error) {
      console.error('Error al obtener el conteo de materia prima:', error);
      res.status(500).json({ error: 'Error al obtener el conteo de materia prima' });
    }
  },
  getMovimientoByDocumento: async (req, res) => {
    try {
      const idDocumento = req.params.idDocumento; 
      const tipoDocumento = req.query.tipo;     
      
      if (!idDocumento || !tipoDocumento) {
        return res.status(400).json({ message: 'Faltan parámetros: idDocumento y tipo.' });
      }
      
      const movimiento = await TesoreriaModel.getByDocumentoIdAndTipo(idDocumento, tipoDocumento);
      console.log("Movimiento recuperado del modelo:", movimiento);
      if (!movimiento) {

        return res.status(200).json(null); 
      }
      
    
      res.json(movimiento);
      
    } catch (error) {
      console.error('Error al obtener movimiento de tesorería por documento:', error);
      res.status(500).json({ error: 'Error interno del servidor al obtener movimiento de tesorería.' });
    }
  },
};

module.exports = tesoreriaController;