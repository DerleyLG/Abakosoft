const express = require("express");
const router = express.Router();
const controller = require("../controllers/costosIndirectosAsignadosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_VIEW),
  controller.getAll,
);
router.get(
  "/resumen",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_VIEW),
  controller.getResumen,
);
router.get(
  "/sugerencias",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_VIEW),
  controller.getSugerencias,
);
router.get(
  "/costo/:id",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_VIEW),
  controller.getByCostoIndirecto,
);
router.post(
  "/",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_ASSIGN),
  checkIdempotency,
  controller.create,
);
router.put(
  "/:id",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_EDIT),
  checkIdempotency,
  controller.update,
);
router.delete(
  "/:id",
  requirePlanFeature("costos"),
  requirePermission(ACTIONS.INDIRECT_COSTS_DELETE),
  controller.delete,
);

module.exports = router;
