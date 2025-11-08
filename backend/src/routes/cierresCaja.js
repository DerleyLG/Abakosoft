const express = require("express");
const router = express.Router();
const cierresCajaController = require("../controllers/cierresCajaController");
const verifyToken = require("../middlewares/verifyToken");
const { requirePermission } = require("../middlewares/permissions");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// ===================================
// CONSULTAS (todos los usuarios autenticados)
// ===================================

/**
 * GET /api/cierres-caja
 * Obtener histórico de cierres
 */
router.get("/", cierresCajaController.getAll);

/**
 * GET /api/cierres-caja/abierto
 * Obtener cierre actual (abierto)
 */
router.get("/abierto", cierresCajaController.getCierreAbierto);

/**
 * GET /api/cierres-caja/:id
 * Obtener detalle completo de un cierre
 */
router.get("/:id", cierresCajaController.getById);

/**
 * GET /api/cierres-caja/:id/movimientos
 * Obtener movimientos detallados del período
 */
router.get("/:id/movimientos", cierresCajaController.getMovimientos);

// ===================================
// ACCIONES RESTRINGIDAS (solo admin y supervisor)
// ===================================

/**
 * POST /api/cierres-caja
 * Crear nuevo período (solo primera vez)
 * Requiere: admin o supervisor
 */
router.post(
  "/",
  requirePermission(["admin", "supervisor"]),
  cierresCajaController.create
);

/**
 * POST /api/cierres-caja/:id/cerrar
 * Cerrar un período
 * Requiere: admin o supervisor
 */
router.post(
  "/:id/cerrar",
  requirePermission(["admin", "supervisor"]),
  cierresCajaController.cerrar
);

/**
 * POST /api/cierres-caja/validar-fecha
 * Validar si una fecha está en un período cerrado
 */
router.post("/validar-fecha", cierresCajaController.validarFecha);

module.exports = router;
