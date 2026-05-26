const express = require("express");
const router = express.Router();
const consumoMateriaPrimaController = require("../controllers/consumoMateriaPrimaController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/costos-por-articulo/:id_orden_fabricacion",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getCostosPorArticulo,
);
router.post(
  "/",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.registrarConsumo,
);
router.get(
  "/articulo/:id",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getConsumosPorArticulo,
);
router.get(
  "/resumen-semanal",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getResumenSemanal,
);
router.get(
  "/prorrateo",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getProrrateo,
);
router.get(
  "/resumen-cierre",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getResumenParaCierre,
);
router.get(
  "/recientes",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.getConsumosRecientes,
);
router.delete(
  "/:id",
  requirePlanFeature("costos_materia_prima"),
  requirePermission(ACTIONS.INVENTORY_CONSUME),
  consumoMateriaPrimaController.eliminarConsumo,
);

module.exports = router;
