const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');


router.get('/', verifyToken, checkRole(['administrador', 'supervisor']), usuariosController.getAll);


router.get('/:id', verifyToken, checkRole(['administrador', 'supervisor']), usuariosController.getById);


router.post('/', verifyToken, checkRole(['administrador']), usuariosController.create);

router.put('/:id', verifyToken, checkRole(['administrador']), usuariosController.update);


router.delete('/:id', verifyToken, checkRole(['administrador']), usuariosController.delete);

module.exports = router;