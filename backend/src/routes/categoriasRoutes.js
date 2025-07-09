const categoriasController = require ('../controllers/categoriasController');
const express = require ('express');
const router = express.Router();


router.get('/', categoriasController.getCategoria);
router.get('/:id', categoriasController.getCategoriaById);
router.post('/', categoriasController.createCategoria);
router.put('/:id', categoriasController.updateCategoria);
router.delete('/:id', categoriasController.deleteCategoria);

module.exports = router;