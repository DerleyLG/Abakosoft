// routes/metodosDePagoRoutes.js
const express = require("express");
const router = express.Router();
const metodosDePagoController = require("../controllers/metodosDePagoController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get("/", metodosDePagoController.getMetodosPago);
router.post(
  "/",
  requirePermission(ACTIONS.PAYMENT_METHODS_MANAGE),
  metodosDePagoController.create,
);
router.put(
  "/:id",
  requirePermission(ACTIONS.PAYMENT_METHODS_MANAGE),
  metodosDePagoController.update,
);
router.delete(
  "/:id",
  requirePermission(ACTIONS.PAYMENT_METHODS_MANAGE),
  metodosDePagoController.delete,
);

module.exports = router;
