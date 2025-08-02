import { useState, useEffect } from 'react';
import DashboardCard from '../components/DashboardCard';
import ChartCard from '../components/ChartCard';
import ResumenFinanciero from '../components/ResumenFinanciero';
import AlertaBajoStock from '../components/AlertaBajoStock'; 
import OrdenesEnProceso from '../components/OrdenesEnProceso'; 
import api from '../services/api'; 

const Dashboard = () => {
  const [data, setData] = useState({
    totalArticulos: 0,
    ordenesPendientes: 0,
    trabajadoresActivos: 0,
    TotalClientes: 0,
    produccionMensual: [],
    ingresosMes: 0,
    egresosMes: 0,
    margenUtilidad: 0,
    costosIndirectos: 0,
    pagosTrabajadores: 0,
    articulosBajoStock: [], 
    ordenesEnProceso: [], 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/dashboard');
        
        setData(prevData => ({
          ...prevData,
          ...res.data
        }));
      } catch (err) {
        console.error('Error cargando datos del dashboard:', err);
        setError('Error al cargar los datos del dashboard. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);
  
  if (loading) return <div className="flex justify-center items-center h-screen">Cargando...</div>;
  if (error) return <div className="text-center text-red-500 mt-20">{error}</div>;

  return (
    <main className="flex-grow p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Las primeras dos tarjetas se mantienen */}
      <DashboardCard
        title="ARTÍCULOS TOTALES"
        value={data.totalArticulos}
        to="/articulos"
        className="p-3 text-sm"
      />
    
 <DashboardCard
        title="PAGOS SEMANALES"
        value={`$${Number(data.pagosTrabajadores).toLocaleString()}`}
        to="/trabajadores/pagos"
        className="p-3 text-sm"
      />

      {/* La alerta de stock siempre ocupa el mismo espacio */}
      <AlertaBajoStock articulos={data.articulosBajoStock} to='/inventario' className="md:col-span-2" />

      <div className="md:col-span-2">
        <ResumenFinanciero
          ingresos={data.ingresosMes}
          egresos={data.egresosMes}
          margen={data.margenUtilidad}
        />
      </div>
      <div className="md:col-span-2">
        <OrdenesEnProceso ordenes={data.ordenesEnProceso}
        to="/ordenes_fabricacion" />
      </div>

      {/* Gráfica */}
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