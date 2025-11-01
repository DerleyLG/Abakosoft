const ordenesCompraController = require("../controllers/ordenesCompraController");
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

// Todas las rutas de órdenes de compra requieren autenticación
router.use(verifyToken);

// Listado y detalle: supervisor y admin
router.get(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  ordenesCompraController.getOrdenesCompra
);
router.get(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  ordenesCompraController.getOrdenCompraById
);

// Crear/actualizar: supervisor y admin
router.post(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  ordenesCompraController.createOrdenCompra
);
router.put(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  ordenesCompraController.updateOrdenCompra
);

// Confirmar recepción: supervisor y admin
router.post(
  "/:id/recibir",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  ordenesCompraController.confirmarRecepcion
);

router.delete(
  "/:id",
  checkRole([ROLES.ADMIN, ROLES.SUPERVISOR]),
  ordenesCompraController.deleteOrdenCompra
);

module.exports = router;
