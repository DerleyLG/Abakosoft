const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosTrabajadoresController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');
const { ROLES } = require('../constants/roles');

// Rutas para pagos
router.get('/', pagosController.getAllPagos);
router.get('/:id', pagosController.getPagoById);
router.post('/', pagosController.createPago);
router.put('/:id', pagosController.updatePago);
router.delete('/:id', verifyToken, checkRole([ROLES.ADMIN]), pagosController.deletePago);

module.exports = router;
