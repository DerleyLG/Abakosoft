const dashboardModel = require("../models/dashboardModel");

const getDashboardData = async (req, res) => {
  try {
    // Usamos Promise.all para hacer las llamadas al modelo de forma concurrente
    // esto es más eficiente que hacer cada llamada con await individualmente.
    const [
      totalArticulos,
      ordenesPendientes,
      trabajadoresActivos,
      TotalClientes,
      ingresosMes,
      egresosMes,
      pagosTrabajadoresSemana,
      produccionMensual,
      articulosBajoStock,
      ordenesEnProceso
    ] = await Promise.all([
      dashboardModel.getTotalArticulos(),
      dashboardModel.getOrdenesPendientes(),
      dashboardModel.getTrabajadoresActivos(),
      dashboardModel.getTotalClientes(),
      dashboardModel.getIngresosMes(),
      dashboardModel.getEgresosMes(),
      dashboardModel.getPagosTrabajadoresSemana(),
      dashboardModel.getProduccionMensual(),
      dashboardModel.getArticulosBajoStock(),
      dashboardModel.getOrdenesEnProceso()
    ]);

    // Cálculo del margen de utilidad
    const margenUtilidad = ingresosMes > 0 ? ((ingresosMes - egresosMes) / ingresosMes) * 100 : 0;
  

    // Enviamos los datos en una única respuesta JSON
    res.json({
      totalArticulos,
      ordenesPendientes,
      trabajadoresActivos,
      TotalClientes,
      ingresosMes: Number(ingresosMes),
      egresosMes: Number(egresosMes),
  
      pagosTrabajadores: Number(pagosTrabajadoresSemana),
      margenUtilidad: parseFloat(margenUtilidad.toFixed(2)),
      produccionMensual,
      articulosBajoStock,
      ordenesEnProceso,
    });
  } catch (error) {
    console.error("Error en dashboardController:", error);
    res.status(500).json({ error: "Error obteniendo datos de dashboard" });
  }
};

module.exports = {
  getDashboardData,
};