const express = require("express");
const router = express.Router();
const controller = require("../controllers/anticiposController");
const pagosController = require("../controllers/pagosTrabajadoresController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  controller.getAllAnticipos,
);
router.get(
  "/pendientes",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  controller.getPendientes,
);
router.get(
  "/por-trabajador",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  controller.getPorTrabajador,
);
router.post(
  "/",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  pagosController.createAnticipo,
);
router.get(
  "/:trab/:ord",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  controller.getAnticipoActivo,
);
router.patch(
  "/descontar",
  requirePlanFeature("anticipos"),
  requirePermission(ACTIONS.ANTICIPOS_VIEW),
  controller.descontarAnticipo,
);

module.exports = router;
