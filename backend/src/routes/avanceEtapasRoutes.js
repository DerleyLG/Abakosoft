const express = require("express");
const router = express.Router();
const controller = require("../controllers/avanceEtapasController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

// Todas las rutas requieren autenticación
const requirePlanFeature = require("./_requirePlanFeature");
router.use(verifyToken);

// Órdenes con avances en la semana actual
router.get(
  "/activas-avance-semana",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getOrdenesConAvancesSemana,
);

// Avances agrupados por orden y etapa para frontend
router.get(
  "/agrupados/orden-etapa",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getAvancesAgrupadosPorOrdenEtapa,
);

// Avances reales agrupados por fecha de avance
router.get(
  "/reales/por-fecha",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getAvancesRealesPorFecha,
);

router.get(
  "/completadas/:idOrden/:idArticulo",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getEtapasFinalizadas,
);
router.get(
  "/costo-anterior/:id_articulo/:id_etapa_produccion",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getCostoAnterior,
);

router.get(
  "/",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getAll,
);
router.get(
  "/pagados",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getAllPagados,
);
router.get(
  "/:id",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_VIEW),
  controller.getAvancesByOrden,
);
router.post(
  "/",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_CREATE),
  checkIdempotency,
  controller.create,
);
router.put(
  "/:id",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_EDIT),
  controller.update,
);
router.put(
  "/:id/costo",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_EDIT),
  controller.updateCosto,
);
router.put(
  "/:id/responsable",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_EDIT),
  controller.updateResponsable,
);
router.put(
  "/:id/cantidad",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_EDIT_QUANTITY),
  controller.updateCantidad,
);
router.delete(
  "/:id",
  requirePlanFeature("avances"),
  requirePermission(ACTIONS.ADVANCES_EDIT),
  controller.delete,
);

module.exports = router;
