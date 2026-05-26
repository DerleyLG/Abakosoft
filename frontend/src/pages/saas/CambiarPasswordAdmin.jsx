import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSaasAuth } from "../../context/SaasAuthContext";
import { saasCambiarPassword } from "../../services/saasApi";
import toast from "react-hot-toast";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";

export default function CambiarPasswordAdmin() {
  const { onPasswordChanged } = useSaasAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forced = !!location.state?.forced;
  const currentPasswordFromState =
    location.state?.currentPassword ||
    sessionStorage.getItem("saas_pending_password") ||
    "";
  const [form, setForm] = useState({
    password_actual: currentPasswordFromState,
    password_nuevo: "",
    password_confirmar: "",
  });
  const [loading, setLoading] = useState(false);
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState("");
  const [showPasswords, setShowPasswords] = useState({
    actual: false,
    nuevo: false,
    confirmar: false,
  });

  useEffect(() => {
    if (forced && currentPasswordFromState) {
      setForm((prev) => ({
        ...prev,
        password_actual: currentPasswordFromState,
      }));
    }
  }, [currentPasswordFromState, forced]);

  const passwordStrengthRegex =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

  const getPasswordStrength = (password) => {
    if (!password) {
      return {
        label: "Sin contraseña",
        percent: 0,
        tone: "bg-slate-200",
        textTone: "text-slate-500",
      };
    }

    const checks = [
      password.length >= 8,
      /[A-Za-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z\d]/.test(password),
    ];
    const score = checks.filter(Boolean).length;

    if (score <= 1) {
      return {
        label: "Muy débil",
        percent: 25,
        tone: "bg-red-500",
        textTone: "text-red-600",
      };
    }
    if (score === 2) {
      return {
        label: "Débil",
        percent: 50,
        tone: "bg-amber-500",
        textTone: "text-amber-600",
      };
    }
    if (score === 3) {
      return {
        label: "Media",
        percent: 75,
        tone: "bg-blue-500",
        textTone: "text-blue-600",
      };
    }
    return {
      label: "Fuerte",
      percent: 100,
      tone: "bg-emerald-500",
      textTone: "text-emerald-600",
    };
  };

  const passwordStrength = getPasswordStrength(form.password_nuevo);

  const validar = () => {
    const e = {};
    if (!forced && !form.password_actual) e.password_actual = "Requerida";
    if (!form.password_nuevo) {
      e.password_nuevo = "Escribe una nueva contraseña";
    } else if (form.password_nuevo.length < 8) {
      e.password_nuevo = "Debe tener al menos 8 caracteres";
    } else if (!/[A-Za-z]/.test(form.password_nuevo)) {
      e.password_nuevo = "Debe incluir al menos una letra";
    } else if (!/\d/.test(form.password_nuevo)) {
      e.password_nuevo = "Debe incluir al menos un número";
    } else if (!/[^A-Za-z\d]/.test(form.password_nuevo)) {
      e.password_nuevo = "Debe incluir al menos un símbolo especial";
    } else if (!passwordStrengthRegex.test(form.password_nuevo)) {
      e.password_nuevo = "La contraseña no cumple con las recomendaciones";
    }
    if (!form.password_confirmar) {
      e.password_confirmar = "Confirma la nueva contraseña";
    } else if (form.password_nuevo !== form.password_confirmar) {
      e.password_confirmar = "Las contraseñas no coinciden";
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrores((prev) => ({ ...prev, [e.target.name]: undefined }));
    setAviso("");
  };

  const toggleVisibility = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const isPasswordPolicyMet =
    !!form.password_nuevo &&
    passwordStrength.percent === 100 &&
    form.password_nuevo === form.password_confirmar &&
    (forced || !!form.password_actual);

  const handleSubmitBlocked = (e) => {
    e.preventDefault();
    if (
      form.password_nuevo &&
      form.password_confirmar &&
      form.password_nuevo !== form.password_confirmar
    ) {
      setAviso("Las contraseñas no coinciden.");
      return;
    }

    setAviso("La contraseña no cumple con las recomendaciones.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setLoading(true);
    try {
      const { data } = await saasCambiarPassword(
        form.password_actual,
        form.password_nuevo,
      );
      onPasswordChanged();
      sessionStorage.removeItem("saas_pending_password");
      toast.success(data?.mensaje || "Contraseña actualizada correctamente");
      navigate("/saas/login", {
        replace: true,
        state: {
          message:
            data?.mensaje ||
            "Tu contraseña fue actualizada. Inicia sesión nuevamente.",
        },
      });
    } catch (err) {
      const msg = err?.response?.data?.error || "Error al cambiar contraseña";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-500 mb-3">
            <LockKeyhole className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">
            {forced ? "Crear contraseña" : "Cambiar contraseña"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {forced
              ? "Es tu primer ingreso. Define una contraseña segura sin volver a escribir la anterior."
              : "Debes confirmar tu contraseña actual antes de cambiarla."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!forced && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña actual
              </label>
              <div className="relative">
                <input
                  type={showPasswords.actual ? "text" : "password"}
                  name="password_actual"
                  value={form.password_actual}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 ${
                    errores.password_actual
                      ? "border-red-400"
                      : "border-slate-300"
                  }`}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => toggleVisibility("actual")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={
                    showPasswords.actual
                      ? "Ocultar contraseña actual"
                      : "Mostrar contraseña actual"
                  }
                >
                  {showPasswords.actual ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              {errores.password_actual && (
                <p className="text-xs text-red-500 mt-1">
                  {errores.password_actual}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.nuevo ? "text" : "password"}
                name="password_nuevo"
                value={form.password_nuevo}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 ${
                  errores.password_nuevo ? "border-red-400" : "border-slate-300"
                }`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("nuevo")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={
                  showPasswords.nuevo
                    ? "Ocultar nueva contraseña"
                    : "Mostrar nueva contraseña"
                }
              >
                {showPasswords.nuevo ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${passwordStrength.tone}`}
                  style={{ width: `${passwordStrength.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={passwordStrength.textTone}>
                  Fortaleza: {passwordStrength.label}
                </span>
                <span className="text-slate-400">
                  {passwordStrength.percent}%
                </span>
              </div>
            </div>
            {errores.password_nuevo ? (
              <p className="text-xs text-red-500 mt-1">
                {errores.password_nuevo}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Usa mínimo 8 caracteres, letra, número y símbolo especial.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirmar ? "text" : "password"}
                name="password_confirmar"
                value={form.password_confirmar}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-600 ${
                  errores.password_confirmar
                    ? "border-red-400"
                    : "border-slate-300"
                }`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("confirmar")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                aria-label={
                  showPasswords.confirmar
                    ? "Ocultar confirmación"
                    : "Mostrar confirmación"
                }
              >
                {showPasswords.confirmar ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
            {errores.password_confirmar && (
              <p className="text-xs text-red-500 mt-1">
                {errores.password_confirmar}
              </p>
            )}
          </div>

          {aviso && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              {aviso}
            </div>
          )}

          <button
            type="submit"
            onClick={!isPasswordPolicyMet ? handleSubmitBlocked : undefined}
            disabled={loading}
            className={`w-full py-2 bg-amber-500 text-white rounded-lg font-medium transition-colors ${
              loading || !isPasswordPolicyMet
                ? "opacity-50 cursor-not-allowed"
                : "cursor-pointer hover:bg-amber-600"
            }`}
          >
            {loading
              ? "Guardando..."
              : forced
                ? "Crear contraseña"
                : "Actualizar contraseña"}
          </button>
          {!isPasswordPolicyMet && (
            <p className="text-xs text-slate-500 text-center">
              Completa la política de seguridad para continuar.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
