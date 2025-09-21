// routes/metodosDePagoRoutes.js
const express = require('express');
const router = express.Router();
const metodosDePagoController = require('../controllers/metodosDePagoController');

router.get('/', metodosDePagoController.getMetodosPago);
router.post('/', metodosDePagoController.create);

module.exports = router;