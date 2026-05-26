// src/routes/ordenesRoutes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenesResumenController");
const verifyToken = require("../middlewares/verifyToken");

router.use(verifyToken);

router.get("/resumen", controller.getResumenOrdenes);

module.exports = router;
