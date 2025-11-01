const express = require("express");
const router = express.Router();
const usuariosController = require("../controllers/usuariosController");
const verifyToken = require("../middlewares/verifyToken");
const checkRole = require("../middlewares/checkRole");

router.get("/", verifyToken, checkRole(["admin"]), usuariosController.getAll);

router.get(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  usuariosController.getById
);

router.post("/", verifyToken, checkRole(["admin"]), usuariosController.create);

router.put(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  usuariosController.update
);

router.delete(
  "/:id",
  verifyToken,
  checkRole(["admin"]),
  usuariosController.delete
);

module.exports = router;
