import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPlus,
  FiRefreshCw,
  FiLogOut,
  FiKey,
  FiEdit3,
  FiPause,
  FiPlay,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiClock,
  FiUsers,
  FiActivity,
  FiDatabase,
  FiSettings,
  FiGlobe,
  FiUser,
} from "react-icons/fi";
import {
  saasListarEmpresas,
  saasActualizarEstado,
  saasEliminarEmpresa,
  saasListarLogs,
  saasListarPlanes,
  saasEditarSuscripcion,
  saasCambiarCredencialesAdmin,
} from "../../services/saasApi";
import { useSaasAuth } from "../../context/SaasAuthContext";
import toast from "react-hot-toast";
// Helpers
const diasRestantes = (fecha_fin) => {
  if (!fecha_fin) return null;
  const fin = new Date(fecha_fin);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const getInitials = (nombre) =>
  nombre
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

const formatFecha = (fecha) => {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatFechaHoraBogota = (fecha) => {
  if (!fecha) return "—";

  return new Date(fecha).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const formatPrecioMensual = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "—";

  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);

  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(numero);
};

const MESES_ABREVIADOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const VIGENCIA_PRESETS = [7, 15, 30, 90, 365];

const formatFechaActividad = (fecha) => {
  if (!fecha) return "—";

  const valor = String(fecha).trim();
  const formatoIso = valor.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::\d{2}(?:\.\d{3})?)?(?:Z|[+-]\d{2}:?\d{2})?$/,
  );

  if (formatoIso) {
    const [, anio, mes, dia, hora, minuto] = formatoIso;
    const mesTexto = MESES_ABREVIADOS[Number(mes) - 1] || mes;
    return `${Number(dia)} ${mesTexto} ${anio}, ${hora}:${minuto}`;
  }

  const formatoLocal = valor.match(
    /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/,
  );

  if (formatoLocal) {
    const [, dia, mes, anio, hora, minuto] = formatoLocal;
    const mesTexto = MESES_ABREVIADOS[Number(mes) - 1] || mes;
    return `${Number(dia)} ${mesTexto} ${anio}, ${hora}:${minuto}`;
  }

  const fechaParseable = new Date(valor);
  if (!Number.isNaN(fechaParseable.getTime())) {
    return fechaParseable.toLocaleString("es-CO", {
      timeZone: "America/Bogota",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return valor;
};

const parseLogDetalle = (detalle = "") => {
  const segments = String(detalle)
    .split(" | ")
    .map((segment) => segment.trim())
    .filter(Boolean);

  const parsed = {
    mensaje: "",
    ip: null,
    userAgent: null,
  };

  segments.forEach((segment) => {
    if (segment.startsWith("IP: ")) {
      parsed.ip = segment.slice(4).trim() || null;
      return;
    }

    if (segment.startsWith("UA: ")) {
      parsed.userAgent = segment.slice(4).trim() || null;
      return;
    }

    parsed.mensaje = parsed.mensaje
      ? `${parsed.mensaje} | ${segment}`
      : segment;
  });

  if (!parsed.mensaje) {
    parsed.mensaje = detalle || "Sin detalle adicional";
  }

  return parsed;
};

const EMPRESA_COLORS = {
  activa: {
    border: "border-l-emerald-500",
    avatar: "bg-slate-900 text-white",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  suspendida: {
    border: "border-l-amber-400",
    avatar: "bg-amber-500 text-white",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  cancelada: {
    border: "border-l-red-400",
    avatar: "bg-red-500 text-white",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};

const SUB_COLORS = {
  activa: "bg-emerald-50 text-emerald-700 border-emerald-200",
  prueba: "bg-violet-50 text-violet-700 border-violet-200",
  gracia: "bg-orange-50 text-orange-700 border-orange-200",
  suspendida: "bg-amber-50 text-amber-700 border-amber-200",
  cancelada: "bg-red-50 text-red-700 border-red-200",
};

const LOG_ICONS = {
  crear_empresa: <FiDatabase size={14} />,
  cambio_estado: <FiRefreshCw size={14} />,
  editar_suscripcion: <FiEdit3 size={14} />,
  cambiar_credenciales_admin: <FiKey size={14} />,
  crear_admin_inicial: <FiUsers size={14} />,
};

const AUTH_LOG_ACTIONS = new Set([
  "login_admin_exitoso",
  "login_admin_fallido",
  "login_admin_lockout",
  "refresh_admin_exitoso",
  "refresh_admin_fallido",
  "logout_admin",
  "cambio_password_admin",
]);

const AUTH_EVENT_OPTIONS = [
  { value: "todos", label: "Todos los eventos" },
  { value: "login_admin_exitoso", label: "Login exitoso" },
  { value: "login_admin_fallido", label: "Login fallido" },
  { value: "login_admin_lockout", label: "Cuenta bloqueada" },
  { value: "refresh_admin_exitoso", label: "Sesión renovada" },
  { value: "refresh_admin_fallido", label: "Refresh fallido" },
  { value: "logout_admin", label: "Cierre de sesión" },
  { value: "cambio_password_admin", label: "Cambio de contraseña" },
];

const LOG_LABELS = {
  crear_empresa: "Empresa creada",
  cambio_estado: "Cambio de estado",
  editar_suscripcion: "Suscripción editada",
  cambiar_credenciales_admin: "Credenciales actualizadas",
  crear_admin_inicial: "Admin inicial creado",
  login_admin_exitoso: "Login exitoso",
  login_admin_fallido: "Login fallido",
  login_admin_lockout: "Cuenta bloqueada",
  refresh_admin_exitoso: "Sesión renovada",
  refresh_admin_fallido: "Refresh fallido",
  logout_admin: "Cierre de sesión",
  cambio_password_admin: "Cambio de contraseña",
};

const LOG_TONES = {
  login_admin_exitoso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  refresh_admin_exitoso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  logout_admin: "bg-slate-100 text-slate-700 border-slate-200",
  login_admin_fallido: "bg-amber-50 text-amber-700 border-amber-200",
  refresh_admin_fallido: "bg-amber-50 text-amber-700 border-amber-200",
  login_admin_lockout: "bg-red-50 text-red-700 border-red-200",
  cambio_password_admin: "bg-blue-50 text-blue-700 border-blue-200",
};

const ESTADO_BADGE = {};
const ESTADO_SUB_BADGE = {};

export default function SaasDashboard() {
  const { admin, logout } = useSaasAuth();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("empresas");
  const [logFilter, setLogFilter] = useState("todos");
  const [logRange, setLogRange] = useState("7d");
  const [logQuery, setLogQuery] = useState("");
  const [authEventFilter, setAuthEventFilter] = useState("todos");

  // Modal editar plan
  const [modalPlan, setModalPlan] = useState({ open: false, empresa: null });
  const [planForm, setPlanForm] = useState({
    id_plan: "",
    dias: "",
    estado_suscripcion: "activa",
    es_prueba: false,
  });
  const [savingPlan, setSavingPlan] = useState(false);

  // Modal cambiar credenciales
  const [modalCred, setModalCred] = useState({ open: false, empresa: null });
  const [credForm, setCredForm] = useState({ nombre_usuario: "", pin: "" });
  const [savingCred, setSavingCred] = useState(false);

  // Modal confirmar cambio de estado (suspender / reactivar)
  const [modalConfirmar, setModalConfirmar] = useState({
    open: false,
    empresa: null,
    estado: "",
    accion: "",
  });
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  // Modal eliminar empresa
  const [modalEliminar, setModalEliminar] = useState({
    open: false,
    empresa: null,
  });
  const [confirmNombre, setConfirmNombre] = useState("");
  const [eliminando, setEliminando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const logParams = {
        ...(logFilter === "auth" ? { categoria: "auth" } : {}),
        ...(logFilter === "auth" && authEventFilter !== "todos"
          ? { tipo_auth: authEventFilter }
          : {}),
        ...(logRange !== "todos" ? { rango: logRange } : {}),
        ...(logQuery.trim() ? { q: logQuery.trim() } : {}),
      };

      const [empRes, logRes, planRes] = await Promise.all([
        saasListarEmpresas(),
        saasListarLogs(logParams),
        saasListarPlanes(),
      ]);
      setEmpresas(empRes.data);
      setLogs(logRes.data.slice(0, 100));
      setPlanes(planRes.data);
    } catch (err) {
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [authEventFilter, logFilter, logQuery, logRange]);

  useEffect(() => {
    if (logFilter !== "auth" && authEventFilter !== "todos") {
      setAuthEventFilter("todos");
    }
  }, [authEventFilter, logFilter]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiarEstado = (id, estado, nombre) => {
    const accion =
      estado === "suspendida"
        ? "Suspender"
        : estado === "cancelada"
          ? "Cancelar"
          : "Reactivar";
    setModalConfirmar({
      open: true,
      empresa: { id_empresa: id, nombre },
      estado,
      accion,
    });
  };

  const handleConfirmarEstado = async () => {
    setCambiandoEstado(true);
    try {
      await saasActualizarEstado(
        modalConfirmar.empresa.id_empresa,
        modalConfirmar.estado,
      );
      toast.success("Estado actualizado");
      setModalConfirmar({ open: false, empresa: null, estado: "", accion: "" });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al actualizar estado");
    } finally {
      setCambiandoEstado(false);
    }
  };

  const abrirModalPlan = (emp) => {
    setModalPlan({ open: true, empresa: emp });
    setPlanForm({
      id_plan: emp.id_plan || "",
      dias: "",
      estado_suscripcion: emp.estado_suscripcion || "activa",
      es_prueba: emp.es_prueba === 1 || emp.estado_suscripcion === "prueba",
    });
  };

  const setEstadoSuscripcion = (estado_suscripcion) => {
    setPlanForm((current) => ({
      ...current,
      estado_suscripcion,
      es_prueba: estado_suscripcion === "prueba",
    }));
  };

  const toggleModoPrueba = () => {
    setPlanForm((current) => {
      const esPrueba = !current.es_prueba;
      return {
        ...current,
        es_prueba: esPrueba,
        estado_suscripcion: esPrueba ? "prueba" : "activa",
      };
    });
  };

  const handleGuardarPlan = async () => {
    if (planForm.es_prueba && !planForm.dias) {
      toast.error("Debes ingresar una vigencia para una suscripción en prueba");
      return;
    }

    setSavingPlan(true);
    try {
      const data = {};
      if (planForm.id_plan !== "") data.id_plan = planForm.id_plan;
      if (planForm.dias) data.dias = parseInt(planForm.dias);
      if (planForm.estado_suscripcion)
        data.estado_suscripcion = planForm.estado_suscripcion;
      data.es_prueba = planForm.es_prueba;
      await saasEditarSuscripcion(modalPlan.empresa.id_empresa, data);
      toast.success("Suscripción actualizada");
      setModalPlan({ open: false, empresa: null });
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al actualizar");
    } finally {
      setSavingPlan(false);
    }
  };

  const abrirModalCred = (emp) => {
    setModalCred({ open: true, empresa: emp });
    setCredForm({ nombre_usuario: "", pin: "" });
  };

  const handleGuardarCred = async () => {
    if (!credForm.nombre_usuario && !credForm.pin) {
      toast.error("Ingresa al menos un campo");
      return;
    }
    setSavingCred(true);
    try {
      const data = {};
      if (credForm.nombre_usuario)
        data.nombre_usuario = credForm.nombre_usuario;
      if (credForm.pin) data.pin = credForm.pin;
      await saasCambiarCredencialesAdmin(modalCred.empresa.id_empresa, data);
      toast.success("Credenciales actualizadas");
      setModalCred({ open: false, empresa: null });
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al actualizar");
    } finally {
      setSavingCred(false);
    }
  };

  const handleEliminarEmpresa = async () => {
    if (confirmNombre.trim() !== modalEliminar.empresa?.nombre) {
      toast.error("El nombre no coincide");
      return;
    }
    setEliminando(true);
    try {
      await saasEliminarEmpresa(modalEliminar.empresa.id_empresa);
      toast.success("Empresa eliminada correctamente");
      setModalEliminar({ open: false, empresa: null });
      setConfirmNombre("");
      cargar();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Error al eliminar la empresa");
    } finally {
      setEliminando(false);
    }
  };

  const activas = empresas.filter((e) => e.estado === "activa").length;
  const suspendidas = empresas.filter((e) => e.estado === "suspendida").length;
  const enPrueba = empresas.filter(
    (e) => e.estado_suscripcion === "prueba",
  ).length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
            <FiDatabase className="text-white" size={16} />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">
              Abakosoft
            </div>
            <div className="text-slate-400 text-xs">Panel SaaS</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-white text-sm font-medium">
              {admin?.nombre}
            </div>
            <div className="text-slate-400 text-xs">{admin?.email}</div>
          </div>
          <Link
            to="/saas/cambiar-password"
            title="Cambiar contraseña"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition"
          >
            <FiSettings size={14} />
          </Link>
          <button
            onClick={() => {
              logout();
              navigate("/saas/login");
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition text-sm cursor-pointer"
          >
            <FiLogOut size={14} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total empresas",
              value: empresas.length,
              Icon: FiUsers,
              color: "text-slate-700",
              bg: "bg-slate-100",
            },
            {
              label: "Activas",
              value: activas,
              Icon: FiCheck,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "En prueba",
              value: enPrueba,
              Icon: FiClock,
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              label: "Suspendidas",
              value: suspendidas,
              Icon: FiPause,
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map(({ label, value, Icon, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {label}
                </p>
                <div
                  className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}
                >
                  <Icon className={color} size={15} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {["empresas", "logs"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  tab === t
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "empresas" ? (
                  <>
                    <FiUsers size={13} /> Empresas
                  </>
                ) : (
                  <>
                    <FiActivity size={13} /> Actividad
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargar}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-sm cursor-pointer"
              title="Actualizar"
            >
              <FiRefreshCw size={14} />
            </button>
            <Link
              to="/saas/empresas/nueva"
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-700 transition shadow-sm"
            >
              <FiPlus size={15} />
              Nueva empresa
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800" />
          </div>
        ) : tab === "empresas" ? (
          empresas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <FiUsers className="mx-auto text-4xl text-slate-300 mb-3" />
              <p className="text-slate-500 mb-3">
                No hay empresas registradas.
              </p>
              <Link
                to="/saas/empresas/nueva"
                className="inline-block text-slate-700 font-semibold underline text-sm"
              >
                Crear la primera empresa
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {empresas.map((emp) => {
                const colors =
                  EMPRESA_COLORS[emp.estado] || EMPRESA_COLORS.cancelada;
                const dias = diasRestantes(emp.fecha_fin);
                const diasLabel =
                  dias === null
                    ? null
                    : dias > 0
                      ? `${dias} día${dias !== 1 ? "s" : ""}`
                      : dias === 0
                        ? "Vence hoy"
                        : `Venció hace ${Math.abs(dias)} día${Math.abs(dias) !== 1 ? "s" : ""}`;
                const diasColor =
                  dias === null
                    ? ""
                    : dias > 7
                      ? "text-emerald-600"
                      : dias > 0
                        ? "text-amber-600"
                        : "text-red-500";
                const diasBarColor =
                  dias === null
                    ? ""
                    : dias > 7
                      ? "bg-emerald-500"
                      : dias > 0
                        ? "bg-amber-400"
                        : "bg-red-400";
                const totalDias =
                  emp.fecha_inicio && emp.fecha_fin
                    ? Math.ceil(
                        (new Date(emp.fecha_fin) - new Date(emp.fecha_inicio)) /
                          (1000 * 60 * 60 * 24),
                      )
                    : null;
                const progreso =
                  totalDias && dias !== null
                    ? Math.max(0, Math.min(100, (dias / totalDias) * 100))
                    : null;

                return (
                  <div
                    key={emp.id_empresa}
                    className={`bg-white rounded-2xl border border-slate-200 shadow-sm border-l-4 ${colors.border} flex flex-col overflow-hidden`}
                  >
                    {/* Header */}
                    <div className="px-5 pt-5 pb-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl ${colors.avatar} flex items-center justify-center font-bold text-base flex-shrink-0 select-none`}
                          >
                            {getInitials(emp.nombre)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 text-base leading-tight truncate">
                              {emp.nombre}
                            </h3>
                            <span className="inline-block text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                              {emp.codigo}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold flex-shrink-0 ${colors.badge}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
                          />
                          {emp.estado}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {emp.email_contacto}
                      </p>
                    </div>

                    {/* Info */}
                    <div className="px-5 py-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">
                          Plan
                        </span>
                        <span className="text-xs font-semibold text-slate-700">
                          {emp.plan || "-"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">
                          Suscripción
                        </span>
                        {emp.estado_suscripcion ? (
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-lg border ${SUB_COLORS[emp.estado_suscripcion] || "bg-slate-50 text-slate-600 border-slate-200"}`}
                          >
                            {emp.estado_suscripcion}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>
                      {dias !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-medium">
                            Vigencia
                          </span>
                          <span
                            className={`text-xs font-semibold flex items-center gap-1 ${diasColor}`}
                          >
                            <FiClock size={11} />
                            {diasLabel}
                          </span>
                        </div>
                      )}
                      {progreso !== null &&
                        emp.estado_suscripcion === "prueba" && (
                          <div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${diasBarColor} transition-all duration-500`}
                                style={{ width: `${progreso}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-[10px] text-slate-400">
                                inicio
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {formatFecha(emp.fecha_fin)}
                              </span>
                            </div>
                          </div>
                        )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-medium">
                          Base de datos
                        </span>
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[150px]">
                          {emp.db_name}
                        </span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 mt-auto flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => abrirModalCred(emp)}
                          title="Cambiar credenciales del admin"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-sm"
                        >
                          <FiKey size={11} />
                          Credenciales
                        </button>
                        <button
                          onClick={() => abrirModalPlan(emp)}
                          title="Editar suscripción"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer shadow-sm"
                        >
                          <FiEdit3 size={11} />
                          Sucripción
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        {emp.estado === "activa" ? (
                          <button
                            onClick={() =>
                              cambiarEstado(
                                emp.id_empresa,
                                "suspendida",
                                emp.nombre,
                              )
                            }
                            title="Suspender empresa"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-amber-500 bg-white border border-slate-200 hover:bg-amber-50 transition cursor-pointer"
                          >
                            <FiPause size={13} />
                          </button>
                        ) : emp.estado === "suspendida" ? (
                          <button
                            onClick={() =>
                              cambiarEstado(
                                emp.id_empresa,
                                "activa",
                                emp.nombre,
                              )
                            }
                            title="Reactivar empresa"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-500 bg-white border border-slate-200 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <FiPlay size={13} />
                          </button>
                        ) : null}
                        {emp.estado !== "cancelada" && (
                          <button
                            onClick={() => {
                              setModalEliminar({ open: true, empresa: emp });
                              setConfirmNombre("");
                            }}
                            title="Eliminar empresa"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 bg-white border border-slate-200 hover:bg-red-50 transition cursor-pointer"
                          >
                            <FiX size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 bg-slate-50/80">
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Actividad reciente
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {logFilter === "auth"
                    ? "Mostrando solo eventos de autenticación SaaS."
                    : "Mostrando toda la actividad del panel SaaS."}
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                <button
                  onClick={() => setLogFilter("todos")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    logFilter === "todos"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setLogFilter("auth")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    logFilter === "auth"
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  Autenticación
                </button>
              </div>
            </div>
            <div className="px-5 py-4 border-b border-slate-200 bg-white">
              <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "24h", label: "24 horas" },
                      { value: "7d", label: "7 días" },
                      { value: "30d", label: "30 días" },
                      { value: "todos", label: "Todo" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setLogRange(option.value)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                          logRange === option.value
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-500 border-slate-200 hover:text-slate-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {logFilter === "auth" && (
                    <select
                      value={authEventFilter}
                      onChange={(e) => setAuthEventFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    >
                      {AUTH_EVENT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="w-full lg:w-72">
                  <input
                    value={logQuery}
                    onChange={(e) => setLogQuery(e.target.value)}
                    placeholder="Buscar por admin, detalle o evento"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                  />
                </div>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <FiActivity className="mx-auto text-3xl mb-2 text-slate-300" />
                Sin actividad registrada.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {logs.map((l) => {
                  const meta = parseLogDetalle(l.detalle);

                  return (
                    <div
                      key={l.id_log}
                      className="flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm select-none">
                        {LOG_ICONS[l.tipo_accion] ||
                          (AUTH_LOG_ACTIONS.has(l.tipo_accion) ? "A" : "-")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={`text-xs font-semibold border px-2 py-0.5 rounded-full ${
                              LOG_TONES[l.tipo_accion] ||
                              "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {LOG_LABELS[l.tipo_accion] || l.tipo_accion}
                          </span>
                          <span className="text-[11px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {AUTH_LOG_ACTIONS.has(l.tipo_accion)
                              ? "Autenticación"
                              : "Operación"}
                          </span>
                          {l.admin_nombre && (
                            <span className="text-xs text-slate-400">
                              por {l.admin_nombre}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 break-words">
                          {meta.mensaje}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {l.admin_nombre && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                              <FiUser size={12} />
                              {l.admin_nombre}
                            </span>
                          )}
                          {meta.ip && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                              <FiGlobe size={12} />
                              {meta.ip}
                            </span>
                          )}
                          {meta.userAgent && (
                            <span
                              className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700"
                              title={meta.userAgent}
                            >
                              <FiSettings size={12} />
                              <span className="truncate max-w-[280px]">
                                {meta.userAgent}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                        {formatFechaActividad(l.fecha_bogota || l.fecha)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal Editar Plan ─────────────────────────────────────────────────────────────── */}
      {modalPlan.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalPlan({ open: false, empresa: null })}
          />
          <div className="relative w-full max-w-6xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-5 text-white">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  Editar suscripción
                </p>
                <h4 className="mt-1 text-2xl font-bold leading-tight">
                  {modalPlan.empresa?.nombre}
                </h4>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white/90">
                    {modalPlan.empresa?.codigo}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-white/90">
                    {modalPlan.empresa?.db_name}
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 font-semibold ${SUB_COLORS[modalPlan.empresa?.estado_suscripcion] || "border-white/10 bg-white/10 text-white/90"}`}
                  >
                    {modalPlan.empresa?.estado_suscripcion || "sin estado"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalPlan({ open: false, empresa: null })}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:bg-white/15 cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_1.15fr]">
              <aside className="border-b border-slate-200 bg-slate-50/80 p-6 lg:border-b-0 lg:border-r">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Resumen actual
                  </p>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Plan actual
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {modalPlan.empresa?.plan || "Sin plan"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Suscripción
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${SUB_COLORS[modalPlan.empresa?.estado_suscripcion] || "border-slate-200 bg-slate-50 text-slate-600"}`}
                      >
                        {modalPlan.empresa?.estado_suscripcion || "-"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Inicio
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {formatFecha(modalPlan.empresa?.fecha_inicio)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          Vence
                        </p>
                        <p className="mt-1 font-semibold text-slate-800">
                          {formatFecha(modalPlan.empresa?.fecha_fin)}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Base de datos
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-700">
                        {modalPlan.empresa?.db_name || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Impacto rápido
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span>Tipo de suscripción</span>
                      <span className="font-semibold text-slate-900">
                        {planForm.es_prueba ? "Prueba" : "Formal"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span>Nuevo vencimiento</span>
                      <span className="font-semibold text-slate-900">
                        {planForm.dias && Number(planForm.dias) > 0
                          ? formatFecha(
                              new Date(
                                Date.now() +
                                  Number(planForm.dias) * 24 * 60 * 60 * 1000,
                              ),
                            )
                          : "Sin cambio"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span>Plan seleccionado</span>
                      <span className="font-semibold text-slate-900">
                        {planes.find(
                          (p) => String(p.id_plan) === String(planForm.id_plan),
                        )?.nombre ||
                          modalPlan.empresa?.plan ||
                          "Mantener actual"}
                      </span>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="p-6">
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Plan
                      </label>
                      <span className="text-xs text-slate-400">
                        Selecciona una opción o deja la actual
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {planes
                        .filter((p) => {
                          const nombre = (p.nombre || "").toLowerCase();
                          return (
                            nombre === "básico" ||
                            nombre === "basico" ||
                            nombre === "pro"
                          );
                        })
                        .map((p) => {
                          const active =
                            String(planForm.id_plan) === String(p.id_plan);
                          return (
                            <button
                              key={p.id_plan}
                              type="button"
                              onClick={() =>
                                setPlanForm((current) => ({
                                  ...current,
                                  id_plan: String(p.id_plan),
                                }))
                              }
                              className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">
                                    {p.nombre}
                                  </p>
                                </div>
                                <span
                                  className={`text-xs font-semibold ${active ? "text-white" : "text-slate-500"}`}
                                >
                                  ${formatPrecioMensual(p.precio_mensual)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-slate-700">
                        Estado de suscripción
                      </label>
                      <span className="text-xs text-slate-400">
                        Define cómo queda visible para la empresa
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      {[
                        { value: "activa", label: "Activa" },
                        { value: "prueba", label: "Prueba" },
                        { value: "gracia", label: "Gracia" },
                        { value: "suspendida", label: "Suspendida" },
                        { value: "cancelada", label: "Cancelada" },
                      ].map((option) => {
                        const active =
                          planForm.estado_suscripcion === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setEstadoSuscripcion(option.value)}
                            className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition cursor-pointer ${
                              active
                                ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
                    <div>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-slate-700">
                          Vigencia nueva
                        </label>
                        <span className="text-xs text-slate-400">
                          Días desde hoy
                        </span>
                      </div>
                      <input
                        type="number"
                        value={planForm.dias}
                        onChange={(e) =>
                          setPlanForm((p) => ({ ...p, dias: e.target.value }))
                        }
                        placeholder="Ej: 30"
                        min="1"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {VIGENCIA_PRESETS.map((dias) => {
                          const active = String(planForm.dias) === String(dias);
                          return (
                            <button
                              key={dias}
                              type="button"
                              onClick={() =>
                                setPlanForm((p) => ({
                                  ...p,
                                  dias: String(dias),
                                }))
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                                active
                                  ? "border-slate-900 bg-slate-900 text-white"
                                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                              }`}
                            >
                              {dias} días
                            </button>
                          );
                        })}
                        {planForm.dias && (
                          <button
                            type="button"
                            onClick={() =>
                              setPlanForm((p) => ({ ...p, dias: "" }))
                            }
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 transition cursor-pointer hover:border-slate-300 hover:text-slate-700"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Modo de prueba
                      </p>
                      <button
                        type="button"
                        onClick={toggleModoPrueba}
                        aria-pressed={planForm.es_prueba}
                        className={`mt-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition cursor-pointer ${
                          planForm.es_prueba
                            ? "border-violet-200 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {planForm.es_prueba ? "Activado" : "Desactivado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Marca la suscripción como prueba y ajusta su estado.
                          </p>
                        </div>
                        <span
                          className={`inline-flex h-8 w-16 items-center rounded-full p-1 transition ${
                            planForm.es_prueba
                              ? "bg-violet-500"
                              : "bg-slate-300"
                          }`}
                          style={{ minWidth: 64, maxWidth: 64 }}
                        >
                          <span
                            className={`h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ${
                              planForm.es_prueba
                                ? "translate-x-8"
                                : "translate-x-0"
                            }`}
                          />
                        </span>
                      </button>
                    </div>
                  </div>

                  {planForm.dias && Number(planForm.dias) > 0 && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Nueva vigencia estimada:{" "}
                      <span className="font-semibold">
                        {formatFecha(
                          new Date(
                            Date.now() +
                              Number(planForm.dias) * 24 * 60 * 60 * 1000,
                          ),
                        )}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                    <button
                      onClick={() =>
                        setModalPlan({ open: false, empresa: null })
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition cursor-pointer hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleGuardarPlan}
                      disabled={savingPlan}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition cursor-pointer hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <FiCheck size={15} />
                      {savingPlan ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cambiar Credenciales ─────────────────────────────────────────────────────────────── */}
      {modalCred.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalCred({ open: false, empresa: null })}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">
                  Credenciales admin
                </p>
                <h4 className="text-lg font-bold text-slate-900">
                  {modalCred.empresa?.nombre}
                </h4>
              </div>
              <button
                onClick={() => setModalCred({ open: false, empresa: null })}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition"
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <FiAlertCircle
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <p className="text-sm text-amber-800">
                  Se actualizarán las credenciales del usuario administrador de
                  esta empresa. Deja un campo vacío para no cambiarlo.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Nuevo nombre de usuario
                </label>
                <input
                  type="text"
                  value={credForm.nombre_usuario}
                  onChange={(e) =>
                    setCredForm((p) => ({
                      ...p,
                      nombre_usuario: e.target.value,
                    }))
                  }
                  placeholder="Dejar vacío para no cambiar"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Nuevo PIN / contraseña
                </label>
                <input
                  type="password"
                  value={credForm.pin}
                  onChange={(e) =>
                    setCredForm((p) => ({ ...p, pin: e.target.value }))
                  }
                  placeholder="Dejar vacío para no cambiar"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setModalCred({ open: false, empresa: null })}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarCred}
                  disabled={
                    savingCred || (!credForm.nombre_usuario && !credForm.pin)
                  }
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingCred ? "Actualizando..." : "Actualizar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eliminar Empresa ── */}
      {modalEliminar.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <FiX size={20} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Eliminar empresa
                </h2>
                <p className="text-xs text-slate-500">
                  Esta acción es irreversible
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Esto eliminará permanentemente la empresa{" "}
              <span className="font-semibold text-slate-900">
                {modalEliminar.empresa?.nombre}
              </span>
              , su base de datos y todos sus registros. No se puede deshacer.
            </p>
            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Escribe el nombre de la empresa para confirmar
              </label>
              <input
                type="text"
                value={confirmNombre}
                onChange={(e) => setConfirmNombre(e.target.value)}
                placeholder={modalEliminar.empresa?.nombre}
                className="w-full rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-300 placeholder:text-slate-300 transition"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setModalEliminar({ open: false, empresa: null });
                  setConfirmNombre("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminarEmpresa}
                disabled={
                  eliminando ||
                  confirmNombre.trim() !== modalEliminar.empresa?.nombre
                }
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {eliminando ? "Eliminando..." : "Eliminar empresa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirmar Cambio de Estado ── */}
      {modalConfirmar.open &&
        (() => {
          const esSuspender = modalConfirmar.estado === "suspendida";
          const esReactivar = modalConfirmar.estado === "activa";
          const iconColor = esSuspender ? "text-amber-500" : "text-emerald-500";
          const iconBg = esSuspender ? "bg-amber-50" : "bg-emerald-50";
          const btnClass = esSuspender
            ? "bg-amber-500 hover:bg-amber-600"
            : "bg-emerald-600 hover:bg-emerald-700";
          const Icon = esSuspender ? FiPause : FiPlay;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}
                  >
                    <Icon size={18} className={iconColor} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {modalConfirmar.accion} empresa
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalConfirmar.empresa?.nombre}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  {esSuspender
                    ? "Los usuarios de esta empresa perderán el acceso de inmediato."
                    : "Los usuarios de esta empresa podrán volver a iniciar sesión."}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() =>
                      setModalConfirmar({
                        open: false,
                        empresa: null,
                        estado: "",
                        accion: "",
                      })
                    }
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmarEstado}
                    disabled={cambiandoEstado}
                    className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${btnClass}`}
                  >
                    {cambiandoEstado ? "Guardando..." : modalConfirmar.accion}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
