import { useState, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import ChartCard from '../components/ChartCard';
import ResumenFinanciero from '../components/ResumenFinanciero';
import { Link } from 'react-router-dom';
import AlertaBajoStock from '../components/AlertaBajoStock'; 
// import OrdenesEnProceso from '../components/OrdenesEnProceso'; 
import TopListCard from '../components/TopListCard';
import api from '../services/api'; 
import PagosSemanaCard from '../components/PagosSemanaCard';

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
    tendenciaIngresos: 0,
    tendenciaEgresos: 0,
    tendenciaPagosSem: 0,
    topVendidosMes: [],
    topFabricadosMes: [],
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
    <main className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 auto-rows-[minmax(0,auto)]">
  
      <div className="lg:col-span-8">
        <ChartCard
          title="PRODUCCIÓN MENSUAL"
          data={data.produccionMensual}
          className="h-[360px]"
          right={
            <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
              Artículos registrados: <span className="font-semibold">{Number(data.totalArticulos).toLocaleString()}</span>
            </span>
          }
        />
      </div>
      <div className="lg:col-span-4 h-[360px] grid grid-rows-[auto_1fr] gap-4">
        <div className="grid grid-cols-2 gap-4">
          <KpiCard title="INGRESOS MES" value={`$${Number(data.ingresosMes).toLocaleString()}`} />
          <KpiCard title="EGRESOS MES" value={`$${Number(data.egresosMes).toLocaleString()}`} />
        </div>
        <Link to="/tesoreria" className="bg-white rounded-lg shadow p-4 h-full hover:shadow-md transition-shadow">
          <ResumenFinanciero
            ingresos={data.ingresosMes}
            egresos={data.egresosMes}
            margen={data.margenUtilidad}
          />
        </Link>
      </div>

      {/* Fila media: Alertas y pagos semanales */}
      <div className="lg:col-span-6">
        <div className="bg-white rounded-lg shadow p-4 h-[360px]">
          <AlertaBajoStock articulos={data.articulosBajoStock} to='/inventario' className="h-full" />
        </div>
      </div>
      <div className="lg:col-span-6 h-[360px] grid grid-rows-[auto_1fr] gap-4">
        <PagosSemanaCard
          pagos={data.pagosTrabajadores}
          anticipos={data.anticiposSemana}
          descuentos={data.descuentosSemana}
          trend={data.tendenciaPagosSem}
          className="min-h-[120px]"
        />
        <div className="grid grid-cols-2 gap-4 h-full overflow-hidden">
          <TopListCard to="/ordenes_venta" title="TOP 5 VENDIDOS (mes)" items={data.topVendidosMes} className="h-full overflow-auto" />
          <TopListCard to="/ordenes_fabricacion" title="TOP 5 FABRICADOS (mes)" items={data.topFabricadosMes} className="h-full overflow-auto" />
        </div>
      </div>

      {/* Fila baja eliminada: Órdenes en proceso */}
    </main>
  );
};
 
export default Dashboard;