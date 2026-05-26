const proveedorController = require("../controllers/proveedoresController");
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

const requirePlanFeature = require("./_requirePlanFeature");

router.get(
  "/",
  requirePlanFeature("proveedores"),
  requirePermission(ACTIONS.SUPPLIERS_VIEW),
  proveedorController.getProveedores,
);
router.get(
  "/:id",
  requirePlanFeature("proveedores"),
  requirePermission(ACTIONS.SUPPLIERS_VIEW),
  proveedorController.getProveedoresById,
);
router.post(
  "/",
  requirePlanFeature("proveedores"),
  requirePermission(ACTIONS.SUPPLIERS_CREATE),
  checkIdempotency,
  proveedorController.createProveedor,
);
router.put(
  "/:id",
  requirePlanFeature("proveedores"),
  requirePermission(ACTIONS.SUPPLIERS_EDIT),
  checkIdempotency,
  proveedorController.updateProveedor,
);
router.delete(
  "/:id",
  requirePlanFeature("proveedores"),
  requirePermission(ACTIONS.SUPPLIERS_DELETE),
  proveedorController.deleteProveedor,
);

module.exports = router;
