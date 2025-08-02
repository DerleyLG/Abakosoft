
const express = require('express');
const router = express.Router();
const compraMateriaPrimaController = require('../controllers/compraMateriaPrimaController');

// Ruta para crear una nueva compra de materia prima
router.post('/', compraMateriaPrimaController.createCompraMateriaPrima);

// Ruta para obtener todas las compras de materia prima
router.get('/', compraMateriaPrimaController.getComprasMateriaPrima);

module.exports = router;
