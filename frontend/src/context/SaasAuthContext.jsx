import React, { createContext, useContext, useState, useEffect } from "react";
import { saasLogin, saasLogout, saasMe } from "../services/saasApi";

const SaasAuthContext = createContext(null);

export const useSaasAuth = () => useContext(SaasAuthContext);

export const SaasAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [primerLogin, setPrimerLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = () => {
    setAdmin(null);
    setPrimerLogin(false);
  };

  useEffect(() => {
    const hasSaasSession = document.cookie
      .split("; ")
      .some((c) => c.startsWith("saas_csrf="));

    if (!hasSaasSession) {
      setLoading(false);
      return;
    }

    const checkSession = async () => {
      try {
        const { data } = await saasMe();
        setAdmin(data?.admin || null);
        setPrimerLogin(!!data?.primer_login);
      } catch (_) {
        setAdmin(null);
        setPrimerLogin(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  useEffect(() => {
    const handler = () => {
      clearSession();
    };

    window.addEventListener("saas-auth-invalid", handler);
    return () => window.removeEventListener("saas-auth-invalid", handler);
  }, []);

  const login = async (nombre_usuario, password) => {
    const { data } = await saasLogin(nombre_usuario, password);
    const adminData = data?.admin || null;
    if (!adminData?.id_admin || !adminData?.nombre_usuario) {
      throw new Error("Respuesta de autenticación inválida");
    }
    setAdmin(adminData);
    setPrimerLogin(!!data.primer_login);
    return { primerLogin: !!data.primer_login };
  };

  const logout = async () => {
    try {
      await saasLogout();
    } catch (_) {
      // Si falla el endpoint, igual se limpia el estado local
    }
    clearSession();
  };

  const onPasswordChanged = () => clearSession();

  return (
    <SaasAuthContext.Provider
      value={{ admin, primerLogin, loading, login, logout, onPasswordChanged }}
    >
      {children}
    </SaasAuthContext.Provider>
  );
};
