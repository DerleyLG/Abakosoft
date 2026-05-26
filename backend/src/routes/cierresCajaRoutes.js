const express = require("express");
const router = express.Router();
const cierresCajaController = require("../controllers/cierresCajaController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.getAll,
);

router.get(
  "/estado-sistema",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.verificarEstadoSistema,
);
router.get(
  "/abierto",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.getCierreAbierto,
);
router.get(
  "/:id",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.getById,
);
router.get(
  "/:id/movimientos",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.getMovimientos,
);

router.post(
  "/",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_CREATE),
  checkIdempotency,
  cierresCajaController.create,
);
router.post(
  "/:id/cerrar",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_CLOSE),
  checkIdempotency,
  cierresCajaController.cerrar,
);
router.post(
  "/validar-fecha",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.validarFecha,
);
router.post(
  "/:id/validar",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_VIEW),
  cierresCajaController.validarPeriodo,
);

router.put(
  "/:id/saldos-iniciales",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_CREATE),
  checkIdempotency,
  cierresCajaController.actualizarSaldosIniciales,
);
router.post(
  "/migrar-historicos",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_CREATE),
  cierresCajaController.migrarPeriodosHistoricos,
);
router.post(
  "/limpiar-datos",
  requirePlanFeature("cierres_caja"),
  requirePermission(ACTIONS.CASH_CLOSINGS_DELETE),
  cierresCajaController.limpiarDatos,
);

module.exports = router;
