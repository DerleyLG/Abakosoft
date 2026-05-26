const express = require("express");
const router = express.Router();
const inventarioController = require("../controllers/inventarioController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Ver inventario y bajo stock
const requirePlanFeature = require("./_requirePlanFeature");

router.get(
  "/",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.obtenerInventario,
);
router.get(
  "/bajo-stock",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.getArticulosBajoStock,
);
router.get(
  "/:id",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.getById,
);

// Crear/ajustar stock e inicializar: supervisor y admin
router.post(
  "/movimientos",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_EDIT),
  checkIdempotency,
  inventarioController.registrarMovimiento,
);
router.post(
  "/inicializar",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_EDIT),
  checkIdempotency,
  inventarioController.inicializarArticuloEnInventario,
);
router.put(
  "/:id",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_EDIT),
  checkIdempotency,
  inventarioController.actualizarInventario,
);

// Eliminar del inventario: solo admin
router.delete(
  "/:id_articulo",
  requirePlanFeature("inventario"),
  requirePermission(ACTIONS.INVENTORY_DELETE),
  inventarioController.eliminarArticulo,
);

module.exports = router;
