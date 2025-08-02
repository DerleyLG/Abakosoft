const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

// Ruta para servicios tercerizados asignados
router.get('/servicios-tercerizados', reportesController.getServiciosTercerizados);

// Ruta para servicios avances de fabricacion
router.get('/avance-fabricacion', reportesController.getAvanceFabricacion);

// Ruta para servicios Ordenes de compra
router.get('/ordenes-compra', reportesController.getReporteOrdenesCompra);

// Ruta para inventario
router.get('/inventario', reportesController.getInventarioActual);

router.get('/ventas-periodo', reportesController.getVentasPorPeriodo);

// Ruta para costos de produccion
router.get('/costos-produccion', reportesController.getCostosProduccion);

// Ruta para utilidad por orden de venta
router.get('/utilidad-por-orden', reportesController.getUtilidadPorOrden);

//Ruta para pagos de trabajadores
router.get('/pagos-trabajadores', reportesController.getPagosTrabajadores);

router.get('/movimientos-inventario', reportesController.getMovimientosInventario);


module.exports = router;
