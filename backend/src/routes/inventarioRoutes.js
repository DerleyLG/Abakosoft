const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventarioController');

router.post('/movimientos', inventarioController.registrarMovimiento);
router.get('/', inventarioController.obtenerInventario);
router.get('/:id', inventarioController.getById);
router.put('/:id', inventarioController.actualizarInventario);
router.delete('/:id_articulo', inventarioController.eliminarArticulo);

module.exports = router;
