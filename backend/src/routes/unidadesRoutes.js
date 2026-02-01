const express = require("express");
const router = express.Router();
const unidadesController = require("../controllers/unidadesController");
const verifyToken = require("../middlewares/verifyToken");

// Obtener todas las unidades
router.get("/", verifyToken, unidadesController.getAll);

// Obtener una unidad por ID
router.get("/:id", verifyToken, unidadesController.getById);

// Crear una nueva unidad
router.post("/", verifyToken, unidadesController.create);

// Actualizar una unidad
router.put("/:id", verifyToken, unidadesController.update);

// Eliminar una unidad
router.delete("/:id", verifyToken, unidadesController.delete);

module.exports = router;
