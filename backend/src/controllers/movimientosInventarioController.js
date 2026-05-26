
const MovimientoInventarioModel = require("../models/movimientosInventarioModel"); 


module.exports = {
  /**
   Obtiene todos los movimientos de inventario registrados.
   */
  getMovimientos: async (_req, res) => {
    try {
      const movimientos = await MovimientoInventarioModel.getAll();
      if (!movimientos.length) {
        return res.status(404).json({ error: "No hay movimientos registrados" });
      }
      res.status(200).json(movimientos);
    } catch (error) {
      console.error("Error al obtener los movimientos:", error);
      res.status(500).json({ error: "Error al obtener los movimientos." });
    }
  },

  /**
   * Obtiene un movimiento de inventario por su ID.
   */
  getMovimientoById: async (req, res) => {
    try {
      const movimiento = await MovimientoInventarioModel.getById(req.params.id);
      if (!movimiento) {
        return res.status(404).json({ error: "Movimiento no encontrado" });
      }
      res.status(200).json(movimiento);
    } catch (error) {
      console.error("Error al obtener el movimiento:", error);
      res.status(500).json({ error: "Error al obtener el movimiento." });
    }
  },

  /**
    No se permite modificar movimientos de inventario.
   */
  updateMovimiento: (_req, res) => {
    return res.status(403).json({ error: "No se permite modificar movimientos de inventario. Use un movimiento correctivo." });
  },

  /**
   * No se permite eliminar movimientos de inventario.
   */
  deleteMovimiento: (_req, res) => {
    return res.status(403).json({ error: "No se permite eliminar movimientos de inventario. Use un movimiento correctivo." });
  },
};
