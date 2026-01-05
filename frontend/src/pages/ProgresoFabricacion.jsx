import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import progresoFabricacionService from "../services/progresoFabricacionService";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiPackage,
  FiChevronDown,
  FiChevronRight,
  FiRefreshCw,
  FiFilter,
  FiSearch,
  FiUser,
  FiChevronLeft,
  FiCalendar,
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
    limit: 15,
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
    // Si viene con orden desde la URL, cargar con esa búsqueda
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

      // Si hay búsqueda, traer todos los registros
      if (searchQuery) {
        params.busqueda = searchQuery;
        params.limit = 1000;
      }

      // Solo agregar fechaInicio si tiene valor
      if (filtros.fechaInicio) {
        params.fechaInicio = filtros.fechaInicio;
      }

      if (filtros.estado && !(searchQuery && /^\d+$/.test(searchQuery))) {
        params.estado = filtros.estado;
      }

      const progresoData = await progresoFabricacionService.getResumenPorOrden(
        params
      );

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

  // Buscar cuando el usuario deje de escribir
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (busqueda !== "") {
        setPaginacion((prev) => ({ ...prev, page: 1 }));
        fetchData(false, busqueda);
      } else if (!loading) {
        // Si se borró la búsqueda, recargar normal
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

  const formatMonto = (monto) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto || 0);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO");
  };

  // Componente de barra de progreso
  const BarraProgreso = ({ porcentaje, etapa, color }) => {
    const getColorClass = () => {
      if (porcentaje >= 100) return "bg-green-500";
      if (porcentaje >= 75) return "bg-blue-500";
      if (porcentaje >= 50) return "bg-yellow-500";
      if (porcentaje >= 25) return "bg-orange-500";
      return "bg-red-400";
    };

    return (
      <div className="w-full">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{etapa}</span>
          <span className="font-semibold">{porcentaje.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              color || getColorClass()
            }`}
            style={{ width: `${Math.min(porcentaje, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const ordenesAgrupadas = progreso;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">
          <FiRefreshCw className="animate-spin inline mr-2" />
          Cargando progreso de fabricación...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Progreso de Fabricación
          </h1>
          <p className="text-gray-600 mt-1">
            Seguimiento del avance de producción y consumo de materia prima
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha Inicio
            </label>
            <input
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) =>
                setFiltros({ ...filtros, fechaInicio: e.target.value })
              }
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado de Orden
            </label>
            <select
              value={filtros.estado}
              onChange={(e) =>
                setFiltros({ ...filtros, estado: e.target.value })
              }
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[160px]"
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
            className="cursor-pointer flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200"
          >
            <FiFilter size={16} />
            Filtrar
          </button>
        </div>

        {/* Buscador */}
        <div className="mt-4">
          <div className="relative">
            <FiSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por cliente, artículo, referencia o número de orden..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Vista de Progreso */}
      <div className="space-y-4">
        {ordenesAgrupadas.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <FiPackage size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {busqueda
                ? "No se encontraron órdenes que coincidan con la búsqueda"
                : "No hay órdenes de fabricación en el período seleccionado"}
            </p>
          </div>
        ) : (
          ordenesAgrupadas.map((orden) => {
            // Usar el porcentaje_general calculado en el backend (promedio real de avances)
            const progresoGeneral = parseFloat(orden.porcentaje_general) || 0;

            // Info de artículos
            const etapasInfo = {
              completadas: orden.articulos_completados || 0,
              enProceso: orden.articulos_en_proceso || 0,
              total: orden.total_articulos || orden.articulos?.length || 0,
            };

            return (
              <div
                key={orden.id_orden_fabricacion}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header de Orden */}
                <div
                  onClick={() => toggleOrden(orden.id_orden_fabricacion)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {expandedOrdenes[orden.id_orden_fabricacion] ? (
                      <FiChevronDown size={20} className="text-gray-400" />
                    ) : (
                      <FiChevronRight size={20} className="text-gray-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800">
                        Orden #{orden.id_orden_fabricacion}
                        {orden.nombre_cliente && (
                          <span className="ml-2 text-base font-normal text-gray-600">
                            - {orden.nombre_cliente}
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <FiCalendar size={14} />
                          {formatFecha(orden.fecha_inicio)}
                        </span>
                        {orden.nombre_cliente && (
                          <span className="flex items-center gap-1">
                            <FiUser size={14} />
                            {orden.nombre_cliente}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            orden.estado_orden === "Completada"
                              ? "bg-green-100 text-green-700"
                              : orden.estado_orden === "En proceso"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {orden.estado_orden}
                        </span>
                        <span className="text-xs text-gray-400">
                          {etapasInfo.completadas} de {etapasInfo.total}{" "}
                          artículos completados
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Progreso General</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {progresoGeneral.toFixed(1)}%
                      </p>
                    </div>
                    <div className="w-32">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            progresoGeneral >= 100
                              ? "bg-green-500"
                              : progresoGeneral >= 50
                              ? "bg-blue-500"
                              : "bg-yellow-500"
                          }`}
                          style={{
                            width: `${Math.min(progresoGeneral, 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detalle de artículos */}
                {expandedOrdenes[orden.id_orden_fabricacion] && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid gap-4">
                      {(orden.articulos || []).map((articulo, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-800">
                                {articulo.nombre_articulo}
                              </h4>
                              <p className="text-sm text-gray-500">
                                Cantidad: {articulo.cantidad_solicitada || 0}{" "}
                                unidades
                                {articulo.cantidad_completada > 0 && (
                                  <span className="text-green-600 ml-2">
                                    ({articulo.cantidad_completada} completadas)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-gray-800">
                                {parseFloat(
                                  articulo.porcentaje_avance || 0
                                ).toFixed(1)}
                                %
                              </p>
                              <p className="text-xs text-gray-500">
                                Etapa {articulo.etapas_completadas_count || 0}{" "}
                                de {articulo.orden_etapa_final || "?"}{" "}
                                completadas
                              </p>
                            </div>
                          </div>

                          {/* Barra de progreso general del artículo */}
                          <BarraProgreso
                            porcentaje={parseFloat(
                              articulo.porcentaje_avance || 0
                            )}
                            etapa="Progreso Total"
                          />

                          {/* Detalle de etapas con cantidades */}
                          {articulo.detalle_etapas &&
                            articulo.detalle_etapas.length > 0 && (
                              <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                                  <p className="text-sm font-medium text-gray-700">
                                    Detalle por etapa (de{" "}
                                    {articulo.cantidad_solicitada} unidades
                                    solicitadas)
                                  </p>
                                </div>
                                <div className="divide-y divide-gray-100">
                                  {articulo.detalle_etapas
                                    .filter(
                                      (etapa) =>
                                        etapa.orden_etapa <=
                                        (articulo.orden_etapa_final || 999)
                                    )
                                    .map((etapa, etapaIdx) => {
                                      const cantidad = etapa.cantidad || 0;
                                      const porcentajeEtapa =
                                        articulo.cantidad_solicitada > 0
                                          ? (cantidad /
                                              articulo.cantidad_solicitada) *
                                            100
                                          : 0;
                                      const esEtapaFinal =
                                        etapa.orden_etapa ===
                                        articulo.orden_etapa_final;

                                      return (
                                        <div
                                          key={etapaIdx}
                                          className={`px-3 py-2 flex items-center justify-between ${
                                            esEtapaFinal ? "bg-blue-50" : ""
                                          }`}
                                        >
                                          <div className="flex items-center gap-2">
                                            <span
                                              className={`w-2 h-2 rounded-full ${
                                                etapa.estado === "completado"
                                                  ? "bg-green-500"
                                                  : etapa.estado ===
                                                    "en proceso"
                                                  ? "bg-blue-500"
                                                  : "bg-gray-300"
                                              }`}
                                            ></span>
                                            <span
                                              className={`text-sm ${
                                                esEtapaFinal
                                                  ? "font-medium text-blue-700"
                                                  : "text-gray-700"
                                              }`}
                                            >
                                              {etapa.nombre_etapa}
                                              {esEtapaFinal && (
                                                <span className="text-xs ml-1">
                                                  (final)
                                                </span>
                                              )}
                                              <span
                                                className={`text-xs ml-1 ${
                                                  etapa.estado === "completado"
                                                    ? "text-green-600"
                                                    : etapa.estado ===
                                                      "en proceso"
                                                    ? "text-blue-600"
                                                    : "text-gray-400"
                                                }`}
                                              >
                                                →{" "}
                                                {etapa.estado === "completado"
                                                  ? "completo"
                                                  : etapa.estado ===
                                                    "en proceso"
                                                  ? "en proceso"
                                                  : "sin iniciar"}
                                              </span>
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-3">
                                            <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                              <div
                                                className={`h-1.5 rounded-full ${
                                                  etapa.estado === "completado"
                                                    ? "bg-green-500"
                                                    : etapa.estado ===
                                                      "en proceso"
                                                    ? "bg-blue-500"
                                                    : "bg-gray-300"
                                                }`}
                                                style={{
                                                  width: `${Math.min(
                                                    porcentajeEtapa,
                                                    100
                                                  )}%`,
                                                }}
                                              ></div>
                                            </div>
                                            <span
                                              className={`text-xs font-medium min-w-[35px] ${
                                                porcentajeEtapa >= 100
                                                  ? "text-green-600"
                                                  : porcentajeEtapa > 0
                                                  ? "text-blue-600"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              {porcentajeEtapa.toFixed(0)}%
                                            </span>
                                            <span
                                              className={`text-sm font-medium min-w-[50px] text-right ${
                                                cantidad > 0
                                                  ? etapa.estado ===
                                                    "completado"
                                                    ? "text-green-600"
                                                    : "text-blue-600"
                                                  : "text-gray-400"
                                              }`}
                                            >
                                              {cantidad}/
                                              {articulo.cantidad_solicitada}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Paginación */}
      {paginacion.totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-600">
            Mostrando página {paginacion.page} de {paginacion.totalPages} (
            {paginacion.total} órdenes en total)
          </p>
          <div className="flex items-center gap-2">
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

            {/* Números de página */}
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
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      paginacion.page === pageNum
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              }
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
      )}
    </div>
  );
};

export default ProgresoFabricacion;
