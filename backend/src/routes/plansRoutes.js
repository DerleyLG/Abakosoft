// Rutas para exponer los features de cada plan
const express = require("express");
const router = express.Router();
const { PLAN_FEATURES, PLANS } = require("../constants/plans");

router.get("/features", (req, res) => {
  res.json({ plans: PLANS, features: PLAN_FEATURES });
});

module.exports = router;
