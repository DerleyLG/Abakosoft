import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePlan } from "../hooks/usePlanApi";
import api from "../services/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  FiArrowRight,
  FiAlertCircle,
  FiBox,
  FiClock,
  FiCalendar,
  FiDollarSign,
  FiShoppingBag,
  FiTrendingUp,
  FiUsers,
  FiUserCheck,
  FiLock,
} from "react-icons/fi";

const Dashboard = () => {
  const [data, setData] = useState({
    totalArticulos: 0,
    ordenesPendientes: 0,
    totalOrdenesEnProceso: 0,
    trabajadoresActivos: 0,
    TotalClientes: 0,
    produccionMensual: [],
    ingresosMes: 0,
    egresosMes: 0,
    ventasSemana: 0,
    comprasSemana: 0,
    margenUtilidad: 0,
    costosIndirectos: 0,
    pagosTrabajadores: 0,
    articulosBajoStock: [],
    ordenesEnProceso: [],
    tendenciaIngresos: 0,
    tendenciaEgresos: 0,
    tendenciaPagosSem: 0,
    topVendidosMes: [],
    topFabricadosMes: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { features } = usePlan();
  const esFabricacion = features.includes("fabricacion");
  const esPagos = features.includes("pagos");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get("/dashboard");

        setData((prevData) => ({
          ...prevData,
          ...res.data,
        }));
      } catch (err) {
        console.error("Error cargando datos del dashboard:", err);
        setError(
          "Error al cargar los datos del dashboard. Inténtalo de nuevo más tarde.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Cargando...
      </div>
    );
  if (error)
    return <div className="text-center text-red-500 mt-20">{error}</div>;

  const hoy = new Date();
  const fechaActual = hoy.toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formatCurrency = (value) =>
    `$${Number(value || 0).toLocaleString("es-CO")}`;

  const meses = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const produccionChart = meses.map((m, i) => {
    const mesData = (data.produccionMensual || []).find((d) => d.mes === i + 1);
    return { name: m, total: mesData ? mesData.total : 0 };
  });

  const totalProduccionAnual = produccionChart.reduce(
    (acc, item) => acc + Number(item.total || 0),
    0,
  );
  const mesesConProduccion = produccionChart.filter(
    (item) => Number(item.total || 0) > 0,
  ).length;
  const promedioMensualProduccion = mesesConProduccion
    ? Math.round(totalProduccionAnual / mesesConProduccion)
    : 0;
  const mejorMes = produccionChart.reduce(
    (best, item) =>
      Number(item.total || 0) > Number(best.total || 0) ? item : best,
    { name: "-", total: 0 },
  );

  const kpisPrincipales = [
    {
      titulo: "Artículos",
      valor: Number(data.totalArticulos || 0).toLocaleString(),
      icono: FiBox,
      colorIcono: "text-blue-700 bg-blue-50",
    },
    {
      titulo: "Órdenes en proceso",
      valor: Number(
        data.totalOrdenesEnProceso || (data.ordenesEnProceso || []).length || 0,
      ).toLocaleString(),
      icono: FiAlertCircle,
      colorIcono: "text-amber-700 bg-amber-50",
      locked: !esFabricacion,
    },
    {
      titulo: "Trabajadores activos",
      valor: Number(data.trabajadoresActivos || 0).toLocaleString(),
      icono: FiUserCheck,
      colorIcono: "text-emerald-700 bg-emerald-50",
    },
    {
      titulo: "Clientes",
      valor: Number(data.TotalClientes || 0).toLocaleString(),
      icono: FiUsers,
      colorIcono: "text-slate-700 bg-slate-100",
    },
  ];

  const ordenesEnProceso = Array.isArray(data.ordenesEnProceso)
    ? data.ordenesEnProceso
    : [];

  const topVendidos = Array.isArray(data.topVendidosMes)
    ? data.topVendidosMes
    : [];
  const topFabricados = Array.isArray(data.topFabricadosMes)
    ? data.topFabricadosMes
    : [];

  const getEtiquetaOrden = (orden) => {
    if (!orden) return "Sin detalle";
    return (
      orden.referencia ||
      orden.descripcion ||
      orden.cliente ||
      orden.nombre_cliente ||
      "Orden en proceso"
    );
  };

  const getEstadoOrden = (orden) => {
    if (!orden) return "En proceso";
    return orden.etapa_actual || orden.etapa || orden.estado || "En proceso";
  };

  const articulosBajoStock = Array.isArray(data.articulosBajoStock)
    ? data.articulosBajoStock.map((art) => ({
        ...art,
        stock: parseInt(art.stock, 10),
      }))
    : [];

  const maxProduccion = Math.max(
    1,
    ...produccionChart.map((item) => Number(item.total || 0)),
  );

  const getProduccionColor = (value) => {
    const ratio = Number(value || 0) / maxProduccion;
    if (ratio >= 0.8) return "#334155";
    if (ratio >= 0.55) return "#475569";
    if (ratio >= 0.3) return "#64748b";
    if (ratio > 0) return "#94a3b8";
    return "#cbd5e1";
  };

  const maxComercialSemana = Math.max(
    Number(data.ventasSemana || 0),
    Number(data.comprasSemana || 0),
    0,
  );

  const maxNominaSemana = Math.max(
    Number(data.pagosTrabajadores || 0),
    Number(data.anticiposSemana || 0),
    0,
  );

  const getBarWidth = (value, maxValue) => {
    if (!maxValue || maxValue <= 0) return "0%";
    // Evita que una sola métrica llene por completo la barra.
    const pct = (Number(value || 0) / maxValue) * 86;
    return `${Math.min(86, Math.max(0, Math.round(pct)))}%`;
  };

  const accesosRapidos = [
    { label: "Tesorería", to: "/tesoreria" },
    { label: "Inventario", to: "/inventario" },
    { label: "Tablero", to: "/kanban", locked: !esFabricacion },
  ];

  return (
    <main className="flex-grow bg-slate-100 px-3 md:px-4 xl:px-6 py-3 md:py-4 min-h-[calc(100vh-68px)] overflow-auto">
      <div className="mx-auto w-full max-w-[1700px] grid grid-rows-[auto_auto_auto] gap-3">
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">
                Dashboard Operativo
              </h1>
              <p className="text-xs md:text-sm text-slate-500 inline-flex items-center gap-2">
                <FiCalendar /> {fechaActual}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
              {accesosRapidos.map((item) =>
                item.locked ? (
                  <div
                    key={item.label}
                    className="bg-slate-700 text-slate-400 rounded-lg px-3 py-2 text-xs md:text-sm font-semibold flex items-center justify-between cursor-not-allowed select-none"
                    title="Disponible en plan Pro"
                  >
                    <span>{item.label}</span>
                    <FiLock size={13} />
                  </div>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="group bg-slate-900 text-white rounded-lg px-3 py-2 text-xs md:text-sm font-semibold shadow-sm hover:bg-slate-800 transition-colors flex items-center justify-between"
                  >
                    <span>{item.label}</span>
                    <FiArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpisPrincipales.map((kpi, idx) => {
            const Icono = kpi.icono;
            return (
              <article
                key={kpi.titulo}
                className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm animate-fade-in-up relative overflow-hidden"
                style={{ animationDelay: `${0.05 * idx}s` }}
              >
                {kpi.locked && (
                  <div className="absolute inset-0 z-10 bg-white/75 flex items-center justify-center rounded-lg">
                    <span className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                      <FiLock size={10} /> Pro
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                      {kpi.titulo}
                    </p>
                    <p className="mt-1 text-2xl leading-none font-bold text-slate-900">
                      {kpi.valor}
                    </p>
                  </div>
                  <div className={`p-2 rounded ${kpi.colorIcono}`}>
                    <Icono size={16} />
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-3 min-h-0">
          <div className="xl:col-span-7 min-h-0 bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex flex-col h-[420px] relative overflow-hidden">
            {!esFabricacion && (
              <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-2">
                <FiLock size={24} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">
                  Producción mensual
                </p>
                <p className="text-xs text-slate-400">
                  Disponible en el plan Profesional
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Producción mensual
              </h2>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={produccionChart}
                  margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#e2e8f0"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="#64748b"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.08)",
                      fontSize: 12,
                    }}
                    formatter={(value) => [
                      `${Number(value).toLocaleString("es-CO")}`,
                      "Producción",
                    ]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {produccionChart.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}-${index}`}
                        fill={getProduccionColor(entry.total)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-5 min-h-0 grid grid-rows-[auto_auto] gap-3 h-[420px]">
            <Link
              to="/tesoreria"
              className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                  Resumen financiero
                </h3>
                <FiDollarSign className="text-slate-400" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-2">
                  <p className="text-slate-600">Ingresos</p>
                  <p className="font-bold text-emerald-700 text-sm">
                    {formatCurrency(data.ingresosMes)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                  <p className="text-slate-600">Egresos</p>
                  <p className="font-bold text-red-700 text-sm">
                    {formatCurrency(data.egresosMes)}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-2">
                  <p className="text-slate-600">Margen</p>
                  <p className="font-bold text-blue-700 text-sm">
                    {Number(data.margenUtilidad || 0).toLocaleString()}%
                  </p>
                </div>
              </div>
            </Link>

            <div className="min-h-0 grid grid-rows-[auto] gap-2.5">
              <div className="grid grid-cols-3 gap-2.5">
                {esFabricacion ? (
                  <Link
                    to="/ordenes_fabricacion"
                    className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-2.5 hover:shadow-md transition-shadow h-[300px]"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-700 inline-flex items-center gap-1.5 ">
                        <FiClock className="text-amber-600" />
                        EN PROCESO
                      </h3>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 max-h-[208px] overflow-auto pr-1">
                      {ordenesEnProceso.length > 0 ? (
                        ordenesEnProceso.slice(0, 10).map((orden, idx) => (
                          <div
                            key={orden.id_orden_fabricacion || idx}
                            className="text-[11px] border border-slate-200 rounded px-1.5 py-1"
                          >
                            <p className="truncate text-slate-700 font-semibold">
                              OF #{orden.id_orden_fabricacion || "-"}
                            </p>
                            <p className="truncate text-slate-500">
                              {getEstadoOrden(orden)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-500">
                          Sin órdenes recientes
                        </p>
                      )}
                    </div>
                  </Link>
                ) : (
                  <div className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-2.5 h-[300px] flex flex-col items-center justify-center gap-2">
                    <FiLock size={18} className="text-slate-300" />
                    <p className="text-xs font-semibold text-slate-500 text-center">
                      Órdenes en proceso
                    </p>
                    <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                      Plan Pro
                    </span>
                  </div>
                )}

                <Link
                  to="/inventario"
                  className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-2.5 hover:shadow-md transition-shadow h-[300px]"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold text-slate-700">
                      BAJO STOCK
                    </h3>
                    <FiAlertCircle className="text-red-500" size={14} />
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 space-y-1 max-h-[208px] overflow-auto pr-1">
                    {articulosBajoStock.length > 0 ? (
                      articulosBajoStock.slice(0, 6).map((art, idx) => (
                        <div
                          key={art.id_articulo || idx}
                          className="text-[11px] flex items-center justify-between border border-slate-200 rounded px-1.5 py-1"
                        >
                          <span className="truncate text-slate-700 pr-2">
                            {art.descripcion}
                          </span>
                          <span className="text-red-700 font-semibold whitespace-nowrap">
                            {art.stock}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Inventario estable
                      </p>
                    )}
                  </div>
                </Link>

                <div className="col-span-1 bg-white border border-slate-200 rounded-xl shadow-sm p-2.5 h-[300px] overflow-hidden">
                  <h3 className="text-xs font-semibold text-slate-700 mb-1.5">
                    TOP DEL MES
                  </h3>
                  <div className="space-y-2 text-[11px] max-h-[248px] overflow-auto pr-1">
                    <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                      <p className="text-[10px] uppercase text-slate-500">
                        Ventas
                      </p>
                      {topVendidos.length > 0 ? (
                        topVendidos.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className={
                              idx === 0
                                ? ""
                                : "mt-1 pt-1 border-t border-slate-200"
                            }
                          >
                            <p className="truncate text-slate-700 font-medium">
                              {idx + 1}. {item.descripcion}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {Number(item.total || 0).toLocaleString("es-CO")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-500">Sin datos</p>
                      )}
                    </div>
                    <div className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1.5">
                      <p className="text-[10px] uppercase text-slate-500">
                        Fabricación
                      </p>
                      {!esFabricacion ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <FiLock size={10} className="text-slate-400" />
                          <p className="text-[10px] text-slate-400 font-medium">
                            Plan Pro
                          </p>
                        </div>
                      ) : topFabricados.length > 0 ? (
                        topFabricados.slice(0, 2).map((item, idx) => (
                          <div
                            key={idx}
                            className={
                              idx === 0
                                ? ""
                                : "mt-1 pt-1 border-t border-slate-200"
                            }
                          >
                            <p className="truncate text-slate-700 font-medium">
                              {idx + 1}. {item.descripcion}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {Number(item.total || 0).toLocaleString("es-CO")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[10px] text-slate-500">Sin datos</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <article className="bg-white border border-slate-200 rounded-xl shadow-sm p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 inline-flex items-center gap-2">
                <FiTrendingUp className="text-slate-600" />
                Comercial semanal
              </h3>
              <span className="text-[11px] text-slate-500">
                Vendido vs Comprado
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                <p className="text-[11px] text-slate-600">
                  Vendido esta semana
                </p>
                <p className="text-lg font-bold text-emerald-700">
                  {formatCurrency(data.ventasSemana)}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-[11px] text-slate-600">
                  Comprado esta semana
                </p>
                <p className="text-lg font-bold text-red-700">
                  {formatCurrency(data.comprasSemana)}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                <span className="text-[11px] font-medium text-slate-600 inline-flex items-center gap-1">
                  <FiTrendingUp size={12} /> Vendido
                </span>
                <div className="h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600"
                    style={{
                      width: getBarWidth(data.ventasSemana, maxComercialSemana),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">
                  {formatCurrency(data.ventasSemana)}
                </span>
              </div>

              <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
                <span className="text-[11px] font-medium text-slate-600 inline-flex items-center gap-1">
                  <FiShoppingBag size={12} /> Comprado
                </span>
                <div className="h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: getBarWidth(
                        data.comprasSemana,
                        maxComercialSemana,
                      ),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">
                  {formatCurrency(data.comprasSemana)}
                </span>
              </div>
            </div>
          </article>

          <article className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 relative overflow-hidden">
            {!esPagos && (
              <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center gap-2">
                <FiLock size={24} className="text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">
                  Pagos a trabajadores
                </p>
                <p className="text-xs text-slate-400">
                  Disponible en el plan Profesional
                </p>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                PAGOS A TRABAJADORES
              </h3>
              <span className="text-[11px] text-slate-500">
                Pagado y anticipado
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="rounded-lg bg-red-50 border border-red-100 px-2.5 py-2">
                <p className="text-[10px] text-slate-600">Pagado semana</p>
                <p className="text-sm font-bold text-red-700">
                  {formatCurrency(data.pagosTrabajadores)}
                </p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-2.5 py-2">
                <p className="text-[10px] text-slate-600">Anticipado semana</p>
                <p className="text-sm font-bold text-rose-700">
                  {formatCurrency(data.anticiposSemana)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-[116px_1fr_auto] items-center gap-2">
                <span className="text-[11px] text-slate-600">Pagado</span>
                <div className="h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: getBarWidth(
                        data.pagosTrabajadores,
                        maxNominaSemana,
                      ),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">
                  {formatCurrency(data.pagosTrabajadores)}
                </span>
              </div>

              <div className="grid grid-cols-[116px_1fr_auto] items-center gap-2">
                <span className="text-[11px] text-slate-600">Anticipado</span>
                <div className="h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-rose-500"
                    style={{
                      width: getBarWidth(data.anticiposSemana, maxNominaSemana),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-700">
                  {formatCurrency(data.anticiposSemana)}
                </span>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
};

export default Dashboard;
