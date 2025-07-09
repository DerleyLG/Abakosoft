const express = require('express');
const router = express.Router();
const detalleOrdenPedidoController = require('../controllers/detalleOrdenPedidoController');

// Ruta para obtener detalles por orden de Pedido
router.get('/:id', detalleOrdenPedidoController.getDetallePorPedido);

module.exports = router;
