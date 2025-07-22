const express = require('express');
const router = express.Router();
const detalleController = require('../controllers/detalleOrdenCompraController');

// Obtener todos los detalles por orden
router.get('/orden/:id_orden_compra', detalleController.obtenerDetallesPorOrden);

// Crear un nuevo detalle
router.post('/', detalleController.crearDetalle);

// Actualizar detalle
router.put('/:id', detalleController.actualizarDetalle);

// Eliminar detalle
router.delete('/:id', detalleController.eliminarDetalle);

module.exports = router;
