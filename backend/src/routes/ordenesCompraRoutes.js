const ordenesCompraController = require('../controllers/ordenesCompraController');
const express = require ('express');
const router = express.Router();

router.get('/', ordenesCompraController.getOrdenesCompra);
router.get('/:id', ordenesCompraController.getOrdenCompraById);
router.post('/', ordenesCompraController.createOrdenCompra);
router.put('/:id', ordenesCompraController.updateOrdenCompra);
router.delete('/:id', ordenesCompraController.deleteOrdenCompra);
router.post('/:id/recibir', ordenesCompraController.confirmarRecepcion);

module.exports = router