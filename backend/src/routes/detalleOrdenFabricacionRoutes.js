const express = require("express");
const router = express.Router();
const controller = require("../controllers/detalleOrdenFabricacionController");
const verifyToken = require("../middlewares/verifyToken");
const { ACTIONS, requirePermission } = require("../utils/permissions");

router.use(verifyToken);

router.get("/", requirePermission(ACTIONS.FABRICATION_VIEW), controller.getAll);
router.get(
  "/:id",
  requirePermission(ACTIONS.FABRICATION_VIEW),
  controller.getById,
);
router.post(
  "/",
  requirePermission(ACTIONS.FABRICATION_CREATE),
  controller.create,
);
router.put(
  "/:id",
  requirePermission(ACTIONS.FABRICATION_EDIT),
  controller.update,
);
router.delete(
  "/:id",
  requirePermission(ACTIONS.FABRICATION_DELETE),
  controller.delete,
);

module.exports = router;
