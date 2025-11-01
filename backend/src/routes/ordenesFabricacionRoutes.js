const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenesFabricacionController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");


router.use(verifyToken);


router.get(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.getAll
);

router.get(
  "/existe/:id_pedido",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.existe
);

router.get(
  "/estado-pedido/:id_pedido",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.getEstadoOFByPedidoId
);


router.get(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.getById
);

// Crear una nueva orden de fabricación (supervisor y admin)
router.post(
  "/",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN, ROLES.OPERARIO]),
  controller.create
);

// Actualizar una orden de fabricación existente (supervisor y admin)
router.put(
  "/:id",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.update
);

// Eliminar una orden de fabricación (solo admin)
router.delete(
  "/:id",
  checkRole([ROLES.ADMIN, ROLES.SUPERVISOR]),
  controller.delete
);

module.exports = router;
