const express = require('express');
const router = express.Router();
const detallePagoController = require('../controllers/detallePagoTrabajadorController');

router.post('/', detallePagoController.create);
router.get('/', detallePagoController.getAll);
router.get('/:id', detallePagoController.getById);
router.put('/:id', detallePagoController.update);
router.delete('/:id', detallePagoController.delete);

module.exports = router;
