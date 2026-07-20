const express = require("express");
const router = express.Router();

const controller = require("../controllers/reparacionesController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get("/", requirePermission(ACTIONS.REPAIRS_VIEW), controller.getAll);
router.get("/:id", requirePermission(ACTIONS.REPAIRS_VIEW), controller.getById);
router.post(
  "/batch",
  requirePermission(ACTIONS.REPAIRS_CREATE),
  controller.createBatch,
);
router.post("/", requirePermission(ACTIONS.REPAIRS_CREATE), controller.create);
router.put(
  "/:id/diagnostico",
  requirePermission(ACTIONS.REPAIRS_DIAGNOSE),
  controller.setDiagnostico,
);
router.post(
  "/:id/materiales",
  requirePermission(ACTIONS.REPAIRS_MANAGE),
  controller.addMaterial,
);
router.delete(
  "/:id/materiales/:idDetalle",
  requirePermission(ACTIONS.REPAIRS_MANAGE),
  controller.deleteMaterial,
);
router.put(
  "/:id/lista-entrega",
  requirePermission(ACTIONS.REPAIRS_DELIVER),
  controller.marcarListaEntrega,
);
router.put(
  "/:id/entregar",
  requirePermission(ACTIONS.REPAIRS_DELIVER),
  controller.entregar,
);
router.put(
  "/:id/cancelar",
  requirePermission(ACTIONS.REPAIRS_CANCEL),
  controller.cancelar,
);

module.exports = router;
