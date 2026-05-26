const express = require("express");
const router = express.Router();
const controller = require("../controllers/serviciosTercerizadosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.post(
  "/",
  requirePlanFeature("servicios_tercerizados"),
  requirePermission(ACTIONS.OUTSOURCED_SERVICES_MANAGE),
  controller.create,
);
router.get(
  "/",
  requirePlanFeature("servicios_tercerizados"),
  requirePermission(ACTIONS.OUTSOURCED_SERVICES_VIEW),
  controller.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("servicios_tercerizados"),
  requirePermission(ACTIONS.OUTSOURCED_SERVICES_VIEW),
  controller.getById,
);
router.put(
  "/:id",
  requirePlanFeature("servicios_tercerizados"),
  requirePermission(ACTIONS.OUTSOURCED_SERVICES_MANAGE),
  controller.update,
);
router.delete(
  "/:id",
  requirePlanFeature("servicios_tercerizados"),
  requirePermission(ACTIONS.OUTSOURCED_SERVICES_MANAGE),
  controller.delete,
);

module.exports = router;
