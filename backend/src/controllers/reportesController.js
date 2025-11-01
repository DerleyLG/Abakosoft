const reportesModel = require("../models/reportesModel");

const reportesController = {
  getServiciosTercerizados: async (req, res) => {
    try {
      const filtros = {
        id_orden_fabricacion: req.query.id_orden_fabricacion,
        id_etapa_produccion: req.query.id_etapa_produccion,
        id_servicio: req.query.id_servicio,
        fecha_inicio: req.query.fecha_inicio,
        fecha_fin: req.query.fecha_fin,
      };

      const resultados = await reportesModel.getServiciosTercerizados(filtros);
      res.json(resultados);
    } catch (error) {
      console.error(
        "Error al obtener reporte de servicios tercerizados:",
        error
      );
      res.status(500).json({ error: "Error al generar el reporte" });
    }
  },
  // (controladores adicionales eliminados)

  // ...
  getAvanceFabricacion: async (req, res) => {
    try {
      let { orden, desde, hasta, estado } = req.query;

      if (hasta) {
        hasta = `${hasta} 23:59:59`;
      }

      const resultados = await reportesModel.getAvanceFabricacion({
        orden,
        desde,
        hasta,
        estado,
      });

      res.json(resultados);
    } catch (error) {
      console.error(
        "Error al obtener reporte de avance de fabricación:",
        error
      );
      res.status(500).json({ error: "Error al generar el reporte" });
    }
  },
  // ...
  async getReporteOrdenesCompra(req, res) {
    try {
      let { proveedor, desde, hasta, estado } = req.query;

      if (hasta) {
        hasta = `${hasta} 23:59:59`;
      }

      const data = await reportesModel.getReporteOrdenesCompra({
        proveedor,
        desde,
        hasta,
        estado,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error al obtener reporte de órdenes de compra:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el reporte.",
      });
    }
  },

  async getInventarioActual(req, res) {
    try {
      let { categoria, articulo, desde, hasta } = req.query;

      // Si llegan parámetros duplicados (?desde=...&desde=...), Express puede parsearlos como array
      if (Array.isArray(desde)) {
        // Tomamos el último valor asumiendo que es el más reciente (UI > default)
        desde = desde[desde.length - 1];
      }
      if (Array.isArray(hasta)) {
        hasta = hasta[hasta.length - 1];
      }

      // Si por algún proxy o cliente llegan como string con comas, tomar el último valor no vacío
      if (typeof desde === "string" && desde.includes(",")) {
        const parts = desde
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) desde = parts[parts.length - 1];
      }
      if (typeof hasta === "string" && hasta.includes(",")) {
        const parts = hasta
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) hasta = parts[parts.length - 1];
      }

      if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        hasta = `${hasta} 23:59:59`;
      }
      const data = await reportesModel.getInventarioActual({
        categoria,
        articulo,
        desde,
        hasta,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error al obtener reporte de inventario:", error);
      res.status(500).json({
        success: false,
        message: "Error al obtener el reporte de inventario.",
      });
    }
  },

  async getCostosProduccion(req, res) {
    try {
      let { desde, hasta, orden } = req.query;

      if (hasta) {
        hasta = `${hasta} 23:59:59`;
      }

      const data = await reportesModel.getCostosProduccion({
        desde,
        hasta,
        orden,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error en reporte de costos de producción:", error);
      res.status(500).json({
        success: false,
        message: "Error al generar el reporte de costos de producción.",
      });
    }
  },

  async getUtilidadPorOrden(req, res) {
    try {
      let { desde, hasta, orden, solo_mano_obra } = req.query;

      if (hasta) {
        hasta = `${hasta} 23:59:59`;
      }

      const soloManoObraBool =
        solo_mano_obra == null
          ? true
          : ["1", "true", "si", "sí", "yes"].includes(
              String(solo_mano_obra).toLowerCase()
            );

      const data = await reportesModel.getUtilidadPorOrden({
        desde,
        hasta,
        orden,
        solo_mano_obra: soloManoObraBool,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error en el reporte de utilidad:", error);
      res.status(500).json({
        success: false,
        message: "Error al generar el reporte de utilidad.",
      });
    }
  },

  async getPagosTrabajadores(req, res) {
    try {
      let { id_trabajador, desde, hasta } = req.query;

      if (hasta) {
        hasta = `${hasta} 23:59:59`;
      }

      const result = await reportesModel.getPagosTrabajadores({
        id_trabajador,
        desde,
        hasta, // 'hasta' ya incluye el final del día
      });
      res.json(result);
    } catch (error) {
      console.error("Error en reporte pagos trabajadores:", error);
      res.status(500).json({ error: "Error en reporte pagos trabajadores" });
    }
  },

  async getPagosTrabajadoresPorDia(req, res) {
    try {
      let { id_trabajador, desde, hasta, id_orden_fabricacion } = req.query;

      if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        hasta = `${hasta} 23:59:59`;
      }

      const data = await reportesModel.getPagosTrabajadoresPorDia({
        id_trabajador,
        desde,
        hasta,
        id_orden_fabricacion,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error en reporte pagos trabajadores por día:", error);
      res.status(500).json({
        success: false,
        message: "Error en reporte pagos trabajadores por día",
      });
    }
  },

  async getVentasPorPeriodo(req, res) {
    try {
      const {
        // Mapeamos los nombres de los filtros del frontend a los nombres que espera el modelo
        fecha_inicio: desde,
        fecha_fin: hasta,
        estado, // Si tienes un filtro de estado en ReporteVentasPorPeriodo
        id_cliente, // Si tienes un filtro de cliente en ReporteVentasPorPeriodo
        groupBy = "orden", // Valor por defecto si no se especifica
      } = req.query;

      const ventas = await reportesModel.getVentasPorPeriodo({
        desde,
        hasta,
        estado,
        id_cliente,
        groupBy,
      });

      res.json(ventas);
    } catch (error) {
      console.error("Error al obtener ventas por periodo:", error);
      res
        .status(500)
        .json({ mensaje: "Error al obtener las ventas por periodo" });
    }
  },

  async getMovimientosInventario(req, res) {
    try {
      let {
        id_articulo,
        tipo_movimiento,
        tipo_origen_movimiento,
        fecha_desde,
        fecha_hasta,
      } = req.query;

      if (fecha_hasta) {
        fecha_hasta = `${fecha_hasta} 23:59:59`;
      }

      const data = await reportesModel.getMovimientosInventario({
        id_articulo,
        tipo_movimiento,
        tipo_origen_movimiento,
        fecha_desde,
        fecha_hasta,
      });

      res.json({ success: true, data });
    } catch (error) {
      console.error(
        "Error al obtener reporte de movimientos de inventario:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Error al generar el reporte de movimientos de inventario.",
      });
    }
  },
};

module.exports = reportesController;
