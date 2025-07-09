const dashboardModel = require("../models/dashboardModel");

const getDashboardData = async (req, res) => {
  try {
    const totalArticulos = await dashboardModel.getTotalArticulos();
    const ordenesPendientes = await dashboardModel.getOrdenesPendientes();
    const trabajadoresActivos = await dashboardModel.getTrabajadoresActivos();
    const TotalClientes = await dashboardModel.getTotalClientes();
    const costosIndirectos = Number(await dashboardModel.getCostosIndirectos());
    const pagosTrabajadores = await dashboardModel.getpagosTrabajadores();
    const egresosPagos = Number(await dashboardModel.getPagosTrabajadoresMes());

    const egresosServicios = Number(
      await dashboardModel.getServiciosTercerosMes()
    );
    const ingresos = Number(await dashboardModel.getIngresosMes());
    const produccionMensual = await dashboardModel.getProduccionMensual();

    const egresos = costosIndirectos + egresosPagos + egresosServicios;
    const margen = ingresos > 0 ? ((ingresos - egresos) / ingresos) * 100 : 0;

    console.log({ produccionMensual });
    res.json({
      totalArticulos,
      ordenesPendientes,
      trabajadoresActivos,
      TotalClientes,
      costosIndirectos,
      pagosTrabajadores,
      ingresosMes: ingresos,
      egresosMes: egresos,
      margenUtilidad: parseFloat(margen.toFixed(2)),
      produccionMensual,
    });
  } catch (error) {
    console.error("Error en dashboardController:", error);
    res.status(500).json({ error: "Error obteniendo datos de dashboard" });
  }
};

module.exports = {
  getDashboardData,
};
