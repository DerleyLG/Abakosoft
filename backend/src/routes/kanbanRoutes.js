const express = require("express");
const router = express.Router();
const kanbanController = require("../controllers/kanbanController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/ordenes-fabricacion",
  requirePlanFeature("kanban"),
  requirePermission(ACTIONS.KANBAN_VIEW),
  kanbanController.getOrdenesKanban,
);
router.get(
  "/ordenes-entregadas",
  requirePlanFeature("kanban"),
  requirePermission(ACTIONS.KANBAN_VIEW),
  kanbanController.getOrdenesEntregadas,
);
router.post(
  "/marcar-entregada/:id",
  requirePlanFeature("kanban"),
  requirePermission(ACTIONS.KANBAN_MANAGE),
  kanbanController.marcarComoEntregada,
);
router.post(
  "/marcar-entregadas",
  requirePlanFeature("kanban"),
  requirePermission(ACTIONS.KANBAN_MANAGE),
  kanbanController.marcarComoEntregadas,
);

module.exports = router;
