const express = require("express");
const router = express.Router();
const unidadesController = require("../controllers/unidadesController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

const requirePlanFeature = require("./_requirePlanFeature");

// Obtener todas las unidades
router.get("/", requirePlanFeature("unidades"), unidadesController.getAll);

// Obtener una unidad por ID
router.get("/:id", requirePlanFeature("unidades"), unidadesController.getById);

// Crear una nueva unidad
router.post(
  "/",
  requirePlanFeature("unidades"),
  requirePermission(ACTIONS.UNITS_MANAGE),
  unidadesController.create,
);

// Actualizar una unidad
router.put(
  "/:id",
  requirePlanFeature("unidades"),
  requirePermission(ACTIONS.UNITS_MANAGE),
  unidadesController.update,
);

// Eliminar una unidad
router.delete(
  "/:id",
  requirePlanFeature("unidades"),
  requirePermission(ACTIONS.UNITS_MANAGE),
  unidadesController.delete,
);

module.exports = router;
