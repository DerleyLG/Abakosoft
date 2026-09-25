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
  FiSearch,
  FiAlertTriangle,
  FiX,
} from "react-icons/fi";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import EditarStockModal from "../components/EditarStockModal";
import SeguimientoArticuloDrawer from "../components/SeguimientoArticuloDrawer";
import ConsumoMateriaPrimaDrawer from "../components/ConsumoMateriaPrimaDrawer";
import useModalTransition from "../hooks/useModalTransition";

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [inventarioEtapas, setInventarioEtapas] = useState([]);
  const [vista, setVista] = useState("stock"); // 'stock' | 'etapas'
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
  const [soloConProduccion, setSoloConProduccion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bajoStockCount, setBajoStockCount] = useState(0);
  const [modalBajoStock, setModalBajoStock] = useState(false);
  const [cargandoBajoStock, setCargandoBajoStock] = useState(false);
  const [articulosBajoStock, setArticulosBajoStock] = useState([]);
  const bajoStockModal = useModalTransition(modalBajoStock, () =>
    setModalBajoStock(false),
  );
  const [etapas, setEtapas] = useState([]);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState("");
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

  // Cargar etapas de producción una sola vez
  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        const res = await api.get("/etapas-produccion");
        setEtapas(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando etapas", error);
      }
    };
    fetchEtapas();
  }, []);

  // Cargar artículos bajo stock (conteo + lista)
  const cargarBajoStock = async () => {
    try {
      const res = await api.get("/inventario/bajo-stock");
      const lista = Array.isArray(res.data) ? res.data : [];
      setArticulosBajoStock(lista);
      setBajoStockCount(lista.length);
    } catch (error) {
      console.error("Error cargando bajo stock", error);
    }
  };

  // Cargar bajo stock una sola vez al montar
  useEffect(() => {
    cargarBajoStock();
  }, []);

  // Cargar inventario con filtros desde el backend
  useEffect(() => {
    const fetchInventario = async () => {
      setLoading(true);
      try {
        if (vista === "etapas") {
          // Limpiar datos de la vista stock para evitar mezclas
          setInventario([]);
          const res = await api.get("/inventario/por-etapas", {
            params: {
              page,
              pageSize,
              buscar: searchTerm || undefined,
              tipo_categoria: searchTerm ? undefined : activeTab || undefined,
              id_categoria: categoriaSeleccionada || undefined,
              id_etapa: etapaSeleccionada || undefined,
              solo_con_produccion: soloConProduccion ? "1" : "",
            },
          });
          const payload = res.data || {};
          setInventarioEtapas(Array.isArray(payload.data) ? payload.data : []);
          setTotal(Number(payload.total) || 0);
          setTotalPages(Number(payload.totalPages) || 1);
          return;
        }
        // Limpiar datos de la vista etapas para evitar mezclas
        setInventarioEtapas([]);
        const res = await api.get("/inventario", {
          params: {
            page,
            pageSize,
            buscar: searchTerm || undefined,
            // búsqueda global cuando hay texto; filtro por tab cuando no hay
            tipo_categoria: searchTerm ? undefined : activeTab || undefined,
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
      } finally {
        setLoading(false);
      }
    };
    fetchInventario();
  }, [
    page,
    pageSize,
    searchTerm,
    activeTab,
    categoriaSeleccionada,
    etapaSeleccionada,
    stockFabricadoFilter,
    stockProcesoFilter,
    stockDisponibleFilter,
    soloConProduccion,
    vista,
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

  // Abre el modal de bajo stock cargando la lista completa de artículos afectados
  const abrirModalBajoStock = async () => {
    setModalBajoStock(true);
    setCargandoBajoStock(true);
    await cargarBajoStock();
    setCargandoBajoStock(false);
  };

  // Editar stock directamente desde el modal de bajo stock.
  // El modal de bajo stock permanece abierto: al cerrar la edición se vuelve a la lista.
  // Se trae el artículo completo (GET /inventario/:id) para tener referencia, categoría y unidad.
  const editarDesdeBajoStock = async (art) => {
    try {
      const res = await api.get(`/inventario/${art.id_articulo}`);
      const completo = res.data || {};
      abrirModalEditarStock({
        ...completo,
        stock_disponible: completo.stock,
      });
    } catch (error) {
      // Fallback con los datos que ya tenemos del listado de bajo stock
      abrirModalEditarStock({
        id_articulo: art.id_articulo,
        descripcion: art.descripcion,
        referencia: art.referencia,
        stock_disponible: art.stock,
        stock_minimo: art.stock_minimo,
      });
    }
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
      cargarBajoStock();
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

  // Tab activo: cuando hay búsqueda se infiere del primer resultado (solo visual)
  const inferredTab =
    searchTerm && inventario.length > 0
      ? inventario[0].tipo_categoria || activeTab
      : activeTab;

  // El backend ya aplica el filtro de texto y de categoría según corresponda:
  //  - Con búsqueda: devuelve resultados de todas las categorías (sin filtro de tab)
  //  - Sin búsqueda: devuelve solo la categoría del tab activo
  // Por eso aquí NO se vuelve a filtrar por categoría (rompía la búsqueda).
  const filteredItems = inventario;

  // En la vista "Por etapas" se muestran TODAS las etapas de producción
  // como columnas (aunque estén en 0), en el orden del flujo
  const etapasVisibles = vista === "etapas" ? etapas : [];

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Control de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Inventario
            </h1>
          </div>
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
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            >
              <FiBox size={15} />
              Consumo
            </button>
          )}
          <button
            onClick={() => navigate("/inventario/seguimiento")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
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

      {/* Tabs + aviso de bajo stock a la derecha */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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

        {/* Aviso sutil de bajo stock, a la derecha de los tabs */}
        {bajoStockCount > 0 && (
          <div className="inline-flex items-center gap-2 bg-white border border-red-200 rounded-full pl-3 pr-1.5 py-1.5 shadow-sm w-fit">
            <FiAlertTriangle size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-slate-600 whitespace-nowrap">
              <span className="font-bold text-red-600">{bajoStockCount}</span>{" "}
              {bajoStockCount === 1
                ? "artículo bajo stock"
                : "artículos bajo stock"}
            </p>
            <button
              onClick={abrirModalBajoStock}
              className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
            >
              Ver
            </button>
          </div>
        )}
      </div>

      {/* Segmented control: vista Stock | Por etapas */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Vista:
        </span>
        <div
          className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 w-fit shadow-sm"
          role="group"
          aria-label="Vista del inventario"
        >
          <button
            type="button"
            onClick={() => {
              setVista("stock");
              setPage(1);
            }}
            aria-pressed={vista === "stock"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              vista === "stock"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <FiPackage size={13} />
            Stock
          </button>
          <button
            type="button"
            onClick={() => {
              setVista("etapas");
              setPage(1);
            }}
            aria-pressed={vista === "etapas"}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              vista === "etapas"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <FiTool size={13} />
            Por etapas
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Buscar
            </label>
            <div className="relative">
              <FiSearch
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Buscar artículo…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                >
                  <FiX size={14} />
                </button>
              )}
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
        {vista === "stock" && (
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
        )}
        {vista === "etapas" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Etapa con unidades
              </label>
              <select
                value={etapaSeleccionada}
                onChange={(e) => {
                  setEtapaSeleccionada(e.target.value);
                  setPage(1);
                }}
                className="w-full text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
              >
                <option value="">Todas las etapas</option>
                {etapas.map((etapa) => (
                  <option key={etapa.id_etapa} value={etapa.id_etapa}>
                    {etapa.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={soloConProduccion}
                  onChange={(e) => {
                    setSoloConProduccion(e.target.checked);
                    setPage(1);
                  }}
                  className="w-4 h-4 accent-slate-700 cursor-pointer"
                />
                Solo con producción
              </label>
            </div>
          </div>
        )}
        {categoriaSeleccionada &&
          !searchTerm &&
          filteredItems.length === 0 &&
          total > 0 && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              ⚠️ <strong>Filtro de categoría no disponible:</strong> Los
              artículos en inventario no tienen categorías asignadas.
            </p>
          )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* key={vista} fuerza el re-montaje completo de la tabla al cambiar
            de vista, evitando que React reutilice el DOM de la otra tabla */}
        <div key={vista} className="overflow-x-auto">
          {vista === "etapas" ? (
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
                  {etapasVisibles.map((etapa) => (
                    <th
                      key={etapa.id_etapa}
                      className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap"
                    >
                      {etapa.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 3 + etapasVisibles.length }).map(
                        (__, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-3.5 bg-slate-100 rounded w-full" />
                          </td>
                        ),
                      )}
                    </tr>
                  ))
                ) : inventarioEtapas.length > 0 ? (
                  inventarioEtapas.map((item) => (
                    <tr
                      key={item.id_articulo}
                      onClick={() => {
                        setArticuloSeguimiento(item.id_articulo);
                        setDrawerSeguimiento(true);
                      }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {item.referencia || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-medium text-slate-800 truncate max-w-[180px] block"
                          title={item.descripcion}
                        >
                          {item.descripcion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {item.abreviatura_unidad || item.nombre_unidad || "ud"}
                      </td>
                      {etapasVisibles.map((etapa) => {
                        const etapaItem = (item.etapas || []).find(
                          (e) => Number(e.id_etapa) === Number(etapa.id_etapa),
                        );
                        return (
                          <td
                            key={etapa.id_etapa}
                            className="px-4 py-3 text-right tabular-nums"
                          >
                            {etapaItem && etapaItem.cantidad > 0 ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {formateaCantidad(etapaItem.cantidad)}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3 + etapasVisibles.length}
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FiTool size={32} className="opacity-40" />
                        <p className="text-sm font-medium">
                          {soloConProduccion
                            ? "No hay artículos con unidades en producción"
                            : "No hay unidades en proceso en ninguna etapa"}
                        </p>
                        <p className="text-xs">
                          Los avances de producción aparecerán aquí
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
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
                    Pendiente fabricar
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    En reparación
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Actualización
                  </th>
                  <th className="px-4 py-3 w-24">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 bg-slate-100 rounded w-full" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const stockDisponible = Number(item.stock_disponible);
                    const stockMinimo = Number(item.stock_minimo);
                    // Bajo stock: stock negativo, o stock <= mínimo (con mínimo definido)
                    const stockBajo =
                      stockDisponible < 0 ||
                      (stockDisponible <= stockMinimo && stockMinimo > 0);
                    return (
                      <tr
                        key={item.id_inventario ?? `art-${item.id_articulo}`}
                        onClick={() => {
                          setArticuloSeguimiento(item.id_articulo);
                          setDrawerSeguimiento(true);
                        }}
                        className={`border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none group ${
                          stockBajo ? "bg-red-50/50" : ""
                        }`}
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
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {item.abreviatura_unidad ||
                            item.nombre_unidad ||
                            "ud"}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            stockBajo ? "text-red-600" : "text-slate-800"
                          }`}
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
                          {formateaCantidad(item.stock_reparacion || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                          {item.ultima_actualizacion
                            ? new Date(
                                item.ultima_actualizacion,
                              ).toLocaleDateString("es-CO", {
                                day: "2-digit",
                                month: "2-digit",
                              }) +
                              " " +
                              new Date(
                                item.ultima_actualizacion,
                              ).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
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
                    <td colSpan="8" className="text-center py-16">
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
          )}
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

      {/* Modal de artículos bajo stock */}
      {bajoStockModal.mostrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`absolute inset-0 bg-black/50 ${
              bajoStockModal.cerrando
                ? "animate-modal-backdrop-out"
                : "animate-modal-backdrop-in"
            }`}
            onClick={bajoStockModal.cerrar}
          />
          <div
            className={`relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden ${
              bajoStockModal.cerrando
                ? "animate-modal-card-out"
                : "animate-modal-card-in"
            }`}
          >
            <div className="bg-slate-800 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-600 rounded-lg">
                    <FiAlertTriangle className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Artículos bajo stock mínimo
                    </h3>
                    <p className="text-slate-300 text-sm">
                      {bajoStockCount}{" "}
                      {bajoStockCount === 1
                        ? "artículo necesita"
                        : "artículos necesitan"}{" "}
                      reposición
                    </p>
                  </div>
                </div>
                <button
                  onClick={bajoStockModal.cerrar}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  <FiX className="text-slate-300 hover:text-white" size={20} />
                </button>
              </div>
            </div>
            <div className="p-6">
              {cargandoBajoStock ? (
                <p className="text-sm text-slate-400 animate-pulse">
                  Cargando artículos…
                </p>
              ) : articulosBajoStock.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No hay artículos por debajo del stock mínimo en este momento.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 max-h-96 overflow-auto">
                  {articulosBajoStock.map((art) => (
                    <li
                      key={art.id_articulo}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium text-slate-800 truncate"
                          title={art.descripcion}
                        >
                          {art.descripcion}
                        </p>
                        <p className="text-xs text-slate-400">
                          {art.referencia && (
                            <>
                              <span className="font-mono">
                                {art.referencia}
                              </span>{" "}
                              ·{" "}
                            </>
                          )}
                          Stock:{" "}
                          <span className="font-semibold text-red-600">
                            {formateaCantidad(art.stock)}
                          </span>{" "}
                          · Mínimo: {formateaCantidad(art.stock_minimo)}
                        </p>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => editarDesdeBajoStock(art)}
                          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <FiEdit3 size={13} />
                          Editar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar stock (al final para quedar encima del modal de bajo stock) */}
      <EditarStockModal
        isOpen={modalEditarStock}
        onClose={cerrarModalEditarStock}
        item={itemSeleccionado}
        onSave={guardarStockYMinimo}
      />
    </div>
  );
};

export default Inventario;
