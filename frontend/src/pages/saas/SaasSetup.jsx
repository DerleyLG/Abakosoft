import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saasSetupStatus, saasSetup } from "../../services/saasApi";
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from "lucide-react";

export default function SaasSetup() {
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState("");
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    saasSetupStatus()
      .then(({ data }) => {
        if (!data.available) navigate("/saas/login", { replace: true });
        else setChecking(false);
      })
      .catch(() => navigate("/saas/login", { replace: true }));
  }, [navigate]);

  const validate = () => {
    if (!token.trim()) return "El token de inicialización es requerido.";
    if (!nombreUsuario.trim()) return "El nombre de usuario es requerido.";
    if (!/^[a-z0-9_]{4,30}$/.test(nombreUsuario.trim().toLowerCase()))
      return "El usuario debe tener 4–30 caracteres (letras, números o guion bajo).";
    if (password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (password !== confirmar) return "Las contraseñas no coinciden.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await saasSetup(
        token.trim(),
        nombreUsuario.trim().toLowerCase(),
        password,
        confirmar,
      );
      navigate("/saas/login", {
        replace: true,
        state: {
          message:
            "Sistema inicializado correctamente. Ya puedes iniciar sesión.",
        },
      });
    } catch (err) {
      setError(err?.response?.data?.error || "Error al crear el SuperAdmin.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-6 h-6 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 mb-3">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            Configuración inicial
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea la cuenta SuperAdmin del panel SaaS
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 font-medium leading-relaxed">
          Ingresa el token de inicialización que aparece en los logs del
          servidor al arrancar.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Token de inicialización
            </label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
              placeholder="a3f8c2d9e1b7…"
              autoComplete="off"
            />
          </div>

          {/* Nombre de usuario */}
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
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              placeholder="superadmin"
              autoComplete="username"
              maxLength={30}
            />
            <p className="text-xs text-slate-400 mt-1">
              Letras minúsculas, números y guion bajo. Mín. 4 caracteres.
            </p>
          </div>

          {/* Contraseña */}
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
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                type={showConfirmar ? "text" : "password"}
                required
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmar((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showConfirmar ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2.5">
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0 text-red-500"
              />
              <p className="text-xs leading-relaxed font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer w-full py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Creando cuenta…" : "Inicializar sistema"}
          </button>
        </form>
      </div>
    </div>
  );
}
