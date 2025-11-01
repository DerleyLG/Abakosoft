const express = require("express");
const router = express.Router();
const rolesModel = require("../models/rolesModel");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");
const { ROLES } = require("../constants/roles");

router.get("/", verifyToken, checkRole([ROLES.ADMIN]), async (req, res) => {
  try {
    const roles = await rolesModel.getAll();
    res.json(roles);
  } catch (err) {
    console.error("Error al obtener roles:", err);
    res.status(500).json({ error: "Error al obtener roles" });
  }
});

module.exports = router;
