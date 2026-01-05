const express = require("express");
const router = express.Router();
const progresoFabricacionController = require("../controllers/progresoFabricacionController");

/**
 * GET /api/progreso-fabricacion
 * Obtiene el progreso detallado de todas las órdenes de fabricación
 * Query params: fecha_inicio, fecha_fin, id_orden_fabricacion, estado
 */
router.get("/", progresoFabricacionController.getProgresoDetallado);

/**
 * GET /api/progreso-fabricacion/resumen
 * Obtiene el resumen agrupado por orden de fabricación
 * Query params: fecha_inicio, fecha_fin, estado
 */
router.get("/resumen", progresoFabricacionController.getResumenPorOrden);

/**
 * GET /api/progreso-fabricacion/materia-prima
 * Obtiene el resumen de materia prima consumida en un período
 * Query params: fecha_inicio, fecha_fin (requeridos)
 */
router.get(
  "/materia-prima",
  progresoFabricacionController.getResumenMateriaPrima
);

/**
 * GET /api/progreso-fabricacion/orden/:id
 * Obtiene el progreso detallado de una orden específica
 */
router.get("/orden/:id", progresoFabricacionController.getProgresoOrden);

module.exports = router;
