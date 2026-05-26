import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import {
  FiTrash2,
  FiPlus,
  FiPackage,
  FiBox,
  FiTool,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
} from "react-icons/fi";
import "../styles/confirmAlert.css";

const ListaArticulos = () => {
  const [articulos, setArticulos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [activeTab, setActiveTab] = useState("articulo_fabricable"); // 'articulo_fabricable' | 'materia_prima' | 'costo_produccion'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [total, setTotal] = useState(0);
  const [sortBy] = useState("descripcion");
  const [sortDir] = useState("asc");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cargar categorías al inicio
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const resCategorias = await api.get("/categorias");
        setCategorias(
          Array.isArray(resCategorias.data) ? resCategorias.data : [],
        );
      } catch (error) {
        console.error("Error cargando categorías", error);
        const msg =
          error.response?.data?.mensaje ||
          error.response?.data?.message ||
          error.message;
        toast.error(msg);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar artículos con paginación y filtros
  useEffect(() => {
    const fetchArticulos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/articulos", {
          params: {
            buscar: searchTerm,
            tipo_categoria: categoriaSeleccionada ? "" : activeTab, // Solo tipo si no hay categoría específica
            id_categoria: categoriaSeleccionada, // Categoría específica si está seleccionada
            page,
            pageSize,
            sortBy,
            sortDir,
          },
        });

        const payload = res.data || {};
        setArticulos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
        setTotal(Number(payload.total) || 0);
      } catch (error) {
        console.error("Error cargando artículos", error);
        const msg =
          error.response?.data?.mensaje ||
          error.response?.data?.message ||
          error.message;
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    // Solo ejecutar si ya tenemos categorías cargadas
    if (categorias.length > 0) {
      fetchArticulos();
    }
  }, [
    searchTerm,
    categoriaSeleccionada,
    activeTab,
    page,
    pageSize,
    sortBy,
    sortDir,
    categorias,
  ]);

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar este artículo?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              const idempotencyKey = crypto.randomUUID();
              await api.delete(`/articulos/${id}`, { headers: { "X-Idempotency-Key": idempotencyKey } });
              toast.success(" Artículo eliminado");
              setArticulos((prev) => prev.filter((a) => a.id_articulo !== id));
            } catch (error) {
              const mensajeBackend =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;

              toast.error(mensajeBackend);
            }
          },
        },
        {
          label: "No",
          onClick: () => {}, // No hace nada, solo cierra el modal
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/articulos/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate("/articulos/nuevo");
  };

  // Handlers para resetear página cuando cambian filtros/búsqueda
  const onSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const onCategoriaChange = (e) => {
    setCategoriaSeleccionada(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCategoriaSeleccionada(""); // Resetear categoría al cambiar tab
    setPage(1);
  };

  // Obtener categorías filtradas según el tab activo
  const getCategoriasFiltradas = () => {
    return categorias.filter((cat) => cat.tipo === activeTab);
  };

  // Configuración de tabs dinámicos
  const tabsConfig = {
    articulo_fabricable: {
      label: "Artículos Fabricables",
      icon: FiPackage,
      color: "blue",
    },
    materia_prima: {
      label: "Materia Prima",
      icon: FiBox,
      color: "green",
    },
    costo_produccion: {
      label: "Costos de Producción",
      icon: FiTool,
      color: "orange",
    },
  };

  const tabAccent = {
    articulo_fabricable: {
      active: "bg-blue-600 text-white shadow-sm",
      inactive: "text-slate-600 hover:bg-slate-100",
    },
    materia_prima: {
      active: "bg-emerald-600 text-white shadow-sm",
      inactive: "text-slate-600 hover:bg-slate-100",
    },
    costo_produccion: {
      active: "bg-amber-500 text-white shadow-sm",
      inactive: "text-slate-600 hover:bg-slate-100",
    },
  };

  const categoriasDisponibles = getCategoriasFiltradas();

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Artículos
          </h1>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total.toLocaleString()}
            </span>
          )}
        </div>
        <button
          onClick={handleCrearClick}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          title="Crear nuevo artículo"
        >
          <FiPlus size={16} />
          Crear artículo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
        {Object.entries(tabsConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive ? tabAccent[key].active : tabAccent[key].inactive
              }`}
            >
              <Icon size={15} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <FiSearch
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar por referencia o descripción…"
            value={searchTerm}
            onChange={onSearchChange}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
          />
        </div>
        {categoriasDisponibles.length > 0 && (
          <div className="relative">
            <FiFilter
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <select
              value={categoriaSeleccionada}
              onChange={onCategoriaChange}
              className="pl-8 pr-8 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent text-slate-700 cursor-pointer appearance-none min-w-[180px] transition"
              title="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categoriasDisponibles.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Referencia
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Descripción
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Unidad
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  P. Venta
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  P. Costo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Categoría
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-16">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : articulos.length > 0 ? (
                articulos.map((art) => (
                  <tr
                    key={art.id_articulo}
                    onDoubleClick={() => handleRowDoubleClick(art.id_articulo)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">
                      {art.referencia || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[260px] truncate">
                      {art.descripcion}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                        {art.abreviatura_unidad || art.nombre_unidad || "ud"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      ${Number(art.precio_venta).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                      ${Number(art.precio_costo).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {art.nombre_categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(art.id_articulo);
                        }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Eliminar artículo"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiBox size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron artículos
                      </p>
                      {searchTerm && (
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

        {/* Paginación */}
        <div className="border-t border-slate-100 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <p className="text-xs text-slate-500">
            {total > 0 ? (
              <>
                Mostrando{" "}
                <span className="font-semibold text-slate-700">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-700">
                  {total.toLocaleString()}
                </span>{" "}
                artículos
              </>
            ) : (
              "Sin resultados"
            )}
          </p>

          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value={10}>10 / pág.</option>
              <option value={25}>25 / pág.</option>
              <option value={50}>50 / pág.</option>
              <option value={100}>100 / pág.</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Página anterior"
              >
                <FiChevronLeft size={15} />
              </button>
              <span className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => hasNext && setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Página siguiente"
              >
                <FiChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaArticulos;
