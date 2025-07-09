const DetalleOrdenVenta = require('../models/detalleOrdenVentaModel');

const getDetallePorOrden = async (req, res) => {
  try {
    const id_orden_venta = req.params.id;
    let detalles = await DetalleOrdenVenta.getByVenta(id_orden_venta);

    // Calcular subtotal para cada detalle
    detalles = detalles.map(detalle => ({
      ...detalle,
      subtotal: detalle.cantidad * detalle.precio_unitario
    }));

    res.json(detalles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error al obtener detalles' });
  }
};
module.exports = {
  getDetallePorOrden,
};
