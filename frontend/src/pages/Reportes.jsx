import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/Card";
import {
  FiBarChart2,
  FiDollarSign,
  FiPackage,
  FiClipboard,
  FiSettings,
} from "react-icons/fi";

const reportes = [
  {
    titulo: "Reporte de Inventario",
    ruta: "/reportes/inventario",
    icono: <FiPackage />,
  },
  {
    titulo: "Avance de Fabricación",
    ruta: "/reportes/avances_fabricacion",
    icono: <FiClipboard />,
  },
  {
    titulo: "Ventas por Período",
    ruta: "/reportes/ventas_por_periodo",
    icono: <FiDollarSign />,
  },
  {
    titulo: "Compras por Período",
    ruta: "/reportes/ordenes_compra",
    icono: <FiClipboard />,
  },
  {
    titulo: "Pagos a trabajadores",
    ruta: "/reportes/pagos_trabajadores_dia",
    icono: <FiDollarSign />,
  },
  {
    titulo: "Costos de Producción",
    ruta: "/reportes/costos_fabricacion",
    icono: <FiBarChart2 />,
  },
  {
    titulo: "Utilidad por Orden",
    ruta: "/reportes/utilidad_por_orden",
    icono: <FiBarChart2 />,
  },
  {
    titulo: "Movimientos de inventario",
    ruta: "/reportes/movimientos_inventario",
    icono: <FiSettings />,
  },
  {
    titulo: "Tesorería: Ventas y Cobros",
    ruta: "/reportes/tesoreria_ventas",
    icono: <FiDollarSign />,
  },
];

const VistaReportes = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 select-none">
      <h1 className="text-4xl font-bold mb-6 text-gray-800">
        Panel de reportes
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {reportes.map((reporte, idx) => (
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
        ))}
      </div>
    </div>
  );
};

export default VistaReportes;
