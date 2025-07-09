// src/routes/ordenesRoutes.js
const express = require('express');
const router = express.Router();
const controller  = require('../controllers/ordenesResumenController');

router.get('/resumen', controller.getResumenOrdenes);

module.exports = router;
