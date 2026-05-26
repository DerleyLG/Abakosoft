import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { usePlan } from "../hooks/usePlanApi";
import toast from "react-hot-toast";
import {
  FiX,
  FiChevronRight,
  FiCheckCircle,
  FiTag,
  FiPackage,
  FiDollarSign,
  FiLayers,
  FiArrowRight,
  FiArrowLeft,
  FiZap,
  FiInfo,
  FiAlertCircle,
} from "react-icons/fi";

const COLOR_STYLES = {
  blue: {
    bg: "bg-blue-50",
    iconBg: "bg-blue-100",
    icon: "text-blue-600",
    btn: "bg-blue-600 hover:bg-blue-700",
    border: "border-blue-200",
    tag: "bg-blue-100 text-blue-700",
  },
  emerald: {
    bg: "bg-emerald-50",
    iconBg: "bg-emerald-100",
    icon: "text-emerald-600",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    border: "border-emerald-200",
    tag: "bg-emerald-100 text-emerald-700",
  },
  violet: {
    bg: "bg-violet-50",
    iconBg: "bg-violet-100",
    icon: "text-violet-600",
    btn: "bg-violet-600 hover:bg-violet-700",
    border: "border-violet-200",
    tag: "bg-violet-100 text-violet-700",
  },
  amber: {
    bg: "bg-amber-50",
    iconBg: "bg-amber-100",
    icon: "text-amber-600",
    btn: "bg-amber-600 hover:bg-amber-700",
    border: "border-amber-200",
    tag: "bg-amber-100 text-amber-700",
  },
};

const STEPS = [
  {
    id: "categorias",
    Icon: FiTag,
    color: "blue",
    title: "Categorías",
    subtitle: "Organiza tus artículos",
    why: "Las categorías son obligatorias para registrar artículos en el sistema. Sin al menos una, no podrás crear ningún producto en tu inventario.",
    endpoint: "/categorias",
    getList: (res) => (Array.isArray(res.data) ? res.data : []),
    fields: [
      {
        name: "nombre",
        label: "Nombre",
        placeholder: "Ej: Materia Prima, Producto Terminado...",
      },
      {
        name: "tipo",
        label: "Tipo",
        type: "select",
        default: "articulo_fabricable",
        options: [
          { value: "articulo_fabricable", label: "Artículo Fabricable" },
          { value: "materia_prima", label: "Materia Prima" },
          { value: "costo_produccion", label: "Costo de Producción" },
        ],
      },
    ],
    getItemLabel: (item) => item.nombre,
  },
  {
    id: "unidades",
    Icon: FiPackage,
    color: "emerald",
    title: "Unidades de Medida",
    subtitle: "Cuantifica tu inventario",
    why: "Las unidades son necesarias para definir cantidades en artículos, órdenes e inventario. Sin ellas no podrás registrar cuánto tienes o produces.",
    endpoint: "/unidades",
    getList: (res) => (Array.isArray(res.data) ? res.data : []),
    fields: [
      {
        name: "nombre",
        label: "Nombre",
        placeholder: "Ej: Kilogramo, Metro, Unidad...",
      },
      {
        name: "abreviatura",
        label: "Abreviatura",
        placeholder: "Ej: kg, m, un...",
      },
    ],
    getItemLabel: (item) => `${item.nombre} (${item.abreviatura})`,
  },
  {
    id: "etapas",
    Icon: FiLayers,
    color: "violet",
    title: "Etapas de Producción",
    subtitle: "Define tu proceso de fabricación",
    why: "Las etapas de producción son necesarias para gestionar órdenes de fabricación y hacer seguimiento paso a paso del proceso productivo.",
    endpoint: "/etapas-produccion",
    getList: (res) =>
      Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [],
    fields: [
      {
        name: "nombre",
        label: "Nombre de la etapa",
        placeholder: "Ej: Corte, Ensamble, Pintura, Empaque...",
      },
      {
        name: "orden",
        label: "Orden",
        type: "number",
        placeholder: "1",
        min: 1,
        computeDefault: (items) => items.length + 1,
      },
      {
        name: "descripcion",
        label: "Descripción (opcional)",
        placeholder: "Describe brevemente esta etapa...",
        optional: true,
      },
    ],
    getItemLabel: (item) => `${item.orden}. ${item.nombre}`,
  },
  {
    id: "metodos_pago",
    Icon: FiDollarSign,
    color: "amber",
    title: "Métodos de Pago",
    subtitle: "Registra cómo cobras a tus clientes",
    why: "Los métodos de pago son necesarios para registrar ventas y gestionar el cierre de caja. Sin uno configurado, no podrás completar ninguna venta.",
    endpoint: "/metodos-pago",
    getList: (res) => (Array.isArray(res.data) ? res.data : []),
    fields: [
      {
        name: "nombre",
        label: "Nombre del método",
        placeholder: "Ej: Efectivo, Transferencia, Nequi, Daviplata...",
      },
    ],
    getItemLabel: (item) => item.nombre,
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────
const OnboardingWizard = () => {
  const { user } = useAuth();
  const { features } = usePlan();
  const navigate = useNavigate();

  const esPlanBasico = !features.includes("fabricacion");

  // Filtrar steps según el plan (básico no incluye etapas de producción)
  const activeSteps = esPlanBasico
    ? STEPS.filter((s) => s.id !== "etapas")
    : STEPS;

  // 'welcome' | 'wizard' | 'float' | null (oculto)
  const [phase, setPhase] = useState(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [hasPreexistingItems, setHasPreexistingItems] = useState(false);

  const storageKey = user?.empresa_id
    ? `abakosoft_ob2_${user.empresa_id}`
    : null;

  const currentStep = activeSteps[stepIdx];
  const isLastStep = stepIdx === activeSteps.length - 1;

  // ── Determinar fase inicial desde localStorage o API ─────────────────────
  useEffect(() => {
    if (!storageKey) return;
    const stored = localStorage.getItem(storageKey);

    if (stored === "done") return; // ya completó → no mostrar nada
    if (stored === "later") {
      setPhase("float");
      return;
    }

    // Sin clave → verificar si ya existen categorías antes de mostrar el wizard
    api
      .get("/categorias")
      .then((res) => {
        const categorias = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        if (categorias.length > 0) {
          // Ya hay categorías → el sistema estaba configurado
          localStorage.setItem(storageKey, "done");
        } else {
          setPhase("welcome");
        }
      })
      .catch(() => {
        // Si falla la consulta, no mostrar el wizard
      });
  }, [storageKey]);

  // ── Cargar items del paso actual cuando el wizard está abierto ────────────
  useEffect(() => {
    if (phase !== "wizard") return;
    let cancelled = false;
    setLoadingItems(true);
    setHasPreexistingItems(false);

    api
      .get(currentStep.endpoint)
      .then((res) => {
        if (cancelled) return;
        const list = currentStep.getList(res);
        setItems(list);
        if (list.length > 0) setHasPreexistingItems(true);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingItems(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phase, stepIdx]);

  // ── Acciones ──────────────────────────────────────────────────────────────
  const handleLater = () => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, "later");
    setPhase("float");
  };

  const handleStart = () => {
    setStepIdx(0);
    setPhase("wizard");
  };

  const handleFinish = () => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, "done");
    setPhase(null);
    toast.success("¡Configuración completada! Ya puedes empezar a trabajar.", {
      duration: 4000,
    });
  };

  const handleBack = () => {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStepIdx((i) => i + 1);
    } else {
      handleFinish();
    }
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!phase || !user) return null;

  // ── Botón flotante cuando eligieron "Más tarde" ───────────────────────────
  if (phase === "float") {
    return (
      <button
        onClick={handleStart}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-xl hover:bg-slate-700 transition-all duration-200 text-sm font-semibold cursor-pointer"
      >
        <FiZap size={16} className="text-amber-400" />
        Continuar configuración inicial
      </button>
    );
  }

  // ── Modal de bienvenida ───────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col gap-5">
          {/* Encabezado */}
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center shadow">
              <FiZap size={22} className="text-amber-300" />
            </div>
            <button
              onClick={handleLater}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Mensaje */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              ¡Hola, bienvenido a Abakosoft!
            </h2>
            <p className="text-slate-500 mt-2 text-sm leading-relaxed">
              Antes de empezar a trabajar, te guiaremos en la configuración
              básica del sistema. Esto solo tomará unos minutos.
            </p>
          </div>

          {/* Vista previa de los pasos */}
          <div className="grid grid-cols-2 gap-2">
            {activeSteps.map((s) => {
              const st = COLOR_STYLES[s.color];
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${st.bg} border ${st.border}`}
                >
                  <s.Icon size={14} className={st.icon} />
                  <span className={`text-xs font-semibold ${st.icon}`}>
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Botones */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={handleStart}
              className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold text-sm hover:bg-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              Configurar ahora
              <FiArrowRight size={16} />
            </button>
            <button
              onClick={handleLater}
              className="w-full text-slate-500 py-2 rounded-xl font-medium text-sm hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Más tarde
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Wizard de configuración ───────────────────────────────────────────────
  const styles = COLOR_STYLES[currentStep.color];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Barra de progreso */}
        <div className="h-1.5 bg-slate-100 w-full">
          <div
            className="h-full bg-slate-800 transition-all duration-500"
            style={{ width: `${((stepIdx + 1) / activeSteps.length) * 100}%` }}
          />
        </div>

        {/* Encabezado del paso */}
        <div className={`p-6 pb-5 ${styles.bg} border-b ${styles.border}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center`}
              >
                <currentStep.Icon size={18} className={styles.icon} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Paso {stepIdx + 1} de {activeSteps.length}
                </p>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {currentStep.title}
                </h3>
              </div>
            </div>
            <button
              onClick={handleLater}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-white/60 transition-colors cursor-pointer"
            >
              <FiX size={16} />
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            {currentStep.why}
          </p>
        </div>

        {/* Cuerpo */}
        <div className="px-6 py-5">
          {/* Cargando */}
          {loadingItems && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
              Cargando...
            </div>
          )}

          {/* Revisión: datos pre-configurados */}
          {!loadingItems && hasPreexistingItems && (
            <div
              className={`rounded-xl border ${styles.border} ${styles.bg} p-4 flex flex-col gap-3`}
            >
              <div className="flex items-center gap-2">
                <FiCheckCircle
                  size={14}
                  className={`${styles.icon} shrink-0`}
                />
                <p className="text-sm font-medium text-slate-700">
                  Configurado inicialmente para tu empresa
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item, i) => (
                  <span
                    key={i}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium ${styles.tag}`}
                  >
                    {currentStep.getItemLabel(item)}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-400">
                Puedes agregar o editar estos datos más adelante desde la
                configuración.
              </p>
            </div>
          )}

          {/* Paso pendiente: categorías sin datos */}
          {!loadingItems && !hasPreexistingItems && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <FiAlertCircle size={15} className="text-amber-600" />
              </div>
              <div className="flex flex-col gap-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Paso pendiente
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
                    Para empezar a registrar artículos en tu empresa, necesitas
                    crear al menos una categoría. Pásate por el módulo y
                    configúralas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    handleFinish();
                    navigate("/categorias");
                  }}
                  className="self-start flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-white border border-amber-200 hover:border-amber-300 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Ir a Categorías
                  <FiArrowRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          {stepIdx > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors cursor-pointer"
            >
              <FiArrowLeft size={14} />
              Atrás
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors cursor-pointer"
            >
              Omitir este paso
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {isLastStep ? (
              <>
                <FiCheckCircle size={15} />
                Finalizar
              </>
            ) : (
              <>
                Continuar
                <FiChevronRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
