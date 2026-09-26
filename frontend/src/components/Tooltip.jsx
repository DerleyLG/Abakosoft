import { useState, useRef, useCallback } from "react";

/**
 * Tooltip flotante con el diseño estándar de la plataforma
 * (bg-slate-900, texto blanco, rounded-xl, sombra). Reemplaza el
 * `title` nativo del navegador para mantener consistencia visual.
 *
 * Uso:
 *   <Tooltip text="Editar">
 *     <button ...>...</button>
 *   </Tooltip>
 */
const Tooltip = ({ text, children, disabled = false }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [flip, setFlip] = useState(false);
  const wrapRef = useRef(null);

  const show = useCallback(
    (e) => {
      if (!text || disabled) return;
      const rect = wrapRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : e.clientX;
      const y = rect ? rect.top : e.clientY;
      setCoords({ x, y });
      // Si no hay espacio debajo del elemento, mostrar el tooltip arriba
      setFlip((rect ? rect.bottom : e.clientY) > window.innerHeight - 80);
      setVisible(true);
    },
    [text, disabled],
  );

  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      ref={wrapRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className="fixed z-[9999] pointer-events-none max-w-sm bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl whitespace-pre-wrap break-words leading-relaxed"
          style={{
            left: coords.x,
            top: flip ? coords.y - 8 : coords.y + 32,
            transform: "translateX(-50%)",
          }}
        >
          {text}
        </div>
      )}
    </span>
  );
};

export default Tooltip;
