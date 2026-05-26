import React from "react";
import { usePlan } from "../hooks/usePlanApi";

/**
 * PlanGuard — bloquea el acceso a una ruta si el plan no lo permite.
 * feature: "reportes" | "kanban" | "progreso"
 */
export default function PlanGuard({ feature, children }) {
  const { puedeAcceder, plan } = usePlan();

  if (puedeAcceder(feature)) return children;

  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-slate-700 mb-1">
        Función no disponible
      </h2>
      <p className="text-sm text-slate-500 max-w-xs">
        Esta sección no está incluida en el plan <strong>{plan}</strong>.
        Actualiza al plan Pro para acceder.
      </p>
    </div>
  );
}
