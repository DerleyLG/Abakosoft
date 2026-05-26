const ordenesCompraController = require("../controllers/ordenesCompraController");
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const upload = require("../config/multer");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_VIEW),
  ordenesCompraController.getOrdenesCompra,
);
router.get(
  "/:id",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_VIEW),
  ordenesCompraController.getOrdenCompraById,
);

router.post(
  "/",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_CREATE),
  checkIdempotency,
  upload.single("comprobante"),
  ordenesCompraController.createOrdenCompra,
);

router.put(
  "/:id",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_EDIT),
  checkIdempotency,
  upload.single("comprobante"),
  ordenesCompraController.updateOrdenCompra,
);

router.put(
  "/:id/estado",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_EDIT),
  checkIdempotency,
  ordenesCompraController.updateEstadoOrdenCompra,
);

router.post(
  "/:id/recibir",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_CREATE),
  checkIdempotency,
  ordenesCompraController.confirmarRecepcion,
);

router.delete(
  "/:id",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_DELETE),
  ordenesCompraController.deleteOrdenCompra,
);

module.exports = router;
