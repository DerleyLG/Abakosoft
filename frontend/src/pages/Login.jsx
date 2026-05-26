import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Eye,
  EyeOff,
  User,
  Lock,
  ArrowRight,
  Clock,
  ShieldOff,
  MessageCircle,
  AlertTriangle,
  Ban,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { WHATSAPP_URL } from "../constants/contact";

// ── Feature list shown on the brand panel ────────────────
const FEATURES = [
  "Gestión de órdenes de venta y pedidos",
  "Control de producción y fabricación",
  "Inventario y trazabilidad en tiempo real",
  "Reportes y análisis financiero",
];

// ── Brand mark: favicon ──────────────────────────────────
const BrandMark = () => (
  <img
    src="/logo.png"
    alt="AbakoSoft"
    width={50}
    height={50}
    className="rounded-xl"
    draggable={false}
  />
);

// ── Component ─────────────────────────────────────────────
const Login = () => {
  const [nombre_usuario, setNombreUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [eyePop, setEyePop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [suspended, setSuspended] = useState(null); // { es_prueba, error, empresa_nombre }
  const [loginError, setLoginError] = useState(null); // { locked: bool, error: string }

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleEyeToggle = () => {
    setShowPin((v) => !v);
    setEyePop(true);
    setTimeout(() => setEyePop(false), 380);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setSuspended(null);
    setLoginError(null);
    setLoading(true);

    const result = await login(nombre_usuario, pin);

    if (result.success) {
      toast.success("¡Bienvenido!");
      navigate("/dashboard");
    } else if (result.suspended) {
      setSuspended(result);
    } else if (result.locked) {
      setLoginError({ locked: true, error: result.error });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } else {
      setLoginError({ locked: false, error: result.error });
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Brand panel (desktop) ──────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 bg-slate-950 px-14 py-12 login-panel-left relative overflow-hidden select-none">
        {/* Decorative rings — no gradients, just outlines */}
        <div className="absolute -top-32 -right-32 w-[440px] h-[440px] rounded-full border border-slate-800 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full border border-slate-800 pointer-events-none" />
        <div className="absolute top-1/2 -right-20 w-56 h-56 rounded-full border border-slate-800/60 pointer-events-none -translate-y-1/2" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <BrandMark />
          <span className="text-white font-bold text-lg tracking-[0.22em]">
            ABAKOSOFT
          </span>
        </div>

        {/* Tagline + features */}
        <div className="z-10 space-y-5">
          <h1 className="text-[2.6rem] font-bold text-white leading-[1.15] tracking-tight">
            Gestión inteligente
            <br />
            para tu negocio.
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-[300px]">
            Centraliza operaciones, controla producción y toma decisiones con
            datos en tiempo real.
          </p>
          <ul className="mt-4 space-y-3.5">
            {FEATURES.map((feat, i) => (
              <li
                key={feat}
                className="flex items-center gap-3 text-slate-300 text-sm login-feature"
                style={{ animationDelay: `${0.4 + i * 0.1}s` }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                {feat}
              </li>
            ))}
          </ul>
        </div>

        {/* Copyright */}
        <p className="text-slate-700 text-xs z-10">
          © 2026 AbakoSoft · Todos los derechos reservados
        </p>
      </aside>

      {/* ── Form panel ────────────────────────────────── */}
      <main className="flex-1 flex flex-col justify-center items-center bg-slate-50 px-6 sm:px-14 login-panel-right">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <BrandMark />
          <span className="text-slate-900 font-bold text-lg tracking-[0.22em]">
            ABAKOSOFT
          </span>
        </div>

        <div className={`w-full max-w-sm ${shake ? "login-shake" : ""}`}>
          {/* Heading */}
          <div className="mb-8 login-form-heading">
            <h2 className="text-[1.6rem] font-bold text-slate-900 tracking-tight">
              Bienvenido de nuevo
            </h2>
            <p className="text-slate-500 text-sm mt-1.5">
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* ── Suscripción suspendida ── */}
            {suspended && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex gap-3 items-start animate-fade-in">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  {suspended.es_prueba ? (
                    <Clock size={16} className="text-red-600" />
                  ) : (
                    <ShieldOff size={16} className="text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">
                    {suspended.es_prueba
                      ? "Período de prueba finalizado"
                      : "Acceso suspendido"}
                  </p>
                  <p className="text-xs text-red-600 mt-0.5 leading-relaxed">
                    {suspended.error}
                  </p>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-700 underline underline-offset-2 hover:text-red-900 transition-colors"
                  >
                    <MessageCircle size={12} />
                    Contactar soporte
                  </a>
                </div>
              </div>
            )}

            {/* ── Error de credenciales / lockout ── */}
            {loginError && (
              <div
                className={`rounded-xl border p-4 flex gap-3 items-start ${loginError.locked ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50"}`}
              >
                <div
                  className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${loginError.locked ? "bg-amber-100" : "bg-red-100"}`}
                >
                  {loginError.locked ? (
                    <Ban size={16} className="text-amber-600" />
                  ) : (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                </div>
                <p
                  className={`text-xs leading-relaxed mt-1.5 font-medium ${loginError.locked ? "text-amber-800" : "text-red-700"}`}
                >
                  {loginError.error ||
                    "Credenciales incorrectas. Inténtalo de nuevo."}
                </p>
              </div>
            )}

            {/* ── Usuario ── */}
            <div className="login-field" style={{ animationDelay: "0.15s" }}>
              <label
                htmlFor="login-usuario"
                className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <User
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="login-usuario"
                  type="text"
                  value={nombre_usuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  autoComplete="username"
                  required
                  className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* ── PIN ── */}
            <div className="login-field" style={{ animationDelay: "0.25s" }}>
              <label
                htmlFor="login-pin"
                className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5"
              >
                PIN
              </label>
              <div className="relative">
                <Lock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  id="login-pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  required
                  className="w-full pl-10 pr-12 py-3 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={handleEyeToggle}
                  tabIndex={-1}
                  aria-label={showPin ? "Ocultar PIN" : "Mostrar PIN"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700 transition-colors duration-200 cursor-pointer"
                >
                  <span
                    className={`inline-flex ${eyePop ? "login-eye-pop" : ""}`}
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </span>
                </button>
              </div>
            </div>

            {/* ── Submit ── */}
            <div
              className="login-field pt-1"
              style={{ animationDelay: "0.35s" }}
            >
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
              >
                {loading ? (
                  <span className="login-spinner" />
                ) : (
                  <>
                    Ingresar
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1 transition-transform duration-200"
                    />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Back to landing */}
          <div className="mt-6 text-center">
            <a
              href="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors group"
            >
              <ChevronLeft
                size={13}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Volver al inicio
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
