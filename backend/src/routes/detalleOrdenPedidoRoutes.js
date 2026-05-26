const express = require("express");
const router = express.Router();
const detalleOrdenPedidoController = require("../controllers/detalleOrdenPedidoController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get(
  "/:id",
  requirePermission(ACTIONS.ORDERS_VIEW),
  detalleOrdenPedidoController.getDetallePorPedido,
);

module.exports = router;
