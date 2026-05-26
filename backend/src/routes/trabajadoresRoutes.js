const express = require("express");
const router = express.Router();
const controller = require("../controllers/trabajadoresController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("trabajadores"),
  requirePermission(ACTIONS.WORKERS_VIEW),
  controller.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("trabajadores"),
  requirePermission(ACTIONS.WORKERS_VIEW),
  controller.getById,
);
router.post(
  "/",
  requirePlanFeature("trabajadores"),
  requirePermission(ACTIONS.WORKERS_CREATE),
  checkIdempotency,
  controller.create,
);
router.put(
  "/:id",
  requirePlanFeature("trabajadores"),
  requirePermission(ACTIONS.WORKERS_EDIT),
  checkIdempotency,
  controller.update,
);
router.delete(
  "/:id",
  requirePlanFeature("trabajadores"),
  requirePermission(ACTIONS.WORKERS_DELETE),
  controller.delete,
);

module.exports = router;
