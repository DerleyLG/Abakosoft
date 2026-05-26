const express = require("express");
const router = express.Router();
const controller = require("../controllers/etapasProduccionController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get("/", requirePlanFeature("etapas"), controller.getAll);
router.get("/:id", requirePlanFeature("etapas"), controller.getById);
router.post(
  "/",
  requirePlanFeature("etapas"),
  requirePermission(ACTIONS.PRODUCTION_STAGES_MANAGE),
  controller.create,
);
router.put(
  "/:id",
  requirePlanFeature("etapas"),
  requirePermission(ACTIONS.PRODUCTION_STAGES_MANAGE),
  controller.update,
);
router.delete(
  "/:id",
  requirePlanFeature("etapas"),
  requirePermission(ACTIONS.PRODUCTION_STAGES_MANAGE),
  controller.delete,
);

module.exports = router;
