const express = require("express");
const router = express.Router();
const pagosController = require("../controllers/pagosTrabajadoresController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");
const { checkIdempotency } = require("../middlewares/idempotency");

router.use(verifyToken);

router.get(
  "/",
  requirePermission([ACTIONS.PAYMENTS_VIEW, ACTIONS.PAYMENTS_CREATE]),
  pagosController.getAllPagos,
);
router.get(
  "/:id",
  requirePermission([ACTIONS.PAYMENTS_VIEW, ACTIONS.PAYMENTS_CREATE]),
  pagosController.getPagoById,
);
router.post(
  "/",
  requirePermission(ACTIONS.PAYMENTS_CREATE),
  checkIdempotency,
  pagosController.createPago,
);
router.put(
  "/:id",
  requirePermission(ACTIONS.PAYMENTS_CREATE),
  checkIdempotency,
  pagosController.updatePago,
);
router.delete(
  "/:id",
  requirePermission(ACTIONS.PAYMENTS_DELETE),
  pagosController.deletePago,
);

module.exports = router;
