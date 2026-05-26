const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const verifyToken = require("../middlewares/verifyToken");
const requirePlanFeature = require("./_requirePlanFeature");

router.use(verifyToken);

router.get(
  "/",
  requirePlanFeature("dashboard"),
  dashboardController.getDashboardData,
);

module.exports = router;
