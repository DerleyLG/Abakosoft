const express = require("express");
const router = express.Router();
const inventarioController = require("../controllers/inventarioController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Ver inventario y bajo stock
router.get(
  "/",
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.obtenerInventario
);
router.get(
  "/bajo-stock",
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.getArticulosBajoStock
);
router.get(
  "/:id",
  requirePermission(ACTIONS.INVENTORY_VIEW),
  inventarioController.getById
);

// Crear/ajustar stock e inicializar: supervisor y admin
router.post(
  "/movimientos",
  requirePermission(ACTIONS.INVENTORY_EDIT),
  inventarioController.registrarMovimiento
);
router.post(
  "/inicializar",
  requirePermission(ACTIONS.INVENTORY_EDIT),
  inventarioController.inicializarArticuloEnInventario
);
router.put(
  "/:id",
  requirePermission(ACTIONS.INVENTORY_EDIT),
  inventarioController.actualizarInventario
);

// Eliminar del inventario: solo admin
router.delete(
  "/:id_articulo",
  requirePermission(ACTIONS.INVENTORY_DELETE),
  inventarioController.eliminarArticulo
);

module.exports = router;
