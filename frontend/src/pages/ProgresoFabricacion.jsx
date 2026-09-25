import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import progresoFabricacionService from "../services/progresoFabricacionService";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPackage,
  FiChevronDown,
  FiRefreshCw,
  FiSearch,
  FiUser,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCircle,
  FiBox,
} from "react-icons/fi";

const ProgresoFabricacion = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ordenFromUrl = searchParams.get("orden");

  const [loading, setLoading] = useState(true);
  const [progreso, setProgreso] = useState([]);
  const [busqueda, setBusqueda] = useState(ordenFromUrl || "");
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    estado: ordenFromUrl ? "" : "En proceso",
  });
  const [expandedOrdenes, setExpandedOrdenes] = useState({});

  const [paginacion, setPaginacion] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const estadosOrden = [
    { value: "", label: "Todos los estados" },
    { value: "Pendiente", label: "Pendiente" },
    { value: "En proceso", label: "En proceso" },
    { value: "Completada", label: "Completada" },
  ];

  useEffect(() => {
    if (ordenFromUrl) {
      fetchData(true, ordenFromUrl);
    } else {
      fetchData();
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchData(false, busqueda);
    }
  }, [paginacion.page]);

  const fetchData = async (showFullLoading = true, searchQuery = "") => {
    try {
      if (showFullLoading) setLoading(true);

      const params = {
        page: paginacion.page,
        limit: paginacion.limit,
      };

      if (searchQuery) {
        params.busqueda = searchQuery;
        params.limit = 1000;
      }

      if (filtros.fechaInicio) {
        params.fechaInicio = filtros.fechaInicio;
      }

      if (filtros.estado && !(searchQuery && /^\d+$/.test(searchQuery))) {
        params.estado = filtros.estado;
      }

      const progresoData =
        await progresoFabricacionService.getResumenPorOrden(params);

      setProgreso(progresoData.data || []);
      setPaginacion((prev) => ({
        ...prev,
        total: progresoData.total || 0,
        totalPages: progresoData.totalPages || 1,
      }));
    } catch (error) {
      console.error("Error cargando progreso:", error);
      toast.error("Error al cargar el progreso de fabricación");
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    setPaginacion((prev) => ({ ...prev, page: 1 }));
    fetchData(true, busqueda);
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (busqueda !== "") {
        setPaginacion((prev) => ({ ...prev, page: 1 }));
        fetchData(false, busqueda);
      } else if (!loading) {
        fetchData(false, "");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= paginacion.totalPages) {
      setPaginacion((prev) => ({ ...prev, page: newPage }));
    }
  };

  const toggleOrden = (idOrden) => {
    setExpandedOrdenes((prev) => ({
      ...prev,
      [idOrden]: !prev[idOrden],
    }));
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "—";
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  };

  // Progreso circular SVG
  const CircularProgress = ({ porcentaje, size = 72, strokeWidth = 5 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset =
      circumference - (Math.min(porcentaje, 100) / 100) * circumference;
    const color =
      porcentaje >= 100
        ? "#22c55e"
        : porcentaje >= 75
          ? "#6366f1"
          : porcentaje >= 40
            ? "#f59e0b"
            : "#ef4444";

    return (
      <div
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
      >
        <svg className="-rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-800">
            {Math.round(porcentaje)}%
          </span>
        </div>
      </div>
    );
  };

  // Badge de estado
  const EstadoBadge = ({ estado }) => {
    const MAP = {
      Completada: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      "En proceso": "bg-indigo-50 text-indigo-700 border border-indigo-200",
      Pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
    };
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${MAP[estado] || "bg-slate-50 text-slate-600 border border-slate-200"}`}
      >
        {(estado || "—").toUpperCase()}
      </span>
    );
  };

  // Tarjeta de orden
  const OrdenCard = ({ orden }) => {
    const progresoGeneral = parseFloat(orden.porcentaje_general) || 0;
    const isExpanded = expandedOrdenes[orden.id_orden_fabricacion];

    return (
      <div
        className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-200 ${
          isExpanded
            ? "border-indigo-200"
            : "border-slate-200 hover:border-slate-300 hover:shadow"
        }`}
      >
        {/* Header clickeable */}
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer select-none"
          onClick={() => toggleOrden(orden.id_orden_fabricacion)}
        >
          <CircularProgress porcentaje={progresoGeneral} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-slate-900 text-base">
                #{orden.id_orden_fabricacion}
              </span>
              <EstadoBadge estado={orden.estado_orden} />
            </div>

            {orden.nombre_cliente && (
              <p className="text-xs text-slate-500 truncate flex items-center gap-1 mb-1">
                <FiUser size={11} />
                {orden.nombre_cliente}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <FiCalendar size={11} />
                {formatFecha(orden.fecha_inicio)}
              </span>
              <span className="flex items-center gap-1">
                <FiBox size={11} />
                {orden.articulos_completados || 0}/{orden.total_articulos || 0}{" "}
                artículos
              </span>
            </div>

            {/* Chips de artículos (colapsado) */}
            {!isExpanded && orden.articulos && orden.articulos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {orden.articulos.slice(0, 3).map((art, idx) => {
                  const pct = parseFloat(art.porcentaje_avance);
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md text-[11px] text-slate-600"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-400" : "bg-slate-300"}`}
                      />
                      <span className="truncate max-w-[100px]">
                        {art.nombre_articulo}
                      </span>
                    </span>
                  );
                })}
                {orden.articulos.length > 3 && (
                  <span className="text-[11px] text-slate-400 px-1.5 py-0.5">
                    +{orden.articulos.length - 3} más
                  </span>
                )}
              </div>
            )}
          </div>

          <FiChevronDown
            size={16}
            className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              {(orden.articulos || []).map((articulo, idx) => (
                <ArticuloCard key={idx} articulo={articulo} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tarjeta de artículo
  const ArticuloCard = ({ articulo }) => {
    const porcentaje = parseFloat(articulo.porcentaje_avance || 0);
    const barColor =
      porcentaje >= 100
        ? "bg-emerald-500"
        : porcentaje >= 50
          ? "bg-indigo-500"
          : porcentaje > 0
            ? "bg-amber-500"
            : "bg-slate-200";

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {articulo.nombre_articulo}
            </p>
            <p className="text-xs text-slate-400">
              {articulo.cantidad_completada || 0} /{" "}
              {articulo.cantidad_solicitada} unidades
            </p>
          </div>
          <span
            className={`text-base font-bold flex-shrink-0 ${
              porcentaje >= 100
                ? "text-emerald-600"
                : porcentaje > 0
                  ? "text-indigo-600"
                  : "text-slate-300"
            }`}
          >
            {porcentaje.toFixed(0)}%
          </span>
        </div>

        {/* Barra general */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          />
        </div>

        {/* Etapas */}
        {articulo.detalle_etapas && articulo.detalle_etapas.length > 0 && (
          <div className="space-y-1.5">
            {articulo.detalle_etapas
              .filter(
                (etapa) =>
                  etapa.orden_etapa <= (articulo.orden_etapa_final || 999),
              )
              .map((etapa, etapaIdx) => {
                const completada = Number(etapa.cantidad_completada) || 0;
                const enProceso = Number(etapa.cantidad_en_proceso) || 0;
                const cantidad =
                  completada + enProceso > 0
                    ? completada + enProceso
                    : Number(etapa.cantidad) || 0;
                const solicitada = Number(articulo.cantidad_solicitada) || 1;
                const pctEtapa = (cantidad / solicitada) * 100;
                const esEtapaFinal =
                  etapa.orden_etapa === articulo.orden_etapa_final;

                const ESTADO_ETAPA = {
                  completado: {
                    icon: FiCheckCircle,
                    dot: "bg-emerald-500",
                    text: "text-emerald-600",
                    bar: "bg-emerald-500",
                  },
                  "en proceso": {
                    icon: FiClock,
                    dot: "bg-indigo-400",
                    text: "text-indigo-600",
                    bar: "bg-indigo-400",
                  },
                  pendiente: {
                    icon: FiCircle,
                    dot: "bg-amber-400",
                    text: "text-amber-600",
                    bar: "bg-amber-400",
                  },
                };
                const cfg = ESTADO_ETAPA[etapa.estado] || {
                  icon: FiCircle,
                  dot: "bg-slate-200",
                  text: "text-slate-400",
                  bar: "bg-slate-200",
                };
                const Icon = cfg.icon;

                return (
                  <div
                    key={etapaIdx}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                      esEtapaFinal
                        ? "bg-indigo-50 border border-indigo-100"
                        : "bg-slate-50"
                    }`}
                  >
                    <Icon size={12} className={`flex-shrink-0 ${cfg.text}`} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${esEtapaFinal ? "text-indigo-700" : "text-slate-700"}`}
                      >
                        {etapa.nombre_etapa}
                        {esEtapaFinal && (
                          <span className="ml-1 text-indigo-400 text-[10px]">
                            final
                          </span>
                        )}
                      </p>
                      <div className="w-full bg-slate-200 rounded-full h-1 mt-0.5">
                        <div
                          className={`h-1 rounded-full ${cfg.bar}`}
                          style={{ width: `${Math.min(pctEtapa, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`font-semibold whitespace-nowrap ${cfg.text}`}
                    >
                      {cantidad}/{solicitada}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Manufactura y
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Progreso de fabricación
            </h1>
          </div>
          {paginacion.total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {paginacion.total} órdenes
            </p>
          )}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft size={14} /> Volver
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Buscar
            </label>
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Cliente, artículo, # orden…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Fecha inicio
            </label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) =>
                setFiltros({ ...filtros, fechaInicio: e.target.value })
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) =>
                setFiltros({ ...filtros, estado: e.target.value })
              }
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition min-w-[150px]"
            >
              {estadosOrden.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleFiltrar}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <FiRefreshCw size={13} /> Aplicar
          </button>
        </div>
      </div>

      {/* Grid de órdenes */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="animate-pulse w-16 h-16 rounded-full bg-slate-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="animate-pulse h-4 bg-slate-100 rounded w-1/3" />
                  <div className="animate-pulse h-3 bg-slate-100 rounded w-2/3" />
                  <div className="animate-pulse h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : progreso.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-16 text-center">
          <FiPackage size={36} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-600 mb-1">
            Sin resultados
          </p>
          <p className="text-xs text-slate-400">
            {busqueda
              ? "No se encontraron órdenes con esa búsqueda"
              : "No hay órdenes en el período seleccionado"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          {progreso.map((orden) => (
            <OrdenCard key={orden.id_orden_fabricacion} orden={orden} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {paginacion.totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página{" "}
              <span className="font-semibold text-slate-700">
                {paginacion.page}
              </span>{" "}
              de{" "}
              <span className="font-semibold text-slate-700">
                {paginacion.totalPages}
              </span>
              {paginacion.total > 0 && (
                <>
                  {" "}
                  —{" "}
                  <span className="font-semibold text-slate-700">
                    {paginacion.total}
                  </span>{" "}
                  órdenes
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(paginacion.page - 1)}
                disabled={paginacion.page === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              {Array.from(
                { length: Math.min(5, paginacion.totalPages) },
                (_, i) => {
                  let pageNum;
                  if (paginacion.totalPages <= 5) pageNum = i + 1;
                  else if (paginacion.page <= 3) pageNum = i + 1;
                  else if (paginacion.page >= paginacion.totalPages - 2)
                    pageNum = paginacion.totalPages - 4 + i;
                  else pageNum = paginacion.page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        paginacion.page === pageNum
                          ? "bg-slate-900 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                },
              )}
              <button
                onClick={() => handlePageChange(paginacion.page + 1)}
                disabled={paginacion.page === paginacion.totalPages}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgresoFabricacion;
