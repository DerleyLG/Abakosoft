const express = require('express');
const router = express.Router();
const movimientosInventarioController = require('../controllers/movimientosInventarioController'); 



// Obtener todos los movimientos
router.get('/', movimientosInventarioController.getMovimientos);

// Obtener movimiento por ID
router.get('/:id', movimientosInventarioController.getMovimientoById);

// Actualizar movimiento (sigue sin permitirse)
router.put('/:id', movimientosInventarioController.updateMovimiento);

// Eliminar movimiento (sigue sin permitirse)
router.delete('/:id', movimientosInventarioController.deleteMovimiento);

module.exports = router;
