const express = require("express");
const TesoreriaController = require("../controllers/tesoreriaController");
const router = express.Router();

// Ruta para obtener todos los métodos de pago
router.get("/metodos-pago", TesoreriaController.getMetodosPago);

// Ruta para obtener todos los movimientos de tesorería
router.get(
  "/movimientos-tesoreria",
  TesoreriaController.getMovimientosTesoreria
);

// Ruta para crear un movimiento de tesorería (POST)
router.post("/movimientos", TesoreriaController.createMovimiento);

router.get("/ingresos-summary", TesoreriaController.getIngresosSummary);
router.get("/egresos-summary", TesoreriaController.getEgresosSummary);
router.get(
  "/pagos-trabajadores/count",
  TesoreriaController.getPagosTrabajadoresCount
);
router.get("/ordenes-compra/count", TesoreriaController.getOrdenesCompraCount);
router.get("/costos/count", TesoreriaController.getCostosIndirectosCount);
router.get("/materia-prima/count", TesoreriaController.getMateriaPrimaCount);
router.get(
  "/:documento/:idDocumento",
  TesoreriaController.getMovimientoByDocumento
);

module.exports = router;
