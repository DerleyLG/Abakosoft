const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/movimientosInventarioController');

// Crear movimiento
router.post('/', inventarioController.createMovimiento);  

// Obtener todos los movimientos
router.get('/', inventarioController.getMovimientos);  

// Obtener movimiento por ID
router.get('/:id', inventarioController.getMovimientoById); 

// Actualizar movimiento
router.put('/:id', inventarioController.updateMovimiento);  

// Eliminar movimiento
router.delete('/:id', inventarioController.deleteMovimiento); 

module.exports = router;
