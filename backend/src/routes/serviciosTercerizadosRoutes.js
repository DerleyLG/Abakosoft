const express = require('express');
const router = express.Router();
const controller = require('../controllers/serviciosTercerizadosController');
const verifyToken = require('../middlewares/verifyToken');
const checkRole = require('../middlewares/checkRole');

router.post('/', verifyToken, checkRole(['admin', 'operario']),controller.create);
router.get('/', verifyToken, checkRole(['admin', 'operario']), controller.getAll);
router.get('/:id', verifyToken, checkRole(['admin', 'operario']), controller.getById);
router.put('/:id', verifyToken, checkRole(['admin', 'operario']), controller.update);
router.delete('/:id', verifyToken, checkRole(['admin', 'operario']), controller.delete);

module.exports = router;
