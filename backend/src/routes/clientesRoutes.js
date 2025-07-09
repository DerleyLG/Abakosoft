const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clientesController');


// GET    /api/clientes
router.get('/', clienteController.getClientes);

// GET    /api/clientes/:id
router.get('/:id', clienteController.getClienteById);

// POST   /api/clientes
router.post('/', clienteController.createCliente);

// PUT    /api/clientes/:id
router.put('/:id', clienteController.updateCliente);

// DELETE /api/clientes/:id
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
