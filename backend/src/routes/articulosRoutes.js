const ArticulosController = require("../controllers/articulosController");
const express = require("express");
const router = express.Router();
const ArticuloModel = require("../models/articulosModel");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/componentes/:id",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_VIEW),
  ArticulosController.getComponentesParaOrdenFabricacion,
);
router.get(
  "/",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_VIEW),
  ArticulosController.getArticulos,
);
router.get(
  "/:id",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_VIEW),
  ArticulosController.getArticuloById,
);

router.post(
  "/",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_CREATE),
  checkIdempotency,
  ArticulosController.createArticulo,
);
router.put(
  "/:id",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_EDIT),
  checkIdempotency,
  ArticulosController.updateArticulo,
);
router.delete(
  "/:id",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_DELETE),
  checkIdempotency,
  ArticulosController.deleteArticulo,
);
router.get(
  "/es-compuesto/:id_articulo",
  requirePlanFeature("articulos"),
  requirePermission(ACTIONS.ARTICLES_VIEW),
  async (req, res) => {
    try {
      const { id_articulo } = req.params;
      const esCompuesto = await ArticuloModel.esCompuesto(id_articulo);
      res.status(200).json({ esCompuesto });
    } catch (error) {
      console.error("Error al verificar el artículo:", error);
      res.status(500).json({ error: "Error interno del servidor." });
    }
  },
);

module.exports = router;
