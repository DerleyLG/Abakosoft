const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenesVentaController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

router.use(verifyToken);

router.get(
  "/articulos-con-stock",
  checkRole([ROLES.OPERARIO, ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getArticulosConStock
);

// Listado y detalle: supervisor y admin
router.get(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.getAll
);
router.get(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.getById
);

// Crear/actualizar: supervisor y admin
router.post(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.create
);
router.put(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.update
);

// Eliminar: solo admin
router.delete(
  "/:id",
  checkRole([ROLES.ADMIN, ROLES.SUPERVISOR]),
  controller.delete
);

module.exports = router;
