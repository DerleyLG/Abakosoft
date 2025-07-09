const DetalleOrdenPedido = require('../models/detalleOrdenPedidosModel');

const getDetallePorPedido = async (req, res) => {
  try {
    const id_pedido = req.params.id;
    let detalles = await DetalleOrdenPedido.getByPedido(id_pedido);

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
  getDetallePorPedido
};
