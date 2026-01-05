import { useState, useEffect } from "react";
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
} from "react-icons/fi";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import EditarStockModal from "../components/EditarStockModal";
import SeguimientoArticuloDrawer from "../components/SeguimientoArticuloDrawer";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.INVENTORY_EDIT);
  const canEdit = can(role, ACTIONS.INVENTORY_EDIT);
  const canDelete = can(role, ACTIONS.INVENTORY_DELETE);

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
      await api.put(`/inventario/${datos.id_articulo}`, {
        stock: datos.stock,
        stock_minimo: datos.stock_minimo,
      });
      toast.success("Inventario actualizado correctamente");
      cargarInventario();
    } catch (error) {
      console.error(
        "Error al actualizar inventario",
        error.response?.data || error.message
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
    return categorias.filter((cat) => cat.tipo === activeTab);
  };

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

  const filteredItems = inventario;

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col mb-6 gap-4">
        <div className="w-full flex items-center justify-between gap-4">
          <h2 className="text-4xl font-bold text-gray-800">Inventario</h2>
          {canCreate && (
            <button
              onClick={() => navigate("/inventario/nuevo")}
              className="h-[42px] inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              <FiPlus size={20} />
              Agregar artículo
            </button>
          )}
        </div>

        {/* Sistema de Tabs */}
        <div className="border-b border-gray-200 bg-white rounded-t-xl px-4 pt-4">
          <div className="flex gap-1">
            {Object.entries(tabsConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => handleTabChange(key)}
                  className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all cursor-pointer ${
                    isActive
                      ? `text-${config.color}-600 border-b-2 border-${config.color}-600 bg-${config.color}-50`
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={18} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full bg-white p-4 rounded-b-xl shadow">
          {/* Primera fila: Búsqueda y Categoría */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-gray-700 font-semibold mb-1">
                Buscar
              </label>
              <input
                type="text"
                placeholder="Buscar artículo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Categoría
              </label>
              <select
                value={categoriaSeleccionada}
                onChange={(e) => {
                  setCategoriaSeleccionada(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                title="Filtrar por categoría"
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

          {/* Segunda fila: Filtros de stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Stock fabricado
              </label>
              <select
                value={stockFabricadoFilter}
                onChange={(e) => {
                  setStockFabricadoFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                title="Filtrar stock fabricado"
              >
                <option value="">Todos</option>
                <option value="gt0">Con stock</option>
                <option value="eq0">Sin stock</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Stock en proceso
              </label>
              <select
                value={stockProcesoFilter}
                onChange={(e) => {
                  setStockProcesoFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                title="Filtrar stock en proceso"
              >
                <option value="">Todos</option>
                <option value="gt0">Con stock</option>
                <option value="eq0">Sin stock</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-1">
                Stock disponible
              </label>
              <select
                value={stockDisponibleFilter}
                onChange={(e) => {
                  setStockDisponibleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                title="Filtrar stock disponible"
              >
                <option value="">Todos</option>
                <option value="gt0">Con stock</option>
                <option value="eq0">Sin stock</option>
              </select>
            </div>
          </div>
        </div>
        {categoriaSeleccionada &&
          filteredItems.length === 0 &&
          allItems.length > 0 && (
            <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
              ⚠️ <strong>Filtro de categoría no disponible:</strong> Los
              artículos en el inventario no tienen categorías asignadas. Para
              habilitar este filtro, asigna categorías a tus artículos desde el
              módulo de Artículos.
            </div>
          )}
        {categoriaSeleccionada &&
          filteredItems.length === 0 &&
          allItems.length === 0 && (
            <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
              No hay artículos inicializados en inventario para esta categoría.
              Puedes agregarlos desde "Agregar artículo" para iniciar con stock
              0.
            </div>
          )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <div className="mb-3 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span>{" "}
              de{" "}
              <span className="font-semibold text-gray-800">{totalPages}</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Artículo</th>
              <th className="px-4 py-3">Stock disponible</th>
              <th className="px-4 py-3">Stock fabricado</th>
              <th className="px-4 py-3">Stock en proceso</th>
              <th className="px-4 py-3">Stock mínimo</th>
              <th className="px-4 py-3">Última actualización</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr
                  key={item.id_inventario}
                  className="hover:bg-slate-300 transition select-none cursor-pointer"
                  onClick={() => {
                    setArticuloSeguimiento(item.id_articulo);
                    setDrawerSeguimiento(true);
                  }}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">
                    {item.referencia || "-"}
                  </td>
                  <td
                    className="px-4 py-3 max-w-xs truncate"
                    title={item.descripcion}
                  >
                    {item.descripcion}
                  </td>
                  <td className="px-4 py-3">{item.stock_disponible ?? 0}</td>
                  <td className="px-4 py-3">{item.stock_fabricado ?? 0}</td>
                  <td className="px-4 py-3">{item.stock_en_proceso ?? 0}</td>
                  <td className="px-4 py-3">{item.stock_minimo ?? 0}</td>
                  <td className="px-4 py-3">
                    {item.ultima_actualizacion
                      ? new Date(item.ultima_actualizacion).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setArticuloSeguimiento(item.id_articulo);
                        setDrawerSeguimiento(true);
                      }}
                      className="text-blue-600 hover:text-blue-400 transition mr-3 cursor-pointer"
                      title="Ver seguimiento del artículo"
                    >
                      <FiEye size={18} />
                    </button>
                    {canEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirModalEditarStock(item);
                        }}
                        className="text-slate-700 hover:text-slate-400 transition mr-3 cursor-pointer"
                        title="Editar stock y stock mínimo"
                      >
                        <FiEdit3 size={18} />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id_articulo);
                        }}
                        className="text-red-600 hover:text-red-300 transition cursor-pointer"
                        title="Eliminar artículo del inventario"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">
                  No se encontraron artículos en inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    </div>
  );
};

export default Inventario;
