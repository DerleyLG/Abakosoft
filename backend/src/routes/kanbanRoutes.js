const express = require("express");
const router = express.Router();
const kanbanController = require("../controllers/kanbanController");
const verifyToken = require("../middlewares/verifyToken");

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener datos del tablero Kanban
router.get("/ordenes-fabricacion", kanbanController.getOrdenesKanban);

// Marcar orden como entregada
router.post("/marcar-entregada/:id", kanbanController.marcarComoEntregada);

module.exports = router;
