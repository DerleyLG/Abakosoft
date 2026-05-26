const express = require("express");
const router = express.Router();
const rolesController = require("../controllers/rolesController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.get(
  "/",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.getAll,
);

router.get(
  "/:id",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.getById,
);

router.post(
  "/",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.create,
);

router.put(
  "/:id",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.update,
);

router.delete(
  "/:id",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.delete,
);

router.get(
  "/:id/permisos",
  verifyToken,
  requirePlanFeature("roles"),
  requirePermission(ACTIONS.USERS_MANAGE),
  rolesController.getPermisos,
);

module.exports = router;
