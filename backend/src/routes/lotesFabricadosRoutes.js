const express = require('express');
const router = express.Router();
const lotesFabricadosController = require('../controllers/lotesFabricadosController');


router.get('/', lotesFabricadosController.getAll);
router.get('/:id', lotesFabricadosController.getById);
router.delete('/:id_lote', lotesFabricadosController.eliminar);

module.exports = router;
