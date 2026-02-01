const express = require("express");
const router = express.Router();
const controller = require("../controllers/avanceEtapasController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

// Órdenes con avances en la semana actual
router.get("/activas-avance-semana", controller.getOrdenesConAvancesSemana);

// Avances agrupados por orden y etapa para frontend
router.get(
  "/agrupados/orden-etapa",
  controller.getAvancesAgrupadosPorOrdenEtapa,
);

// Avances reales agrupados por fecha de avance
router.get("/reales/por-fecha", controller.getAvancesRealesPorFecha);

router.get(
  "/completadas/:idOrden/:idArticulo",
  controller.getEtapasFinalizadas,
);
router.get(
  "/costo-anterior/:id_articulo/:id_etapa_produccion",
  controller.getCostoAnterior,
);

router.get(
  "/",
  verifyToken,
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getAll,
);
router.get(
  "/pagados",
  verifyToken,
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getAllPagados,
);
router.get("/:id", controller.getAvancesByOrden);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.put("/:id/costo", controller.updateCosto);
router.put("/:id/responsable", controller.updateResponsable);
router.delete("/:id", controller.delete);

module.exports = router;
