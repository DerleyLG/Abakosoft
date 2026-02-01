/**
 * GET /api/progreso-fabricacion/costos-por-articulo/:id_orden_fabricacion
 * Devuelve el prorrateo y costo total por artículo avanzado en la orden
 */

const express = require("express");
const router = express.Router();
const progresoFabricacionController = require("../controllers/progresoFabricacionController");

router.get(
  "/costos-por-articulo/:id_orden_fabricacion",
  progresoFabricacionController.getCostosPorArticulo,
);
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
  progresoFabricacionController.getResumenMateriaPrima,
);

/**
 * GET /api/progreso-fabricacion/orden/:id
 * Obtiene el progreso detallado de una orden específica
 */
router.get("/orden/:id", progresoFabricacionController.getProgresoOrden);

module.exports = router;
