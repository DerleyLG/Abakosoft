const express = require("express");
const router = express.Router();
const clienteController = require("../controllers/clientesController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

const requirePlanFeature = require("./_requirePlanFeature");

router.get(
  "/",
  requirePlanFeature("clientes"),
  requirePermission(ACTIONS.CLIENTS_VIEW),
  clienteController.getClientes,
);
router.get(
  "/:id",
  requirePlanFeature("clientes"),
  requirePermission(ACTIONS.CLIENTS_VIEW),
  clienteController.getClienteById,
);
router.post(
  "/",
  requirePlanFeature("clientes"),
  requirePermission(ACTIONS.CLIENTS_CREATE),
  checkIdempotency,
  clienteController.createCliente,
);
router.put(
  "/:id",
  requirePlanFeature("clientes"),
  requirePermission(ACTIONS.CLIENTS_EDIT),
  checkIdempotency,
  clienteController.updateCliente,
);
router.delete(
  "/:id",
  requirePlanFeature("clientes"),
  requirePermission(ACTIONS.CLIENTS_DELETE),
  clienteController.deleteCliente,
);

module.exports = router;
