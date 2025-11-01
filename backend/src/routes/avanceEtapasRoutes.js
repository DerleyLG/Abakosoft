const express = require("express");
const router = express.Router();
const controller = require("../controllers/avanceEtapasController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

router.get(
  "/completadas/:idOrden/:idArticulo",
  controller.getEtapasFinalizadas
);
router.get(
  "/costo-anterior/:id_articulo/:id_etapa_produccion",
  controller.getCostoAnterior
);

router.get(
  "/",
  verifyToken,
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getAll
);
router.get(
  "/pagados",
  verifyToken,
  checkRole([ROLES.SUPERVISOR, ROLES.ADMIN]),
  controller.getAllPagados
);
router.get("/:id", controller.getAvancesByOrden);
router.post("/", controller.create);
router.put("/:id", controller.update);
router.put("/:id/costo", controller.updateCosto);
router.delete("/:id", controller.delete);

module.exports = router;
