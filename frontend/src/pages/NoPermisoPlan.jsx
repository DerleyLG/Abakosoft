import React from "react";
import { motion } from "framer-motion";
import {
  Lock,
  ArrowLeft,
  Zap,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { WHATSAPP_URL_PLAN as whatsappUrl } from "../constants/contact";

const PRO_FEATURES = [
  "Tesorería y movimientos de caja",
  "Órdenes de fabricación y Kanban",
  "Reportes y análisis avanzados",
  "Cierres de caja y anticipos",
  "Costos indirectos y servicios tercerizados",
  "Ventas a crédito y seguimiento",
];

export default function NoPermisoPlan() {
  const navigate = useNavigate();

  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-950">
      {/* ── Textura de anillos (misma que landing) ──────────────────────── */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {/* Anillos concéntricos — esquina superior-derecha */}
        <div className="absolute inset-0 landing-ring-tr">
          <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full border border-slate-700/60" />
          <div className="absolute -top-28 -right-28 w-[480px] h-[480px] rounded-full border border-slate-700/50" />
          <div className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border border-slate-700/40" />
        </div>
        {/* Anillos concéntricos — esquina inferior-izquierda */}
        <div className="absolute inset-0 landing-ring-bl">
          <div className="absolute -bottom-56 -left-56 w-[750px] h-[750px] rounded-full border border-slate-800/70" />
          <div className="absolute -bottom-36 -left-36 w-[500px] h-[500px] rounded-full border border-slate-800/60" />
          <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full border border-slate-800/50" />
        </div>
        {/* Anillo central */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-slate-800/30" />
        {/* Grilla de puntos */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg px-4 py-10">
        {/* Botón volver */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          onClick={() => navigate(-1)}
          className="cursor-pointer flex items-center gap-2 text-slate-400 hover:text-slate-100 mb-8 text-sm font-medium transition-colors group"
        >
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-1 transition-transform"
          />
          Volver
        </motion.button>

        {/* Tarjeta principal */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 shadow-2xl shadow-slate-950/60"
        >
          {/* Ícono de candado animado */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 18,
              delay: 0.18,
            }}
            className="flex justify-center mb-6"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg">
                <Lock size={34} className="text-slate-300" />
              </div>
              <motion.div
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.8,
                  ease: "easeInOut",
                }}
                className="absolute w-20 h-20 rounded-full border border-slate-600/50"
              />
              <motion.div
                animate={{ scale: [1, 1.7, 1], opacity: [0.2, 0, 0.2] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.8,
                  ease: "easeInOut",
                  delay: 0.55,
                }}
                className="absolute w-20 h-20 rounded-full border border-slate-700/40"
              />
            </div>
          </motion.div>

          {/* Texto principal */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-white mb-3">
              Módulo no disponible
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Tu plan actual no incluye acceso a este módulo. Actualiza a{" "}
              <span className="text-slate-200 font-semibold">Plan Pro</span>{" "}
              para desbloquear todas las funcionalidades.
            </p>
          </motion.div>

          {/* Divisor */}
          <div className="border-t border-slate-800 mb-6" />

          {/* Features del plan Pro */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-yellow-400" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Incluido en Plan Pro
              </span>
            </div>
            <ul className="space-y-2.5">
              {PRO_FEATURES.map((feature, i) => (
                <motion.li
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="flex items-center gap-3 text-sm text-slate-300"
                >
                  <CheckCircle2 size={15} className="text-slate-500 shrink-0" />
                  {feature}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <motion.a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2.5 w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors shadow-lg"
          >
            <MessageCircle size={17} />
            Consultar actualización por WhatsApp
          </motion.a>
        </motion.div>

        {/* Nota al pie */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-center text-slate-600 text-xs mt-5"
        >
          ¿Crees que esto es un error?{" "}
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-slate-300 underline transition-colors cursor-pointer"
          >
            Regresa a la página anterior
          </button>
        </motion.p>
      </div>
    </div>
  );
}
