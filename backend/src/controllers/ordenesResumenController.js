// src/controllers/ordenesController.js
const resumen = require('../models/ordenesResumenModel');

module.exports={
 getResumenOrdenes: async (req, res) => {
  try {
    const compra = await resumen.getResumenCompra();
    const fabricacion = await resumen.getResumenFabricacion();
    const venta = await resumen.getResumenVenta();

    res.json({ compra, fabricacion, venta });
  } catch (error) {
    console.error('Error al obtener resumen de órdenes:', error);
    res.status(500).json({ error: 'Error al obtener resumen de órdenes' });
  }
 },
}


