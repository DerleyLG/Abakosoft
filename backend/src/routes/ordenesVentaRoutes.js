const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenesVentaController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/articulos-con-stock",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_VIEW),
  controller.getArticulosConStock,
);

router.get(
  "/",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_VIEW),
  controller.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_VIEW),
  controller.getById,
);

router.post(
  "/",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_CREATE),
  checkIdempotency,
  controller.create,
);
router.put(
  "/:id",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_EDIT),
  checkIdempotency,
  controller.update,
);

router.delete(
  "/:id",
  requirePlanFeature("ventas"),
  requirePermission(ACTIONS.SALES_DELETE),
  controller.delete,
);

module.exports = router;
