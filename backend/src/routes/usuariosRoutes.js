const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.get(
  "/",
  verifyToken,
  requirePlanFeature("usuarios"),
  requirePermission(ACTIONS.USERS_MANAGE),
  usuariosController.getAll,
);

router.get(
  "/:id",
  verifyToken,
  requirePlanFeature("usuarios"),
  requirePermission(ACTIONS.USERS_MANAGE),
  usuariosController.getById,
);

router.post(
  "/",
  verifyToken,
  requirePlanFeature("usuarios"),
  requirePermission(ACTIONS.USERS_MANAGE),
  checkIdempotency,
  usuariosController.create,
);

router.put(
  "/:id",
  verifyToken,
  requirePlanFeature("usuarios"),
  requirePermission(ACTIONS.USERS_MANAGE),
  checkIdempotency,
  usuariosController.update,
);

router.delete(
  "/:id",
  verifyToken,
  requirePlanFeature("usuarios"),
  requirePermission(ACTIONS.USERS_MANAGE),
  usuariosController.delete,
);

module.exports = router;
