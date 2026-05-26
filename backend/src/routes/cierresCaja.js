const express = require("express");
const router = express.Router();
const cierresCajaController = require("../controllers/cierresCajaController");
const verifyToken = require("../middlewares/verifyToken");
const { requirePermission } = require("../middlewares/permissions");

// Todas las rutas requieren autenticación
router.use(verifyToken);



router.get("/", requirePermission(["admin"]), cierresCajaController.getAll);

/**
 * Verificar si el sistema necesita migración
 */
router.get(
  "/estado-sistema",
  requirePermission(["admin"]),
  cierresCajaController.verificarEstadoSistema
);

/**
 * Obtener cierre actual (abierto)
 */
router.get(
  "/abierto",
  requirePermission(["admin"]),
  cierresCajaController.getCierreAbierto
);

/**
 
 * Obtener detalle completo de un cierre
 */
router.get("/:id", requirePermission(["admin"]), cierresCajaController.getById);

/**
 * Obtener movimientos detallados del período
 */
router.get(
  "/:id/movimientos",
  requirePermission(["admin"]),
  cierresCajaController.getMovimientos
);

/**
 * Crear nuevo período (solo primera vez)
 */
router.post("/", requirePermission(["admin"]), cierresCajaController.create);

/**
 * Cerrar un período
 */
router.post(
  "/:id/cerrar",
  requirePermission(["admin"]),
  cierresCajaController.cerrar
);

/**
 * Validar si una fecha está en un período cerrado
 */
router.post(
  "/validar-fecha",
  requirePermission(["admin"]),
  cierresCajaController.validarFecha
);

/**
 * Validar un período antes de cerrarlo
 */
router.post(
  "/:id/validar",
  requirePermission(["admin"]),
  cierresCajaController.validarPeriodo
);

/**
 * Actualizar saldos iniciales de un período abierto
 */
router.put(
  "/:id/saldos-iniciales",
  requirePermission(["admin"]),
  cierresCajaController.actualizarSaldosIniciales
);

/**
 * Crear períodos históricos automáticamente
 */
router.post(
  "/migrar-historicos",
  requirePermission(["admin"]),
  cierresCajaController.migrarPeriodosHistoricos
);

/**
 * Recalcular totales de períodos históricos cerrados
 */
router.post(
  "/recalcular-historicos",
  requirePermission(["admin"]),
  cierresCajaController.recalcularHistoricos
);

module.exports = router;
