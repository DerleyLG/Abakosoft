const dashboardModel = require("../models/dashboardModel");

const getDashboardData = async (req, res) => {
  try {
    const [
      totalArticulos,
      ordenesPendientes,
      trabajadoresActivos,
      TotalClientes,
      ingresosMes,
      egresosMes,
      pagosTrabajadoresSemana,
      anticiposSemana,
      descuentosSemana,
      produccionMensual,
      articulosBajoStock,
      ordenesEnProceso,
      ingresosMesAnterior,
      egresosMesAnterior,
      pagosTrabajadoresSemanaAnterior,
      topVendidosMes,
      topFabricadosMes,
      ventasSemana,
      comprasSemana,
    ] = await Promise.all([
      dashboardModel.getTotalArticulos(),
      dashboardModel.getOrdenesPendientes(),
      dashboardModel.getTrabajadoresActivos(),
      dashboardModel.getTotalClientes(),
      dashboardModel.getIngresosMes(),
      dashboardModel.getEgresosMes(),
      dashboardModel.getPagosTrabajadoresSemana(),
      dashboardModel.getAnticiposSemana(),
      dashboardModel.getDescuentosSemana(),
      dashboardModel.getProduccionMensual(),
      dashboardModel.getArticulosBajoStock(),
      dashboardModel.getOrdenesEnProceso(),
      dashboardModel.getIngresosMesAnterior(),
      dashboardModel.getEgresosMesAnterior(),
      dashboardModel.getPagosTrabajadoresSemanaAnterior(),
      dashboardModel.getTopVendidosMes(),
      dashboardModel.getTopFabricadosMes(),
      dashboardModel.getVentasSemana(),
      dashboardModel.getComprasSemana(),
    ]);

    // Cálculo del margen de utilidad
    const margenUtilidad =
      ingresosMes > 0 ? ((ingresosMes - egresosMes) / ingresosMes) * 100 : 0;
    const tendenciaIngresos =
      ingresosMesAnterior > 0
        ? ((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100
        : ingresosMes > 0
        ? 100
        : 0;
    const tendenciaEgresos =
      egresosMesAnterior > 0
        ? ((egresosMes - egresosMesAnterior) / egresosMesAnterior) * 100
        : egresosMes > 0
        ? 100
        : 0;
    const tendenciaPagosSem =
      pagosTrabajadoresSemanaAnterior > 0
        ? ((pagosTrabajadoresSemana - pagosTrabajadoresSemanaAnterior) /
            pagosTrabajadoresSemanaAnterior) *
          100
        : pagosTrabajadoresSemana > 0
        ? 100
        : 0;

    // Enviamos los datos en una única respuesta JSON
    res.json({
      totalArticulos,
      ordenesPendientes,
      trabajadoresActivos,
      TotalClientes,
      ingresosMes: Number(ingresosMes),
      egresosMes: Number(egresosMes),
      ventasSemana: Number(ventasSemana),
      comprasSemana: Number(comprasSemana),
      tendenciaIngresos: Number(tendenciaIngresos.toFixed(2)),
      tendenciaEgresos: Number(tendenciaEgresos.toFixed(2)),
      tendenciaPagosSem: Number(tendenciaPagosSem.toFixed(2)),
      pagosTrabajadores: Number(pagosTrabajadoresSemana),
      anticiposSemana: Number(anticiposSemana),
      descuentosSemana: Number(descuentosSemana),
      margenUtilidad: parseFloat(margenUtilidad.toFixed(2)),
      produccionMensual,
      articulosBajoStock,
      ordenesEnProceso,
      topVendidosMes,
      topFabricadosMes,
    });
  } catch (error) {
    console.error("Error en dashboardController:", error);
    res.status(500).json({ error: "Error obteniendo datos de dashboard" });
  }
};

module.exports = {
  getDashboardData,
};
