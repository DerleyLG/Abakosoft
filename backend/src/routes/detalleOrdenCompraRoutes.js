const express = require("express");
const router = express.Router();
const detalleController = require("../controllers/detalleOrdenCompraController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get(
  "/orden/:id_orden_compra",
  requirePermission(ACTIONS.PURCHASES_VIEW),
  detalleController.obtenerDetallesPorOrden,
);
router.post(
  "/",
  requirePermission(ACTIONS.PURCHASES_CREATE),
  detalleController.crearDetalle,
);
router.put(
  "/:id",
  requirePermission(ACTIONS.PURCHASES_EDIT),
  detalleController.actualizarDetalle,
);
router.delete(
  "/:id",
  requirePermission(ACTIONS.PURCHASES_DELETE),
  detalleController.eliminarDetalle,
);

module.exports = router;
