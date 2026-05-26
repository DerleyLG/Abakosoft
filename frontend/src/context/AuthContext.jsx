import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../services/api";
import toast from "react-hot-toast";

export const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

// Días restantes desde hoy hasta fecha_fin
const diasRestantesTrialFn = (fecha_fin) => {
  if (!fecha_fin) return null;
  const fin = new Date(fecha_fin);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fin.setHours(0, 0, 0, 0);
  return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const mostrarAlertaTrial = (dias, empresaNombre) => {
  if (dias === null || dias > 7) return;
  const urgente = dias <= 2;
  const icono = urgente ? "🔥" : "⏳";
  const color = urgente ? "#ef4444" : "#f59e0b";
  const msg =
    dias <= 0
      ? "¡Tu período de prueba venció hoy!"
      : dias === 1
        ? "¡Queda solo 1 día de prueba!"
        : `Quedan ${dias} días de prueba`;

  toast(
    (t) => (
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "22px", lineHeight: 1 }}>{icono}</span>
        <div>
          <p
            style={{
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
              fontSize: "14px",
            }}
          >
            {msg}
          </p>
          <p style={{ color: "#64748b", margin: "3px 0 0", fontSize: "12px" }}>
            Contáctanos antes de que expire para no perder el acceso.
          </p>
        </div>
      </div>
    ),
    {
      duration: urgente ? 8000 : 6000,
      style: {
        borderLeft: `4px solid ${color}`,
        padding: "12px 16px",
        maxWidth: "380px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
      },
    },
  );
};

const mostrarAlertaGracia = () => {
  toast(
    () => (
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <span style={{ fontSize: "22px", lineHeight: 1 }}>⚠️</span>
        <div>
          <p
            style={{
              fontWeight: 700,
              color: "#1e293b",
              margin: 0,
              fontSize: "14px",
            }}
          >
            Suscripción en período de gracia
          </p>
          <p style={{ color: "#64748b", margin: "3px 0 0", fontSize: "12px" }}>
            Tu plan venció. Tienes 3 días para renovar antes de que se suspenda
            el acceso.
          </p>
        </div>
      </div>
    ),
    {
      duration: 10000,
      style: {
        borderLeft: "4px solid #f97316",
        padding: "12px 16px",
        maxWidth: "400px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
      },
    },
  );
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // { es_prueba: bool } cuando la suscripción está bloqueada mid-session
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await api.get("/auth/me");
          const userData = response.data;
          setUser(userData);
          const esSaas = window.location.pathname.startsWith("/saas");
          if (!esSaas && userData.estado_suscripcion === "gracia") {
            mostrarAlertaGracia();
          }
        } catch (error) {
          console.error("Error al verificar el token:", error);
          localStorage.removeItem("token");
          setUser(null);
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  // Escuchar evento de suscripción bloqueada mid-session (desde api.js)
  useEffect(() => {
    const handler = (e) => {
      localStorage.removeItem("token");
      setUser(null);
      setSubscriptionBlocked({ es_prueba: e.detail?.es_prueba ?? false });
    };
    window.addEventListener("subscription-blocked", handler);
    return () => window.removeEventListener("subscription-blocked", handler);
  }, []);

  // Polling cada 60 s para detectar suspensión en tiempo real mientras la sesión está activa
  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      // No hacer polling si el usuario está navegando el panel SaaS
      if (window.location.pathname.startsWith("/saas")) return;
      try {
        await api.get("/auth/me");
      } catch (_) {
        // api.js interceptor maneja 403+suspended disparando "subscription-blocked"
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [user]);

  const login = async (nombre_usuario, pin) => {
    try {
      const response = await api.post("/auth/login", {
        nombre_usuario,
        pin,
      });

      const { token } = response.data;
      localStorage.setItem("token", token);

      const userResponse = await api.get("/auth/me");
      const userData = userResponse.data;
      setUser(userData);
      setSubscriptionBlocked(null); // limpiar bloqueo previo en caso de reactivación

      // Mostrar alerta si es trial próximo a vencer
      if (userData.es_prueba || userData.estado_suscripcion === "prueba") {
        const dias = diasRestantesTrialFn(userData.fecha_fin);
        mostrarAlertaTrial(dias, userData.empresa_nombre);
      }

      // Mostrar alerta si está en período de gracia
      if (userData.estado_suscripcion === "gracia") {
        mostrarAlertaGracia();
      }

      return { success: true };
    } catch (error) {
      const data = error?.response?.data;
      const status = error?.response?.status;
      if (status === 403 && data?.suspended) {
        return {
          success: false,
          suspended: true,
          es_prueba: data.es_prueba,
          error: data.error,
          empresa_nombre: data.empresa_nombre,
        };
      }
      // 429: cuenta bloqueada (lockout de BD) o rate limit por IP
      if (status === 429) {
        return { success: false, locked: true, error: data?.error };
      }
      // 401: credenciales incorrectas — puede incluir intentos restantes
      return { success: false, error: data?.error || null };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setSubscriptionBlocked(null);
    toast.success("Sesión cerrada.");
  };

  const value = {
    user,
    loading,
    login,
    logout,
    subscriptionBlocked,
    clearSubscriptionBlocked: () => setSubscriptionBlocked(null),
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
