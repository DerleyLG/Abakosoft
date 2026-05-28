// Formatea cantidades: sin decimales si es entero, con decimales si los tiene
function formateaCantidad(valor) {
  if (valor === null || valor === undefined) return 0;
  const num = Number(valor);
  if (Number.isNaN(num)) return 0;
  if (Number.isInteger(num)) return num;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}
import { useState, useEffect } from "react";
import { usePlan } from "../hooks/usePlanApi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiPlus,
  FiEdit3,
  FiPackage,
  FiBox,
  FiTool,
  FiTrash2,
  FiEye,
  FiActivity,
} from "react-icons/fi";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import EditarStockModal from "../components/EditarStockModal";
import SeguimientoArticuloDrawer from "../components/SeguimientoArticuloDrawer";
import ConsumoMateriaPrimaDrawer from "../components/ConsumoMateriaPrimaDrawer";

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  const [activeTab, setActiveTab] = useState("articulo_fabricable");
  const [stockFabricadoFilter, setStockFabricadoFilter] = useState("");
  const [stockProcesoFilter, setStockProcesoFilter] = useState("");
  const [stockDisponibleFilter, setStockDisponibleFilter] = useState("");
  const [modalEditarStock, setModalEditarStock] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(null);
  const [drawerSeguimiento, setDrawerSeguimiento] = useState(false);
  const [articuloSeguimiento, setArticuloSeguimiento] = useState(null);
  const [drawerConsumo, setDrawerConsumo] = useState(false);
  const navigate = useNavigate();
  const { features } = usePlan();
  const { user } = useAuth();
  const canCreate = can(user, ACTIONS.INVENTORY_EDIT);
  const canEdit = can(user, ACTIONS.INVENTORY_EDIT);
  const canDelete = can(user, ACTIONS.INVENTORY_DELETE);

  // Cargar categorías una sola vez
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await api.get("/categorias");
        setCategorias(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando categorías", error);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar inventario con filtros desde el backend
  useEffect(() => {
    const fetchInventario = async () => {
      try {
        const res = await api.get("/inventario", {
          params: {
            page,
            pageSize,
            buscar: searchTerm || undefined,
            // búsqueda global cuando hay texto; filtro por tab cuando no hay
            tipo_categoria: searchTerm ? undefined : (activeTab || undefined),
            id_categoria: categoriaSeleccionada || undefined,
            stock_fabricado: stockFabricadoFilter || undefined,
            stock_en_proceso: stockProcesoFilter || undefined,
            stock_disponible: stockDisponibleFilter || undefined,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const payload = res.data || {};
        setInventario(Array.isArray(payload.data) ? payload.data : []);
        setTotal(Number(payload.total) || 0);
        setTotalPages(Number(payload.totalPages) || 1);
      } catch (error) {
        console.error("Error cargando inventario", error);
        const msg =
          error.response?.data?.mensaje ||
          error.response?.data?.message ||
          error.message;
        toast.error(msg);
      }
    };
    fetchInventario();
  }, [
    page,
    pageSize,
    searchTerm,
    activeTab,
    categoriaSeleccionada,
    stockFabricadoFilter,
    stockProcesoFilter,
    stockDisponibleFilter,
  ]);

  const cargarInventario = async () => {
    try {
      const res = await api.get("/inventario", {
        params: {
          page,
          pageSize,
          buscar: searchTerm || undefined,
          tipo_categoria: activeTab || undefined,
          id_categoria: categoriaSeleccionada || undefined,
          stock_fabricado: stockFabricadoFilter || undefined,
          stock_en_proceso: stockProcesoFilter || undefined,
          stock_disponible: stockDisponibleFilter || undefined,
          sortBy: "descripcion",
          sortDir: "asc",
        },
      });
      const payload = res.data || {};
      setInventario(Array.isArray(payload.data) ? payload.data : []);
      setTotal(Number(payload.total) || 0);
      setTotalPages(Number(payload.totalPages) || 1);
    } catch (error) {
      console.error("Error al cargar inventario", error);
      toast.error("Error al cargar inventario");
    }
  };

  const handleDelete = (id_articulo) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message:
        "¿Seguro que quieres quitar este artículo del inventario? Si tiene stock, no se permitirá.",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/inventario/${id_articulo}`);
              toast.success("Artículo removido del inventario");
              cargarInventario();
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
          onClick: () => {},
        },
      ],
    });
  };

  const abrirModalEditarStock = (item) => {
    setItemSeleccionado(item);
    setModalEditarStock(true);
  };

  const cerrarModalEditarStock = () => {
    setModalEditarStock(false);
    setItemSeleccionado(null);
  };

  const guardarStockYMinimo = async (datos) => {
    try {
      await api.put(
        `/inventario/${datos.id_articulo}`,
        { stock: datos.stock, stock_minimo: datos.stock_minimo },
        datos.idempotencyKey
          ? { headers: { "X-Idempotency-Key": datos.idempotencyKey } }
          : {},
      );
      toast.success("Inventario actualizado correctamente");
      cargarInventario();
    } catch (error) {
      console.error(
        "Error al actualizar inventario",
        error.response?.data || error.message,
      );
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al actualizar inventario";
      toast.error(mensajeBackend);
      throw error;
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCategoriaSeleccionada("");
    setPage(1);
  };

  const getCategoriasFiltradas = () => {
    return categorias.filter((cat) => cat.tipo === inferredTab);
  };

  const tabsConfig = {
    articulo_fabricable: {
      label: "Artículos Fabricables",
      icon: FiPackage,
      activeClass: "bg-blue-600 text-white",
      inactiveClass: "text-slate-600 hover:bg-slate-200",
    },
    materia_prima: {
      label: "Materia Prima",
      icon: FiBox,
      activeClass: "bg-emerald-600 text-white",
      inactiveClass: "text-slate-600 hover:bg-slate-200",
    },
    costo_produccion: {
      label: "Costos de Producción",
      icon: FiTool,
      activeClass: "bg-amber-500 text-white",
      inactiveClass: "text-slate-600 hover:bg-slate-200",
    },
  };

  const inferredTab =
    searchTerm && inventario.length > 0
      ? inventario[0].tipo_categoria || activeTab
      : activeTab;

  const filteredItems = searchTerm
    ? inventario.filter((i) => i.tipo_categoria === inferredTab)
    : inventario;

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Inventario
          </h1>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón Consumo solo si el plan tiene movimientos_inventario */}
          {features && features.includes("movimientos_inventario") && (
            <button
              onClick={() => setDrawerConsumo(true)}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-400 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FiBox size={15} />
              Consumo
            </button>
          )}
          <button
            onClick={() => navigate("/inventario/seguimiento")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-500 text-white shadow-sm transition-colors cursor-pointer"
          >
            <FiActivity size={15} />
            Seguimiento
          </button>
          {canCreate && (
            <button
              onClick={() => navigate("/inventario/nuevo")}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={16} />
              Agregar artículo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-slate-100 p-1 rounded-xl w-fit border border-slate-200 flex gap-1">
        {Object.entries(tabsConfig).map(([key, config]) => {
          const Icon = config.icon;
          const isActive = inferredTab === key;
          return (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                isActive ? config.activeClass : config.inactiveClass
              }`}
            >
              <Icon size={15} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Buscar
            </label>
            <div className="relative">
              <FiPlus size={0} className="hidden" />
              <input
                type="text"
                placeholder="Buscar artículo…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-4 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Categoría
            </label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => {
                setCategoriaSeleccionada(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {getCategoriasFiltradas().map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              label: "Stock fabricado",
              value: stockFabricadoFilter,
              setter: setStockFabricadoFilter,
            },
            {
              label: "Stock en proceso",
              value: stockProcesoFilter,
              setter: setStockProcesoFilter,
            },
            {
              label: "Stock disponible",
              value: stockDisponibleFilter,
              setter: setStockDisponibleFilter,
            },
          ].map(({ label, value, setter }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                {label}
              </label>
              <select
                value={value}
                onChange={(e) => {
                  setter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                <option value="">Todos</option>
                <option value="gt0">Con stock</option>
                <option value="eq0">Sin stock</option>
              </select>
            </div>
          ))}
        </div>
        {categoriaSeleccionada &&
          filteredItems.length === 0 &&
          allItems?.length > 0 && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              ⚠️ <strong>Filtro de categoría no disponible:</strong> Los
              artículos en inventario no tienen categorías asignadas.
            </p>
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
                  Artículo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Unidad
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Disponible
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fabricado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  En proceso
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Mínimo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Actualización
                </th>
                <th className="px-4 py-3 w-24">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const bajoMinimo =
                    item.stock_minimo > 0 &&
                    Number(item.stock_disponible) < Number(item.stock_minimo);
                  return (
                    <tr
                      key={item.id_inventario ?? `art-${item.id_articulo}`}
                      onClick={() => {
                        setArticuloSeguimiento(item.id_articulo);
                        setDrawerSeguimiento(true);
                      }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {item.referencia || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium text-slate-800 truncate max-w-[180px]"
                            title={item.descripcion}
                          >
                            {item.descripcion}
                          </span>
                          {bajoMinimo && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-600 border border-red-200 whitespace-nowrap">
                              Stock bajo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {item.abreviatura_unidad || item.nombre_unidad || "ud"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold tabular-nums ${bajoMinimo ? "text-red-600" : "text-slate-800"}`}
                      >
                        {formateaCantidad(item.stock_disponible)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                        {formateaCantidad(item.stock_fabricado)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 tabular-nums">
                        {formateaCantidad(item.stock_en_proceso)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                        {formateaCantidad(item.stock_minimo)}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        {item.ultima_actualizacion
                          ? new Date(item.ultima_actualizacion).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setArticuloSeguimiento(item.id_articulo);
                              setDrawerSeguimiento(true);
                            }}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Ver seguimiento"
                          >
                            <FiEye size={14} />
                          </button>
                          {canEdit && item.id_inventario && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                abrirModalEditarStock(item);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                              title="Editar stock"
                            >
                              <FiEdit3 size={14} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id_articulo);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Eliminar del inventario"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiPackage size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron artículos en inventario
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página{" "}
              <span className="font-semibold text-slate-700">{page}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>
              {total > 0 && (
                <>
                  {" "}
                  —{" "}
                  <span className="font-semibold text-slate-700">
                    {total}
                  </span>{" "}
                  artículos
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value={10}>10 / pág.</option>
                <option value={25}>25 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para editar stock */}
      <EditarStockModal
        isOpen={modalEditarStock}
        onClose={cerrarModalEditarStock}
        item={itemSeleccionado}
        onSave={guardarStockYMinimo}
      />

      {/* Drawer de seguimiento del artículo */}
      <SeguimientoArticuloDrawer
        isOpen={drawerSeguimiento}
        onClose={() => {
          setDrawerSeguimiento(false);
          setArticuloSeguimiento(null);
        }}
        idArticulo={articuloSeguimiento}
      />

      {/* Drawer para registrar consumo de materia prima */}
      <ConsumoMateriaPrimaDrawer
        isOpen={drawerConsumo}
        onClose={() => setDrawerConsumo(false)}
        onSuccess={cargarInventario}
      />
    </div>
  );
};

export default Inventario;
