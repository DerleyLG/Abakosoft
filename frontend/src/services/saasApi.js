import axios from "axios";

const BASE = import.meta.env.VITE_API_URL;
const SAFE_METHODS = new Set(["get", "head", "options"]);

const getCookieValue = (name) => {
  if (typeof document === "undefined") return null;

  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return cookie
    ? decodeURIComponent(cookie.split("=").slice(1).join("="))
    : null;
};

const saasApi = axios.create({ baseURL: BASE, withCredentials: true });

saasApi.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookieValue("saas_csrf");
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }

  return config;
});

saasApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isLoginRequest = url.includes("/saas/auth/login");
    const isRefreshRequest = url.includes("/saas/auth/refresh");

    if (
      status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !error.config?._retry
    ) {
      try {
        error.config._retry = true;
        await saasApi.post("/saas/auth/refresh");
        return saasApi(error.config);
      } catch (_) {
        // Si refresh falla, limpiar sesión en contexto
      }
    }

    if (!isLoginRequest && (status === 401 || status === 403)) {
      try {
        window.dispatchEvent(new CustomEvent("saas-auth-invalid"));
      } catch (_) {}
    }

    return Promise.reject(error);
  },
);

export const saasLogin = (nombre_usuario, password) =>
  saasApi.post("/saas/auth/login", { nombre_usuario, password });

export const saasSetupStatus = () => saasApi.get("/saas/auth/setup-status");

export const saasSetup = (
  init_token,
  nombre_usuario,
  password,
  confirmar_password,
) =>
  saasApi.post("/saas/auth/setup", {
    init_token,
    nombre_usuario,
    password,
    confirmar_password,
  });

export const saasMe = () => saasApi.get("/saas/auth/me");

export const saasLogout = () => saasApi.post("/saas/auth/logout");

export const saasCambiarPassword = (password_actual, password_nuevo) =>
  saasApi.patch("/saas/auth/cambiar-password", {
    password_actual,
    password_nuevo,
  });

export const saasListarEmpresas = () => saasApi.get("/saas/empresas");

export const saasObtenerEmpresa = (id) => saasApi.get(`/saas/empresas/${id}`);

export const saasCrearEmpresa = (data) => saasApi.post("/saas/empresas", data);

export const saasActualizarEstado = (id, estado) =>
  saasApi.patch(`/saas/empresas/${id}/estado`, { estado });

export const saasEliminarEmpresa = (id) =>
  saasApi.delete(`/saas/empresas/${id}`);

export const saasEditarSuscripcion = (id, data) =>
  saasApi.patch(`/saas/empresas/${id}/suscripcion`, data);

export const saasCambiarCredencialesAdmin = (id, data) =>
  saasApi.patch(`/saas/empresas/${id}/credenciales-admin`, data);

export const saasVerificarBd = (db_name) =>
  saasApi.get("/saas/empresas/verificar-bd", { params: { db_name } });

export const saasVerificarUsuario = (nombre_usuario) =>
  saasApi.get("/saas/usuarios/verificar", { params: { nombre_usuario } });

export const saasListarPlanes = () => saasApi.get("/saas/planes");

export const saasListarLogs = (params = {}) =>
  saasApi.get("/saas/logs", { params });

export default saasApi;
