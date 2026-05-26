const express = require("express");
const router = express.Router();
const detalleOrdenVentaController = require("../controllers/detalleOrdenVentaController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get(
  "/:id",
  requirePermission(ACTIONS.SALES_VIEW),
  detalleOrdenVentaController.getDetallePorOrden,
);

module.exports = router;
