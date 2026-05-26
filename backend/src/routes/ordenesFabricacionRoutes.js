const express = require("express");
const router = express.Router();
const controller = require("../controllers/ordenesFabricacionController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const requirePlanFeature = require("./_requirePlanFeature");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  controller.getAll,
);

router.get(
  "/existe/:id_pedido",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  controller.existe,
);

router.get(
  "/estado-pedido/:id_pedido",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  controller.getEstadoOFByPedidoId,
);

router.get(
  "/:id",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_VIEW),
  controller.getById,
);

router.post(
  "/",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_CREATE),
  checkIdempotency,
  controller.create,
);

router.put(
  "/:id",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_EDIT),
  checkIdempotency,
  controller.update,
);

router.delete(
  "/:id",
  requirePlanFeature("fabricacion"),
  requirePermission(ACTIONS.FABRICATION_DELETE),
  controller.delete,
);

module.exports = router;
