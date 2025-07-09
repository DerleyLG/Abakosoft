const proveedorController = require('../controllers/proveedoresController');
const express = require ('express');
const router = express.Router();

router.get('/', proveedorController.getProveedores);
router.get('/:id', proveedorController.getProveedoresById);
router.post('/', proveedorController.createProveedor);
router.put('/:id', proveedorController.updateProveedor);
router.delete('/:id', proveedorController.deleteProveedor);

module.exports = router;