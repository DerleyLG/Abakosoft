const express = require("express");
const router = express.Router();
const controller = require("../controllers/historialCostosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.post(
  "/",
  requirePermission(ACTIONS.COST_HISTORY_VIEW),
  controller.create,
);
router.put(
  "/:id",
  requirePermission(ACTIONS.COST_HISTORY_VIEW),
  controller.update,
);
router.delete(
  "/:id",
  requirePermission(ACTIONS.COST_HISTORY_VIEW),
  controller.delete,
);

module.exports = router;
