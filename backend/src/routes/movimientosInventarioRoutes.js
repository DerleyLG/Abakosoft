const express = require("express");
const router = express.Router();
const movimientosInventarioController = require("../controllers/movimientosInventarioController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener todos los movimientos (solo supervisor y admin)
router.get(
  "/",
  requirePermission(ACTIONS.MOVEMENTS_VIEW),
  movimientosInventarioController.getMovimientos
);

// Obtener movimiento por ID (solo supervisor y admin)
router.get(
  "/:id",
  requirePermission(ACTIONS.MOVEMENTS_VIEW),
  movimientosInventarioController.getMovimientoById
);

// Actualizar movimiento (no permitido por diseño)
router.put(
  "/:id",
  requirePermission(ACTIONS.MOVEMENTS_VIEW),
  movimientosInventarioController.updateMovimiento
);

// Eliminar movimiento (no permitido por diseño)
router.delete(
  "/:id",
  requirePermission(ACTIONS.MOVEMENTS_VIEW),
  movimientosInventarioController.deleteMovimiento
);

module.exports = router;
