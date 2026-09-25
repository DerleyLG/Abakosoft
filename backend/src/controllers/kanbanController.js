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

      // Construir columnas dinámicamente desde las etapas registradas
      const columnas = {
        sin_iniciar: [],
      };

      etapas.forEach((etapa) => {
        columnas[`etapa_${etapa.id_etapa}`] = [];
      });

      columnas.finalizada = [];
      columnas.entregada = [];

      ordenes.forEach((orden) => {
        if (columnas[orden.columna]) {
          columnas[orden.columna].push(orden);
        } else {
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

      const orden = await kanbanModel.marcarComoEntregada(id);

      res.json({
        message: "Orden marcada como entregada exitosamente",
        id_orden_fabricacion: id,
        fecha_entrega: orden.fecha_entrega,
        fecha_fin_estimada: orden.fecha_fin_estimada,
      });
    } catch (error) {
      console.error("Error marcando orden como entregada:", error);
      res.status(500).json({ error: "Error al marcar orden como entregada" });
    }
  },

  /**
   * POST /api/kanban/marcar-entregadas
   * Marca múltiples órdenes como entregadas
   */
  marcarComoEntregadas: async (req, res) => {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          error: "Debe enviar al menos un id de orden de fabricación.",
        });
      }

      const idsNumericos = ids
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0);

      if (idsNumericos.length === 0) {
        return res.status(400).json({ error: "IDs inválidos." });
      }

      const ordenes = await kanbanModel.marcarComoEntregadas(idsNumericos);

      res.json({
        message: `${ordenes.length} órdenes marcadas como entregadas exitosamente`,
        ordenes,
      });
    } catch (error) {
      console.error("Error marcando órdenes como entregadas:", error);
      res
        .status(500)
        .json({ error: "Error al marcar órdenes como entregadas" });
    }
  },

  /**
   * GET /api/kanban/ordenes-entregadas
   * Obtiene órdenes entregadas filtradas por mes/año
   */
  getOrdenesEntregadas: async (req, res) => {
    try {
      const { mes, anio } = req.query;

      const ordenes = await kanbanModel.getOrdenesEntregadas(
        mes ? parseInt(mes) : null,
        anio ? parseInt(anio) : null,
      );

      res.json({
        ordenes,
        total: ordenes.length,
        mes: mes || new Date().getMonth() + 1,
        anio: anio || new Date().getFullYear(),
      });
    } catch (error) {
      console.error("Error obteniendo órdenes entregadas:", error);
      res.status(500).json({ error: "Error al cargar órdenes entregadas" });
    }
  },
};

module.exports = kanbanController;
