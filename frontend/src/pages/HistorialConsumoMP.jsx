import { useState, useEffect } from "react";
import formateaCantidad from "../utils/formateaCantidad";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCalendar,
  FiBox,
  FiDollarSign,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiPieChart,
  FiTruck,
  FiPercent,
} from "react-icons/fi";
import ConsumoMateriaPrimaDrawer from "../components/ConsumoMateriaPrimaDrawer";
import ProrrateoOrdenDrawer from "../components/ProrrateoDrawer";

const HistorialConsumoMP = () => {
  const [costosPorArticulo, setCostosPorArticulo] = useState([]);
  const [loadingCostos, setLoadingCostos] = useState(false);
  const navigate = useNavigate();
  const [drawerProrrateo, setDrawerProrrateo] = useState({ open: false });
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState([]);
  const [totales, setTotales] = useState({});
  const [periodo, setPeriodo] = useState({ fechaInicio: "", fechaFin: "" });
  const [ordenes, setOrdenes] = useState([]);
  const [drawerConsumo, setDrawerConsumo] = useState(false);
  const [avancesReales, setAvancesReales] = useState([]);

  const getSemanaActual = () => {
    const hoy = new Date();
    const diaSemana = hoy.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diffLunes);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    const formatLocalDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return {
      fechaInicio: formatLocalDate(lunes),
      fechaFin: formatLocalDate(domingo),
    };
  };

  const [filtros, setFiltros] = useState(getSemanaActual());

  useEffect(() => {
    cargarDatos();
  }, [filtros]);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [resumenRes, avancesRealesRes, ordenesRes] = await Promise.all([
        api.get("/consumos-materia-prima/resumen-semanal", { params: filtros }),
        api.get("/avance-etapas/reales/por-fecha", {
          params: { desde: filtros.fechaInicio, hasta: filtros.fechaFin },
        }),
        api.get("/avance-etapas/activas-avance-semana", {
          params: { desde: filtros.fechaInicio, hasta: filtros.fechaFin },
        }),
      ]);
      setResumen(resumenRes.data?.data || []);
      setTotales(resumenRes.data?.totales || {});
      setPeriodo(resumenRes.data?.periodo || filtros);
      setAvancesReales(avancesRealesRes.data?.data || []);
      setOrdenes(ordenesRes.data?.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const fetchCostosPorArticulo = async () => {
    setLoadingCostos(true);
    try {
      const res = await api.get("/consumos-materia-prima/prorrateo", {
        params: {
          fechaInicio: filtros.fechaInicio,
          fechaFin: filtros.fechaFin,
        },
      });
      setCostosPorArticulo(res.data?.prorrateoPorArticulo || []);
    } catch (error) {
      toast.error("Error al cargar el prorrateo");
    } finally {
      setLoadingCostos(false);
    }
  };

  const cambiarSemana = (direccion) => {
    const fechaInicio = new Date(filtros.fechaInicio);
    fechaInicio.setDate(fechaInicio.getDate() + direccion * 7);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaInicio.getDate() + 6);
    setFiltros({
      fechaInicio: fechaInicio.toISOString().split("T")[0],
      fechaFin: fechaFin.toISOString().split("T")[0],
    });
  };

  const formatMoneda = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);
  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const f = new Date(fecha + "T00:00:00");
    return f.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
  };
  const esSemanaActual = () => {
    const semanaActual = getSemanaActual();
    return (
      filtros.fechaInicio === semanaActual.fechaInicio &&
      filtros.fechaFin === semanaActual.fechaFin
    );
  };

  // Colores por etapa
  const etapaColors = {
    Mecanizado: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      dot: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600",
      light: "bg-blue-100",
    },
    Pintura: {
      bg: "bg-pink-50",
      text: "text-pink-600",
      border: "border-pink-200",
      dot: "bg-pink-500",
      gradient: "from-pink-500 to-pink-600",
      light: "bg-pink-100",
    },
    Tapizado: {
      bg: "bg-green-50",
      text: "text-green-600",
      border: "border-green-200",
      dot: "bg-green-500",
      gradient: "from-green-500 to-green-600",
      light: "bg-green-100",
    },
    Pulido: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      dot: "bg-amber-500",
      gradient: "from-amber-500 to-amber-600",
      light: "bg-amber-100",
    },
    Ensamble: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-200",
      dot: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600",
      light: "bg-purple-100",
    },
  };
  const getEtapaColor = (nombre) =>
    etapaColors[nombre] || {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      dot: "bg-slate-400",
      gradient: "from-slate-500 to-slate-600",
      light: "bg-slate-100",
    };

  // Agrupar consumos por etapa (con desglose por unidad)
  const resumenPorEtapa = {};
  resumen.forEach((item) => {
    const etapaKey = item.id_etapa || "sin_etapa";
    if (!resumenPorEtapa[etapaKey]) {
      resumenPorEtapa[etapaKey] = {
        nombre_etapa: item.nombre_etapa || "Sin etapa",
        articulos: [],
        unidades_por_tipo: {},
        total_costo: 0,
      };
    }
    resumenPorEtapa[etapaKey].articulos.push(item);
    // Agrupar por tipo de unidad
    const unidad = item.abreviatura_unidad || "uds";
    if (!resumenPorEtapa[etapaKey].unidades_por_tipo[unidad]) {
      resumenPorEtapa[etapaKey].unidades_por_tipo[unidad] = 0;
    }
    resumenPorEtapa[etapaKey].unidades_por_tipo[unidad] +=
      Number(item.total_consumido) || 0;
    resumenPorEtapa[etapaKey].total_costo += Number(item.costo_total) || 0;
  });

  // Calcular totales generales agrupados por unidad
  const totalesUnidadesPorTipo = {};
  resumen.forEach((item) => {
    const unidad = item.abreviatura_unidad || "uds";
    if (!totalesUnidadesPorTipo[unidad]) {
      totalesUnidadesPorTipo[unidad] = 0;
    }
    totalesUnidadesPorTipo[unidad] += Number(item.total_consumido) || 0;
  });

  // Helper para formatear unidades por tipo
  const formatUnidadesPorTipo = (unidadesPorTipo) => {
    return Object.entries(unidadesPorTipo)
      .map(([unidad, cantidad]) => `${Number(cantidad).toFixed(1)} ${unidad}`)
      .join(", ");
  };

  // Calcular datos de prorrateo por etapa (avances)
  const etapasAvances = {};
  avancesReales.forEach((av) => {
    const etapaNombre = av.nombre_etapa || "Sin etapa";
    if (!etapasAvances[etapaNombre]) {
      etapasAvances[etapaNombre] = { articulos: {}, totalPrecioVenta: 0 };
    }
    const artKey = av.id_articulo;
    if (!etapasAvances[etapaNombre].articulos[artKey]) {
      etapasAvances[etapaNombre].articulos[artKey] = {
        id_articulo: av.id_articulo,
        descripcion:
          av.descripcion_articulo || av.descripcion || "Sin descripcion",
        referencia: av.referencia || "",
        precio_venta: Number(av.precio_venta) || 0,
        cantidad_avanzada: 0,
        ordenes: {},
      };
    }
    etapasAvances[etapaNombre].articulos[artKey].cantidad_avanzada +=
      Number(av.cantidad_avanzada) || 0;
    // Guardar por orden
    const ordenId = av.id_orden_fabricacion;
    if (ordenId) {
      if (!etapasAvances[etapaNombre].articulos[artKey].ordenes[ordenId]) {
        etapasAvances[etapaNombre].articulos[artKey].ordenes[ordenId] = 0;
      }
      etapasAvances[etapaNombre].articulos[artKey].ordenes[ordenId] +=
        Number(av.cantidad_avanzada) || 0;
    }
  });

  // Calcular totales por etapa
  Object.keys(etapasAvances).forEach((etapaNombre) => {
    const etapa = etapasAvances[etapaNombre];
    etapa.totalPrecioVenta = Object.values(etapa.articulos).reduce(
      (sum, art) => sum + art.precio_venta * art.cantidad_avanzada,
      0,
    );
    etapa.totalCostoConsumo =
      resumenPorEtapa[
        Object.keys(resumenPorEtapa).find(
          (k) => resumenPorEtapa[k].nombre_etapa === etapaNombre,
        )
      ]?.total_costo || 0;
  });

  // Calcular datos por orden de fabricacion
  const ordenesProrrateo = {};
  avancesReales.forEach((av) => {
    const ordenId = av.id_orden_fabricacion;
    if (!ordenId) return;
    if (!ordenesProrrateo[ordenId]) {
      const ordenInfo =
        ordenes.find((o) => o.id_orden_fabricacion === ordenId) || {};
      ordenesProrrateo[ordenId] = {
        id_orden_fabricacion: ordenId,
        nombre_cliente: ordenInfo.nombre_cliente || "Sin cliente",
        etapas: {},
        totalPrecioVenta: 0,
        totalCostoEstimado: 0,
      };
    }
    const etapaNombre = av.nombre_etapa || "Sin etapa";
    if (!ordenesProrrateo[ordenId].etapas[etapaNombre]) {
      ordenesProrrateo[ordenId].etapas[etapaNombre] = {
        cantidad: 0,
        precioVenta: 0,
        articulos: {},
      };
    }
    const cantidad = Number(av.cantidad_avanzada) || 0;
    const precioVenta = Number(av.precio_venta) || 0;
    ordenesProrrateo[ordenId].etapas[etapaNombre].cantidad += cantidad;
    ordenesProrrateo[ordenId].etapas[etapaNombre].precioVenta +=
      cantidad * precioVenta;
    ordenesProrrateo[ordenId].totalPrecioVenta += cantidad * precioVenta;

    // Agregar artículo a la etapa
    const artId = av.id_articulo;
    if (!ordenesProrrateo[ordenId].etapas[etapaNombre].articulos[artId]) {
      ordenesProrrateo[ordenId].etapas[etapaNombre].articulos[artId] = {
        id_articulo: artId,
        descripcion:
          av.descripcion_articulo || av.descripcion || "Sin descripción",
        referencia: av.referencia || "",
        abreviatura_unidad: av.abreviatura_unidad || "uds",
        cantidad: 0,
        precioVenta: precioVenta,
      };
    }
    ordenesProrrateo[ordenId].etapas[etapaNombre].articulos[artId].cantidad +=
      cantidad;
  });

  // Calcular porcentaje y costo por orden
  const totalGeneralPrecioVenta = Object.values(ordenesProrrateo).reduce(
    (sum, o) => sum + o.totalPrecioVenta,
    0,
  );
  const totalGeneralCosto = Number(totales.costo_total) || 0;
  const totalGeneralConsumo = Number(totales.total_consumido) || 0;

  Object.values(ordenesProrrateo).forEach((orden) => {
    orden.porcentaje =
      totalGeneralPrecioVenta > 0
        ? (orden.totalPrecioVenta / totalGeneralPrecioVenta) * 100
        : 0;
    orden.totalCostoEstimado = (orden.porcentaje / 100) * totalGeneralCosto;
    orden.totalConsumoEstimado = (orden.porcentaje / 100) * totalGeneralConsumo;

    // Calcular porcentaje por etapa y consumo por artículo
    // SOLO para etapas que tienen consumo registrado
    Object.keys(orden.etapas).forEach((etapaNombre) => {
      const etapaGlobal = etapasAvances[etapaNombre];
      const etapaOrden = orden.etapas[etapaNombre];

      // Buscar si esta etapa tiene consumo registrado
      const etapaResumen =
        resumenPorEtapa[
          Object.keys(resumenPorEtapa).find(
            (k) => resumenPorEtapa[k].nombre_etapa === etapaNombre,
          )
        ];
      const costoEtapaConsumo = etapaResumen?.total_costo || 0;
      const consumoEtapaUnidades = etapaResumen?.total_unidades || 0;

      // Si la etapa no tiene consumo registrado, no calcular prorrateo
      if (costoEtapaConsumo === 0) {
        etapaOrden.tieneConsumo = false;
        etapaOrden.porcentaje = 0;
        etapaOrden.costoEstimado = 0;
        etapaOrden.unidadesProrrateadas = {};
      } else {
        etapaOrden.tieneConsumo = true;
        etapaOrden.porcentaje =
          etapaGlobal?.totalPrecioVenta > 0
            ? (etapaOrden.precioVenta / etapaGlobal.totalPrecioVenta) * 100
            : 0;
        etapaOrden.costoEstimado =
          (etapaOrden.porcentaje / 100) * costoEtapaConsumo;
        // Calcular consumo prorrateado por tipo de unidad
        etapaOrden.unidadesProrrateadas = {};
        if (etapaResumen?.unidades_por_tipo) {
          Object.entries(etapaResumen.unidades_por_tipo).forEach(
            ([unidad, cantidad]) => {
              etapaOrden.unidadesProrrateadas[unidad] =
                (etapaOrden.porcentaje / 100) * cantidad;
            },
          );
        }
      }

      // Calcular consumo estimado por artículo basado en proporción
      Object.values(etapaOrden.articulos).forEach((art) => {
        const proporcionArticulo =
          etapaOrden.cantidad > 0 ? art.cantidad / etapaOrden.cantidad : 0;
        art.costoEstimado = proporcionArticulo * etapaOrden.costoEstimado;
      });
    });
  });

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/inventario")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={16} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">
                Inventario
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Historial de Consumo MP
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cargarDatos}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <FiRefreshCw size={15} />
              Actualizar
            </button>
            <button
              onClick={() => setDrawerConsumo(true)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <FiPlus size={15} />
              Registrar consumo
            </button>
            <button
              onClick={async () => {
                setDrawerProrrateo({ open: true });
                await fetchCostosPorArticulo();
              }}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm inline-flex items-center gap-2"
            >
              <FiPieChart size={15} />
              Ver prorrateo detallado
            </button>
          </div>
        </div>

        {/* Selector de semana */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => cambiarSemana(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 font-semibold text-slate-800">
                <FiCalendar className="text-slate-400" size={16} />
                {formatFecha(periodo.fechaInicio)} —{" "}
                {formatFecha(periodo.fechaFin)}
              </div>
              {esSemanaActual() && (
                <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg">
                  Semana actual
                </span>
              )}
            </div>
            <button
              onClick={() => cambiarSemana(1)}
              disabled={esSemanaActual()}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-800" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Consumos por etapa */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <FiBox size={13} />
                  Consumos de Materia Prima por Etapa
                </h2>
                <div className="text-right">
                  <p className="text-xl font-bold text-slate-900">
                    {formatMoneda(totales.costo_total)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatUnidadesPorTipo(totalesUnidadesPorTipo)}
                  </p>
                </div>
              </div>
              {resumen.length === 0 ? (
                <div className="p-12 text-center">
                  <FiBox className="mx-auto text-4xl text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">
                    No hay consumos registrados en este período
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(resumenPorEtapa).map(
                      ([etapaKey, etapa]) => {
                        const colors = getEtapaColor(etapa.nombre_etapa);
                        return (
                          <div
                            key={etapaKey}
                            className={`rounded-xl border ${colors.border} overflow-hidden`}
                          >
                            <div
                              className={`px-3 py-2.5 ${colors.bg} border-b ${colors.border} flex items-center justify-between`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${colors.dot}`}
                                />
                                <span
                                  className={`font-semibold text-sm ${colors.text}`}
                                >
                                  {etapa.nombre_etapa}
                                </span>
                              </div>
                              <span
                                className={`font-bold text-sm ${colors.text}`}
                              >
                                {formatMoneda(etapa.total_costo)}
                              </span>
                            </div>
                            <div className="p-2 max-h-48 overflow-y-auto space-y-1.5 bg-white">
                              {etapa.articulos.map((item) => (
                                <div
                                  key={item.id_articulo}
                                  className="p-2 rounded-lg border border-slate-100"
                                >
                                  <div className="flex items-start gap-1.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${colors.dot}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-slate-800 font-medium truncate leading-tight">
                                        {item.descripcion}
                                      </p>
                                      <p className="text-[11px] text-slate-400">
                                        Ref: {item.referencia || "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-slate-100">
                                    <span className="text-[11px] text-slate-500">
                                      {formateaCantidad(item.total_consumido)}{" "}
                                      {item.abreviatura_unidad || "uds"}
                                    </span>
                                    <span
                                      className={`font-bold text-xs ${colors.text}`}
                                    >
                                      {formatMoneda(item.costo_total)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Órdenes con prorrateo */}
            {Object.keys(ordenesProrrateo).length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <FiTruck size={13} />
                    Distribución de Costos por Orden de Fabricación
                  </h2>
                  <p className="text-xs text-slate-400 mt-1.5">
                    El porcentaje de cada orden se calcula sumando precio de
                    venta × cantidad avanzada, dividido entre el total de todas
                    las órdenes.
                  </p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.values(ordenesProrrateo)
                      .sort((a, b) => b.porcentaje - a.porcentaje)
                      .map((orden) => (
                        <div
                          key={orden.id_orden_fabricacion}
                          className="border border-slate-200 rounded-xl overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                OF #{orden.id_orden_fabricacion}
                              </p>
                              <p className="text-xs text-slate-500 truncate max-w-[200px]">
                                {orden.nombre_cliente}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs text-slate-400">
                                  Participación
                                </p>
                                <p className="font-bold text-slate-900 text-lg">
                                  {orden.porcentaje.toFixed(1)}%
                                </p>
                              </div>
                              <div className="text-right border-l border-slate-200 pl-4">
                                <p className="text-xs text-slate-400">
                                  Costo Est.
                                </p>
                                <p className="font-bold text-emerald-700">
                                  {formatMoneda(orden.totalCostoEstimado)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(orden.etapas)
                                .filter(
                                  ([_, etapaData]) => etapaData.tieneConsumo,
                                )
                                .map(([etapaNombre, etapaData]) => {
                                  const colors = getEtapaColor(etapaNombre);
                                  return (
                                    <div
                                      key={etapaNombre}
                                      className={`flex-1 min-w-[160px] rounded-lg border ${colors.border} overflow-hidden`}
                                    >
                                      <div
                                        className={`px-2.5 py-1.5 ${colors.bg} flex items-center justify-between`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
                                          />
                                          <span
                                            className={`text-xs font-semibold ${colors.text}`}
                                          >
                                            {etapaNombre}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span
                                            className={`font-semibold ${colors.text}`}
                                          >
                                            ~
                                            {formatUnidadesPorTipo(
                                              etapaData.unidadesProrrateadas,
                                            )}
                                          </span>
                                          <span className="text-slate-400">
                                            {etapaData.porcentaje.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                      <div className="p-1.5 space-y-1 bg-white max-h-28 overflow-y-auto">
                                        {Object.values(etapaData.articulos).map(
                                          (art) => (
                                            <div
                                              key={art.id_articulo}
                                              className="px-2 py-1 rounded border border-slate-100 flex items-center justify-between gap-2"
                                            >
                                              <div className="min-w-0 flex-1">
                                                <p className="text-[11px] text-slate-700 font-medium truncate">
                                                  {art.descripcion}
                                                </p>
                                                <p className="text-[9px] text-slate-400">
                                                  {art.referencia || "N/A"} •{" "}
                                                  {art.cantidad}{" "}
                                                  {art.abreviatura_unidad}
                                                </p>
                                              </div>
                                              <p className="text-[11px] font-semibold text-emerald-700 flex-shrink-0">
                                                {formatMoneda(
                                                  art.costoEstimado || 0,
                                                )}
                                              </p>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              {Object.entries(orden.etapas).filter(
                                ([_, d]) => d.tieneConsumo,
                              ).length === 0 && (
                                <p className="w-full text-center py-3 text-slate-400 text-xs">
                                  Sin etapas con consumo de MP registrado
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drawers */}
      <ProrrateoOrdenDrawer
        open={drawerProrrateo.open}
        onClose={() => setDrawerProrrateo({ open: false })}
        prorrateoPorArticulo={costosPorArticulo}
        avancesReales={avancesReales}
        resumen={resumen}
        ordenes={ordenes}
        totales={totales}
      />
      <ConsumoMateriaPrimaDrawer
        isOpen={drawerConsumo}
        onClose={() => setDrawerConsumo(false)}
        onSuccess={() => {
          setDrawerConsumo(false);
          cargarDatos();
        }}
      />
    </div>
  );
};

export default HistorialConsumoMP;
