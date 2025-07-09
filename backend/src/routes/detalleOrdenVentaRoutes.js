const express = require('express');
const router = express.Router();
const detalleOrdenVentaController = require('../controllers/detalleOrdenVentaController');

// Ruta para obtener detalles por orden de venta
router.get('/:id', detalleOrdenVentaController.getDetallePorOrden);

module.exports = router;
