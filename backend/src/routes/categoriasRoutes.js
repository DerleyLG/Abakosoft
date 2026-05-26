const categoriasController = require("../controllers/categoriasController");
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

const requirePlanFeature = require("./_requirePlanFeature");

router.get(
  "/",
  requirePlanFeature("categorias"),
  requirePermission(ACTIONS.CATEGORIES_VIEW),
  categoriasController.getCategoria,
);
router.get(
  "/:id",
  requirePlanFeature("categorias"),
  requirePermission(ACTIONS.CATEGORIES_VIEW),
  categoriasController.getCategoriaById,
);
router.post(
  "/",
  requirePlanFeature("categorias"),
  requirePermission(ACTIONS.CATEGORIES_CREATE),
  checkIdempotency,
  categoriasController.createCategoria,
);
router.put(
  "/:id",
  requirePlanFeature("categorias"),
  requirePermission(ACTIONS.CATEGORIES_EDIT),
  checkIdempotency,
  categoriasController.updateCategoria,
);
router.delete(
  "/:id",
  requirePlanFeature("categorias"),
  requirePermission(ACTIONS.CATEGORIES_DELETE),
  categoriasController.deleteCategoria,
);

module.exports = router;
