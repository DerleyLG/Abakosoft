const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenPedidosController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Listado y detalle: operario, supervisor, admin
router.get(
  "/",
  checkRole([ROLES.OPERARIO, ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getAll
);
router.get(
  "/:id",
  checkRole([ROLES.OPERARIO, ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getById
);

// Completar pedido: supervisor y admin
router.put(
  "/:id/completar",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.complete
);

// Crear pedido: operario, supervisor, admin
router.post(
  "/",
  checkRole([ROLES.OPERARIO, ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.create
);

// Actualizar pedido: supervisor y admin
router.put(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.update
);

// Eliminar pedido: admin y supervisor (operario no)
router.delete(
  "/:id",
  checkRole([ROLES.ADMIN, ROLES.SUPERVISOR]),
  controller.delete
);

module.exports = router;
