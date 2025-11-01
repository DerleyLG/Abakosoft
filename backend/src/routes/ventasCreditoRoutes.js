const express = require("express");
const router = express.Router();
const VentasCreditoController = require("../controllers/VentasCreditoController");

// Crear crédito manual (factura pendiente sin OV)
router.post("/manual", VentasCreditoController.createManual);

router.get("/", VentasCreditoController.getAll);
router.get("/:id", VentasCreditoController.getById);
router.post("/:id/abonos", VentasCreditoController.registrarAbono);
router.get("/:id/abonos", VentasCreditoController.getAbonos);
router.get("/:id/resumen", VentasCreditoController.getResumenCredito);

module.exports = router;
