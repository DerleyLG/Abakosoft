const express = require("express");
const router = express.Router();
const compraMateriaPrimaController = require("../controllers/compraMateriaPrimaController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.post(
  "/",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_CREATE),
  compraMateriaPrimaController.createCompraMateriaPrima,
);
router.get(
  "/",
  requirePlanFeature("compras"),
  requirePermission(ACTIONS.PURCHASES_VIEW),
  compraMateriaPrimaController.getComprasMateriaPrima,
);

module.exports = router;
