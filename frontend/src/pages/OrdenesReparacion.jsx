import { useState, useEffect, Fragment, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiTool,
  FiCalendar,
  FiUser,
  FiBox,
  FiChevronDown,
  FiChevronRight,
  FiClipboard,
  FiPackage,
  FiDollarSign,
  FiCheckCircle,
  FiSend,
  FiXCircle,
  FiTrash2,
  FiRefreshCw,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

const ESTADOS = {
  registrada: {
    label: "Registrada",
    bg: "bg-slate-100",
    text: "text-slate-700",
  },
  diagnosticada: {
    label: "Diagnosticada",
    bg: "bg-sky-100",
    text: "text-sky-700",
  },
  en_reparacion: {
    label: "En reparación",
    bg: "bg-blue-100",
    text: "text-blue-700",
  },
  lista_entrega: {
    label: "Lista para entrega",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
  },
  entregada: {
    label: "Entregada",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  cancelada: { label: "Cancelada", bg: "bg-red-100", text: "text-red-700" },
};

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatCurrency = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const OrdenesReparacion = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canView = can(user, ACTIONS.REPAIRS_VIEW);
  const canCreate = can(user, ACTIONS.REPAIRS_CREATE);
  const canDiagnose = can(user, ACTIONS.REPAIRS_DIAGNOSE);
  const canManageMaterials = can(user, ACTIONS.REPAIRS_MANAGE);
  const canDeliver = can(user, ACTIONS.REPAIRS_DELIVER);
  const canCancel = can(user, ACTIONS.REPAIRS_CANCEL);

  const [ordenes, setOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [detallesCache, setDetallesCache] = useState({});
  const [showFormName, setShowFormName] = useState(null);
  const [articulosList, setArticulosList] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  // Formulario diagnóstico
  const [diagTexto, setDiagTexto] = useState("");
  const [diagCosto, setDiagCosto] = useState(0);
  const [diagPago, setDiagPago] = useState(false);
  const [diagTrabajador, setDiagTrabajador] = useState(null);
  const [todosTrabajadores, setTodosTrabajadores] = useState([]);
  const trabajadoresCache = useRef({});

  // Formulario material
  const [matId, setMatId] = useState("");
  const [matCant, setMatCant] = useState("");
  const [matCosto, setMatCosto] = useState(0);

  // Formulario entrega
  const [entMetodo, setEntMetodo] = useState("");
  const [entRef, setEntRef] = useState("");

  // --- AsyncSelect cache y helpers ---
  const articulosCache = useRef({});
  const timerRef = useRef(null);

  const loadArticulosOptions = useCallback(
    (inputValue, callback) => {
      const key = (inputValue || "").toLowerCase();
      if (articulosCache.current[key])
        return callback(articulosCache.current[key]);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          const res = await api.get("/articulos", {
            params: {
              buscar: inputValue || "",
              page: 1,
              pageSize: 20,
              sortBy: "descripcion",
              sortDir: "asc",
            },
          });
          const rows = Array.isArray(res.data?.data) ? res.data.data : [];
          const opciones = rows.map((a) => ({
            value: a.id_articulo,
            label: `${a.descripcion}${a.referencia ? ` (Ref: ${a.referencia})` : ""}`,
            ...a,
          }));
          articulosCache.current[key] = opciones;
          callback(opciones);
        } catch (error) {
          console.error("Error buscando artículos:", error);
          callback([]);
        }
      }, 200);
    },
    [],
  );

  const loadTrabajadoresOptions = useCallback(
    (inputValue, callback) => {
      const key = (inputValue || "").toLowerCase();
      if (!key) return callback(todosTrabajadores);
      if (trabajadoresCache.current[key])
        return callback(trabajadoresCache.current[key]);
      const filtrados = todosTrabajadores.filter(
        (t) =>
          t.label.toLowerCase().includes(key) ||
          (t.identificacion || "").includes(key),
      );
      trabajadoresCache.current[key] = filtrados;
      callback(filtrados);
    },
    [todosTrabajadores],
  );

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      borderColor: state.isFocused ? "transparent" : "#e2e8f0",
      boxShadow: state.isFocused
        ? "0 0 0 2px #94a3b8"
        : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      borderRadius: "0.5rem",
      minHeight: "32px",
      fontSize: "0.8125rem",
      cursor: "text",
      "&:hover": { borderColor: "#cbd5e1" },
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#1e293b"
        : state.isFocused
          ? "#f8fafc"
          : "white",
      color: state.isSelected ? "white" : "#334155",
      fontSize: "0.8125rem",
      cursor: "pointer",
    }),
    menuList: (base) => ({ ...base, maxHeight: "200px" }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "0.75rem" }),
    input: (base) => ({ ...base, fontSize: "0.8125rem" }),
  };

  // Cargar las primeras 20 sugerencias de artículos para el buscador
  useEffect(() => {
    const cargarArticulos = async () => {
      try {
        const res = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const lista = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        setArticulosList(lista);
        articulosCache.current[""] = lista.map((a) => ({
          value: a.id_articulo,
          label: `${a.descripcion}${a.referencia ? ` (Ref: ${a.referencia})` : ""}`,
          ...a,
        }));
      } catch (e) {
        console.error(e);
      }
    };
    cargarArticulos();
    api
      .get("/metodos-pago")
      .then((r) => setMetodosPago(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    // Cargar trabajadores para el diagnóstico
    api
      .get("/trabajadores")
      .then((r) => {
        const trabs = (Array.isArray(r.data) ? r.data : []).map((t) => ({
          value: t.id_trabajador,
          label: t.nombre,
          ...t,
        }));
        setTodosTrabajadores(trabs);
        trabajadoresCache.current[""] = trabs;
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (canView) cargarOrdenes();
  }, [page, pageSize, searchTerm, filtroEstado]);

  const cargarOrdenes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/reparaciones", {
        params: {
          estado: filtroEstado || undefined,
          buscar: searchTerm || undefined,
          page,
          pageSize,
          sortBy: "fecha_ingreso",
          sortDir: "desc",
        },
      });
      const data = res.data || {};
      setOrdenes(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total) || 0);
      setTotalPages(Number(data.totalPages) || 1);
      setHasNext(Boolean(data.hasNext));
      setHasPrev(Boolean(data.hasPrev));
    } catch (error) {
      toast.error("No fue posible cargar las órdenes de reparación");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    setShowFormName(null);
    if (!detallesCache[id]) {
      try {
        const res = await api.get(`/reparaciones/${id}`);
        setDetallesCache((prev) => ({ ...prev, [id]: res.data }));
      } catch (e) {
        toast.error("Error al cargar detalle");
      }
    }
  };

  const refresh = async () => {
    // Recargar el detalle de la orden expandida (si hay una)
    if (expandedId) {
      try {
        const res = await api.get(`/reparaciones/${expandedId}`);
        if (["entregada", "cancelada"].includes(res.data?.estado)) {
          setExpandedId(null);
          setDetallesCache((prev) => {
            const copy = { ...prev };
            delete copy[expandedId];
            return copy;
          });
        } else {
          setDetallesCache((prev) => ({ ...prev, [expandedId]: res.data }));
        }
      } catch (e) {
        /* silencioso */
      }
    }
    cargarOrdenes();
  };

  const handleDiagnosticar = async (id) => {
    if (!diagTexto.trim()) return toast.error("Escriba el diagnóstico");
    try {
      await api.put(`/reparaciones/${id}/diagnostico`, {
        diagnostico: diagTexto,
        requiere_pago: diagPago,
        mano_obra: diagCosto,
        id_trabajador: diagTrabajador?.value || null,
      });
      toast.success("Diagnóstico registrado");
      setShowFormName(null);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.error || "Error");
    }
  };

  const handleDiagCostoChange = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    const num = val ? parseInt(val, 10) : 0;
    setDiagCosto(num);
    if (num <= 0) setDiagPago(false);
  };

  const handleDiagPagoChange = (e) => {
    const checked = e.target.checked;
    setDiagPago(checked);
    if (!checked) setDiagCosto(0);
  };

  const formatDiagCosto = () => {
    if (!diagPago || diagCosto <= 0) return "";
    return `$${diagCosto.toLocaleString("es-CO")}`;
  };

  const handleAddMaterial = async (id) => {
    if (!matId || !matCant || Number(matCant) <= 0)
      return toast.error("Complete los datos");

    // Verificar si el artículo existe en inventario
    try {
      const invRes = await api.get(`/inventario/${matId}`);
      if (!invRes.data || invRes.data?.stock === undefined)
        throw new Error("Sin inventario");
    } catch {
      // No existe en inventario → preguntar antes de continuar
      return confirmAlert({
        title: "Artículo sin inventario",
        message: `El artículo seleccionado no está registrado en el inventario.\nSe creará con stock 0 y el movimiento quedará en negativo.\n¿Deseas continuar?`,
        buttons: [
          {
            label: "Sí, agregar",
            onClick: async () => {
              try {
                await api.post(`/reparaciones/${id}/materiales`, {
                  id_articulo: Number(matId),
                  cantidad: matCant,
                  costo_unitario: matCosto,
                });
                toast.success("Material agregado");
                setShowFormName(null);
                setMatId("");
                setMatCant("");
                setMatCosto(0);
                refresh();
              } catch (error) {
                toast.error(error.response?.data?.error || "Error");
              }
            },
          },
          { label: "No" },
        ],
      });
    }

    // Tiene inventario → agregar directamente
    try {
      await api.post(`/reparaciones/${id}/materiales`, {
        id_articulo: Number(matId),
        cantidad: matCant,
        costo_unitario: matCosto,
      });
      toast.success("Material agregado");
      setShowFormName(null);
      setMatId("");
      setMatCant("");
      setMatCosto(0);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.error || "Error");
    }
  };

  const handleDeleteMaterial = async (idRep, idDet) => {
    confirmAlert({
      title: "Eliminar material",
      message: "¿Seguro?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/reparaciones/${idRep}/materiales/${idDet}`);
              toast.success("Eliminado");
              refresh();
            } catch (e) {
              toast.error("Error");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const handleMarcarLista = (id) => {
    confirmAlert({
      title: "Marcar como lista para entrega",
      message:
        "¿Confirmas que la reparación está terminada y lista para entregar al cliente?",
      buttons: [
        {
          label: "Sí, marcar",
          onClick: async () => {
            try {
              await api.put(`/reparaciones/${id}/lista-entrega`);
              toast.success("Lista para entrega");
              refresh();
            } catch (error) {
              toast.error(error.response?.data?.error || "Error");
            }
          },
        },
        { label: "Cancelar" },
      ],
    });
  };

  const handleEntregar = async (id, det) => {
    if (det.requiere_pago && Number(det.total) > 0 && !entMetodo)
      return toast.error("Seleccione método de pago");
    confirmAlert({
      title: "Entregar reparación",
      message:
        det.requiere_pago && Number(det.total) > 0
          ? `¿Confirmas la entrega y cobro de ${formatCurrency(det.total)} al cliente?`
          : "¿Confirmas que la reparación fue entregada al cliente?",
      buttons: [
        {
          label: "Sí, entregar",
          onClick: async () => {
            try {
              await api.put(`/reparaciones/${id}/entregar`, {
                id_metodo_pago: entMetodo || null,
                referencia: entRef || null,
              });
              toast.success("Entregada correctamente");
              setShowFormName(null);
              refresh();
            } catch (error) {
              toast.error(error.response?.data?.error || "Error");
            }
          },
        },
        { label: "Cancelar" },
      ],
    });
  };

  const handleCancelar = async (id) => {
    confirmAlert({
      title: "Cancelar orden",
      message: "¿Seguro?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.put(`/reparaciones/${id}/cancelar`);
              toast.success("Cancelada");
              refresh();
            } catch (error) {
              toast.error(error.response?.data?.error || "Error");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  if (!canView)
    return (
      <div className="p-8 text-center text-slate-500">No tienes permisos.</div>
    );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all cursor-pointer"
            title="Volver"
          >
            <FiArrowLeft size={18} />
          </button>

          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Postventa y
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Reparaciones
            </h1>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            {total}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate("/reparaciones/nueva")}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FiPlus size={16} /> Nueva orden
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por #ID, cliente o artículo..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => {
              setFiltroEstado(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADOS).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-7 px-1.5 py-2"></th>
                <th className="px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  ID
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Cliente
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Artículo
                </th>
                <th className="px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Ingreso
                </th>
                <th className="px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Estimada
                </th>
                <th className="px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-1.5 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Responsable
                </th>
                <th className="px-1.5 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </th>
                {canCancel && (
                  <th className="w-10 px-1.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500"></th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {Array.from({ length: canCancel ? 10 : 9 }).map(
                      (__, ci) => (
                        <td key={ci} className="px-1.5 py-2">
                          <div className="animate-pulse h-3.5 bg-slate-100 rounded w-full" />
                        </td>
                      ),
                    )}
                  </tr>
                ))
              ) : ordenes.length === 0 ? (
                <tr>
                  <td
                    colSpan={canCancel ? 10 : 9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay órdenes de reparación registradas.
                  </td>
                </tr>
              ) : (
                ordenes.map((item) => {
                  const est = ESTADOS[item.estado] || {
                    label: item.estado,
                    bg: "bg-slate-100",
                    text: "text-slate-700",
                  };
                  const det = detallesCache[item.id_reparacion];
                  const esFinalizada = ["entregada", "cancelada"].includes(
                    item.estado,
                  );
                  return (
                    <Fragment key={item.id_reparacion}>
                      {/* ── Fila principal ── */}
                      <tr
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors`}
                        onClick={() => toggleExpand(item.id_reparacion)}
                      >
                        <td className="px-1.5 py-2.5 text-center text-slate-400">
                          {expandedId === item.id_reparacion ? (
                            <FiChevronDown size={13} />
                          ) : (
                            <FiChevronRight size={13} />
                          )}
                        </td>
                        <td className="px-1.5 py-2.5 font-mono text-xs text-slate-500">
                          #{item.id_reparacion}
                        </td>
                        <td className="px-1.5 py-2.5 text-slate-700 max-w-[120px] truncate">
                          <span className="flex items-center gap-1">
                            <FiUser
                              size={11}
                              className="text-slate-400 shrink-0"
                            />
                            {item.cliente_nombre || "-"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-slate-700 max-w-[140px] truncate">
                          <span className="flex items-center gap-1">
                            <FiBox
                              size={11}
                              className="text-slate-400 shrink-0"
                            />
                            {item.articulo_descripcion || "-"}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-center text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <FiCalendar size={10} className="text-slate-400" />
                            {formatDate(item.fecha_ingreso)}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-center text-slate-600 whitespace-nowrap">
                          {formatDate(item.fecha_estimada)}
                        </td>
                        <td className="px-1.5 py-2.5 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${est.bg} ${est.text}`}
                          >
                            {est.label.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-xs text-slate-600 truncate max-w-[100px]">
                          {item.trabajador_nombre || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-1.5 py-2.5 text-right font-mono text-xs font-semibold whitespace-nowrap">
                          {Number(item.total) > 0 ? (
                            <span className="text-slate-800">
                              {formatCurrency(item.total)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        {canCancel && (
                          <td className="px-1.5 py-2.5 text-center">
                            {!esFinalizada && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCancelar(item.id_reparacion);
                                }}
                                className="p-1 rounded-md text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Cancelar orden"
                              >
                                <FiXCircle size={13} />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>

                      {/* ── Fila expandida ── */}
                      {expandedId === item.id_reparacion && (
                        <tr className="bg-slate-50">
                          <td
                            colSpan={canCancel ? 10 : 9}
                            className="px-0 py-0"
                          >
                            <div className="border-l-4 border-slate-400 mx-2 my-1 bg-white rounded-b-xl shadow-sm overflow-hidden">
                              <div className="px-5 py-4">
                                {!det ? (
                                  <div className="flex justify-center py-6">
                                    <div className="animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-600 rounded-full" />
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                                    {/* ═══ Columna 1-2: Info ═══ */}
                                    <div className="lg:col-span-2 space-y-4">
                                      {/* Motivo */}
                                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                          <FiBox
                                            size={14}
                                            className="text-slate-400"
                                          />
                                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                            Motivo
                                          </span>
                                        </div>
                                        <p className="text-sm text-slate-700 leading-relaxed">
                                          {det.motivo}
                                        </p>
                                      </div>

                                      {/* Diagnóstico */}
                                      {det.diagnostico && (
                                        <div className="bg-white rounded-xl border border-sky-200 shadow-sm p-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <FiClipboard
                                              size={14}
                                              className="text-sky-500"
                                            />
                                            <span className="text-[11px] font-semibold text-sky-600 uppercase tracking-wider">
                                              Diagnóstico
                                            </span>
                                          </div>
                                          <p className="text-sm text-slate-700 leading-relaxed">
                                            {det.diagnostico}
                                          </p>
                                        </div>
                                      )}

                                      {/* Materiales */}
                                      {Array.isArray(det.materiales) &&
                                        det.materiales.length > 0 && (
                                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                              <FiPackage
                                                size={14}
                                                className="text-slate-400"
                                              />
                                              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                                Materiales usados{" "}
                                                <span className="text-slate-400 font-normal normal-case">
                                                  ({det.materiales.length})
                                                </span>
                                              </span>
                                            </div>
                                            <div className="overflow-x-auto rounded-lg border border-slate-100">
                                              <table className="w-full text-xs">
                                                <thead>
                                                  <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                                      Artículo
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                                      Cant.
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                                      Costo
                                                    </th>
                                                    <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                                      Subtotal
                                                    </th>
                                                    {canManageMaterials &&
                                                      !esFinalizada && (
                                                        <th className="w-10"></th>
                                                      )}
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50">
                                                  {det.materiales.map((mat) => (
                                                    <tr
                                                      key={mat.id_detalle}
                                                      className="bg-white hover:bg-slate-50/50 transition-colors"
                                                    >
                                                      <td className="px-3 py-2 text-slate-700">
                                                        {
                                                          mat.articulo_descripcion
                                                        }
                                                      </td>
                                                      <td className="px-3 py-2 text-right text-slate-700">
                                                        {mat.cantidad}
                                                      </td>
                                                      <td className="px-3 py-2 text-right text-slate-700">
                                                        {formatCurrency(
                                                          mat.costo_unitario,
                                                        )}
                                                      </td>
                                                      <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                                        {formatCurrency(
                                                          Number(mat.cantidad) *
                                                            Number(
                                                              mat.costo_unitario,
                                                            ),
                                                        )}
                                                      </td>
                                                      {canManageMaterials &&
                                                        !esFinalizada && (
                                                          <td className="px-3 py-2 text-center">
                                                            <button
                                                              onClick={() =>
                                                                handleDeleteMaterial(
                                                                  item.id_reparacion,
                                                                  mat.id_detalle,
                                                                )
                                                              }
                                                              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                                                            >
                                                              <FiTrash2
                                                                size={11}
                                                              />
                                                            </button>
                                                          </td>
                                                        )}
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        )}
                                    </div>

                                    {/* ═══ Columna 3: Acciones ═══ */}
                                    <div className="space-y-3">
                                      {/* Resumen */}
                                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-3">
                                          Resumen
                                        </span>
                                        <div className="space-y-2 text-sm">
                                          <div className="flex justify-between">
                                            <span className="text-slate-500">
                                              Materiales
                                            </span>
                                            <span className="font-semibold text-slate-700">
                                              {formatCurrency(
                                                det.subtotal_materiales || 0,
                                              )}
                                            </span>
                                          </div>
                                          {Number(det.mano_obra) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">
                                                Mano de obra
                                              </span>
                                              <span className="font-semibold text-slate-700">
                                                {formatCurrency(det.mano_obra)}
                                              </span>
                                            </div>
                                          )}
                                          {Number(det.descuento) > 0 && (
                                            <div className="flex justify-between">
                                              <span className="text-slate-500">
                                                Descuento
                                              </span>
                                              <span className="font-semibold text-red-500">
                                                -{formatCurrency(det.descuento)}
                                              </span>
                                            </div>
                                          )}
                                          {det.requiere_pago && (
                                            <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                                              <span className="font-semibold text-slate-700">
                                                Total a cobrar
                                              </span>
                                              <span className="font-bold text-emerald-600 text-base">
                                                {formatCurrency(det.total)}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Botón: Diagnosticar */}
                                      {canDiagnose &&
                                        item.estado === "registrada" &&
                                        (showFormName ===
                                        `diag-${item.id_reparacion}` ? (
                                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                                              <FiClipboard
                                                size={14}
                                                className="text-amber-400"
                                              />
                                              <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                                                Nuevo diagnóstico
                                              </span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                              <textarea
                                                value={diagTexto}
                                                onChange={(e) =>
                                                  setDiagTexto(e.target.value)
                                                }
                                                rows={3}
                                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none transition placeholder:text-slate-400"
                                                placeholder="Describe el diagnóstico del responsable"
                                              />
                                              <AsyncSelect
                                                cacheOptions
                                                loadOptions={
                                                  loadTrabajadoresOptions
                                                }
                                                defaultOptions={
                                                  todosTrabajadores
                                                }
                                                value={diagTrabajador}
                                                onChange={(opt) =>
                                                  setDiagTrabajador(opt)
                                                }
                                                placeholder="Asignar responsable…"
                                                isClearable
                                                styles={selectStyles}
                                                noOptionsMessage={() =>
                                                  "No encontrado"
                                                }
                                              />
                                              <div className="flex items-center justify-between gap-3">
                                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                  <div className="relative">
                                                    <input
                                                      type="checkbox"
                                                      checked={diagPago}
                                                      onChange={
                                                        handleDiagPagoChange
                                                      }
                                                      className="sr-only peer"
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                                                    <div
                                                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${diagPago ? "translate-x-4" : ""}`}
                                                    />
                                                  </div>
                                                  <span className="text-xs font-medium text-slate-600">
                                                    Tiene costo
                                                  </span>
                                                </label>
                                                {diagPago && (
                                                  <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                                                      $
                                                    </span>
                                                    <input
                                                      type="text"
                                                      inputMode="numeric"
                                                      value={
                                                        diagCosto > 0
                                                          ? diagCosto.toLocaleString(
                                                              "es-CO",
                                                            )
                                                          : ""
                                                      }
                                                      onChange={
                                                        handleDiagCostoChange
                                                      }
                                                      className="w-36 pl-6 pr-3 py-1.5 text-xs text-right font-semibold text-slate-800 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                                                      placeholder="0"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 pt-1">
                                                <button
                                                  onClick={() =>
                                                    handleDiagnosticar(
                                                      item.id_reparacion,
                                                    )
                                                  }
                                                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                                                >
                                                  <FiClipboard size={12} />{" "}
                                                  Guardar diagnóstico
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setShowFormName(null)
                                                  }
                                                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                                >
                                                  Cancelar
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              // Precargar responsable si ya está asignado
                                              const trabPre =
                                                item.id_trabajador &&
                                                todosTrabajadores.length > 0
                                                  ? todosTrabajadores.find(
                                                      (t) =>
                                                        t.value ===
                                                        item.id_trabajador,
                                                    ) || null
                                                  : null;
                                              setShowFormName(
                                                `diag-${item.id_reparacion}`,
                                              );
                                              setDiagTexto(
                                                item.diagnostico || "",
                                              );
                                              setDiagCosto(
                                                Number(item.mano_obra) || 0,
                                              );
                                              setDiagPago(
                                                item.requiere_pago
                                                  ? true
                                                  : false,
                                              );
                                              setDiagTrabajador(trabPre);
                                            }}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 hover:text-amber-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                                          >
                                            <FiClipboard size={14} />{" "}
                                            Diagnosticar
                                          </button>
                                        ))}

                                      {/* Botón: Agregar material */}
                                      {canManageMaterials &&
                                        ![
                                          "entregada",
                                          "cancelada",
                                          "registrada",
                                          "lista_entrega",
                                        ].includes(item.estado) &&
                                        (showFormName ===
                                        `mat-${item.id_reparacion}` ? (
                                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                            <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
                                              <FiPackage
                                                size={14}
                                                className="text-blue-400"
                                              />
                                              <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
                                                Agregar material
                                              </span>
                                            </div>
                                            <div className="p-4 space-y-3">
                                              <div>
                                                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                                                  Artículo
                                                </label>
                                                <AsyncSelect
                                                  cacheOptions
                                                  loadOptions={
                                                    loadArticulosOptions
                                                  }
                                                  defaultOptions={articulosList.map(
                                                    (a) => ({
                                                      value: a.id_articulo,
                                                      label: `${a.descripcion}${a.referencia ? ` (Ref: ${a.referencia})` : ""}`,
                                                      ...a,
                                                    }),
                                                  )}
                                                  value={
                                                    articulosList.find(
                                                      (a) =>
                                                        a.id_articulo ===
                                                        Number(matId),
                                                    )
                                                      ? {
                                                          value: Number(matId),
                                                          label:
                                                            articulosList.find(
                                                              (a) =>
                                                                a.id_articulo ===
                                                                Number(matId),
                                                            )?.descripcion,
                                                        }
                                                      : null
                                                  }
                                                  onChange={(opt) => {
                                                    setMatId(
                                                      opt ? opt.value : "",
                                                    );
                                                    setMatCosto(
                                                      opt?.precio_costo ||
                                                        opt?.precio_venta ||
                                                        0,
                                                    );
                                                  }}
                                                  placeholder="Buscar artículo por nombre o referencia…"
                                                  isClearable
                                                  styles={selectStyles}
                                                  menuPortalTarget={
                                                    document.body
                                                  }
                                                  menuPosition="fixed"
                                                  noOptionsMessage={() =>
                                                    "No encontrado"
                                                  }
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                                                    Cantidad
                                                  </label>
                                                  <input
                                                    type="number"
                                                    value={matCant}
                                                    onChange={(e) =>
                                                      setMatCant(
                                                        e.target.value === ""
                                                          ? ""
                                                          : Number(
                                                              e.target.value,
                                                            ),
                                                      )
                                                    }
                                                    min={0}
                                                    step="1"
                                                    onFocus={(e) =>
                                                      e.target.select()
                                                    }
                                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                                                    Costo unitario
                                                  </label>
                                                  <div className="relative">
                                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                                                      $
                                                    </span>
                                                    <input
                                                      type="number"
                                                      value={matCosto}
                                                      onChange={(e) =>
                                                        setMatCosto(
                                                          Number(
                                                            e.target.value,
                                                          ),
                                                        )
                                                      }
                                                      min={0}
                                                      className="w-full pl-6 pr-3 py-1.5 text-sm text-right border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-2 pt-1">
                                                <button
                                                  onClick={() =>
                                                    handleAddMaterial(
                                                      item.id_reparacion,
                                                    )
                                                  }
                                                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                                                >
                                                  <FiPlus size={12} /> Agregar
                                                  material
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setShowFormName(null)
                                                  }
                                                  className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                                >
                                                  Cancelar
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() =>
                                              setShowFormName(
                                                `mat-${item.id_reparacion}`,
                                              )
                                            }
                                            className="w-full inline-flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 hover:text-blue-800 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                                          >
                                            <FiPackage size={14} /> Agregar
                                            material
                                          </button>
                                        ))}

                                      {/* Botón: Lista entrega */}
                                      {canDeliver &&
                                        (item.estado === "en_reparacion" ||
                                          item.estado === "diagnosticada") &&
                                        showFormName !==
                                          `mat-${item.id_reparacion}` && (
                                          <button
                                            onClick={() =>
                                              handleMarcarLista(
                                                item.id_reparacion,
                                              )
                                            }
                                            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                                          >
                                            <FiSend size={14} /> Marcar lista
                                            entrega
                                          </button>
                                        )}

                                      {/* Botón: Entregar */}
                                      {canDeliver &&
                                        item.estado === "lista_entrega" &&
                                        (showFormName ===
                                        `ent-${item.id_reparacion}` ? (
                                          <div className="bg-white rounded-xl border border-emerald-200 shadow-sm p-4 space-y-3">
                                            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">
                                              Confirmar entrega
                                            </span>
                                            {det.requiere_pago &&
                                              Number(det.total) > 0 && (
                                                <>
                                                  <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                                                      Método de pago
                                                    </label>
                                                    <select
                                                      value={entMetodo}
                                                      onChange={(e) =>
                                                        setEntMetodo(
                                                          e.target.value,
                                                        )
                                                      }
                                                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                                                    >
                                                      <option value="">
                                                        Seleccionar…
                                                      </option>
                                                      {metodosPago.map((mp) => (
                                                        <option
                                                          key={
                                                            mp.id_metodo_pago
                                                          }
                                                          value={
                                                            mp.id_metodo_pago
                                                          }
                                                        >
                                                          {mp.nombre}
                                                        </option>
                                                      ))}
                                                    </select>
                                                  </div>
                                                  <div>
                                                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                                                      Referencia
                                                    </label>
                                                    <input
                                                      type="text"
                                                      value={entRef}
                                                      onChange={(e) =>
                                                        setEntRef(
                                                          e.target.value,
                                                        )
                                                      }
                                                      className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                                      placeholder="Opcional"
                                                    />
                                                  </div>
                                                </>
                                              )}
                                            <div className="flex items-center gap-2">
                                              <button
                                                onClick={() =>
                                                  handleEntregar(
                                                    item.id_reparacion,
                                                    det,
                                                  )
                                                }
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
                                              >
                                                <FiCheckCircle size={12} />{" "}
                                                Entregar
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setShowFormName(null)
                                                }
                                                className="px-3 py-2 text-xs text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                              >
                                                Cancelar
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            onClick={() => {
                                              setShowFormName(
                                                `ent-${item.id_reparacion}`,
                                              );
                                              setEntMetodo("");
                                              setEntRef("");
                                            }}
                                            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
                                          >
                                            <FiCheckCircle size={14} /> Entregar
                                          </button>
                                        ))}
                                    </div>
                                  </div>
                                )}{" "}
                              </div>
                            </div>{" "}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

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
                  órdenes
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => hasNext && setPage((p) => p + 1)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value={10}>10 / pág.</option>
                <option value={20}>20 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdenesReparacion;
