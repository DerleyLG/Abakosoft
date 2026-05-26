const express = require("express");
const router = express.Router();
const VentasCreditoController = require("../controllers/VentasCreditoController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

// Crear crédito manual — requiere permiso específico
router.post(
  "/manual",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_CREATE),
  checkIdempotency,
  VentasCreditoController.createManual,
);

// Ver créditos
router.get(
  "/",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_VIEW),
  VentasCreditoController.getAll,
);
router.get(
  "/buscar-documento/:id",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_VIEW),
  VentasCreditoController.buscarPorDocumento,
);
router.get(
  "/:id",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_VIEW),
  VentasCreditoController.getById,
);
router.get(
  "/:id/abonos",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_VIEW),
  VentasCreditoController.getAbonos,
);
router.get(
  "/:id/resumen",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_VIEW),
  VentasCreditoController.getResumenCredito,
);

// Registrar abono — requiere permiso de gestión
router.post(
  "/:id/abonos",
  requirePlanFeature("creditos"),
  requirePermission(ACTIONS.CREDITS_MANAGE),
  checkIdempotency,
  VentasCreditoController.registrarAbono,
);

module.exports = router;
