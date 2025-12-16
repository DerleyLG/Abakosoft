const express = require("express");
const router = express.Router();
const cierresCajaController = require("../controllers/cierresCajaController");
const verifyToken = require("../middlewares/verifyToken");
const { requirePermission } = require("../middlewares/permissions");

// Todas las rutas requieren autenticación
router.use(verifyToken);

router.get("/", requirePermission(["admin"]), cierresCajaController.getAll);

/**
 * GET /api/cierres-caja/estado-sistema
 * Verificar si el sistema necesita migración
 * Requiere: solo admin
 */
router.get(
  "/estado-sistema",
  requirePermission(["admin"]),
  cierresCajaController.verificarEstadoSistema
);

/**
 * GET /api/cierres-caja/abierto
 * Obtener cierre actual (abierto)
 * Requiere: solo admin
 */
router.get(
  "/abierto",
  requirePermission(["admin"]),
  cierresCajaController.getCierreAbierto
);

/**
 * GET /api/cierres-caja/:id
 * Obtener detalle completo de un cierre
 * Requiere: solo admin
 */
router.get("/:id", requirePermission(["admin"]), cierresCajaController.getById);

/**
 * GET /api/cierres-caja/:id/movimientos
 * Obtener movimientos detallados del período
 * Requiere: solo admin
 */
router.get(
  "/:id/movimientos",
  requirePermission(["admin"]),
  cierresCajaController.getMovimientos
);

/**
 * POST /api/cierres-caja
 * Crear nuevo período (solo primera vez)
 * Requiere: solo admin
 */
router.post("/", requirePermission(["admin"]), cierresCajaController.create);

/**
 * POST /api/cierres-caja/:id/cerrar
 * Cerrar un período
 * Requiere: solo admin
 */
router.post(
  "/:id/cerrar",
  requirePermission(["admin"]),
  cierresCajaController.cerrar
);

/**
 * POST /api/cierres-caja/validar-fecha
 * Validar si una fecha está en un período cerrado
 * Requiere: solo admin
 */
router.post(
  "/validar-fecha",
  requirePermission(["admin"]),
  cierresCajaController.validarFecha
);

/**
 * POST /api/cierres-caja/:id/validar
 * Validar un período antes de cerrarlo
 * Requiere: solo admin
 */
router.post(
  "/:id/validar",
  requirePermission(["admin"]),
  cierresCajaController.validarPeriodo
);

/**
 * PUT /api/cierres-caja/:id/saldos-iniciales
 * Actualizar saldos iniciales de un período abierto
 * Requiere: solo admin
 */
router.put(
  "/:id/saldos-iniciales",
  requirePermission(["admin"]),
  cierresCajaController.actualizarSaldosIniciales
);

/**
 * POST /api/cierres-caja/migrar-historicos
 * Crear períodos históricos automáticamente
 * Requiere: solo admin
 */
router.post(
  "/migrar-historicos",
  requirePermission(["admin"]),
  cierresCajaController.migrarPeriodosHistoricos
);

/**
 * POST /api/cierres-caja/limpiar-datos
 * Limpiar todos los registros de control de caja
 * Requiere: solo admin
 */
router.post(
  "/limpiar-datos",
  requirePermission(["admin"]),
  cierresCajaController.limpiarDatos
);

module.exports = router;
