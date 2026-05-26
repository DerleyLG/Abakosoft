const express = require("express");
const router = express.Router();
const lotesFabricadosController = require("../controllers/lotesFabricadosController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("lotes"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  lotesFabricadosController.getAll,
);
router.get(
  "/:id",
  requirePlanFeature("lotes"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  lotesFabricadosController.getById,
);
router.delete(
  "/:id_lote",
  requirePlanFeature("lotes"),
  requirePermission(ACTIONS.FABRICATION_DELETE),
  lotesFabricadosController.eliminar,
);

module.exports = router;
