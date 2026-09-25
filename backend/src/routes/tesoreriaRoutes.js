const express = require("express");
const TesoreriaController = require("../controllers/tesoreriaController");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

// Métodos de pago: dato de referencia usado en múltiples formularios (sin restricción de plan)
router.get("/metodos-pago", TesoreriaController.getMetodosPago);
router.get(
  "/movimientos-tesoreria",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getMovimientosTesoreria,
);
router.post(
  "/movimientos",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_MANAGE),
  TesoreriaController.createMovimiento,
);
router.post(
  "/transferencia-metodos",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_MANAGE),
  TesoreriaController.transferirEntreMetodos,
);
router.get(
  "/ingresos-summary",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getIngresosSummary,
);
router.get(
  "/egresos-summary",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getEgresosSummary,
);
router.get(
  "/pagos-trabajadores/count",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getPagosTrabajadoresCount,
);
router.get(
  "/ordenes-compra/count",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getOrdenesCompraCount,
);
router.get(
  "/costos/count",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getCostosIndirectosCount,
);
router.get(
  "/materia-prima/count",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getMateriaPrimaCount,
);
router.get(
  "/anticipos/count",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getAnticiposCount,
);
router.get(
  "/resumen-tarjetas",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getResumenTarjetas,
);
router.get(
  "/ventas-cobros",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getVentasCobrosReport,
);
// Conciliación bancaria: listar movimientos con filtros (ver) y marcar como validado (conciliar)
router.get(
  "/conciliacion",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getConciliacion,
);
router.put(
  "/conciliacion/:id",
  requirePlanFeature("tesoreria"),
  requirePermission(ACTIONS.TREASURY_RECONCILE),
  TesoreriaController.marcarConciliado,
);
// Dato de referencia: consulta de pago asociado a un documento (compra/venta), sin restricción de plan
router.get(
  "/:documento/:idDocumento",
  requirePermission(ACTIONS.TREASURY_VIEW),
  TesoreriaController.getMovimientoByDocumento,
);

module.exports = router;
