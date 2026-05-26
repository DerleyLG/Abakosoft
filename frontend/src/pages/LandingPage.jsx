import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { WHATSAPP_URL_LANDING as WHATSAPP_URL } from "../constants/contact";
import {
  Package,
  ShoppingCart,
  Factory,
  BarChart3,
  Users,
  Wallet,
  Shield,
  CheckCircle2,
  ArrowRight,
  MessageCircle,
  TrendingUp,
  Layers,
  Zap,
  Building2,
  LayoutDashboard,
  Truck,
  ChevronDown,
} from "lucide-react";

// ─── Configuración WhatsApp ────────────────────────────────────────────────────
const CYCLING_WORDS = ["fábrica", "producción", "inventario", "negocio"];

// ─── Variantes de animación ────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

// ─── Hook para animar al hacer scroll ─────────────────────────────────────────
const AnimatedSection = ({ children, className = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Tarjeta de característica ─────────────────────────────────────────────────
const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <motion.div
    variants={fadeUp}
    className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-default"
  >
    <div
      className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${color} mb-4 shadow-lg`}
    >
      <Icon className="w-6 h-6 text-white" aria-hidden="true" />
    </div>
    <h3 className="text-base font-semibold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
      {title}
    </h3>
    <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

// ─── Paso "Cómo funciona" ──────────────────────────────────────────────────────
const Step = ({ number, title, description, icon: Icon }) => (
  <motion.div
    variants={fadeUp}
    className="flex flex-col items-center text-center"
  >
    <div className="relative mb-6">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200">
        <Icon className="w-7 h-7 text-white" aria-hidden="true" />
      </div>
      <span className="absolute -top-2 -right-2 w-6 h-6 bg-slate-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
        {number}
      </span>
    </div>
    <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
    <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
      {description}
    </p>
  </motion.div>
);

// ─── Estadística animada ───────────────────────────────────────────────────────
const Stat = ({ value, label }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div ref={ref} variants={fadeUp} className="text-center px-4">
      <motion.span
        className="text-3xl sm:text-4xl font-extrabold text-white block"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5 }}
      >
        {value}
      </motion.span>
      <span className="text-indigo-200 text-sm mt-1.5 block leading-snug">
        {label}
      </span>
    </motion.div>
  );
};

// ─── Mock de la interfaz del sistema ──────────────────────────────────────────
const DashboardMock = () => (
  <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700 bg-white select-none">
    {/* Barra del navegador */}
    <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
      </div>
      <div className="flex-1 mx-3">
        <div className="bg-white border border-slate-200 rounded-md px-3 py-1 text-xs text-slate-400 max-w-xs">
          app.abakosoft.com/dashboard
        </div>
      </div>
    </div>
    {/* Layout de la app */}
    <div className="flex" style={{ height: "320px" }}>
      {/* Sidebar */}
      <div className="w-14 sm:w-44 bg-slate-800 flex flex-col p-2 sm:p-3 gap-1 shrink-0">
        <div className="text-white font-bold text-xs sm:text-sm mb-4 px-1 hidden sm:block tracking-wide">
          ABAKOSOFT
        </div>
        {[
          { label: "Dashboard", active: true },
          { label: "Inventario", active: false },
          { label: "Ventas", active: false },
          { label: "Producción", active: false },
          { label: "Reportes", active: false },
        ].map(({ label, active }) => (
          <div
            key={label}
            className={`rounded-lg px-2 py-1.5 text-xs transition-colors ${
              active
                ? "bg-indigo-600 text-white font-medium"
                : "text-slate-400 hover:bg-slate-700 hover:text-white"
            }`}
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden text-center block text-[9px] font-bold">
              {label.charAt(0)}
            </span>
          </div>
        ))}
      </div>
      {/* Contenido principal */}
      <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-hidden">
        <p className="text-xs font-semibold text-slate-600 mb-3">
          Panel de Control
        </p>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {[
            {
              label: "Ventas Hoy",
              value: "$4.2M",
              bg: "bg-indigo-50",
              border: "border-indigo-100",
              text: "text-indigo-700",
            },
            {
              label: "Órdenes",
              value: "24",
              bg: "bg-green-50",
              border: "border-green-100",
              text: "text-green-700",
            },
            {
              label: "Producción",
              value: "18",
              bg: "bg-amber-50",
              border: "border-amber-100",
              text: "text-amber-700",
            },
            {
              label: "Alertas",
              value: "3",
              bg: "bg-red-50",
              border: "border-red-100",
              text: "text-red-700",
            },
          ].map(({ label, value, bg, border, text }) => (
            <div
              key={label}
              className={`rounded-xl border p-2 sm:p-3 ${bg} ${border}`}
            >
              <div className={`text-lg sm:text-xl font-bold ${text}`}>
                {value}
              </div>
              <div className="text-[9px] sm:text-xs text-slate-500 mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </div>
        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="text-[10px] sm:text-xs font-semibold text-slate-600 px-3 py-2 bg-slate-50 border-b border-slate-100">
            Órdenes Recientes
          </div>
          {[
            {
              id: "#ORD-001",
              cliente: "Muebles del Norte",
              estado: "En producción",
              estadoStyle: "bg-blue-100 text-blue-700",
              monto: "$890K",
            },
            {
              id: "#ORD-002",
              cliente: "Maderas del Sur",
              estado: "Entregado",
              estadoStyle: "bg-green-100 text-green-700",
              monto: "$1.2M",
            },
            {
              id: "#ORD-003",
              cliente: "Casa Bella Ltda",
              estado: "Pendiente",
              estadoStyle: "bg-amber-100 text-amber-700",
              monto: "$560K",
            },
          ].map(({ id, cliente, estado, estadoStyle, monto }) => (
            <div
              key={id}
              className="flex items-center px-3 py-2 text-[9px] sm:text-xs border-b border-slate-50 last:border-0 gap-2"
            >
              <span className="text-indigo-600 font-semibold w-16 sm:w-20 shrink-0">
                {id}
              </span>
              <span className="text-slate-600 flex-1 hidden sm:block truncate">
                {cliente}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[8px] sm:text-[10px] font-semibold shrink-0 ${estadoStyle}`}
              >
                {estado}
              </span>
              <span className="text-slate-700 font-semibold shrink-0">
                {monto}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Datos estáticos ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Factory,
    title: "Gestión de Producción",
    description:
      "Órdenes de fabricación, Kanban por etapas, avance en tiempo real y control de lotes fabricados.",
    color: "bg-indigo-600",
  },
  {
    icon: Package,
    title: "Inventario Inteligente",
    description:
      "Stock en tiempo real, alertas de bajo stock, movimientos trazables y gestión de materia prima.",
    color: "bg-blue-600",
  },
  {
    icon: ShoppingCart,
    title: "Ventas y Pedidos",
    description:
      "Órdenes de venta, pedidos, ventas a crédito, anticipos y seguimiento de pagos por cliente.",
    color: "bg-violet-600",
  },
  {
    icon: Truck,
    title: "Compras y Proveedores",
    description:
      "Órdenes de compra, gestión de proveedores y control de insumos recibidos al almacén.",
    color: "bg-cyan-600",
  },
  {
    icon: Wallet,
    title: "Tesorería y Finanzas",
    description:
      "Cierres de caja, flujo de caja, cuentas por cobrar y reportes financieros en detalle.",
    color: "bg-emerald-600",
  },
  {
    icon: Users,
    title: "Talento Humano",
    description:
      "Gestión de trabajadores, pagos por día y etapa, anticipos de nómina e historial completo.",
    color: "bg-orange-500",
  },
  {
    icon: BarChart3,
    title: "Reportes y Analytics",
    description:
      "Dashboards interactivos, reportes de ventas, costos de producción, utilidad por orden y más.",
    color: "bg-pink-600",
  },
  {
    icon: Shield,
    title: "Control de Acceso",
    description:
      "Roles personalizados, permisos granulares por módulo y soporte nativo ",
    color: "bg-slate-700",
  },
];

const STEPS = [
  {
    number: 1,
    icon: Building2,
    title: "Registra tu empresa",
    description:
      "Configura tu empresa, usuarios y roles en minutos. Sin instalaciones ni infraestructura propia.",
  },
  {
    number: 2,
    icon: Layers,
    title: "Configura tus módulos",
    description:
      "Ingresa artículos, proveedores, trabajadores y parámetros de producción según tu operación.",
  },
  {
    number: 3,
    icon: Zap,
    title: "Opera y crece",
    description:
      "Registra ventas, órdenes y producción. Toma decisiones con datos en tiempo real.",
  },
];

const BENEFITS = [
  "Elimina hojas de cálculo y errores manuales",
  "Trazabilidad completa de cada orden de producción",
  "Control exacto de costos por lote fabricado",
  "Visibilidad del negocio en tiempo real",
  "Acceso desde cualquier dispositivo con internet",
  "Roles y permisos configurables por área",
  "Reportes automáticos y exportables",
];

// ─── Componente principal ───────────────────────────────────────────────────────
const LandingPage = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setWordIndex((i) => (i + 1) % CYCLING_WORDS.length),
      2800,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <LandingNavbar />

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        id="inicio"
        aria-label="Sección de inicio"
        className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950"
      >
        {/* ── Fondo de identidad ─────────────────────────────────────────── */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          {/* Anillos concéntricos — esquina superior-derecha (float A) */}
          <div className="absolute inset-0 landing-ring-tr">
            <div className="absolute -top-48 -right-48 w-[700px] h-[700px] rounded-full border border-slate-700/60" />
            <div className="absolute -top-28 -right-28 w-[480px] h-[480px] rounded-full border border-slate-700/50" />
            <div className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border border-slate-700/40" />
          </div>

          {/* Anillos concéntricos — esquina inferior-izquierda (float B) */}
          <div className="absolute inset-0 landing-ring-bl">
            <div className="absolute -bottom-56 -left-56 w-[750px] h-[750px] rounded-full border border-slate-800/70" />
            <div className="absolute -bottom-36 -left-36 w-[500px] h-[500px] rounded-full border border-slate-800/60" />
            <div className="absolute -bottom-16 -left-16 w-[300px] h-[300px] rounded-full border border-slate-800/50" />
          </div>

          {/* Punto de acento — centro */}
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

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Texto izquierda */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="inline-flex items-center gap-2 bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6"
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                Todo lo que tu empresa necesita en un solo lugar
              </motion.span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Gestiona tu{" "}
                <span
                  className="inline-block overflow-hidden align-bottom"
                  style={{ minWidth: "7ch" }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={CYCLING_WORDS[wordIndex]}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.36, ease: "easeOut" }}
                      className="text-indigo-300 inline-block"
                    >
                      {CYCLING_WORDS[wordIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                  sin límites
                </span>
              </h1>

              <p className="text-slate-300 text-lg leading-relaxed mb-8 max-w-lg">
                Desde la materia prima hasta la entrega final. Abakosoft
                centraliza producción, inventario, ventas y finanzas en una sola
                plataforma diseñada para empresas de la industria.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-xl shadow-green-900/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <MessageCircle className="w-5 h-5" aria-hidden="true" />
                  Quiero una demo
                </a>
                <Link
                  to="/planes"
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-7 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-900/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Estoy interesado
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              {/* Social proof 
              <div className="flex items-center gap-5 mt-10 pt-8 border-t border-white/10">
                <div className="flex -space-x-2" aria-hidden="true">
                  {["A", "B", "C", "D"].map((l, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-700 border-2 border-slate-800 flex items-center justify-center text-white text-xs font-bold"
                    >
                      {l}
                    </div>
                  ))}
                </div>
                <div>
                  <div
                    className="text-amber-400 text-sm tracking-wide"
                    aria-label="5 estrellas"
                  >
                    ★★★★★
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Servicio garantizado
                  </p>
                </div>
              </div>
              */}
            </motion.div>

            {/* Mock dashboard derecha */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
              className="hidden lg:block"
            >
              <DashboardMock />
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          aria-hidden="true"
        >
          <span className="text-slate-400 text-xs">Descubre más</span>
          <motion.div
            animate={{ y: [0, 5, 0] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          >
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── Barra de estadísticas ────────────────────────────────────────────── */}
      <section
        aria-label="Estadísticas de la plataforma"
        className="bg-indigo-700 py-14"
      >
        <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value="12+" label="Módulos integrados" />
            <Stat value="100%" label="En la nube, sin instalación" />
            <Stat value="↑40%" label="Menos tiempo operativo" />
            <Stat value="360°" label="Visibilidad del negocio" />
          </div>
        </AnimatedSection>
      </section>

      {/* ── Características ──────────────────────────────────────────────────── */}
      <section
        id="caracteristicas"
        aria-labelledby="features-heading"
        className="py-24 bg-gray-50 relative overflow-hidden"
      >
        {/* Anillos decorativos */}
        <div
          aria-hidden="true"
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full border border-slate-200/70 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full border border-slate-200/50 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full border border-slate-200/60 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/2 right-0 w-56 h-56 rounded-full border border-slate-200/40 pointer-events-none -translate-y-1/2"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">
                Características
              </span>
              <h2
                id="features-heading"
                className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 mb-4"
              >
                Todo lo que necesitas, en un solo lugar
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-lg">
                Módulos diseñados específicamente para la operación diaria de
                fábricas y empresas de muebles.
              </p>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURES.map((f) => (
                <FeatureCard key={f.title} {...f} />
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        aria-labelledby="steps-heading"
        className="py-24 bg-white relative overflow-hidden"
      >
        {/* Anillos decorativos */}
        <div
          aria-hidden="true"
          className="absolute -top-28 -right-28 w-[460px] h-[460px] rounded-full border border-slate-100 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-[280px] h-[280px] rounded-full border border-slate-100 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-36 -left-36 w-[500px] h-[500px] rounded-full border border-slate-100 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-10 w-60 h-60 rounded-full border border-slate-100/70 pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">
                Proceso
              </span>
              <h2
                id="steps-heading"
                className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 mb-4"
              >
                Empieza en 3 pasos simples
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto">
                Sin instalaciones complicadas. Desde el primer día tienes el
                control total de tu empresa.
              </p>
            </motion.div>
            <div className="relative">
              {/* Línea conectora (desktop) */}
              <div
                className="hidden md:block absolute top-8 h-0.5 bg-indigo-100"
                style={{ left: "20%", right: "20%" }}
                aria-hidden="true"
              />
              <div className="grid md:grid-cols-3 gap-12 relative z-10">
                {STEPS.map((step) => (
                  <Step key={step.number} {...step} />
                ))}
              </div>
            </div>
            <motion.div variants={fadeUp} className="text-center mt-14">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Comenzar ahora{" "}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </a>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Vista previa de la interfaz ──────────────────────────────────────── */}
      <section
        aria-labelledby="preview-heading"
        className="py-24 bg-gradient-to-br from-slate-900 to-indigo-950 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <motion.div variants={fadeUp} className="text-center mb-14">
              <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">
                Vista previa
              </span>
              <h2
                id="preview-heading"
                className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
              >
                Una interfaz clara y poderosa
              </h2>
              <p className="text-slate-400 max-w-xl mx-auto">
                Diseñada para ser intuitiva. Tu equipo la domina desde el primer
                día sin capacitaciones extensas.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="max-w-4xl mx-auto">
              <DashboardMock />
            </motion.div>

            <div className="grid sm:grid-cols-3 gap-6 mt-14">
              {[
                {
                  icon: Zap,
                  title: "Respuesta instantánea",
                  desc: "Interfaz optimizada para operaciones de alto volumen sin demoras.",
                },
                {
                  icon: LayoutDashboard,
                  title: "Dashboard en tiempo real",
                  desc: "Métricas siempre actualizadas, sin necesidad de recargar la página.",
                },
                {
                  icon: Shield,
                  title: "Acceso seguro por roles",
                  desc: "Cada usuario ve y accede solo a lo que le corresponde según su rol.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  className="text-center px-4"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 mb-4 mx-auto">
                    <Icon
                      className="w-5 h-5 text-indigo-400"
                      aria-hidden="true"
                    />
                  </div>
                  <h4 className="text-white font-semibold mb-2">{title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Impacto / Beneficios ─────────────────────────────────────────────── */}
      <section
        id="impacto"
        aria-labelledby="impact-heading"
        className="py-24 bg-white relative overflow-hidden"
      >
        {/* Anillos decorativos */}
        <div
          aria-hidden="true"
          className="absolute -top-36 -left-36 w-[520px] h-[520px] rounded-full border border-slate-100 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -top-16 -left-16 w-[320px] h-[320px] rounded-full border border-slate-100 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute top-1/3 -right-20 w-80 h-80 rounded-full border border-slate-100/70 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-24 right-1/4 w-52 h-52 rounded-full border border-slate-100/60 pointer-events-none"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <AnimatedSection>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Texto izquierda */}
              <motion.div variants={fadeUp}>
                <span className="text-indigo-600 text-xs font-bold uppercase tracking-widest">
                  Por qué Abakosoft
                </span>
                <h2
                  id="impact-heading"
                  className="text-3xl sm:text-4xl font-bold text-slate-800 mt-3 mb-6 leading-tight"
                >
                  Transforma la operación de tu fábrica
                </h2>
                <p className="text-slate-500 text-lg mb-8 leading-relaxed">
                  Deja atrás las hojas de cálculo, los errores de inventario y
                  la falta de control. Abakosoft te da visibilidad total sobre
                  cada aspecto de tu negocio.
                </p>
                <ul className="space-y-3" aria-label="Beneficios de Abakosoft">
                  {BENEFITS.map((benefit) => (
                    <motion.li
                      key={benefit}
                      variants={fadeUp}
                      className="flex items-start gap-3 text-slate-600"
                    >
                      <CheckCircle2
                        className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{benefit}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>

              {/* Tarjeta de impacto derecha */}
              <motion.div variants={fadeUp}>
                <div className="bg-gradient-to-br from-slate-800 to-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                  <div
                    className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"
                    aria-hidden="true"
                  />
                  <div className="relative z-10">
                    <TrendingUp
                      className="w-12 h-12 text-indigo-400 mb-6"
                      aria-hidden="true"
                    />
                    <h3 className="text-2xl font-bold mb-4">
                      Resultados reales desde el día uno
                    </h3>
                    <p className="text-slate-300 mb-8 leading-relaxed">
                      Las empresas que usan Abakosoft reportan mayor claridad en
                      sus operaciones, menos errores y más tiempo para enfocarse
                      en crecer.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { v: "↓ 60%", l: "Errores de inventario" },
                        { v: "↑ 3x", l: "Velocidad de facturación" },
                        { v: "100%", l: "Trazabilidad de órdenes" },
                        { v: "24/7", l: "Disponibilidad del sistema" },
                      ].map(({ v, l }) => (
                        <div
                          key={l}
                          className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm"
                        >
                          <div className="text-2xl font-extrabold text-white">
                            {v}
                          </div>
                          <div className="text-indigo-200 text-xs mt-1 leading-snug">
                            {l}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA Final ───────────────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        className="py-24 bg-gradient-to-br from-indigo-600 to-indigo-800 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
        >
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-900/30 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <AnimatedSection>
            <motion.div variants={fadeUp}>
              <h2
                id="cta-heading"
                className="text-3xl sm:text-4xl font-bold text-white mb-5"
              >
                ¿Listo para transformar tu fábrica?
              </h2>
              <p className="text-indigo-200 text-lg mb-10 leading-relaxed">
                Habla con nuestro equipo hoy y descubre cómo Abakosoft puede
                adaptarse a tu operación desde el primer día.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-2xl shadow-green-900/40 hover:-translate-y-0.5 active:translate-y-0 text-lg"
                >
                  <MessageCircle className="w-6 h-6" aria-hidden="true" />
                  Escribirnos por WhatsApp
                </a>
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl transition-all backdrop-blur-sm hover:-translate-y-0.5 active:translate-y-0 text-lg"
                >
                  Ingresar al sistema
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </Link>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer role="contentinfo" className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <img
                src="/android-chrome-192x192.png"
                alt="Abakosoft"
                className="w-7 h-7 rounded-xl object-cover"
              />
              <span className="text-white font-bold tracking-tight text-lg">
                ABAKOSOFT
              </span>
            </div>
            <p className="text-slate-500 text-sm text-center">
              Software de Gestión para Fábricas de Muebles &middot; &copy;{" "}
              {new Date().getFullYear()} Abakosoft. Todos los derechos
              reservados.
            </p>
            <div className="flex items-center gap-5">
              <Link
                to="/login"
                className="text-slate-400 hover:text-white text-sm transition-colors"
              >
                Ingresar
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-green-400 text-sm transition-colors flex items-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                Contacto
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
