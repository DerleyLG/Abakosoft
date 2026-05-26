import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Consolidar ambos interceptores en uno solo
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {}
  return config;
});

// Manejo global de respuestas: detectar 401/403 para limpieza de sesión
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    if (status === 401) {
      try {
        localStorage.removeItem("token");
      } catch (e) {}
    }
    // 403 con suspended: true → suscripción bloqueada mid-session
    if (status === 403 && data?.suspended) {
      window.dispatchEvent(
        new CustomEvent("subscription-blocked", {
          detail: { es_prueba: !!data.es_prueba },
        }),
      );
    }
    // 403 por plan insuficiente (mensaje único del backend)
    if (
      status === 403 &&
      typeof data?.error === "string" &&
      data.error === "NO_PLAN_PERMISSION"
    ) {
      window.dispatchEvent(new CustomEvent("plan-restricted"));
    }
    return Promise.reject(error);
  },
);

export default api;
export { API_BASE_URL };
