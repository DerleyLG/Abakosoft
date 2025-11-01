const express = require("express");
const router = express.Router();
const reportesController = require("../controllers/reportesController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

// Todas las rutas de reportes requieren autenticación y rol supervisor o admin
router.use(verifyToken);

// Ruta para servicios tercerizados asignados
router.get(
  "/servicios-tercerizados",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getServiciosTercerizados
);

// Ruta para servicios avances de fabricacion
router.get(
  "/avance-fabricacion",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getAvanceFabricacion
);

// Ruta para servicios Ordenes de compra
router.get(
  "/ordenes-compra",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getReporteOrdenesCompra
);

// Ruta para inventario
router.get(
  "/inventario",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getInventarioActual
);

router.get(
  "/ventas-periodo",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getVentasPorPeriodo
);

// Ruta para costos de produccion
router.get(
  "/costos-produccion",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getCostosProduccion
);

// Ruta para utilidad por orden de venta
router.get(
  "/utilidad-por-orden",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getUtilidadPorOrden
);

//Ruta para pagos de trabajadores
router.get(
  "/pagos-trabajadores",
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  reportesController.getPagosTrabajadores
);

router.get(
  "/pagos-trabajadores-dia",
  checkRole(["supervisor", "admin"]),
  reportesController.getPagosTrabajadoresPorDia
);

router.get(
  "/movimientos-inventario",
  checkRole(["supervisor", "admin"]),
  reportesController.getMovimientosInventario
);

// Nuevos: Absorción y Costos por OF
// (rutas de reportes adicionales eliminadas)

module.exports = router;
