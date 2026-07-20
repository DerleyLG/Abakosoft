const express = require("express");
const router = express.Router();
const controller = require("../controllers/saldoFavorController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get(
  "/total/todo",
  requirePermission(ACTIONS.TREASURY_VIEW),
  controller.getTotalSaldo,
);
router.get(
  "/:id/historial",
  requirePermission(ACTIONS.CLIENTS_VIEW),
  controller.getHistorial,
);
router.get(
  "/:id",
  requirePermission(ACTIONS.CLIENTS_VIEW),
  controller.getSaldoFavor,
);
router.post(
  "/:id/abonar",
  requirePermission(ACTIONS.TREASURY_MANAGE),
  controller.abonarSaldoFavor,
);
router.post(
  "/:id/usar",
  requirePermission(ACTIONS.TREASURY_MANAGE),
  controller.usarSaldoFavor,
);

module.exports = router;
