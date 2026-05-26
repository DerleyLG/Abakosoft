import React from "react";
import LandingNavbar from "../components/LandingNavbar";
import { motion } from "framer-motion";
import { whatsappLink } from "../constants/contact";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MessageCircle,
  Zap,
  ShieldCheck,
  BarChart3,
  ShoppingCart,
  Truck,
  Warehouse,
  LayoutDashboard,
  Users,
  Factory,
  Wallet,
  Settings,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useState } from "react";

// ─── Módulos por plan ────────────────────────────────────────────────────────
const MODULES = [
  { icon: LayoutDashboard, label: "Dashboard", basic: true, pro: true },
  { icon: ShoppingCart, label: "Ventas ", basic: true, pro: true },
  { icon: Truck, label: "Compras y Proveedores", basic: true, pro: true },
  { icon: Warehouse, label: "Inventario", basic: true, pro: true },
  { icon: BarChart3, label: "Reportes", basic: true, pro: true },
  { icon: Users, label: "Clientes", basic: true, pro: true },
  {
    icon: Factory,
    label: "Producción, Fabricación y pedidos",
    basic: false,
    pro: true,
  },
  { icon: Layers, label: "Kanban de producción", basic: false, pro: true },
  { icon: Wallet, label: "Tesorería y Finanzas", basic: false, pro: true },
  { icon: Users, label: "Talento Humano y Pagos", basic: false, pro: true },
  { icon: Settings, label: "Gestión de Roles", basic: false, pro: true },
  { icon: ShieldCheck, label: "Permisos granulares", basic: false, pro: true },
];

// ─── Animación ───────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

// ─── Componente ──────────────────────────────────────────────────────────────
const Planes = () => {
  const [isOpen, setIsOpen] = useState(false);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // Genera el enlace de WhatsApp con mensaje personalizado
  function makeWaUrl(plan) {
    return whatsappLink(
      `Hola! Estoy interesado en el plan ${plan} de Abakosoft. ¿Podemos hablar?`,
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden font-sans antialiased">
      {/* ── Fondo decorativo (misma identidad que landing) ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Anillos top-right */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full border border-slate-800/70" />
        <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full border border-slate-800/60" />
        <div className="absolute -top-8  -right-8  w-[220px] h-[220px] rounded-full border border-slate-800/50" />
        {/* Anillos bottom-left */}
        <div className="absolute -bottom-48 -left-48 w-[650px] h-[650px] rounded-full border border-slate-800/60" />
        <div className="absolute -bottom-28 -left-28 w-[420px] h-[420px] rounded-full border border-slate-800/50" />

        {/* Puntos */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #fff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
      </div>

      {/* ── Contenido ──────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        ></motion.div>

        {/* Encabezado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-5">
            <Zap className="w-3.5 h-3.5" />
            Planes y precios
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            El plan perfecto para
            <br className="hidden sm:block" /> tu operación
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
            Empieza con lo esencial o accede a todo el poder de Abakosoft. Sin
            permanencia mínima, sin sorpresas.
          </p>
        </motion.div>

        {/* ── Tarjetas ── */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid md:grid-cols-2 gap-6 items-start"
        >
          {/* ── BÁSICO ── */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-8 flex flex-col h-full"
          >
            {/* Badge */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                Plan Básico
              </span>
              <span className="text-xs font-semibold bg-slate-800 text-slate-300 px-3 py-1 rounded-full border border-slate-700">
                Esencial
              </span>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Para empresas que necesitan gestionar ventas, compras, inventario
              y reportes de forma ordenada y centralizada.
            </p>

            {/* Módulos */}
            <div className="space-y-3 mb-10 flex-1">
              {MODULES.map(({ icon: Icon, label, basic }) => (
                <div key={label} className="flex items-center gap-3">
                  {basic ? (
                    <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-700 shrink-0" />
                  )}
                  <div
                    className={`flex items-center gap-2 text-sm ${basic ? "text-slate-300" : "text-slate-600"}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <a
              href={makeWaUrl("Básico")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 group"
            >
              <MessageCircle className="w-4 h-4" />
              Estoy interesado
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
          </motion.div>

          {/* ── PRO ── */}
          <motion.div
            variants={fadeUp}
            className="relative rounded-2xl border border-indigo-500/40 bg-slate-900/80 backdrop-blur-sm p-8 flex flex-col h-full shadow-[0_0_60px_-15px_rgba(99,102,241,0.25)]"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                Plan Pro
              </span>
              <span className="text-xs font-semibold bg-indigo-600/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                Acceso completo
              </span>
            </div>

            <p className="text-slate-300 text-sm leading-relaxed mb-8">
              Acceso ilimitado a todos los módulos del sistema. Producción,
              finanzas, talento humano, roles y mucho más. Sin restricciones.
            </p>

            {/* Módulos */}
            <div className="space-y-3 mb-10 flex-1">
              {MODULES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <a
              href={makeWaUrl("Pro")}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-900/40 group"
            >
              <MessageCircle className="w-4 h-4" />
              Estoy interesado
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
          </motion.div>
        </motion.div>

        {/* Nota pie */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-slate-600 text-sm mt-10"
        >
          ¿Tienes dudas sobre qué plan elegir?{" "}
          <a
            href={makeWaUrl("(quiero asesoría)")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white underline underline-offset-2 transition-colors"
          >
            Escríbenos y te asesoramos.
          </a>
        </motion.p>
      </div>

      <LandingNavbar />
    </div>
  );
};

export default Planes;

// Genera el enlace de WhatsApp con mensaje personalizado
function makeWaUrl(plan) {
  return whatsappLink(
    `Hola! Estoy interesado en el plan ${plan} de Abakosoft. ¿Podemos hablar?`,
  );
}
