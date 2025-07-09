
const reportesModel = require('../models/reportesModel');

  


const reportesController = {
    getServiciosTercerizados: async (req, res) => {
  try {
    const filtros = {
      id_orden_fabricacion: req.query.id_orden_fabricacion,
      id_etapa_produccion: req.query.id_etapa_produccion,
      id_servicio: req.query.id_servicio,
      fecha_inicio: req.query.fecha_inicio,
      fecha_fin: req.query.fecha_fin
    };

    const resultados = await reportesModel.getServiciosTercerizados(filtros);
    res.json(resultados);
  } catch (error) {
    console.error('Error al obtener reporte de servicios tercerizados:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
  }
},

  getAvanceFabricacion: async (req, res) => {
    try {
      const { orden, desde, hasta, estado } = req.query;

      const resultados = await reportesModel.getAvanceFabricacion({
        orden,
        desde,
        hasta,
        estado
      });

      res.json(resultados);
    } catch (error) {
      console.error('Error al obtener reporte de avance de fabricación:', error);
      res.status(500).json({ error: 'Error al generar el reporte' });
    }
  },
  async getReporteOrdenesCompra(req, res) {
    try {
      const { proveedor, desde, hasta, estado } = req.query;
      const data = await reportesModel.getReporteOrdenesCompra({
        proveedor,
        desde,
        hasta,
        estado,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error al obtener reporte de órdenes de compra:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener el reporte.',
      });
    }
  },

async getInventarioActual(req, res) {
  try {
    const { categoria, articulo } = req.query;
    const data = await reportesModel.getInventarioActual({ categoria, articulo });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error al obtener reporte de inventario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el reporte de inventario.' });
  }
},
async getCostosProduccion(req, res) {
  try {
    const { desde, hasta, orden } = req.query;
    const data = await reportesModel.getCostosProduccion({ desde, hasta, orden });
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error en reporte de costos de producción:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de costos de producción.' });
  }
},
async getVentasPorPeriodo(req, res){
 try {
    const { desde, hasta, estado, id_cliente, monto_min, monto_max } = req.query;

    const data = await reportesModel.getVentasPorFiltros({
      desde,
      hasta,
      estado,
      id_cliente,
      monto_min,
      monto_max
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
},


async getUtilidadPorOrden(req, res){
  try {
    const { desde, hasta, estado } = req.query;

    const data = await reportesModel.getUtilidadPorOrden({ desde, hasta, estado });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
 
},

async getPagosTrabajadores (req, res) {
  try {
    const result = await reportesModel.getPagosTrabajadores(req.query);
    res.json(result);
  } catch (error) {
    console.error('Error en reporte pagos trabajadores:', error);
    res.status(500).json({ error: 'Error en reporte pagos trabajadores' });
  }
},
};

module.exports = reportesController;
