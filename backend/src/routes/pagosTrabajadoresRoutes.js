const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosTrabajadoresController');



// Rutas para pagos
router.get('/', pagosController.getAllPagos);
router.get('/:id', pagosController.getPagoById);
router.post('/', pagosController.createPago);
router.put('/:id', pagosController.updatePago);
router.delete('/:id', pagosController.deletePago);

module.exports = router;
