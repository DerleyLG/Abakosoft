const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenPedidosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_VIEW),
  controller.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_VIEW),
  controller.getById,
);

router.put(
  "/:id/completar",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_EDIT),
  checkIdempotency,
  controller.complete,
);

router.post(
  "/",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_CREATE),
  checkIdempotency,
  controller.create,
);

router.put(
  "/:id",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_EDIT),
  checkIdempotency,
  controller.update,
);

router.delete(
  "/:id",
  requirePlanFeature("ordenes"),
  requirePermission(ACTIONS.ORDERS_DELETE),
  controller.delete,
);

module.exports = router;
