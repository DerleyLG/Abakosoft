const express = require("express");
const router = express.Router();
const controller = require("../controllers/anticiposController");
const pagosController = require("../controllers/pagosTrabajadoresController");

router.get("/", controller.getAllAnticipos);
router.get("/pendientes", controller.getPendientes);
router.get("/por-trabajador", controller.getPorTrabajador);
router.post("/", pagosController.createAnticipo);
router.get("/:trab/:ord", controller.getAnticipoActivo);
router.patch("/descontar", controller.descontarAnticipo);

module.exports = router;
