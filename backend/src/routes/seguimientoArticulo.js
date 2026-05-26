const express = require("express");
const router = express.Router();
const seguimientoArticuloController = require("../controllers/seguimientoArticuloController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getAllMovimientos,
);
router.get(
  "/:id",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getSeguimiento,
);
router.get(
  "/:id/ventas",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getOrdenesVenta,
);
router.get(
  "/:id/pedidos",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getOrdenesPedido,
);
router.get(
  "/:id/fabricacion",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getOrdenesFabricacion,
);
router.get(
  "/:id/compras",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getOrdenesCompra,
);
router.get(
  "/:id/movimientos-detallados",
  requirePlanFeature("seguimiento_inventario"),
  requirePermission(ACTIONS.INVENTORY_TRACKING),
  seguimientoArticuloController.getMovimientosDetallados,
);

module.exports = router;
