import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { generateUUID } from "../utils/uuid";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiClock,
  FiCheckCircle,
  FiArrowLeft,
  FiMenu,
  FiPackage,
  FiTruck,
  FiSearch,
  FiUser,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import React from "react";
import { useSidebar } from "../context/SidebarContext";
import DrawerOrdenesEntregadas from "../components/DrawerOrdenesEntregadas";
import Swal from "sweetalert2";

// Helper para formatear fechas evitando problemas de zona horaria
const formatFecha = (fecha) => {
  if (!fecha) return "";
  // Si es string, extraer solo la parte de fecha (YYYY-MM-DD)
  const fechaStr = typeof fecha === "string" ? fecha.split("T")[0] : fecha;
  const [year, month, day] = fechaStr.split("-");
  return `${day}/${month}/${year}`;
};

const KanbanBoard = () => {
  const [columnas, setColumnas] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMes, setDrawerMes] = useState(null);
  const [drawerAnio, setDrawerAnio] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrdenes, setSelectedOrdenes] = useState(new Set());
  const [puedeScrollIzq, setPuedeScrollIzq] = useState(false);
  const [puedeScrollDer, setPuedeScrollDer] = useState(false);
  const scrollRef = useRef(null);
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar, openSidebar } = useSidebar();

  useEffect(() => {
    // Ocultar sidebar al entrar a Kanban (vista inmersiva)
    closeSidebar();

    fetchKanbanData();

    // Cleanup: Restaurar sidebar al salir del componente
    return () => {
      openSidebar();
    };
  }, []);

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/kanban/ordenes-fabricacion");
      setColumnas(res.data.columnas || {});
      setEtapas(res.data.etapas || []);
      setSelectedOrdenes(new Set()); // Limpiar selección al recargar
    } catch (error) {
      console.error("Error cargando datos del Kanban:", error);
      toast.error("Error al cargar el tablero Kanban");
    } finally {
      setLoading(false);
    }
  };

  // ── Scroll horizontal mejorado ──
  const actualizarEstadoScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setPuedeScrollIzq(el.scrollLeft > 4);
    setPuedeScrollDer(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    // Recalcular al cargar datos y al cambiar el tamaño de la ventana
    const t = setTimeout(actualizarEstadoScroll, 100);
    window.addEventListener("resize", actualizarEstadoScroll);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", actualizarEstadoScroll);
    };
  }, [columnas, actualizarEstadoScroll]);

  const scrollHorizontal = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const cantidad = Math.max(300, el.clientWidth * 0.7);
    const inicio = el.scrollLeft;
    const destino = inicio + dir * cantidad;
    const duracion = 450; // ms
    const t0 = performance.now();

    // Easing suave (easeInOutCubic) para un desplazamiento fluido
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const animar = (tiempo) => {
      const progreso = Math.min((tiempo - t0) / duracion, 1);
      el.scrollLeft = inicio + (destino - inicio) * easeInOutCubic(progreso);
      if (progreso < 1) requestAnimationFrame(animar);
    };
    requestAnimationFrame(animar);
  };

  // Rueda del mouse sobre el tablero → scroll horizontal
  const handleWheel = (e) => {
    const el = scrollRef.current;
    if (!el) return;
    // Solo interceptar si el scroll vertical de la columna no puede avanzar
    // o si el usuario hace scroll horizontal con shift
    if (e.shiftKey) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
      return;
    }
    // Si el delta es mayormente horizontal, usarlo directamente
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      el.scrollLeft += e.deltaX;
      e.preventDefault();
    }
  };

  const handleScroll = () => {
    actualizarEstadoScroll();
  };

  const getBadgeColor = (prioridad) => {
    switch (prioridad) {
      case "retrasada":
        return "bg-red-100 text-red-800 border-red-300";
      case "urgente":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-green-100 text-green-800 border-green-300";
    }
  };

  const getPrioridadTexto = (prioridad, dias) => {
    if (prioridad === "retrasada") return `Retrasada ${Math.abs(dias)} días`;
    if (prioridad === "urgente") return `${dias} días restantes`;
    if (dias !== null) return `${dias} días restantes`;
    return "Sin fecha estimada";
  };

  const marcarComoEntregada = async (id_orden) => {
    const result = await Swal.fire({
      title: "¿Marcar como entregada?",
      html: `
        <p class="mb-2">La orden <strong>OF #${id_orden}</strong> será marcada como entregada.</p>
        <p class="text-sm text-gray-600">Esto la moverá al historial de órdenes entregadas.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, marcar como entregada",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(
          `/kanban/marcar-entregada/${id_orden}`,
          {},
          { headers: { "X-Idempotency-Key": generateUUID() } },
        );
        toast.success("Orden marcada como entregada exitosamente");

        // Usar la fecha retornada por el backend para el filtro del drawer
        if (response.data && response.data.fecha_entrega) {
          const fechaEntrega = new Date(response.data.fecha_entrega);
          setDrawerMes(fechaEntrega.getMonth() + 1);
          setDrawerAnio(fechaEntrega.getFullYear());
        } else {
          // Fallback a fecha actual si no viene en la respuesta
          const ahora = new Date();
          setDrawerMes(ahora.getMonth() + 1);
          setDrawerAnio(ahora.getFullYear());
        }

        fetchKanbanData(); // Recargar datos
        setDrawerOpen(true); // Abrir drawer para ver la orden entregada
      } catch (error) {
        console.error("Error marcando orden como entregada:", error);
        toast.error("Error al marcar la orden como entregada");
      }
    }
  };

  // ── Selección múltiple para marcar como entregadas ──
  const toggleSeleccion = (id) => {
    setSelectedOrdenes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const finalizadasIds = (columnas["finalizada"] || []).map(
    (o) => o.id_orden_fabricacion,
  );
  const todasFinalizadasSeleccionadas =
    finalizadasIds.length > 0 &&
    finalizadasIds.every((id) => selectedOrdenes.has(id));

  const seleccionarTodasFinalizadas = () => {
    setSelectedOrdenes((prev) => {
      const next = new Set(prev);
      if (todasFinalizadasSeleccionadas) {
        finalizadasIds.forEach((id) => next.delete(id));
      } else {
        finalizadasIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const marcarSeleccionadasComoEntregadas = async () => {
    const ids = Array.from(selectedOrdenes);
    if (ids.length === 0) return;

    const result = await Swal.fire({
      title: `¿Marcar ${ids.length} órdenes como entregadas?`,
      html: `
        <p class="mb-2">Las órdenes <strong>${ids
          .map((id) => `#${id}`)
          .join(", ")}</strong> serán marcadas como entregadas.</p>
        <p class="text-sm text-gray-600">Esto las moverá al historial de órdenes entregadas.</p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, marcar como entregadas",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await api.post(
        "/kanban/marcar-entregadas",
        { ids },
        { headers: { "X-Idempotency-Key": generateUUID() } },
      );
      toast.success(
        `${ids.length} órdenes marcadas como entregadas exitosamente`,
      );

      // Usar la fecha retornada por el backend para el filtro del drawer
      if (response.data?.ordenes?.[0]?.fecha_entrega) {
        const fechaEntrega = new Date(response.data.ordenes[0].fecha_entrega);
        setDrawerMes(fechaEntrega.getMonth() + 1);
        setDrawerAnio(fechaEntrega.getFullYear());
      } else {
        const ahora = new Date();
        setDrawerMes(ahora.getMonth() + 1);
        setDrawerAnio(ahora.getFullYear());
      }

      setSelectedOrdenes(new Set());
      fetchKanbanData(); // Recargar datos
      setDrawerOpen(true); // Abrir drawer para ver las órdenes entregadas
    } catch (error) {
      console.error("Error marcando órdenes como entregadas:", error);
      toast.error("Error al marcar las órdenes como entregadas");
    }
  };

  // Colores rotativos para las columnas de etapas (misma paleta visual)
  const coloresColumnas = [
    "bg-blue-50",
    "bg-indigo-50",
    "bg-purple-50",
    "bg-pink-50",
    "bg-amber-50",
    "bg-cyan-50",
    "bg-rose-50",
    "bg-teal-50",
  ];

  // Construir columnas dinámicamente desde las etapas que devuelve el backend
  // Solo mostrar columnas que tienen al menos una orden
  const columnasConfig = [
    ...((columnas["sin_iniciar"] || []).length > 0
      ? [
          {
            key: "sin_iniciar",
            titulo: "Sin iniciar",
            icon: FiClock,
            color: "bg-slate-50",
          },
        ]
      : []),
    ...etapas
      .filter((etapa) => (columnas[`etapa_${etapa.id_etapa}`] || []).length > 0)
      .map((etapa, idx) => ({
        key: `etapa_${etapa.id_etapa}`,
        titulo: etapa.nombre,
        icon: FiClock,
        color: coloresColumnas[idx % coloresColumnas.length],
      })),
    ...((columnas["finalizada"] || []).length > 0
      ? [
          {
            key: "finalizada",
            titulo: "Finalizado",
            icon: FiCheckCircle,
            color: "bg-green-50",
          },
        ]
      : []),
  ];

  // ¿Hay resultados que coincidan con la búsqueda en alguna columna?
  const hayResultadosBusqueda =
    !searchTerm ||
    columnasConfig.some((config) =>
      (columnas[config.key] || []).some((orden) => {
        const term = searchTerm.toLowerCase();
        return (
          orden.id_orden_fabricacion.toString().includes(term) ||
          orden.nombre_cliente?.toLowerCase().includes(term)
        );
      }),
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">
          Cargando tablero de producción...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[100dvh] flex flex-col px-3 md:px-8 py-2 md:py-4 select-none overflow-hidden">
      {/* Header */}
      <div className="mb-2 md:mb-3 flex-shrink-0">
        <div className="flex justify-between items-center gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Manufactura y
            </p>
            <h2 className="text-lg md:text-2xl font-bold text-gray-800 -mt-0.5 truncate">
              Tablero de Producción
            </h2>
            <p className="hidden md:block text-gray-600 text-sm mt-1">
              Seguimiento de órdenes de fabricación en tiempo real
            </p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="cursor-pointer flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 md:px-4 py-2 rounded-md font-semibold transition-colors shadow-sm"
              title="Ver órdenes entregadas"
            >
              <FiPackage size={16} />
              <span className="hidden sm:inline">Ver entregadas</span>
            </button>
            {sidebarOpen && (
              <button
                onClick={closeSidebar}
                className="cursor-pointer flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 md:px-4 py-2 rounded-md font-semibold transition shadow-sm"
                title="Maximizar tablero"
              >
                <FiMenu size={16} />
                <span className="hidden sm:inline">Ocultar menú</span>
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2.5 md:px-4 py-2 rounded-md font-semibold transition shadow-sm"
              title="Volver"
            >
              <FiArrowLeft size={16} />
              <span className="hidden sm:inline">Volver</span>
            </button>
          </div>
        </div>

        {/* Filtro de búsqueda */}
        <div className="relative max-w-full md:max-w-md">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por ID de orden o nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-1.5 md:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="relative flex-1 min-h-0">
        {/* Flecha izquierda */}
        {puedeScrollIzq && (
          <button
            onClick={() => scrollHorizontal(-1)}
            className="cursor-pointer absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-slate-900 text-white hover:bg-slate-700 w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 animate-fade-in"
            title="Ver columnas anteriores"
            aria-label="Scroll horizontal a la izquierda"
          >
            <FiChevronLeft size={22} />
          </button>
        )}

        {/* Flecha derecha */}
        {puedeScrollDer && (
          <button
            onClick={() => scrollHorizontal(1)}
            className="cursor-pointer absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-slate-900 text-white hover:bg-slate-700 w-10 h-10 rounded-full shadow-xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 animate-fade-in"
            title="Ver más columnas"
            aria-label="Scroll horizontal a la derecha"
          >
            <FiChevronRight size={22} />
          </button>
        )}

        <div className="bg-white rounded-xl shadow-lg p-2 md:p-3 h-full overflow-hidden">
          {columnasConfig.length === 0 ||
          (searchTerm && !hayResultadosBusqueda) ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
              {searchTerm ? (
                <FiSearch size={40} className="opacity-40" />
              ) : (
                <FiPackage size={40} className="opacity-40" />
              )}
              <p className="text-sm font-medium">
                {searchTerm
                  ? "No se encontraron órdenes"
                  : "No hay órdenes en el tablero"}
              </p>
              <p className="text-xs">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Las columnas aparecen cuando tienen al menos una orden"}
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              onWheel={handleWheel}
              className="flex gap-2 md:gap-2.5 h-full overflow-x-auto overflow-y-hidden pb-2 kanban-scroll"
            >
              {columnasConfig.map((config) => {
                const ordenes = columnas[config.key] || [];
                const Icon = config.icon;

                // Filtrar por término de búsqueda
                const ordenesFiltradas = ordenes.filter((orden) => {
                  if (!searchTerm) return true;
                  const term = searchTerm.toLowerCase();
                  const matchId = orden.id_orden_fabricacion
                    .toString()
                    .includes(term);
                  const matchCliente = orden.nombre_cliente
                    ?.toLowerCase()
                    .includes(term);
                  return matchId || matchCliente;
                });

                // Ordenar: primero las que están en proceso, después las pendientes
                const ordenesOrdenadas = [...ordenesFiltradas].sort((a, b) => {
                  if (
                    a.estado_etapa === "en_proceso" &&
                    b.estado_etapa !== "en_proceso"
                  )
                    return -1;
                  if (
                    a.estado_etapa !== "en_proceso" &&
                    b.estado_etapa === "en_proceso"
                  )
                    return 1;
                  return 0; // Mantener orden original si ambas tienen el mismo estado
                });

                return (
                  <div
                    key={config.key}
                    className="flex-shrink-0 w-56 md:w-60 lg:w-64 xl:w-72 h-full flex flex-col"
                  >
                    {/* Header de columna */}
                    <div
                      className={`${config.color} rounded-lg p-2 mb-2 border-2 border-gray-200 flex-shrink-0`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="text-gray-700" size={18} />
                          <h3 className="font-bold text-gray-800 text-sm">
                            {config.titulo}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          {config.key === "finalizada" && (
                            <button
                              onClick={seleccionarTodasFinalizadas}
                              className="cursor-pointer text-[11px] font-semibold text-green-700 hover:text-green-800 underline underline-offset-2"
                              title={
                                todasFinalizadasSeleccionadas
                                  ? "Deseleccionar todas"
                                  : "Seleccionar todas las finalizadas"
                              }
                            >
                              {todasFinalizadasSeleccionadas
                                ? "Deseleccionar"
                                : "Seleccionar todas"}
                            </button>
                          )}
                          <span className="bg-white px-2 py-0.5 rounded-full text-xs font-semibold text-gray-700">
                            {ordenesOrdenadas.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lista de tarjetas */}
                    <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0 kanban-scroll">
                      {ordenesOrdenadas.length === 0 ? (
                        <div className="text-center text-gray-400 text-sm py-8">
                          No hay órdenes
                        </div>
                      ) : (
                        ordenesOrdenadas.map((orden) => (
                          <div
                            key={orden.id_orden_fabricacion}
                            onClick={() =>
                              navigate(
                                `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                              )
                            }
                            draggable
                            onDragStart={(e) => {
                              // Informar que el movimiento se registra con avances,
                              // no arrastrando (el estado lo determina la producción)
                              e.preventDefault();
                              toast(
                                "Las órdenes se mueven registrando avances de producción, no arrastrando. Clic para ver el progreso.",
                                { duration: 3500 },
                              );
                            }}
                            title="Clic para ver el progreso de la orden"
                            className="group bg-white border-2 border-gray-200 rounded-lg p-3 hover:shadow-md hover:border-slate-300 transition-all cursor-grab active:cursor-grabbing"
                          >
                            {/* Header de tarjeta */}
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="font-bold text-gray-800 text-sm">
                                OF #{orden.id_orden_fabricacion}
                              </div>
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-full border ${getBadgeColor(
                                  orden.prioridad,
                                )}`}
                              >
                                {getPrioridadTexto(
                                  orden.prioridad,
                                  orden.dias_restantes,
                                )}
                              </span>
                            </div>

                            {/* Cliente */}
                            <div className="text-xs text-gray-600 mb-1.5">
                              <span className="font-semibold">Cliente:</span>{" "}
                              {orden.nombre_cliente || "Sin cliente"}
                            </div>

                            {/* Progreso por etapa (bloque unificado) */}
                            {orden.etapas_en_proceso?.length > 0 ? (
                              <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                {orden.etapas_en_proceso.map((et) => (
                                  <span
                                    key={et.id_etapa}
                                    className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    {et.nombre}{" "}
                                    <span className="font-bold">
                                      {et.cantidad_en_proceso || 0}/
                                      {et.cantidad_total || 0}
                                    </span>
                                  </span>
                                ))}
                                {orden.etapas_pendientes_anteriores?.length >
                                  0 && (
                                  <span className="text-[11px] text-slate-500">
                                    Falta terminar:{" "}
                                    {orden.etapas_pendientes_anteriores
                                      .map((et) => et.nombre)
                                      .join(", ")}
                                  </span>
                                )}
                              </div>
                            ) : (
                              config.key !== "finalizada" && (
                                <div className="mb-1.5">
                                  <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                                    Sin iniciar
                                  </span>
                                </div>
                              )
                            )}

                            {/*Articulos */}
                            <div className="mb-2">
                              <div className="text-xs font-semibold text-gray-600 mb-1">
                                Artículos:
                              </div>
                              <div className="bg-gray-50 rounded p-1.5">
                                {orden.productos ? (
                                  <div
                                    className="text-xs text-gray-700 space-y-0.5 line-clamp-2"
                                    title={orden.productos}
                                  >
                                    {orden.productos
                                      .split(",")
                                      .map((producto, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-start"
                                        >
                                          <span className="text-gray-400 mr-1">
                                            •
                                          </span>
                                          <span className="flex-1">
                                            {producto.trim()}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">
                                    Sin artículos
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Trabajador */}
                            {orden.nombre_trabajador && (
                              <div className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                                <FiUser size={12} className="text-gray-400" />
                                {orden.nombre_trabajador}
                              </div>
                            )}

                            {/* Fechas */}
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-1.5">
                              <div>
                                Inicio: {formatFecha(orden.fecha_inicio)}
                              </div>
                              {orden.fecha_fin_estimada && (
                                <div>
                                  Entrega:{" "}
                                  {formatFecha(orden.fecha_fin_estimada)}
                                </div>
                              )}
                            </div>

                            {/* Botón marcar como entregada (solo en columna finalizada) */}
                            {config.key === "finalizada" && (
                              <div className="mt-2 space-y-2">
                                <label
                                  onClick={(e) => e.stopPropagation()}
                                  className={`flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none transition-opacity ${
                                    selectedOrdenes.has(
                                      orden.id_orden_fabricacion,
                                    )
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedOrdenes.has(
                                      orden.id_orden_fabricacion,
                                    )}
                                    onChange={() =>
                                      toggleSeleccion(
                                        orden.id_orden_fabricacion,
                                      )
                                    }
                                    className="w-4 h-4 accent-green-600 cursor-pointer"
                                  />
                                  <span className="font-medium">
                                    {selectedOrdenes.has(
                                      orden.id_orden_fabricacion,
                                    )
                                      ? "Seleccionada"
                                      : "Seleccionar"}
                                  </span>
                                </label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    marcarComoEntregada(
                                      orden.id_orden_fabricacion,
                                    );
                                  }}
                                  className="cursor-pointer w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                                >
                                  <FiPackage size={14} />
                                  Marcar como entregada
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Barra de acciones para selección múltiple */}
      {selectedOrdenes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl animate-fade-in">
          <span className="text-sm font-semibold">
            {selectedOrdenes.size}{" "}
            {selectedOrdenes.size === 1
              ? "orden seleccionada"
              : "órdenes seleccionadas"}
          </span>
          <button
            onClick={marcarSeleccionadasComoEntregadas}
            className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          >
            <FiPackage size={16} />
            Marcar como entregadas
          </button>
          <button
            onClick={() => setSelectedOrdenes(new Set())}
            className="cursor-pointer text-sm text-gray-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Drawer de órdenes entregadas */}
      <DrawerOrdenesEntregadas
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mesInicial={drawerMes}
        anioInicial={drawerAnio}
      />
    </div>
  );
};

export default KanbanBoard;
