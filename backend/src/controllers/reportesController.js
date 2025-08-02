
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
      estado
    });

    res.json(resultados);
  } catch (error) {
    console.error('Error al obtener reporte de avance de fabricación:', error);
    res.status(500).json({ error: 'Error al generar el reporte' });
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
      let { desde, hasta, orden } = req.query; 

  
      if (hasta) {
      
        hasta = `${hasta} 23:59:59`;
      }

      const data = await reportesModel.getCostosProduccion({ desde, hasta, orden });
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error en reporte de costos de producción:', error);
      res.status(500).json({ success: false, message: 'Error al generar el reporte de costos de producción.' });
    }
  },

async getUtilidadPorOrden(req, res) {
  try {
    let { desde, hasta, orden } = req.query;

    
    if (hasta) {
      hasta = `${hasta} 23:59:59`;
    }

    const data = await reportesModel.getUtilidadPorOrden({ desde, hasta, orden });

    res.json({ success: true, data });

  } catch (error) {
    console.error('Error en el reporte de utilidad:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de utilidad.' });
  }
},

async getPagosTrabajadores (req, res) {
    try {
      let { id_trabajador, desde, hasta} = req.query;

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
      console.error('Error en reporte pagos trabajadores:', error);
      res.status(500).json({ error: 'Error en reporte pagos trabajadores' });
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
                groupBy = 'orden', // Valor por defecto si no se especifica
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
            console.error('Error al obtener ventas por periodo:', error);
            res.status(500).json({ mensaje: 'Error al obtener las ventas por periodo' });
        }
    },
    
   async getMovimientosInventario(req, res) {
  try {
    let { id_articulo, tipo_movimiento, tipo_origen_movimiento, fecha_desde, fecha_hasta } = req.query;

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
    console.error('Error al obtener reporte de movimientos de inventario:', error);
    res.status(500).json({ success: false, message: 'Error al generar el reporte de movimientos de inventario.' });
  }
},
};

module.exports = reportesController;
