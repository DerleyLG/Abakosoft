import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiSave,
  FiTool,
  FiTrash2,
  FiChevronDown,
  FiChevronRight,
  FiUserPlus,
  FiCalendar,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

const MOTIVOS_PREDEFINIDOS = [
  { id: "golpe", label: "Golpe / Abolladura" },
  { id: "rayon", label: "Rayón / Rasguño" },
  { id: "desgaste", label: "Desgaste general" },
  { id: "rotura", label: "Rotura / Fractura" },
  { id: "mecanismo", label: "Fallo en mecanismo" },
  { id: "tapizado", label: "Tapizado dañado" },
  { id: "pintura", label: "Pintura descascarada" },
  { id: "estructura", label: "Estructura floja" },
  { id: "personalizado", label: "Otro motivo" },
];

const OrdenReparacionForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const devolucionId = searchParams.get("devolucion");

  const canCreate = can(user, ACTIONS.REPAIRS_CREATE);

  // --- Caché para AsyncSelect ---
  const clientesCache = useRef({});
  const articulosCache = useRef({});
  const trabajadoresCache = useRef({});
  const timerRef = useRef(null);

  const [todosClientes, setTodosClientes] = useState([]);
  const [todosArticulos, setTodosArticulos] = useState([]);
  const [todosTrabajadores, setTodosTrabajadores] = useState([]);

  const [devolucionInfo, setDevolucionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fechaIngreso, setFechaIngreso] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [fechaEstimada, setFechaEstimada] = useState("");
  const [cliente, setCliente] = useState(null);
  const [motivos, setMotivos] = useState(["personalizado"]);
  const [showMotivoExtra, setShowMotivoExtra] = useState(true);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [articulosReparacion, setArticulosReparacion] = useState([]);
  const [articuloEnCurso, setArticuloEnCurso] = useState(null);
  const [trabajador, setTrabajador] = useState(null);
  const [mostrarTrabajador, setMostrarTrabajador] = useState(false);
  const trabajadorRef = useRef(null);
  const trabajadorSelectRef = useRef(null);

  // --- Cargar datos iniciales ---
  useEffect(() => {
    const init = async () => {
      try {
        const [cliRes, artRes, traRes] = await Promise.all([
          api.get("/clientes"),
          api.get("/articulos", { params: { page: 1, pageSize: 1 } }),
          api.get("/trabajadores"),
        ]);

        const clis = (
          Array.isArray(cliRes.data) ? cliRes.data : cliRes.data?.data || []
        ).map((c) => ({ value: c.id_cliente, label: c.nombre, ...c }));
        setTodosClientes(clis);
        clientesCache.current[""] = clis;

        const totalArts = artRes.data?.total || 10000;
        const artsRes = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const arts = (
          Array.isArray(artsRes.data?.data) ? artsRes.data.data : []
        ).map((a) => ({
          value: a.id_articulo,
          label: `${a.descripcion}${a.referencia ? ` (Ref: ${a.referencia})` : ""}`,
          ...a,
        }));
        setTodosArticulos(arts);
        articulosCache.current[""] = arts;

        const trabs = (
          Array.isArray(traRes.data) ? traRes.data : traRes.data?.data || []
        ).map((t) => ({ value: t.id_trabajador, label: t.nombre, ...t }));
        setTodosTrabajadores(trabs);
        trabajadoresCache.current[""] = trabs;
      } catch (e) {
        console.error(e);
        toast.error("No fue posible cargar datos iniciales");
      } finally {
        setLoading(false);
      }
    };
    init();
    if (devolucionId) cargarDevolucion(devolucionId);
  }, []);

  const cargarDevolucion = async (id) => {
    try {
      const res = await api.get(`/devoluciones/${id}`);
      setDevolucionInfo(res.data);
      if (res.data.id_cliente) {
        setCliente({
          value: res.data.id_cliente,
          label: res.data.cliente_nombre,
        });
      }
      if (res.data.detalles?.length > 0) {
        setArticulosReparacion(
          res.data.detalles.map((d) => ({
            id_articulo: d.id_articulo,
            descripcion: d.descripcion,
            referencia: d.referencia || "",
            cantidad: 1,
          })),
        );
      }
    } catch (e) {
      toast.error("No fue posible cargar la devolución");
    }
  };

  // --- AsyncSelect helpers ---
  const loadClientesOptions = useCallback(
    (inputValue, callback) => {
      const key = (inputValue || "").toLowerCase();
      if (!key) return callback(todosClientes);
      if (clientesCache.current[key])
        return callback(clientesCache.current[key]);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const filtrados = todosClientes.filter((c) =>
          c.label.toLowerCase().includes(key),
        );
        clientesCache.current[key] = filtrados;
        callback(filtrados);
      }, 200);
    },
    [todosClientes],
  );

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
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const filtrados = todosTrabajadores.filter((t) =>
          t.label.toLowerCase().includes(key),
        );
        trabajadoresCache.current[key] = filtrados;
        callback(filtrados);
      }, 200);
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
      minHeight: "38px",
      fontSize: "0.875rem",
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
    menuList: (base) => ({ ...base, maxHeight: "240px" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    placeholder: (base) => ({
      ...base,
      color: "#94a3b8",
      fontSize: "0.8125rem",
    }),
    input: (base) => ({ ...base, fontSize: "0.8125rem" }),
  };

  // --- Auto-scroll al trabajador ---
  useEffect(() => {
    if (mostrarTrabajador && trabajadorRef.current) {
      trabajadorRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      setTimeout(() => {
        const input = trabajadorRef.current?.querySelector("input");
        if (input) input.focus();
      }, 350);
    }
  }, [mostrarTrabajador]);

  // --- Motivos ---
  const toggleMotivo = (id) => {
    if (id === "personalizado") {
      // Otro motivo es exclusivo: desmarca todo lo demás
      setMotivos((prev) =>
        prev.includes("personalizado") ? [] : ["personalizado"],
      );
      setShowMotivoExtra((prev) => !prev);
    } else {
      // Si se marca un motivo normal y "personalizado" está activo, se desactiva
      setMotivos((prev) => {
        const nuevo = prev.includes(id)
          ? prev.filter((m) => m !== id)
          : [...prev.filter((m) => m !== "personalizado"), id];
        return nuevo;
      });
      if (showMotivoExtra) {
        setShowMotivoExtra(false);
        setMotivoPersonalizado("");
      }
    }
  };

  // --- Artículos ---
  const agregarArticulo = (articulo) => {
    if (!articulo) return;
    if (articulosReparacion.some((a) => a.id_articulo === articulo.value)) {
      toast.error("Este artículo ya está en la lista");
      setArticuloEnCurso(null);
      return;
    }
    setArticulosReparacion((prev) => [
      ...prev,
      {
        id_articulo: articulo.value,
        descripcion: articulo.descripcion,
        referencia: articulo.referencia || "",
        cantidad: 1,
      },
    ]);
    setArticuloEnCurso(null);
  };

  const eliminarArticulo = (id) =>
    setArticulosReparacion((prev) => prev.filter((a) => a.id_articulo !== id));
  const cambiarCantidad = (id, cantidad) => {
    const num = Number(cantidad);
    if (isNaN(num) || num <= 0) return;
    setArticulosReparacion((prev) =>
      prev.map((a) => (a.id_articulo === id ? { ...a, cantidad: num } : a)),
    );
  };

  // --- Submit ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cliente) return toast.error("Debe seleccionar un cliente");
    if (articulosReparacion.length === 0)
      return toast.error("Debe agregar al menos un artículo");

    const motivosTexto = motivos
      .filter((id) => id !== "personalizado")
      .map((id) => MOTIVOS_PREDEFINIDOS.find((mp) => mp.id === id)?.label)
      .filter(Boolean);
    if (showMotivoExtra && motivoPersonalizado.trim())
      motivosTexto.push(motivoPersonalizado.trim());
    if (motivosTexto.length === 0)
      return toast.error("Debe indicar al menos un motivo");

    setSubmitting(true);
    try {
      await api.post("/reparaciones/batch", {
        id_devolucion_venta: devolucionId || null,
        id_cliente: cliente.value,
        fecha_ingreso: fechaIngreso,
        fecha_estimada: fechaEstimada || null,
        id_trabajador: trabajador?.value || null,
        articulos: articulosReparacion.map((art) => ({
          id_articulo: art.id_articulo,
          motivo: `${motivosTexto.join(", ")}${art.referencia ? ` (Ref: ${art.referencia})` : ""}${art.cantidad > 1 ? ` [${art.cantidad} uds]` : ""}`,
        })),
      });
      setSubmitting(false);
      toast.success(`${articulosReparacion.length} reparación(es) creada(s) correctamente`);
      navigate("/reparaciones");
    } catch (error) {
      setSubmitting(false);
      toast.error(error.response?.data?.error || "Error al crear las reparaciones");
    }
  };

  if (!canCreate) {
    return (
      <div className="p-8 text-center text-slate-500">
        No tienes permisos para crear órdenes de reparación.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 select-none">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/reparaciones")}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <FiArrowLeft size={16} /> Volver
          </button>
          <div className="h-5 w-px bg-slate-200" />

          <h1 className="text-xl font-bold text-slate-900">
            {devolucionInfo
              ? "Nueva reparación desde devolución"
              : "Nueva orden de reparación"}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cliente + Fechas */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Información general
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cliente <span className="text-red-500">*</span>
              </label>
              <AsyncSelect
                cacheOptions
                loadOptions={loadClientesOptions}
                defaultOptions={todosClientes}
                value={cliente}
                onChange={(opt) => setCliente(opt)}
                placeholder="Buscar cliente…"
                isClearable
                styles={selectStyles}
                noOptionsMessage={() => "No se encontraron clientes"}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Fecha ingreso <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiCalendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
                <input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Fecha estimada entrega
              </label>
              <div className="relative">
                <FiCalendar
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  size={14}
                />
                <input
                  type="date"
                  value={fechaEstimada}
                  onChange={(e) => setFechaEstimada(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Motivos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Motivo <span className="text-red-500">*</span>
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_PREDEFINIDOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMotivo(m.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  motivos.includes(m.id)
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`w-3 h-3 rounded-full border flex items-center justify-center ${motivos.includes(m.id) ? "bg-white border-white" : "border-slate-300"}`}
                >
                  {motivos.includes(m.id) && (
                    <svg
                      className="w-1.5 h-1.5 text-slate-900"
                      fill="currentColor"
                      viewBox="0 0 16 16"
                    >
                      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z" />
                    </svg>
                  )}
                </span>
                {m.label}
              </button>
            ))}
          </div>
          {showMotivoExtra && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Especifica el motivo
              </label>
              <textarea
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none transition"
                placeholder="Describe aquí el motivo de la reparación…"
              />
            </div>
          )}
        </div>

        {/* Artículos + Trabajador + Costo */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Artículos a reparar <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tabla de artículos — 2/3 */}
            <div className="lg:col-span-2 space-y-3">
              <AsyncSelect
                cacheOptions
                loadOptions={loadArticulosOptions}
                defaultOptions={todosArticulos}
                value={articuloEnCurso}
                onChange={(opt) => agregarArticulo(opt)}
                placeholder="Buscar artículo por nombre o referencia…"
                isClearable
                styles={selectStyles}
                noOptionsMessage={() => "No se encontraron artículos"}
              />
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Artículo
                      </th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">
                        Cantidad
                      </th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-20">
                        Ref.
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {articulosReparacion.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="text-center py-10 text-slate-400 text-xs"
                        >
                          Agrega artículos usando el buscador de arriba
                        </td>
                      </tr>
                    ) : (
                      articulosReparacion.map((art) => (
                        <tr
                          key={art.id_articulo}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-3 py-2.5">
                            <span className="text-slate-800 font-medium text-xs">
                              {art.descripcion}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={art.cantidad}
                              onChange={(e) =>
                                cambiarCantidad(art.id_articulo, e.target.value)
                              }
                              className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-slate-400 font-mono">
                            {art.referencia || "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => eliminarArticulo(art.id_articulo)}
                              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {articulosReparacion.length > 1 && (
                <p className="text-[11px] text-slate-400">
                  * Se creará una orden por cada artículo
                </p>
              )}
            </div>

            {/* Columna lateral — Trabajador + Costo */}
            <div className="space-y-4">
              <div ref={trabajadorRef} className="scroll-mt-24">
                <button
                  type="button"
                  onClick={() => setMostrarTrabajador(!mostrarTrabajador)}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {mostrarTrabajador ? (
                    <FiChevronDown size={15} />
                  ) : (
                    <FiChevronRight size={15} />
                  )}
                  <FiUserPlus size={14} />
                  Asignar trabajador
                </button>
                {mostrarTrabajador && (
                  <div className="mt-3 animate-fade-in">
                    <AsyncSelect
                      ref={trabajadorSelectRef}
                      cacheOptions
                      loadOptions={loadTrabajadoresOptions}
                      defaultOptions={todosTrabajadores}
                      value={trabajador}
                      onChange={(opt) => setTrabajador(opt)}
                      placeholder="Buscar trabajador…"
                      isClearable
                      styles={selectStyles}
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      noOptionsMessage={() => "No se encontraron trabajadores"}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Botones sticky siempre visibles */}
        <div className="sticky bottom-0 bg-white border border-slate-200 rounded-xl shadow-lg px-5 py-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FiSave size={15} />
            {submitting
              ? "Registrando…"
              : articulosReparacion.length > 1
                ? `Registrar reparaciones (${articulosReparacion.length})`
                : "Registrar reparación"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/reparaciones")}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrdenReparacionForm;
