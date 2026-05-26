import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  saasCrearEmpresa,
  saasListarPlanes,
  saasVerificarBd,
  saasVerificarUsuario,
} from "../../services/saasApi";
import toast from "react-hot-toast";

const ESTADO_BD = {
  libre: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: "✓",
    label: "Disponible",
  },
  bd_huerfana: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: "⚠",
    label: "BD existe sin empresa registrada",
  },
  registrada_sin_bd: {
    color: "text-blue-600",
    bg: "bg-blue-50",
    icon: "ℹ",
    label: "Empresa registrada, BD pendiente",
  },
  completa: {
    color: "text-red-600",
    bg: "bg-red-50",
    icon: "✗",
    label: "Ya existe y está registrada",
  },
};

// ─── Iconos SVG inline ────────────────────────────────
const IconBuilding = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
    />
  </svg>
);
const IconUser = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
    />
  </svg>
);
const IconSettings = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  </svg>
);
const IconEye = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
  </svg>
);
const IconEyeOff = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

export default function SaasCrearEmpresa() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [paso, setPaso] = useState(1);
  const [showPin, setShowPin] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    codigo: "",
    email_contacto: "",
    id_plan: "",
    es_prueba: true,
    dias_prueba: 7,
    adoptar_bd: false,
    nombre_usuario_admin: "",
    pin_admin: "",
  });
  const [verificacionBd, setVerificacionBd] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const [verificandoUsuario, setVerificandoUsuario] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});

  useEffect(() => {
    saasListarPlanes()
      .then((r) => setPlanes(r.data))
      .catch(() => toast.error("No se pudieron cargar los planes"));
  }, []);

  // Calcular db_name en tiempo real
  const dbName = form.codigo
    ? `gestion_${form.codigo
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 30)}`
    : "";

  // Verificar BD cuando cambia el código (debounce)
  useEffect(() => {
    if (!dbName) {
      setVerificacionBd(null);
      return;
    }
    const timer = setTimeout(async () => {
      setVerificando(true);
      try {
        const { data } = await saasVerificarBd(dbName);
        setVerificacionBd(data);
        if (data.estado === "bd_huerfana") {
          setForm((prev) => ({ ...prev, adoptar_bd: true }));
        } else {
          setForm((prev) => ({ ...prev, adoptar_bd: false }));
        }
      } catch (_) {
        setVerificacionBd(null);
      } finally {
        setVerificando(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [dbName]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrores((prev) => ({ ...prev, [name]: undefined }));
  };

  const validarPaso1 = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = "Requerido";
    if (!form.codigo.trim()) e.codigo = "Requerido";
    if (!/^[a-zA-Z0-9_]+$/.test(form.codigo))
      e.codigo = "Solo letras, números y guiones bajos";
    if (!form.email_contacto.trim()) e.email_contacto = "Requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contacto))
      e.email_contacto = "Email inválido";
    if (verificacionBd?.estado === "completa")
      e.codigo = "Esta BD ya existe y está registrada";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPaso2 = () => {
    const e = {};
    if (!form.es_prueba && !form.id_plan) e.id_plan = "Selecciona un plan";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const validarPaso3 = () => {
    const e = {};
    if (!form.nombre_usuario_admin.trim()) e.nombre_usuario_admin = "Requerido";
    if (form.nombre_usuario_admin.length < 3)
      e.nombre_usuario_admin = "Mínimo 3 caracteres";
    if (!form.pin_admin.trim()) e.pin_admin = "Requerido";
    if (form.pin_admin.length < 4) e.pin_admin = "Mínimo 4 caracteres";
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const siguiente = () => {
    if (paso === 1 && validarPaso1()) setPaso(2);
    else if (paso === 2 && validarPaso2()) setPaso(3);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarPaso3()) return;
    setLoading(true);
    try {
      const payload = {
        nombre: form.nombre,
        codigo: form.codigo,
        email_contacto: form.email_contacto,
        id_plan: form.id_plan ? Number(form.id_plan) : undefined,
        es_prueba: form.es_prueba,
        dias_prueba: Number(form.dias_prueba),
        adoptar_bd: form.adoptar_bd,
        nombre_usuario_admin: form.nombre_usuario_admin,
        pin_admin: form.pin_admin,
      };
      const { data } = await saasCrearEmpresa(payload);
      toast.success(
        data.adoptada
          ? `Empresa registrada (BD adoptada: ${data.db_name})`
          : `Empresa creada — Admin: ${data.admin_creado}`,
        { duration: 5000 },
      );
      navigate("/saas/empresas");
    } catch (err) {
      const resp = err?.response?.data;
      if (resp?.tipo === "bd_huerfana") {
        setVerificacionBd((prev) => ({ ...prev, estado: "bd_huerfana" }));
        setForm((prev) => ({ ...prev, adoptar_bd: true }));
        toast.error(resp.error);
        setPaso(1);
      } else if (resp?.tipo === "db_ya_registrada") {
        setErrores((prev) => ({ ...prev, codigo: resp.error }));
        setPaso(1);
      } else {
        toast.error(resp?.error || "Error al crear empresa");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBlurUsuarioAdmin = async (e) => {
    const valor = e.target.value.trim();
    if (!valor || valor.length < 3) return;
    setVerificandoUsuario(true);
    try {
      const { data } = await saasVerificarUsuario(valor);
      if (!data.disponible) {
        setErrores((prev) => ({
          ...prev,
          nombre_usuario_admin:
            data.error || `El usuario '${valor}' no está disponible`,
        }));
      }
    } catch (_) {
      // ignorar errores de red
    } finally {
      setVerificandoUsuario(false);
    }
  };

  const bdInfo = verificacionBd ? ESTADO_BD[verificacionBd.estado] : null;

  // ─── Stepper ──────────────────────────────────
  const pasos = [
    { n: 1, label: "Datos empresa", icon: <IconBuilding /> },
    { n: 2, label: "Plan y suscripción", icon: <IconSettings /> },
    { n: 3, label: "Admin inicial", icon: <IconUser /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-slate-800 text-white px-6 py-3.5 flex items-center gap-4 shadow-lg">
        <Link
          to="/saas/empresas"
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Volver
        </Link>
        <div className="h-4 w-px bg-slate-600" />
        <span className="font-semibold text-sm tracking-wide">
          Nueva empresa
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-center mb-8">
          {pasos.map((p, i) => (
            <React.Fragment key={p.n}>
              <button
                type="button"
                onClick={() => {
                  if (p.n < paso) setPaso(p.n);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer
                  ${
                    paso === p.n
                      ? "bg-slate-800 text-white shadow-md"
                      : paso > p.n
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-200 text-slate-400"
                  }`}
              >
                <span className="flex-shrink-0">{p.icon}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </button>
              {i < pasos.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 rounded ${paso > p.n ? "bg-emerald-400" : "bg-slate-300"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <form onSubmit={handleSubmit}>
            {/* ═══════ PASO 1: Datos empresa ═══════ */}
            {paso === 1 && (
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <IconBuilding />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Datos de la empresa
                    </h2>
                    <p className="text-xs text-slate-400">
                      Información básica para el registro
                    </p>
                  </div>
                </div>

                <Campo
                  label="Nombre de la empresa"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  error={errores.nombre}
                  placeholder="Ej: Confecciones Maya"
                />

                {/* Código */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Código único
                    <span className="ml-1.5 text-slate-400 font-normal text-xs">
                      (identificador de la empresa)
                    </span>
                  </label>
                  <input
                    name="codigo"
                    value={form.codigo}
                    onChange={handleChange}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-shadow ${
                      errores.codigo
                        ? "border-red-400 ring-1 ring-red-200"
                        : "border-slate-300"
                    }`}
                    placeholder="ej: confecciones_maya"
                  />
                  {errores.codigo && (
                    <p className="text-xs text-red-500 mt-1">
                      {errores.codigo}
                    </p>
                  )}

                  {/* Preview BD */}
                  {dbName && (
                    <div
                      className={`mt-2 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 ${
                        bdInfo
                          ? `${bdInfo.bg} border-transparent`
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className="text-slate-500">BD:</span>
                      <span className="font-mono text-slate-700 font-medium">
                        {dbName}
                      </span>
                      {verificando && (
                        <span className="ml-auto text-slate-400 animate-pulse">
                          verificando…
                        </span>
                      )}
                      {!verificando && bdInfo && (
                        <span className={`ml-auto font-medium ${bdInfo.color}`}>
                          {bdInfo.icon} {bdInfo.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Alerta BD huérfana */}
                  {verificacionBd?.estado === "bd_huerfana" && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-2">
                      <p>
                        <strong>
                          ⚠ La BD{" "}
                          <code className="bg-amber-100 px-1 rounded">
                            {dbName}
                          </code>{" "}
                          existe
                        </strong>{" "}
                        pero no tiene empresa registrada.
                        {verificacionBd.tablas_en_bd > 0 && (
                          <span>
                            {" "}
                            Contiene {verificacionBd.tablas_en_bd} tablas.
                          </span>
                        )}
                      </p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          name="adoptar_bd"
                          checked={form.adoptar_bd}
                          onChange={handleChange}
                          className="rounded"
                        />
                        <span>
                          Adoptar BD existente{" "}
                          <strong>(no se sobreescribirá)</strong>
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <Campo
                  label="Email de contacto"
                  name="email_contacto"
                  type="email"
                  value={form.email_contacto}
                  onChange={handleChange}
                  error={errores.email_contacto}
                  placeholder="contacto@empresa.com"
                />
              </div>
            )}

            {/* ═══════ PASO 2: Plan ═══════ */}
            {paso === 2 && (
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <IconSettings />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Plan y suscripción
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configura el tipo de acceso de la empresa
                    </p>
                  </div>
                </div>

                {/* Período de prueba */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative">
                      <input
                        type="checkbox"
                        name="es_prueba"
                        checked={form.es_prueba}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-5 bg-slate-300 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-5 transition-transform" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-slate-700">
                        Período de prueba
                      </span>
                      <p className="text-xs text-slate-400">
                        Acceso completo sin compromiso
                      </p>
                    </div>
                  </label>
                  {form.es_prueba && (
                    <div className="flex items-center gap-3 pl-[52px]">
                      <label className="text-xs text-slate-500">
                        Duración:
                      </label>
                      <input
                        type="number"
                        name="dias_prueba"
                        value={form.dias_prueba}
                        onChange={handleChange}
                        min="1"
                        max="90"
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-slate-500"
                      />
                      <span className="text-xs text-slate-400">días</span>
                    </div>
                  )}
                </div>

                {/* Planes como cards */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Plan
                    {form.es_prueba && (
                      <span className="ml-2 text-xs text-slate-400 font-normal">
                        (opcional durante la prueba)
                      </span>
                    )}
                  </label>
                  <div className="grid gap-3">
                    {form.es_prueba && (
                      <label
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          !form.id_plan
                            ? "border-slate-800 bg-slate-50 shadow-sm"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="id_plan"
                          value=""
                          checked={!form.id_plan}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            !form.id_plan
                              ? "border-slate-800"
                              : "border-slate-300"
                          }`}
                        >
                          {!form.id_plan && (
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-700">
                            Sin plan asignado
                          </span>
                          <p className="text-xs text-slate-400">
                            Acceso completo durante la prueba
                          </p>
                        </div>
                      </label>
                    )}
                    {planes.map((p) => (
                      <label
                        key={p.id_plan}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          String(form.id_plan) === String(p.id_plan)
                            ? "border-slate-800 bg-slate-50 shadow-sm"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="id_plan"
                          value={p.id_plan}
                          checked={String(form.id_plan) === String(p.id_plan)}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            String(form.id_plan) === String(p.id_plan)
                              ? "border-slate-800"
                              : "border-slate-300"
                          }`}
                        >
                          {String(form.id_plan) === String(p.id_plan) && (
                            <div className="w-2 h-2 rounded-full bg-slate-800" />
                          )}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-slate-800">
                            {p.nombre}
                          </span>
                          <p className="text-xs text-slate-400">
                            ${p.precio_mensual?.toLocaleString("es-CO")} / mes
                            
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errores.id_plan && (
                    <p className="text-xs text-red-500 mt-2">
                      {errores.id_plan}
                    </p>
                  )}
                </div>
              </div>
            )}

            {paso === 3 && (
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    <IconUser />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Administrador inicial
                    </h2>
                    <p className="text-xs text-slate-400">
                      Credenciales del primer usuario de la empresa
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 space-y-1">
                  <p className="font-medium">
                    Este usuario será el administrador principal.
                  </p>
                  <p>
                    Tendrá acceso total al sistema y podrá crear más usuarios
                    desde el panel de gestión.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nombre de usuario
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="nombre_usuario_admin"
                      value={form.nombre_usuario_admin}
                      onChange={handleChange}
                      onBlur={handleBlurUsuarioAdmin}
                      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-shadow ${
                        errores.nombre_usuario_admin
                          ? "border-red-400 ring-1 ring-red-200"
                          : "border-slate-300"
                      }`}
                      placeholder="ej: admin"
                    />
                    {verificandoUsuario && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 animate-pulse">
                        verificando…
                      </span>
                    )}
                  </div>
                  {errores.nombre_usuario_admin && (
                    <p className="text-xs text-red-500 mt-1">
                      {errores.nombre_usuario_admin}
                    </p>
                  )}
                </div>

                {/* PIN con toggle */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    PIN de acceso
                  </label>
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      name="pin_admin"
                      value={form.pin_admin}
                      onChange={handleChange}
                      className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-shadow ${
                        errores.pin_admin
                          ? "border-red-400 ring-1 ring-red-200"
                          : "border-slate-300"
                      }`}
                      placeholder="Mínimo 4 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPin ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                  {errores.pin_admin && (
                    <p className="text-xs text-red-500 mt-1">
                      {errores.pin_admin}
                    </p>
                  )}
                </div>

                {/* Resumen */}
                <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-semibold text-slate-700 text-sm">
                    Resumen
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1.5 text-slate-600">
                    <span className="text-slate-400">Empresa:</span>
                    <span className="font-medium">{form.nombre}</span>
                    <span className="text-slate-400">Código:</span>
                    <span className="font-mono font-medium">{form.codigo}</span>
                    <span className="text-slate-400">Base de datos:</span>
                    <span className="font-mono font-medium">{dbName}</span>
                    <span className="text-slate-400">Email:</span>
                    <span>{form.email_contacto}</span>
                    <span className="text-slate-400">Plan:</span>
                    <span>
                      {form.id_plan
                        ? planes.find(
                            (p) => String(p.id_plan) === String(form.id_plan),
                          )?.nombre
                        : "Sin plan (prueba)"}
                    </span>
                    {form.es_prueba && (
                      <>
                        <span className="text-slate-400">Prueba:</span>
                        <span>{form.dias_prueba} días</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══════ Footer botones ═══════ */}
            <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
              {paso > 1 && (
                <button
                  type="button"
                  onClick={() => setPaso(paso - 1)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ← Anterior
                </button>
              )}
              <div className="flex-1" />
              <Link
                to="/saas/empresas"
                className="px-5 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancelar
              </Link>
              {paso < 3 ? (
                <button
                  type="button"
                  onClick={siguiente}
                  className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={
                    loading ||
                    verificacionBd?.estado === "completa" ||
                    !!errores.nombre_usuario_admin ||
                    verificandoUsuario
                  }
                  className="px-6 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Creando…
                    </span>
                  ) : (
                    "Crear empresa"
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

function Campo({
  label,
  name,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-3.5 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 transition-shadow ${
          error ? "border-red-400 ring-1 ring-red-200" : "border-slate-300"
        }`}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
