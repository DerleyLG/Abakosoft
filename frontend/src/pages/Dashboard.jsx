import { useState, useEffect } from 'react';
import DashboardCard from '../components/DashboardCard';
import ChartCard from '../components/ChartCard';
import ResumenFinanciero from '../components/ResumenFinanciero'
import api from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState({
    totalArticulos: 0,
    ordenesPendientes: 0,
    produccionMensual: [],
    trabajadoresActivos:0,
    TotalClientes:0,
  });



  useEffect(() => {
  const fetchData = async () => {
    const resCostosIndirectos = await fetch('/api/reportes/costos-indirectos-mes');
    const dataCostos = await resCostosIndirectos.json();
    const [data, setData] = useState({});
     const res = await fetch('/api/dashboard');
    setData(prev => ({
      ...prev,
      pagosSemanales: prev.pagosSemanales.total_semana,
      costosIndirectos: dataCostos.total,
      ingresosMes: data.ingresosMes, 
      egresosMes: data.egresosMes, 
      margenUtilidad: data.margenUtilidad


    }));
  };

  fetchData();

}, []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/dashboard');
        setData(res.data);
      } catch (error) {
        console.error('Error cargando datos de dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>;

  return (
    
<main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-4 gap-4">

  {/* Tarjetas pequeñas más compactas */}
  <DashboardCard
    title="ARTÍCULOS TOTALES"
    value={data.totalArticulos}
    className="p-3 text-sm"
  />
  <DashboardCard
    title="ÓRDENES PENDIENTES"
    value={data.ordenesPendientes}
    className="p-3 text-sm"
  />
  <DashboardCard
    title="TRABAJADORES ACTIVOS"
    value={data.trabajadoresActivos}
    className="p-3 text-sm"
  />
  <DashboardCard
    title="CLIENTES REGISTRADOS"
    value={data.TotalClientes}
    className="p-3 text-sm"
  />
   <DashboardCard
    title="COSTOS INDIRECTOS"
    value={`$${Number(data.costosIndirectos).toLocaleString()}`}
    className="p-3 text-sm"
  />

   <DashboardCard
    title="PAGOS SEMANALES"
    value={`$${Number(data.pagosTrabajadores).toLocaleString()}`}
    className="pl-4"
  />

  

    <ResumenFinanciero
      ingresos={data.ingresosMes}
      egresos={data.egresosMes}
      margen={data.margenUtilidad}
    />


  {/* Gráfica con tamaño destacado */}
  <div className="md:col-span-4">
    <ChartCard
      title="PRODUCCIÓN MENSUAL"
      data={data.produccionMensual}
      className="h-[400px]"
    />
  </div>
</main>

    
  );
};

export default Dashboard;

