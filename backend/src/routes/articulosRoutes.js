const ArticulosController = require('../controllers/articulosController');
const express = require ('express');
const router = express.Router();


router.get('/', ArticulosController.getArticulos);
router.get('/:id', ArticulosController.getArticuloById);
router.post('/', ArticulosController.createArticulo);
router.put('/:id', ArticulosController.updateArticulo);
router.delete('/:id', ArticulosController.deleteArticulo);

module.exports = router;