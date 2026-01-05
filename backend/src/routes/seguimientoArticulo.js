const express = require("express");
const router = express.Router();
const seguimientoArticuloController = require("../controllers/seguimientoArticuloController");
const verifyToken = require("../middlewares/verifyToken");

// Obtener seguimiento completo de un artículo
router.get("/:id", verifyToken, seguimientoArticuloController.getSeguimiento);

// Endpoints específicos por tipo de orden
router.get(
  "/:id/ventas",
  verifyToken,
  seguimientoArticuloController.getOrdenesVenta
);
router.get(
  "/:id/pedidos",
  verifyToken,
  seguimientoArticuloController.getOrdenesPedido
);
router.get(
  "/:id/fabricacion",
  verifyToken,
  seguimientoArticuloController.getOrdenesFabricacion
);
router.get(
  "/:id/compras",
  verifyToken,
  seguimientoArticuloController.getOrdenesCompra
);

module.exports = router;
