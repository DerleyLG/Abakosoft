const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const verifyToken = require("../middlewares/verifyToken");

// Rate limiter: máximo 5 intentos fallidos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de acceso. Inténtalo de nuevo en 15 minutos.",
  },
  skipSuccessfulRequests: true,
});

// Login multi-tenant: requiere empresa_codigo + nombre_usuario + pin
router.post("/login", loginLimiter, authController.login);

// Datos del usuario autenticado (requiere token válido)
router.get("/me", verifyToken, authController.me);

module.exports = router;
