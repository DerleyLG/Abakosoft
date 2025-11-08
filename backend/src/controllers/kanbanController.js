const kanbanModel = require("../models/kanbanModel");

const kanbanController = {
  /**
   * GET /api/kanban/ordenes-fabricacion
   * Obtiene todas las órdenes agrupadas para el tablero Kanban
   */
  getOrdenesKanban: async (req, res) => {
    try {
      const ordenes = await kanbanModel.getOrdenesKanban();
      const etapas = await kanbanModel.getEtapasProduccion();

      // Agrupar órdenes por columna
      const columnas = {
        sin_iniciar: [],
        etapa_11: [], // Carpintería
        etapa_12: [], // Pulido
        etapa_3: [], // Pintura
        etapa_13: [], // Tapizado
        finalizada: [],
        entregada: [],
      };

      ordenes.forEach((orden) => {
        if (columnas[orden.columna]) {
          columnas[orden.columna].push(orden);
        } else {
          // Si no encaja en ninguna columna conocida, va a sin_iniciar
          columnas.sin_iniciar.push(orden);
        }
      });

      res.json({
        columnas,
        etapas,
        total_ordenes: ordenes.length,
      });
    } catch (error) {
      console.error("Error obteniendo órdenes para Kanban:", error);
      res.status(500).json({ error: "Error al cargar el tablero Kanban" });
    }
  },

  /**
   * POST /api/kanban/marcar-entregada/:id
   * Marca una orden como entregada
   */
  marcarComoEntregada: async (req, res) => {
    try {
      const { id } = req.params;

      await kanbanModel.marcarComoEntregada(id);

      res.json({
        message: "Orden marcada como entregada exitosamente",
        id_orden_fabricacion: id,
      });
    } catch (error) {
      console.error("Error marcando orden como entregada:", error);
      res.status(500).json({ error: "Error al marcar orden como entregada" });
    }
  },
};

module.exports = kanbanController;
