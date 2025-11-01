const express = require("express");
const router = express.Router();
const controller = require("../controllers/costosIndirectosAsignadosController");

router.get("/", controller.getAll);
router.get("/resumen", controller.getResumen);
router.get("/sugerencias", controller.getSugerencias);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
