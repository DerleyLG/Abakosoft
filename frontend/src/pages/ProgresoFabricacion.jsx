import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import progresoFabricacionService from "../services/progresoFabricacionService";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPackage,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiFilter,
  FiSearch,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
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
  const ordenRefs = useRef({});
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
    const isCurrentlyExpanded = expandedOrdenes[idOrden];

    setExpandedOrdenes((prev) => ({
      ...prev,
      [idOrden]: !prev[idOrden],
    }));

    // Si se está expandiendo, hacer scroll hacia la tarjeta después de renderizar
    if (!isCurrentlyExpanded) {
      setTimeout(() => {
        const element = ordenRefs.current[idOrden];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 50);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
    });
  };

  // Componente de progreso circular
  const CircularProgress = ({ porcentaje, size = 80, strokeWidth = 6 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (porcentaje / 100) * circumference;

    const getColor = () => {
      if (porcentaje >= 100) return "#22c55e";
      if (porcentaje >= 75) return "#3b82f6";
      if (porcentaje >= 50) return "#eab308";
      if (porcentaje >= 25) return "#f97316";
      return "#ef4444";
    };

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">
            {Math.round(porcentaje)}%
          </span>
        </div>
      </div>
    );
  };

  // Mini barra de progreso para etapas
  const MiniProgressBar = ({ porcentaje, estado }) => {
    const getColor = () => {
      if (estado === "completado") return "bg-green-500";
      if (estado === "en proceso") return "bg-blue-500";
      if (estado === "pendiente") return "bg-orange-400";
      return "bg-gray-300";
    };

    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${Math.min(porcentaje, 100)}%` }}
        />
      </div>
    );
  };

  // Badge de estado
  const EstadoBadge = ({ estado }) => {
    const config = {
      Completada: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: FiCheckCircle,
      },
      "En proceso": {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: FiClock,
      },
      Pendiente: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        icon: FiCircle,
      },
    };
    const { bg, text, icon: Icon } = config[estado] || config["Pendiente"];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}
      >
        <Icon size={12} />
        {estado}
      </span>
    );
  };

  // Tarjeta de orden
  const OrdenCard = ({ orden }) => {
    const progresoGeneral = parseFloat(orden.porcentaje_general) || 0;
    const isExpanded = expandedOrdenes[orden.id_orden_fabricacion];

    return (
      <div
        ref={(el) => (ordenRefs.current[orden.id_orden_fabricacion] = el)}
        className={`bg-white rounded-2xl shadow-sm border transition-all duration-300 scroll-mt-4 ${
          isExpanded
            ? "border-blue-200 shadow-md col-span-1 lg:col-span-2"
            : "border-gray-200 hover:shadow-md hover:border-gray-300"
        }`}
      >
        {/* Header de la tarjeta */}
        <div
          onClick={() => toggleOrden(orden.id_orden_fabricacion)}
          className="p-5 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-4">
            {/* Info de la orden */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl font-bold text-gray-800">
                  #{orden.id_orden_fabricacion}
                </span>
                <EstadoBadge estado={orden.estado_orden} />
              </div>

              {orden.nombre_cliente && (
                <p className="text-gray-600 font-medium truncate mb-2">
                  <FiUser className="inline mr-1" size={14} />
                  {orden.nombre_cliente}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <FiCalendar size={14} />
                  {formatFecha(orden.fecha_inicio)}
                </span>
                <span className="flex items-center gap-1">
                  <FiBox size={14} />
                  {orden.articulos_completados || 0}/
                  {orden.total_articulos || 0} artículos
                </span>
              </div>
            </div>

            {/* Progreso circular */}
            <div className="flex flex-col items-center">
              <CircularProgress porcentaje={progresoGeneral} />
              <button className="mt-2 text-gray-400 hover:text-gray-600 transition-colors">
                {isExpanded ? (
                  <FiChevronUp size={20} />
                ) : (
                  <FiChevronDown size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Vista rápida de artículos cuando no está expandido */}
          {!isExpanded && orden.articulos && orden.articulos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {orden.articulos.slice(0, 3).map((art, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs text-gray-600"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      parseFloat(art.porcentaje_avance) >= 100
                        ? "bg-green-500"
                        : parseFloat(art.porcentaje_avance) > 0
                          ? "bg-blue-500"
                          : "bg-gray-300"
                    }`}
                  />
                  <span className="truncate max-w-[120px]">
                    {art.nombre_articulo}
                  </span>
                </span>
              ))}
              {orden.articulos.length > 3 && (
                <span className="text-xs text-gray-400 px-2 py-1">
                  +{orden.articulos.length - 3} más
                </span>
              )}
            </div>
          )}
        </div>

        {/* Detalle expandido */}
        {isExpanded && (
          <div className="border-t border-gray-100 p-5 bg-gradient-to-b from-gray-50/50 to-white">
            <div className="grid gap-4 md:grid-cols-2">
              {(orden.articulos || []).map((articulo, idx) => (
                <ArticuloCard
                  key={idx}
                  articulo={articulo}
                  MiniProgressBar={MiniProgressBar}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Tarjeta de artículo
  const ArticuloCard = ({ articulo, MiniProgressBar }) => {
    const porcentaje = parseFloat(articulo.porcentaje_avance || 0);

    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
        {/* Header del artículo */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 truncate">
              {articulo.nombre_articulo}
            </h4>
            <p className="text-sm text-gray-500">
              {articulo.cantidad_completada || 0} de{" "}
              {articulo.cantidad_solicitada} unidades
            </p>
          </div>
          <div className="text-right ml-3">
            <span
              className={`text-xl font-bold ${
                porcentaje >= 100
                  ? "text-green-600"
                  : porcentaje > 0
                    ? "text-blue-600"
                    : "text-gray-400"
              }`}
            >
              {porcentaje.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Barra de progreso general */}
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                porcentaje >= 100
                  ? "bg-green-500"
                  : porcentaje >= 50
                    ? "bg-blue-500"
                    : porcentaje > 0
                      ? "bg-amber-500"
                      : "bg-gray-300"
              }`}
              style={{ width: `${Math.min(porcentaje, 100)}%` }}
            />
          </div>
        </div>

        {/* Etapas */}
        {articulo.detalle_etapas && articulo.detalle_etapas.length > 0 && (
          <div className="space-y-2">
            {articulo.detalle_etapas
              .filter(
                (etapa) =>
                  etapa.orden_etapa <= (articulo.orden_etapa_final || 999),
              )
              .map((etapa, etapaIdx) => {
                const cantidadCompletada =
                  Number(etapa.cantidad_completada) || 0;
                const cantidadEnProceso =
                  Number(etapa.cantidad_en_proceso) || 0;
                const cantidadTotal = cantidadCompletada + cantidadEnProceso;
                const cantidad =
                  cantidadTotal > 0
                    ? cantidadTotal
                    : Number(etapa.cantidad) || 0;
                const cantidadSolicitada =
                  Number(articulo.cantidad_solicitada) || 1;
                const porcentajeEtapa =
                  cantidadSolicitada > 0
                    ? (cantidad / cantidadSolicitada) * 100
                    : 0;
                const esEtapaFinal =
                  etapa.orden_etapa === articulo.orden_etapa_final;

                return (
                  <div
                    key={etapaIdx}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      esEtapaFinal
                        ? "bg-blue-50 border border-blue-200"
                        : etapa.estado === "pendiente"
                          ? "bg-orange-50/50"
                          : "bg-gray-50"
                    }`}
                  >
                    {/* Indicador de estado */}
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        etapa.estado === "completado"
                          ? "bg-green-100 text-green-600"
                          : etapa.estado === "en proceso"
                            ? "bg-blue-100 text-blue-600"
                            : etapa.estado === "pendiente"
                              ? "bg-orange-100 text-orange-500"
                              : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {etapa.estado === "completado" ? (
                        <FiCheckCircle size={14} />
                      ) : etapa.estado === "en proceso" ? (
                        <FiClock size={14} />
                      ) : (
                        <FiCircle size={12} />
                      )}
                    </span>

                    {/* Nombre de etapa */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate ${
                          esEtapaFinal
                            ? "text-blue-700"
                            : etapa.estado === "pendiente"
                              ? "text-orange-600"
                              : "text-gray-700"
                        }`}
                      >
                        {etapa.nombre_etapa}
                        {esEtapaFinal && (
                          <span className="text-xs ml-1 text-blue-500">★</span>
                        )}
                      </p>
                      <div className="mt-1">
                        <MiniProgressBar
                          porcentaje={porcentajeEtapa}
                          estado={etapa.estado}
                        />
                      </div>
                    </div>

                    {/* Cantidad */}
                    <span
                      className={`text-sm font-semibold whitespace-nowrap ${
                        etapa.estado === "completado"
                          ? "text-green-600"
                          : etapa.estado === "en proceso"
                            ? "text-blue-600"
                            : etapa.estado === "pendiente"
                              ? "text-orange-500"
                              : "text-gray-400"
                      }`}
                    >
                      {cantidad}/{cantidadSolicitada}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">
            Cargando progreso de fabricación...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Progreso de Fabricación
            </h1>
            <p className="text-gray-500 mt-1">
              Seguimiento del avance de producción
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition-all cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Buscar
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Cliente, artículo, referencia o # orden..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fecha inicio
              </label>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) =>
                  setFiltros({ ...filtros, fechaInicio: e.target.value })
                }
                className="border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Estado
              </label>
              <select
                value={filtros.estado}
                onChange={(e) =>
                  setFiltros({ ...filtros, estado: e.target.value })
                }
                className="border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[160px]"
              >
                {estadosOrden.map((estado) => (
                  <option key={estado.value} value={estado.value}>
                    {estado.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleFiltrar}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all cursor-pointer shadow-sm hover:shadow-md"
            >
              <FiFilter size={16} />
              Filtrar
            </button>
          </div>
        </div>
      </div>

      {/* Grid de órdenes */}
      <div className="max-w-7xl mx-auto">
        {progreso.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <FiPackage size={40} className="text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              No hay órdenes
            </h3>
            <p className="text-gray-500">
              {busqueda
                ? "No se encontraron órdenes que coincidan con la búsqueda"
                : "No hay órdenes de fabricación en el período seleccionado"}
            </p>
          </div>
        ) : (
          <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
            {progreso.map((orden) => (
              <OrdenCard key={orden.id_orden_fabricacion} orden={orden} />
            ))}
          </div>
        )}
      </div>

      {/* Paginación */}
      {paginacion.totalPages > 1 && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="flex justify-between items-center bg-white rounded-2xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-600">
              Página <span className="font-semibold">{paginacion.page}</span> de{" "}
              <span className="font-semibold">{paginacion.totalPages}</span>
              <span className="text-gray-400 ml-2">
                ({paginacion.total} órdenes)
              </span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(paginacion.page - 1)}
                disabled={paginacion.page === 1}
                className={`p-2 rounded-lg transition-all ${
                  paginacion.page === 1
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100 cursor-pointer"
                }`}
              >
                <FiChevronLeft size={20} />
              </button>

              {Array.from(
                { length: Math.min(5, paginacion.totalPages) },
                (_, i) => {
                  let pageNum;
                  if (paginacion.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (paginacion.page <= 3) {
                    pageNum = i + 1;
                  } else if (paginacion.page >= paginacion.totalPages - 2) {
                    pageNum = paginacion.totalPages - 4 + i;
                  } else {
                    pageNum = paginacion.page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                        paginacion.page === pageNum
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-100"
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
                className={`p-2 rounded-lg transition-all ${
                  paginacion.page === paginacion.totalPages
                    ? "text-gray-300 cursor-not-allowed"
                    : "text-gray-600 hover:bg-gray-100 cursor-pointer"
                }`}
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgresoFabricacion;
