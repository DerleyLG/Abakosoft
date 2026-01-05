const progresoFabricacionModel = require("../models/progresoFabricacionModel");

const progresoFabricacionController = {
  /**
   * GET /api/progreso-fabricacion
   * Obtiene el progreso detallado de todas las órdenes de fabricación
   */
  getProgresoDetallado: async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, id_orden_fabricacion, estado } =
        req.query;

      const progreso =
        await progresoFabricacionModel.calcularProgresoConEstimacion({
          fecha_inicio: fecha_inicio || null,
          fecha_fin: fecha_fin || null,
          id_orden_fabricacion: id_orden_fabricacion || null,
          estado_orden: estado || null,
        });

      res.json({
        success: true,
        data: progreso,
        total: progreso.length,
      });
    } catch (error) {
      console.error("Error obteniendo progreso de fabricación:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el progreso de fabricación",
      });
    }
  },

  /**
   * GET /api/progreso-fabricacion/resumen
   * Obtiene el resumen agrupado por orden de fabricación
   */
  getResumenPorOrden: async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, fechaInicio, estado, page = 1, limit = 20, busqueda } = req.query;
      
      // Soportar ambos formatos de fecha
      const fechaInicioFinal = fecha_inicio || fechaInicio || null;

      let resumen = await progresoFabricacionModel.getResumenPorOrden({
        fecha_inicio: fechaInicioFinal,
        fecha_fin: null, // Ya no usamos fecha_fin
        estado_orden: estado || null,
      });
      
      // Filtrar por búsqueda si se proporciona
      if (busqueda) {
        const busquedaLower = busqueda.toLowerCase();
        resumen = resumen.filter(orden => {
          // Buscar por ID de orden
          if (orden.id_orden_fabricacion?.toString().includes(busqueda)) return true;
          // Buscar por cliente
          if (orden.nombre_cliente?.toLowerCase().includes(busquedaLower)) return true;
          // Buscar por artículos (nombre o referencia)
          if (orden.articulos?.some(art => 
            art.nombre_articulo?.toLowerCase().includes(busquedaLower) ||
            art.referencia_articulo?.toLowerCase().includes(busquedaLower)
          )) return true;
          return false;
        });
      }
      
      // Paginación
      const pageNum = parseInt(page) || 1;
      const limitNum = parseInt(limit) || 20;
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      
      const paginatedData = resumen.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: paginatedData,
        total: resumen.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(resumen.length / limitNum),
      });
    } catch (error) {
      console.error("Error obteniendo resumen de fabricación:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el resumen de fabricación",
      });
    }
  },

  /**
   * GET /api/progreso-fabricacion/materia-prima
   * Obtiene el resumen de materia prima consumida en un período
   * Útil para el cierre semanal
   */
  getResumenMateriaPrima: async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, fechaInicio, fechaFin } = req.query;
      
      const inicio = fecha_inicio || fechaInicio;
      const fin = fecha_fin || fechaFin;

      if (!inicio || !fin) {
        return res.status(400).json({
          success: false,
          error: "Se requieren fechaInicio y fechaFin",
        });
      }

      const resumen =
        await progresoFabricacionModel.getResumenMateriaPrimaPeriodo(
          inicio,
          fin
        );

      res.json({
        success: true,
        ...resumen,
      });
    } catch (error) {
      console.error("Error obteniendo resumen de materia prima:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el resumen de materia prima",
      });
    }
  },

  /**
   * GET /api/progreso-fabricacion/orden/:id
   * Obtiene el progreso detallado de una orden específica
   */
  getProgresoOrden: async (req, res) => {
    try {
      const { id } = req.params;

      const progreso =
        await progresoFabricacionModel.calcularProgresoConEstimacion({
          id_orden_fabricacion: id,
        });

      if (progreso.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Orden de fabricación no encontrada",
        });
      }

      // Calcular totales para la orden
      let totalCostoMateria = 0;
      let totalMateriaUsada = 0;
      let articulosCompletados = 0;
      let articulosEnProceso = 0;

      progreso.forEach((item) => {
        totalCostoMateria += item.costo_total_estimado;
        totalMateriaUsada += item.materia_usada_estimada;

        if (item.estado_progreso === "Completado") {
          articulosCompletados++;
        } else if (
          item.estado_progreso === "En Proceso" ||
          item.estado_progreso === "Parcial"
        ) {
          articulosEnProceso++;
        }
      });

      const porcentajeGeneral =
        progreso.length > 0
          ? (articulosCompletados / progreso.length) * 100
          : 0;

      res.json({
        success: true,
        orden: {
          id_orden_fabricacion: parseInt(id),
          estado: progreso[0]?.estado_orden,
          fecha_inicio: progreso[0]?.fecha_inicio,
          nombre_cliente: progreso[0]?.nombre_cliente,
        },
        resumen: {
          total_articulos: progreso.length,
          articulos_completados: articulosCompletados,
          articulos_en_proceso: articulosEnProceso,
          porcentaje_completado: porcentajeGeneral.toFixed(1),
          costo_materia_total: totalCostoMateria,
          materia_usada_estimada: totalMateriaUsada,
          porcentaje_materia_consumida:
            totalCostoMateria > 0
              ? ((totalMateriaUsada / totalCostoMateria) * 100).toFixed(1)
              : 0,
        },
        articulos: progreso,
      });
    } catch (error) {
      console.error("Error obteniendo progreso de orden:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el progreso de la orden",
      });
    }
  },
};

module.exports = progresoFabricacionController;
