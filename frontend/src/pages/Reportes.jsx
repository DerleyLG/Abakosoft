import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/Card";
import {
  FiBarChart2,
  FiDollarSign,
  FiPackage,
  FiClipboard,
  FiSettings,
  FiLock,
} from "react-icons/fi";
import { usePlan } from "../hooks/usePlanApi";

const reportes = [
  {
    titulo: "Reporte de Inventario",
    ruta: "/reportes/inventario",
    icono: <FiPackage />,
    feature: "inventario",
  },
  {
    titulo: "Ventas por Período",
    ruta: "/reportes/ventas_por_periodo",
    icono: <FiDollarSign />,
    feature: "ventas",
  },
  {
    titulo: "Compras por Período",
    ruta: "/reportes/ordenes_compra",
    icono: <FiClipboard />,
    feature: "compras",
  },
  {
    titulo: "Movimientos de inventario",
    ruta: "/reportes/movimientos_inventario",
    icono: <FiSettings />,
    feature: "seguimiento_inventario",
  },
  {
    titulo: "Tesorería: Ventas y Cobros",
    ruta: "/reportes/tesoreria_ventas",
    icono: <FiDollarSign />,
    feature: "tesoreria",
  },
  {
    titulo: "Avance de Fabricación",
    ruta: "/reportes/avances_fabricacion",
    icono: <FiClipboard />,
    feature: "fabricacion",
  },
  {
    titulo: "Pagos a trabajadores",
    ruta: "/reportes/pagos_trabajadores_dia",
    icono: <FiDollarSign />,
    feature: "pagos",
  },
  {
    titulo: "Costos de Producción",
    ruta: "/reportes/costos_fabricacion",
    icono: <FiBarChart2 />,
    feature: "costos",
  },
  {
    titulo: "Utilidad por Orden",
    ruta: "/reportes/utilidad_por_orden",
    icono: <FiBarChart2 />,
    feature: "fabricacion",
  },
];

const VistaReportes = () => {
  const navigate = useNavigate();
  const { features } = usePlan();

  return (
    <div className="p-6 select-none">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">
        Panel de reportes
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reportes.map((reporte, idx) => {
          const disponible = features.includes(reporte.feature);
          return disponible ? (
            <Card
              key={idx}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => navigate(reporte.ruta)}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="text-xl text-slate-600">{reporte.icono}</div>
                <div className="text-lg text-slate-800 font-medium">
                  {reporte.titulo}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card key={idx} className="opacity-50 cursor-not-allowed">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="text-xl text-slate-400">{reporte.icono}</div>
                <div className="flex-1">
                  <div className="text-lg text-slate-500 font-medium">
                    {reporte.titulo}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                  <FiLock size={9} /> Pro
                </span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default VistaReportes;
