const express = require("express");
const router = express.Router();
const progresoFabricacionController = require("../controllers/progresoFabricacionController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/costos-por-articulo/:id_orden_fabricacion",
  requirePlanFeature("progreso"),
  requirePermission(ACTIONS.PROGRESS_VIEW),
  progresoFabricacionController.getCostosPorArticulo,
);
router.get(
  "/",
  requirePlanFeature("progreso"),
  requirePermission(ACTIONS.PROGRESS_VIEW),
  progresoFabricacionController.getProgresoDetallado,
);
router.get(
  "/resumen",
  requirePlanFeature("progreso"),
  requirePermission(ACTIONS.PROGRESS_VIEW),
  progresoFabricacionController.getResumenPorOrden,
);
router.get(
  "/materia-prima",
  requirePlanFeature("progreso"),
  requirePermission(ACTIONS.PROGRESS_VIEW),
  progresoFabricacionController.getResumenMateriaPrima,
);
router.get(
  "/orden/:id",
  requirePlanFeature("progreso"),
  requirePermission(ACTIONS.PROGRESS_VIEW),
  progresoFabricacionController.getProgresoOrden,
);

module.exports = router;
