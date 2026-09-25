import { useState, useEffect, useCallback } from "react";

/**
 * Controla la animación de apertura/cierre de un modal.
 * - `mostrar`: si el modal debe estar montado (true durante entrada y salida).
 * - `cerrando`: true durante la animación de salida.
 * - `cerrar`: dispara el cierre (llama a onClose).
 */
const useModalTransition = (isOpen, onClose, duration = 200) => {
  const [mostrar, setMostrar] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMostrar(true);
      setCerrando(false);
    } else if (mostrar) {
      setCerrando(true);
      const t = setTimeout(() => {
        setMostrar(false);
        setCerrando(false);
      }, duration);
      return () => clearTimeout(t);
    }
  }, [isOpen, mostrar, duration]);

  const cerrar = useCallback(() => {
    if (cerrando) return;
    onClose();
  }, [cerrando, onClose]);

  return { mostrar, cerrando, cerrar };
};

export default useModalTransition;
