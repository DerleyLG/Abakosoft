const express = require('express');
const router = express.Router();
const controller = require('../controllers/ordenesFabricacionController');

// Obtener todas las órdenes de fabricación
router.get('/', controller.getAll);

router.get('/existe/:id_pedido', controller.existe);

router.get('/estado-pedido/:id_pedido', controller.getEstadoOFByPedidoId);

// Obtener una orden de fabricación por ID
router.get('/:id', controller.getById);

// Crear una nueva orden de fabricación
router.post('/', controller.create);

// Actualizar una orden de fabricación existente
router.put('/:id', controller.update);

// Eliminar una orden de fabricación
router.delete('/:id', controller.delete);

module.exports = router;
