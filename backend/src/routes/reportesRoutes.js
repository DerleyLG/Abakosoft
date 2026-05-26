const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportesController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

// Todas las rutas de reportes requieren autenticación
const requirePlanFeature = require("./_requirePlanFeature");
router.use(verifyToken);

router.get(
  "/servicios-tercerizados",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getServiciosTercerizados,
);

router.get(
  "/avance-fabricacion",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getAvanceFabricacion,
);

router.get(
  "/ordenes-compra",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getReporteOrdenesCompra,
);

router.get(
  "/inventario",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getInventarioActual,
);

router.get(
  "/ventas-periodo",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getVentasPorPeriodo,
);

router.get(
  "/costos-produccion",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getCostosProduccion,
);

router.get(
  "/utilidad-por-orden",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getUtilidadPorOrden,
);

router.get(
  "/pagos-trabajadores",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getPagosTrabajadores,
);

router.get(
  "/pagos-trabajadores-dia",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getPagosTrabajadoresPorDia,
);

router.get(
  "/movimientos-inventario",
  requirePlanFeature("reportes"),
  requirePermission(ACTIONS.REPORTS_VIEW),
  reportesController.getMovimientosInventario,
);

// Nuevos: Absorción y Costos por OF
// (rutas de reportes adicionales eliminadas)

module.exports = router;
