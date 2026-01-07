const express = require("express");
const router = express.Router();
const seguimientoArticuloController = require("../controllers/seguimientoArticuloController");
const verifyToken = require("../middlewares/verifyToken");

// Obtener TODOS los movimientos de inventario (vista general con paginación)
router.get("/", verifyToken, seguimientoArticuloController.getAllMovimientos);

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

// Endpoint para movimientos detallados de inventario
router.get(
  "/:id/movimientos-detallados",
  verifyToken,
  seguimientoArticuloController.getMovimientosDetallados
);

module.exports = router;
