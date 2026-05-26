import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSaasAuth } from "../../context/SaasAuthContext";
import { saasSetupStatus } from "../../services/saasApi";
import toast from "react-hot-toast";
import { AlertTriangle, Ban, ChevronLeft, Eye, EyeOff } from "lucide-react";

export default function SaasLogin() {
  const { login } = useSaasAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState(null); // { type: "invalid" | "locked", message: string }
  const [infoMessage, setInfoMessage] = useState(
    location.state?.message || null,
  );

  useEffect(() => {
    saasSetupStatus()
      .then(({ data }) => {
        if (data.available) navigate("/saas/setup", { replace: true });
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    if (!location.state?.message) return;

    setInfoMessage(location.state.message);
    const timer = window.setTimeout(() => {
      navigate(location.pathname, { replace: true, state: null });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const { primerLogin } = await login(
        nombreUsuario.trim().toLowerCase(),
        password,
      );
      if (primerLogin) {
        sessionStorage.setItem("saas_pending_password", password);
        navigate("/saas/cambiar-password", {
          state: {
            forced: true,
            currentPassword: password,
          },
        });
      } else {
        navigate("/saas/empresas");
      }
    } catch (err) {
      const status = err?.response?.status;
      const locked = !!err?.response?.data?.locked;
      const msg = err?.response?.data?.error || "Credenciales incorrectas";
      setFormError({
        type: status === 429 || locked ? "locked" : "invalid",
        message: msg,
      });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Logo / titulo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-800 mb-3">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">Panel SaaS</h1>
          <p className="text-sm text-slate-500 mt-1">
            Abakosoft — Administración
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {infoMessage && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-800">
              {infoMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre de usuario
            </label>
            <input
              type="text"
              required
              value={nombreUsuario}
              onChange={(e) =>
                setNombreUsuario(
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                )
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 text-sm"
              placeholder="superadmin"
              autoComplete="username"
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {formError && (
            <div
              className={`rounded-lg border p-3 flex items-start gap-2.5 ${
                formError.type === "locked"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {formError.type === "locked" ? (
                <Ban size={15} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              )}
              <p className="text-xs leading-relaxed font-medium">
                {formError.message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          <div className="text-center pt-1">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors group"
            >
              <ChevronLeft
                size={13}
                className="group-hover:-translate-x-0.5 transition-transform cursor-pointer"
              />
              Volver al inicio
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
