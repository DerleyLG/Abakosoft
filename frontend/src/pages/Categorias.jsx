import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiTrash2,
  FiPlus,
  FiPackage,
  FiBox,
  FiTool,
  FiSearch,
} from "react-icons/fi";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { confirmAlert } from "react-confirm-alert";

const TIPOS = [
  {
    key: "articulo_fabricable",
    label: "Artículos Fabricables",
    icon: FiPackage,
    active: "bg-blue-600 text-white shadow-sm",
    inactive: "text-slate-600 hover:bg-slate-100",
  },
  {
    key: "materia_prima",
    label: "Materia Prima",
    icon: FiBox,
    active: "bg-emerald-600 text-white shadow-sm",
    inactive: "text-slate-600 hover:bg-slate-100",
  },
  {
    key: "costo_produccion",
    label: "Costos de Producción",
    icon: FiTool,
    active: "bg-amber-500 text-white shadow-sm",
    inactive: "text-slate-600 hover:bg-slate-100",
  },
];

const TIPO_BADGE = {
  articulo_fabricable: {
    label: "Fabricable",
    cls: "bg-blue-50 text-blue-700 border-blue-100",
  },
  materia_prima: {
    label: "Materia Prima",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  costo_produccion: {
    label: "Costo Prod.",
    cls: "bg-amber-50 text-amber-700 border-amber-100",
  },
};

const ListaCategorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [activeTab, setActiveTab] = useState("articulo_fabricable");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const cargarCategorias = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categorias");
      setCategorias(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando categorías", error);
      toast.error("Error al cargar categorías");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleDelete = (id_categoria) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Estás seguro de que deseas eliminar esta categoría?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/categorias/${id_categoria}`);
              toast.success(" Categoría eliminada correctamente");
              cargarCategorias(); // ahora sí funciona
            } catch (error) {
              console.error("Error al eliminar categoría:", error);
              toast.error(" No se pudo eliminar la categoría");
            }
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/categorias/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate("/categorias/nuevo");
  };

  const categoriasFiltradas = categorias
    .filter((c) => c.tipo === activeTab)
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  const total = categorias.filter((c) => c.tipo === activeTab).length;

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Catálogo de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Categorías
            </h1>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={handleCrearClick}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <FiPlus size={16} />
          Crear categoría
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        {TIPOS.map(({ key, label, icon: Icon, active, inactive }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setBusqueda("");
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === key ? active : inactive
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <FiSearch
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Tipo
                </th>
                <th className="px-4 py-3 w-16">&nbsp;</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 3 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : categoriasFiltradas.length > 0 ? (
                categoriasFiltradas.map((cat) => {
                  const badge =
                    TIPO_BADGE[cat.tipo] || TIPO_BADGE["articulo_fabricable"];
                  return (
                    <tr
                      key={cat.id_categoria}
                      onDoubleClick={() =>
                        handleRowDoubleClick(cat.id_categoria)
                      }
                      className="hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {cat.nombre}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(cat.id_categoria);
                          }}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Eliminar categoría"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiPackage size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron categorías
                      </p>
                      {busqueda && (
                        <p className="text-xs">
                          Intenta con otro término de búsqueda
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ListaCategorias;
