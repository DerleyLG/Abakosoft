const express = require("express");
const router = express.Router();
const detallePagoController = require("../controllers/detallePagoTrabajadorController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.post(
  "/",
  requirePlanFeature("pagos"),
  requirePermission(ACTIONS.PAYMENTS_CREATE),
  detallePagoController.create,
);
router.get(
  "/",
  requirePlanFeature("pagos"),
  requirePermission(ACTIONS.PAYMENTS_VIEW),
  detallePagoController.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("pagos"),
  requirePermission(ACTIONS.PAYMENTS_VIEW),
  detallePagoController.getById,
);
router.put(
  "/:id",
  requirePlanFeature("pagos"),
  requirePermission(ACTIONS.PAYMENTS_CREATE),
  detallePagoController.update,
);
router.delete(
  "/:id",
  requirePlanFeature("pagos"),
  requirePermission(ACTIONS.PAYMENTS_DELETE),
  detallePagoController.delete,
);

module.exports = router;
