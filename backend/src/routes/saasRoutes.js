const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const verifySaasAdmin = require("../middlewares/verifySaasAdmin");
const verifySaasCsrf = require("../middlewares/verifySaasCsrf");
const {
  loginAdmin,
  meAdmin,
  refreshAdmin,
  logoutAdmin,
  cambiarPasswordAdmin,
  verificarBdExistente,
  verificarUsuarioDisponible,
  listarEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarEstadoEmpresa,
  eliminarEmpresa,
  editarSuscripcion,
  cambiarCredencialesAdmin,
  listarPlanes,
  listarLogs,
  crearAdminInicial,
  setupStatus,
  setupAdmin,
} = require("../controllers/saasController");

// Rate limiter estricto solo para el endpoint de login SaaS:
// máximo 5 intentos por IP cada 15 minutos
const saasLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Demasiados intentos de acceso. Inténtalo de nuevo en 15 minutos.",
  },
  skipSuccessfulRequests: true,
});

// Rate limiter para el endpoint de setup: máximo 10 intentos por IP por hora
const saasSetupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de setup. Inténtalo más tarde." },
});

// Setup del sistema (públicos, solo disponibles antes de crear el primer admin)
router.get("/auth/setup-status", setupStatus);
router.post("/auth/setup", saasSetupLimiter, setupAdmin);

// Auth panel SaaS (público, con rate limit)
router.post("/auth/login", saasLoginLimiter, loginAdmin);
router.post("/auth/refresh", refreshAdmin);
router.post("/auth/logout", logoutAdmin);

// Todo lo de abajo requiere ser admin SaaS
router.use(verifySaasAdmin);
router.use(verifySaasCsrf);

// Perfil del admin autenticado
router.get("/auth/me", meAdmin);

// Cambiar contraseña (requiere auth)
router.patch("/auth/cambiar-password", cambiarPasswordAdmin);

// Empresas
router.get("/empresas/verificar-bd", verificarBdExistente);
router.get("/usuarios/verificar", verificarUsuarioDisponible);
router.get("/empresas", listarEmpresas);
router.get("/empresas/:id", obtenerEmpresa);
router.post("/empresas", crearEmpresa);
router.patch("/empresas/:id/estado", actualizarEstadoEmpresa);
router.delete("/empresas/:id", verifySaasAdmin, eliminarEmpresa);
router.patch("/empresas/:id/suscripcion", editarSuscripcion);
router.patch("/empresas/:id/credenciales-admin", cambiarCredencialesAdmin);

// Crear admin inicial en la BD del tenant
router.post("/empresas/:id/crear-admin-inicial", crearAdminInicial);

// Planes
router.get("/planes", listarPlanes);

// Logs
router.get("/logs", listarLogs);

module.exports = router;
