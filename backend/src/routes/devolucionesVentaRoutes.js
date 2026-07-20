const express = require("express");
const router = express.Router();

const controller = require("../controllers/devolucionVentasController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("devoluciones"),
  requirePermission(ACTIONS.RETURNS_VIEW),
  controller.getAll,
);

router.get(
  "/ventas/:id/preview",
  requirePlanFeature("devoluciones"),
  requirePermission(ACTIONS.RETURNS_CREATE),
  controller.getPreviewVenta,
);

router.get(
  "/:id",
  requirePlanFeature("devoluciones"),
  requirePermission(ACTIONS.RETURNS_VIEW),
  controller.getById,
);

router.post(
  "/",
  requirePlanFeature("devoluciones"),
  requirePermission(ACTIONS.RETURNS_CREATE),
  checkIdempotency,
  controller.create,
);

router.put(
  "/:id/anular",
  requirePlanFeature("devoluciones"),
  requirePermission(ACTIONS.RETURNS_CANCEL),
  checkIdempotency,
  controller.cancelar,
);

module.exports = router;
