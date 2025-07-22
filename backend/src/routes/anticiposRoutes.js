const express = require('express');
const router = express.Router();
const controller = require('../controllers/anticiposController');

router.get('/', controller.getAllAnticipos);
router.post('/', controller.crearAnticipo);
router.get('/:trab/:ord', controller.getAnticipoActivo);
router.patch('/descontar', controller.descontarAnticipo);


module.exports = router;
