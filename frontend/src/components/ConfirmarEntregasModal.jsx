import React from "react";
import { FiX, FiTruck, FiCheckCircle } from "react-icons/fi";
import useModalTransition from "../hooks/useModalTransition";

/**
 * Modal de confirmación para marcar órdenes de fabricación como entregadas.
 * Sigue el estilo de la plataforma (header oscuro, animaciones de index.css).
 */
const ConfirmarEntregasModal = ({
  isOpen,
  onClose,
  ids = [],
  onConfirm,
  cargando = false,
}) => {
  const { mostrar, cerrando, cerrar } = useModalTransition(isOpen, onClose);
  const esMultiple = ids.length > 1;

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 ${
          cerrando ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        }`}
        onClick={cerrar}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden ${
          cerrando ? "animate-modal-card-out" : "animate-modal-card-in"
        }`}
      >
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <FiTruck className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {esMultiple
                    ? `Marcar ${ids.length} órdenes como entregadas`
                    : "Marcar como entregada"}
                </h3>
                <p className="text-slate-300 text-sm">
                  Confirmación de entrega
                </p>
              </div>
            </div>
            <button
              onClick={cerrar}
              disabled={cargando}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            >
              <FiX className="text-slate-300 hover:text-white" size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            {esMultiple ? (
              <>
                Las órdenes{" "}
                <span className="font-semibold text-slate-800">
                  {ids.map((id) => `#${id}`).join(", ")}
                </span>{" "}
                serán marcadas como entregadas.
              </>
            ) : (
              <>
                La orden{" "}
                <span className="font-semibold text-slate-800">#{ids[0]}</span>{" "}
                será marcada como entregada.
              </>
            )}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Esto las moverá al historial de órdenes entregadas.
          </p>

          {/* Lista de órdenes (solo si son varias) */}
          {esMultiple && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
              {ids.map((id) => (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <FiCheckCircle size={14} className="text-emerald-500" />
                  <span className="font-mono text-xs text-slate-600">
                    OF #{id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={cerrar}
            disabled={cargando}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={cargando}
            className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {cargando
              ? "Marcando..."
              : esMultiple
                ? "Sí, marcar como entregadas"
                : "Sí, marcar como entregada"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEntregasModal;
