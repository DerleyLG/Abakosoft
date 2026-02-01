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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Historial de Consumo MP
              </h1>
              <p className="text-slate-500 mt-1">
                Registro, prorrateo y distribucion por ordenes de fabricacion
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={cargarDatos}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
              >
                <FiRefreshCw size={18} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>
              <button
                onClick={() => setDrawerConsumo(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-md cursor-pointer"
              >
                <FiPlus size={18} />
                Registrar consumo
              </button>
              <button
                onClick={async () => {
                  setDrawerProrrateo({ open: true });
                  await fetchCostosPorArticulo();
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md cursor-pointer"
              >
                <FiPieChart size={18} />
                Ver prorrateo detallado
              </button>
              <button
                onClick={() => navigate("/inventario")}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md cursor-pointer"
              >
                <FiArrowLeft size={18} />
                <span className="hidden sm:inline">Volver</span>
              </button>
            </div>
          </div>
        </div>

        {/* Selector de semana */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => cambiarSemana(-1)}
              className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              <FiChevronLeft size={24} className="text-slate-600" />
            </button>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-800">
                <FiCalendar className="text-emerald-500" />
                {formatFecha(periodo.fechaInicio)} -{" "}
                {formatFecha(periodo.fechaFin)}
              </div>
              {esSemanaActual() && (
                <span className="inline-block mt-1 px-3 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  Semana actual
                </span>
              )}
            </div>
            <button
              onClick={() => cambiarSemana(1)}
              disabled={esSemanaActual()}
              className="p-2 hover:bg-slate-100 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiChevronRight size={24} className="text-slate-600" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FiBox />
                    Consumos de Materia Prima por Etapa
                  </h3>
                  <div className="text-right text-white">
                    <p className="text-2xl font-bold">
                      {formatMoneda(totales.costo_total)}
                    </p>
                    <p className="text-emerald-100 text-sm">
                      {formatUnidadesPorTipo(totalesUnidadesPorTipo)}
                    </p>
                  </div>
                </div>
              </div>

              {resumen.length === 0 ? (
                <div className="p-12 text-center">
                  <FiBox className="mx-auto text-4xl text-slate-300 mb-3" />
                  <p className="text-slate-500">
                    No hay consumos registrados en este periodo
                  </p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {Object.entries(resumenPorEtapa).map(
                      ([etapaKey, etapa]) => {
                        const colors = getEtapaColor(etapa.nombre_etapa);
                        return (
                          <div
                            key={etapaKey}
                            className={`rounded-xl border ${colors.border} ${colors.bg} overflow-hidden shadow-sm hover:shadow-md transition-shadow`}
                          >
                            <div
                              className={`bg-gradient-to-r ${colors.gradient} px-3 py-2`}
                            >
                              <div className="flex items-center justify-between text-white">
                                <div className="flex items-center gap-1.5">
                                  <FiBox className="text-sm" />
                                  <span className="font-semibold text-sm">
                                    {etapa.nombre_etapa}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-sm">
                                    {formatMoneda(etapa.total_costo)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="p-2 max-h-48 overflow-y-auto space-y-1.5">
                              {etapa.articulos.map((item) => (
                                <div
                                  key={item.id_articulo}
                                  className="p-2 rounded-lg bg-white/60 border border-slate-200/50"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${colors.dot}`}
                                      ></span>
                                      <div className="min-w-0">
                                        <p className="text-xs text-slate-800 font-medium truncate leading-tight">
                                          {item.descripcion}
                                        </p>
                                        <p className="text-[12px] text-slate-400 truncate">
                                          Ref: {item.referencia || "N/A"} •
                                          P.Costo:{" "}
                                          {formatMoneda(item.precio_costo || 0)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200/50">
                                    <span className="text-[10px] text-slate-500">
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

            {/* SECCION 2: Ordenes de Fabricacion con Prorrateo */}
            {Object.keys(ordenesProrrateo).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <FiTruck />
                    Distribucion de Costos por Orden de Fabricacion
                  </h3>
                  <p className="text-slate-200 text-sm mt-1">
                    El porcentaje de cada orden se calcula sumando el precio de
                    venta × cantidad avanzada de sus artículos, dividido entre
                    el total de todas las órdenes. Quien produce más valor,
                    asume proporcionalmente más costo de materia prima.
                  </p>
                </div>

                <div className="p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Object.values(ordenesProrrateo)
                      .sort((a, b) => b.porcentaje - a.porcentaje)
                      .map((orden) => (
                        <div
                          key={orden.id_orden_fabricacion}
                          className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all"
                        >
                          {/* Header compacto con info principal */}
                          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="font-bold text-white text-sm">
                                  OF #{orden.id_orden_fabricacion}
                                </p>
                                <p className="text-slate-300 text-xs truncate max-w-[180px]">
                                  {orden.nombre_cliente}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-xl font-bold text-white">
                                  {orden.porcentaje.toFixed(1)}%
                                </span>
                              </div>
                              <div className="text-right border-l border-slate-600 pl-4">
                                <p className="text-xs text-emerald-300">
                                  Costo Est.
                                </p>
                                <p className="font-bold text-emerald-400">
                                  {formatMoneda(orden.totalCostoEstimado)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Etapas en layout horizontal */}
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
                                      className={`flex-1 min-w-[200px] rounded-lg border ${colors.border} overflow-hidden`}
                                    >
                                      {/* Header de etapa compacto */}
                                      <div
                                        className={`px-2.5 py-1.5 ${colors.light} flex items-center justify-between`}
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`w-2 h-2 rounded-full ${colors.dot}`}
                                          ></span>
                                          <span
                                            className={`text-xs font-semibold ${colors.text}`}
                                          >
                                            {etapaNombre}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span
                                            className={`font-bold ${colors.text}`}
                                          >
                                            ~
                                            {formatUnidadesPorTipo(
                                              etapaData.unidadesProrrateadas,
                                            )}
                                          </span>
                                          <span className="text-slate-500">
                                            {etapaData.porcentaje.toFixed(1)}%
                                          </span>
                                        </div>
                                      </div>
                                      {/* Artículos compactos */}
                                      <div className="p-1.5 space-y-1 bg-white/50 max-h-28 overflow-y-auto">
                                        {Object.values(etapaData.articulos).map(
                                          (art) => (
                                            <div
                                              key={art.id_articulo}
                                              className="px-2 py-1 rounded bg-white border border-slate-100 flex items-center justify-between gap-2"
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
                                              <div className="text-right flex-shrink-0">
                                                <p className="text-[10px] font-semibold text-emerald-600">
                                                  {formatMoneda(
                                                    art.costoEstimado || 0,
                                                  )}
                                                </p>
                                              </div>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              {/* Mensaje si no hay etapas con consumo */}
                              {Object.entries(orden.etapas).filter(
                                ([_, etapaData]) => etapaData.tieneConsumo,
                              ).length === 0 && (
                                <div className="w-full text-center py-3 text-slate-400 text-xs">
                                  No hay etapas con consumo de MP registrado
                                </div>
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
        />
      </div>
    </div>
  );
};

export default HistorialConsumoMP;
