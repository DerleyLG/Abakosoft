const express = require("express");
const router = express.Router();
const consumoMateriaPrimaController = require("../controllers/consumoMateriaPrimaController");
const verifyToken = require("../middlewares/verifyToken");

/**
 * GET /api/consumos-materia-prima/costos-por-articulo/:id_orden_fabricacion
 * Devuelve el prorrateo y costo total por artículo avanzado en la orden
 */
router.get(
  "/costos-por-articulo/:id_orden_fabricacion",
  consumoMateriaPrimaController.getCostosPorArticulo,
);

// Todas las rutas requieren autenticación
router.use(verifyToken);

/**
 * POST /api/consumos-materia-prima
 * Registrar un nuevo consumo de materia prima
 */
router.post("/", consumoMateriaPrimaController.registrarConsumo);

/**
 * GET /api/consumos-materia-prima/articulo/:id
 * Obtener consumos de un artículo específico
 */
router.get(
  "/articulo/:id",
  consumoMateriaPrimaController.getConsumosPorArticulo,
);

/**
 * GET /api/consumos-materia-prima/resumen-semanal
 * Obtener resumen de consumos de la semana
 */
router.get("/resumen-semanal", consumoMateriaPrimaController.getResumenSemanal);

/**
 * GET /api/consumos-materia-prima/prorrateo
 * Obtener prorrateo de consumos entre órdenes
 */
router.get("/prorrateo", consumoMateriaPrimaController.getProrrateo);

/**
 * GET /api/consumos-materia-prima/resumen-cierre
 * Obtener resumen de consumos para cierre de caja
 */
router.get(
  "/resumen-cierre",
  consumoMateriaPrimaController.getResumenParaCierre,
);

/**
 * GET /api/consumos-materia-prima/recientes
 * Obtener los últimos registros de consumo con notas
 */
router.get("/recientes", consumoMateriaPrimaController.getConsumosRecientes);

/**
 * DELETE /api/consumos-materia-prima/:id
 * Eliminar un consumo
 */
router.delete("/:id", consumoMateriaPrimaController.eliminarConsumo);

module.exports = router;
