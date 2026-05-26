import React from "react";
import { Clock, ShieldOff, MessageCircle, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { WHATSAPP_URL } from "../constants/contact";

export default function SuscripcionSuspendida({ es_prueba }) {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md text-center">
        {/* Ícono */}
        <div className="mx-auto mb-6 w-20 h-20 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          {es_prueba ? (
            <Clock size={36} className="text-amber-500" />
          ) : (
            <ShieldOff size={36} className="text-red-500" />
          )}
        </div>

        {/* Texto principal */}
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          {es_prueba
            ? "Tu período de prueba ha finalizado"
            : "Acceso suspendido"}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          {es_prueba
            ? "Tu prueba gratuita ha llegado a su fin. Para seguir disfrutando de todas las funcionalidades de AbakoSoft, contáctanos y activa tu plan."
            : "El acceso a tu empresa ha sido suspendido. Si crees que esto es un error o deseas reactivar tu suscripción, contáctanos."}
        </p>

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors shadow-sm"
          >
            <MessageCircle size={15} />
            Contactar soporte
          </a>
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>

        {/* Footer */}
        <p className="mt-10 text-xs text-slate-400">© 2026 AbakoSoft</p>
      </div>
    </div>
  );
}
