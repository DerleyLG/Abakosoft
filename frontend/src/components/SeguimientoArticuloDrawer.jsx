import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiX,
  FiPackage,
  FiShoppingCart,
  FiClipboard,
  FiSettings,
  FiTruck,
  FiTrendingUp,
  FiTrendingDown,
  FiAlertTriangle,
  FiLoader,
  FiChevronRight,
  FiCalendar,
  FiUser,
  FiDollarSign,
  FiHash,
  FiFilter,
  FiActivity,
  FiLayers,
  FiArrowRight,
  FiExternalLink,
} from "react-icons/fi";
import api from "../services/api";

const MESES = [
  { value: "", label: "Todos" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const getAniosDisponibles = () => {
  const anioActual = new Date().getFullYear();
  const anios = [{ value: "", label: "Todos" }];
  for (let i = anioActual; i >= anioActual - 5; i--) {
    anios.push({ value: String(i), label: String(i) });
  }
  return anios;
};

const SeguimientoArticuloDrawer = ({ isOpen, onClose, idArticulo }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [error, setError] = useState(null);

  // Filtros de fecha (vacíos = mostrar todos)
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState("");

  // Filtro para tipo de movimiento (null = se determinará automáticamente)
  const [tipoMovimientoFiltro, setTipoMovimientoFiltro] = useState(null);

  useEffect(() => {
    if (isOpen && idArticulo) {
      setTipoMovimientoFiltro(null); // Resetear al abrir con nuevo artículo
      fetchSeguimiento();
    }
  }, [isOpen, idArticulo, mesSeleccionado, anioSeleccionado]);

  // Seleccionar automáticamente el primer tipo de movimiento que tenga datos al recibir data
  useEffect(() => {
    if (!data?.movimientosDetallados || activeTab !== "movimientos") return;
    // Solo establecer si no hay filtro seleccionado
    if (tipoMovimientoFiltro) return;

    const movimientos = data.movimientosDetallados;
    const tiposDisponibles = [
      "venta",
      "compra",
      "produccion",
      "ajuste_manual",
      "anulacion_venta",
      "anulacion_compra",
    ];
    const primerTipoConDatos = tiposDisponibles.find((tipo) =>
      movimientos.some((m) => m.tipo_origen_movimiento === tipo)
    );
    if (primerTipoConDatos) {
      setTipoMovimientoFiltro(primerTipoConDatos);
    }
  }, [data?.movimientosDetallados, activeTab]);

  const fetchSeguimiento = async () => {
    console.log(
      "[SeguimientoDrawer] Iniciando fetchSeguimiento para artículo:",
      idArticulo
    );
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Permitir filtrar por mes, año, o ambos de forma independiente
      if (mesSeleccionado) {
        params.append("mes", mesSeleccionado);
      }
      if (anioSeleccionado) {
        params.append("anio", anioSeleccionado);
      }
      const queryString = params.toString();
      const url = `/seguimiento-articulo/${idArticulo}${
        queryString ? `?${queryString}` : ""
      }`;
      console.log("[SeguimientoDrawer] Haciendo petición a:", url);
      const res = await api.get(url);
      console.log(
        "[SeguimientoDrawer] Respuesta recibida:",
        res.data ? "OK" : "SIN DATA"
      );
      setData(res.data);
    } catch (err) {
      console.error("[SeguimientoDrawer] Error al cargar seguimiento:", err);
      setError("Error al cargar la información del artículo");
    } finally {
      console.log("[SeguimientoDrawer] Finalizando fetch, setLoading(false)");
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setMesSeleccionado("");
    setAnioSeleccionado("");
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "resumen", label: "Resumen", icon: FiTrendingUp },
    { id: "movimientos", label: "Movimientos", icon: FiActivity },
    { id: "ventas", label: "Ventas", icon: FiShoppingCart },
    { id: "pedidos", label: "Pedidos", icon: FiClipboard },
    { id: "fabricacion", label: "Fabricación", icon: FiSettings },
    { id: "compras", label: "Compras", icon: FiTruck },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      completada: "bg-green-100 text-green-700",
      completado: "bg-green-100 text-green-700",
      pendiente: "bg-amber-100 text-amber-700",
      "en proceso": "bg-blue-100 text-blue-700",
      "en fabricacion": "bg-blue-100 text-blue-700",
      "listo para entrega": "bg-purple-100 text-purple-700",
      cancelado: "bg-red-100 text-red-700",
      cancelada: "bg-red-100 text-red-700",
    };
    return estilos[estado?.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  const renderResumen = () => {
    if (!data?.resumen) return null;
    const { ventas, pedidos, fabricacion, compras } = data.resumen;
    const articulo = data.articulo;

    return (
      <div className="space-y-6">
        {/* Info del stock */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">
              {articulo?.stock_disponible || 0}
            </div>
            <div className="text-xs text-slate-500 mt-1">Stock Disponible</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {articulo?.stock_fabricado || 0}
            </div>
            <div className="text-xs text-blue-500 mt-1">Fabricado</div>
          </div>
          <div
            className={`rounded-xl p-4 text-center ${
              (articulo?.stock_disponible || 0) <= (articulo?.stock_minimo || 0)
                ? "bg-amber-50"
                : "bg-green-50"
            }`}
          >
            <div
              className={`text-2xl font-bold ${
                (articulo?.stock_disponible || 0) <=
                (articulo?.stock_minimo || 0)
                  ? "text-amber-700"
                  : "text-green-700"
              }`}
            >
              {articulo?.stock_minimo || 0}
            </div>
            <div
              className={`text-xs mt-1 ${
                (articulo?.stock_disponible || 0) <=
                (articulo?.stock_minimo || 0)
                  ? "text-amber-500"
                  : "text-green-500"
              }`}
            >
              Stock Mínimo
            </div>
          </div>
        </div>

        {/* Tarjetas de resumen */}
        <div className="space-y-3">
          {/* Ventas */}
          <div
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab("ventas")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiShoppingCart size={20} />
                </div>
                <div>
                  <div className="text-sm opacity-80">Órdenes de Venta</div>
                  <div className="text-2xl font-bold">
                    {ventas?.total_ordenes || 0}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">Total vendido</div>
                <div className="font-semibold">
                  {ventas?.total_cantidad || 0} uds
                </div>
                <div className="text-xs opacity-70">
                  {formatCurrency(ventas?.total_monto)}
                </div>
              </div>
            </div>
          </div>

          {/* Pedidos */}
          <div
            className="bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab("pedidos")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiClipboard size={20} />
                </div>
                <div>
                  <div className="text-sm opacity-80">Órdenes de Pedido</div>
                  <div className="text-2xl font-bold">
                    {pedidos?.total_ordenes || 0}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">Cantidad pedida</div>
                <div className="font-semibold">
                  {pedidos?.total_cantidad || 0} uds
                </div>
              </div>
            </div>
          </div>

          {/* Fabricación */}
          <div
            className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab("fabricacion")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiSettings size={20} />
                </div>
                <div>
                  <div className="text-sm opacity-80">
                    Órdenes de Fabricación
                  </div>
                  <div className="text-2xl font-bold">
                    {fabricacion?.total_ordenes || 0}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">Fabricado</div>
                <div className="font-semibold">
                  {fabricacion?.total_fabricado || 0} /{" "}
                  {fabricacion?.total_solicitado || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Compras */}
          <div
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setActiveTab("compras")}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FiTruck size={20} />
                </div>
                <div>
                  <div className="text-sm opacity-80">Órdenes de Compra</div>
                  <div className="text-2xl font-bold">
                    {compras?.total_ordenes || 0}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm opacity-80">Total comprado</div>
                <div className="font-semibold">
                  {compras?.total_cantidad || 0} uds
                </div>
                <div className="text-xs opacity-70">
                  {formatCurrency(compras?.total_monto)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Movimientos recientes */}
        {data?.movimientos?.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <FiTrendingUp size={16} />
              Últimos movimientos
            </h4>
            <div className="space-y-2">
              {data.movimientos.slice(0, 5).map((mov) => (
                <div
                  key={mov.id_movimiento}
                  className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {mov.tipo_movimiento === "entrada" ? (
                      <FiTrendingUp className="text-green-500" size={14} />
                    ) : (
                      <FiTrendingDown className="text-red-500" size={14} />
                    )}
                    <span className="text-slate-600">
                      {mov.tipo_origen_movimiento}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-medium ${
                        mov.tipo_movimiento === "entrada"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {mov.tipo_movimiento === "entrada" ? "+" : "-"}
                      {mov.cantidad_movida}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(mov.fecha)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderOrdenesVenta = () => {
    const ordenes = data?.ordenesVenta || [];
    if (ordenes.length === 0) {
      return (
        <div className="text-center py-10 text-slate-400">
          <FiShoppingCart size={40} className="mx-auto mb-3 opacity-50" />
          <p>No hay órdenes de venta para este artículo</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {ordenes.map((orden) => (
          <div
            key={orden.id_orden_venta}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiHash className="text-slate-400" size={14} />
                <span className="font-semibold text-slate-800">
                  OV-{orden.id_orden_venta}
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(
                  orden.estado
                )}`}
              >
                {orden.estado}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <FiUser size={14} className="text-slate-400" />
                {orden.cliente}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiCalendar size={14} className="text-slate-400" />
                {formatDate(orden.fecha)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiPackage size={14} className="text-slate-400" />
                {orden.cantidad} unidades
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiDollarSign size={14} className="text-slate-400" />
                {formatCurrency(orden.subtotal)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrdenesPedido = () => {
    const ordenes = data?.ordenesPedido || [];
    if (ordenes.length === 0) {
      return (
        <div className="text-center py-10 text-slate-400">
          <FiClipboard size={40} className="mx-auto mb-3 opacity-50" />
          <p>No hay órdenes de pedido para este artículo</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {ordenes.map((orden) => (
          <div
            key={orden.id_pedido}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiHash className="text-slate-400" size={14} />
                <span className="font-semibold text-slate-800">
                  PED-{orden.id_pedido}
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(
                  orden.estado
                )}`}
              >
                {orden.estado}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <FiUser size={14} className="text-slate-400" />
                {orden.cliente}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiCalendar size={14} className="text-slate-400" />
                {formatDate(orden.fecha)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiPackage size={14} className="text-slate-400" />
                {orden.cantidad} unidades
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiDollarSign size={14} className="text-slate-400" />
                {formatCurrency(orden.subtotal)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOrdenesFabricacion = () => {
    const ordenes = data?.ordenesFabricacion || [];
    if (ordenes.length === 0) {
      return (
        <div className="text-center py-10 text-slate-400">
          <FiSettings size={40} className="mx-auto mb-3 opacity-50" />
          <p>No hay órdenes de fabricación para este artículo</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {ordenes.map((orden) => {
          const progreso =
            orden.cantidad > 0
              ? Math.round((orden.cantidad_fabricada / orden.cantidad) * 100)
              : 0;
          return (
            <div
              key={orden.id_orden_fabricacion}
              className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FiHash className="text-slate-400" size={14} />
                  <span className="font-semibold text-slate-800">
                    OF-{orden.id_orden_fabricacion}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(
                    orden.estado
                  )}`}
                >
                  {orden.estado}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <FiUser size={14} className="text-slate-400" />
                  {orden.cliente || "Sin cliente"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <FiCalendar size={14} className="text-slate-400" />
                  {formatDate(orden.fecha)}
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2 text-sm">
                  <span className="text-slate-600">
                    Progreso de fabricación
                  </span>
                  <span className="font-semibold text-slate-800">
                    {orden.cantidad_fabricada} / {orden.cantidad}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      progreso >= 100 ? "bg-green-500" : "bg-slate-600"
                    }`}
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
                <div className="text-right text-xs text-slate-500 mt-1">
                  {progreso}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderOrdenesCompra = () => {
    const ordenes = data?.ordenesCompra || [];
    if (ordenes.length === 0) {
      return (
        <div className="text-center py-10 text-slate-400">
          <FiTruck size={40} className="mx-auto mb-3 opacity-50" />
          <p>No hay órdenes de compra para este artículo</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {ordenes.map((orden) => (
          <div
            key={orden.id_orden_compra}
            className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <FiHash className="text-slate-400" size={14} />
                <span className="font-semibold text-slate-800">
                  OC-{orden.id_orden_compra}
                </span>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(
                  orden.estado
                )}`}
              >
                {orden.estado}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <FiTruck size={14} className="text-slate-400" />
                {orden.proveedor}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiCalendar size={14} className="text-slate-400" />
                {formatDate(orden.fecha)}
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiPackage size={14} className="text-slate-400" />
                {orden.cantidad} unidades
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <FiDollarSign size={14} className="text-slate-400" />
                {formatCurrency(orden.subtotal)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render de movimientos detallados con información completa
  const renderMovimientosDetallados = () => {
    const todosMovimientos = data?.movimientosDetallados || [];

    const getTipoOrigenInfo = (tipoOrigen) => {
      const info = {
        venta: {
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-300",
          bgActive: "bg-red-500",
          textActive: "text-white",
          label: "Ventas",
          icon: FiShoppingCart,
        },
        compra: {
          bg: "bg-green-100",
          text: "text-green-700",
          border: "border-green-300",
          bgActive: "bg-green-500",
          textActive: "text-white",
          label: "Compras",
          icon: FiTruck,
        },
        produccion: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          border: "border-blue-300",
          bgActive: "bg-blue-500",
          textActive: "text-white",
          label: "Fabricación",
          icon: FiSettings,
        },
        inicial: {
          bg: "bg-slate-100",
          text: "text-slate-700",
          border: "border-slate-300",
          bgActive: "bg-slate-500",
          textActive: "text-white",
          label: "Inicial",
          icon: FiLayers,
        },
        ajuste_manual: {
          bg: "bg-amber-100",
          text: "text-amber-700",
          border: "border-amber-300",
          bgActive: "bg-amber-500",
          textActive: "text-white",
          label: "Ajustes",
          icon: FiActivity,
        },
        anulacion_venta: {
          bg: "bg-teal-100",
          text: "text-teal-700",
          border: "border-teal-300",
          bgActive: "bg-teal-500",
          textActive: "text-white",
          label: "Anul. Venta",
          icon: FiTrendingUp,
        },
        anulacion_compra: {
          bg: "bg-rose-100",
          text: "text-rose-700",
          border: "border-rose-300",
          bgActive: "bg-rose-500",
          textActive: "text-white",
          label: "Anul. Compra",
          icon: FiTrendingDown,
        },
        devolucion_cliente: {
          bg: "bg-purple-100",
          text: "text-purple-700",
          border: "border-purple-300",
          bgActive: "bg-purple-500",
          textActive: "text-white",
          label: "Dev. Cliente",
          icon: FiTrendingUp,
        },
        devolucion_proveedor: {
          bg: "bg-pink-100",
          text: "text-pink-700",
          border: "border-pink-300",
          bgActive: "bg-pink-500",
          textActive: "text-white",
          label: "Dev. Proveedor",
          icon: FiTrendingDown,
        },
      };
      return (
        info[tipoOrigen] || {
          bg: "bg-slate-100",
          text: "text-slate-700",
          border: "border-slate-300",
          bgActive: "bg-slate-500",
          textActive: "text-white",
          label: tipoOrigen,
          icon: FiActivity,
        }
      );
    };

    // Tipos de movimiento disponibles para filtrar
    const tiposDisponibles = [
      "venta",
      "compra",
      "produccion",
      "ajuste_manual",
      "anulacion_venta",
      "anulacion_compra",
    ];

    // Contar movimientos por tipo
    const conteosPorTipo = tiposDisponibles.reduce((acc, tipo) => {
      acc[tipo] = todosMovimientos.filter(
        (m) => m.tipo_origen_movimiento === tipo
      ).length;
      return acc;
    }, {});

    // Solo mostrar tipos que tengan movimientos
    const tiposConDatos = tiposDisponibles.filter(
      (tipo) => conteosPorTipo[tipo] > 0
    );

    // Filtrar movimientos según el tipo seleccionado
    const movimientos = tipoMovimientoFiltro
      ? todosMovimientos.filter(
          (m) => m.tipo_origen_movimiento === tipoMovimientoFiltro
        )
      : [];

    return (
      <div className="space-y-4">
        {/* Filtros por tipo de movimiento */}
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <p className="text-xs text-slate-500 mb-3 font-medium flex items-center gap-2">
            <FiFilter size={12} /> Filtrar por fecha tipo:
          </p>
          <div className="flex flex-wrap gap-2">
            {tiposConDatos.map((tipo) => {
              const info = getTipoOrigenInfo(tipo);
              const IconComponent = info.icon;
              const isActive = tipoMovimientoFiltro === tipo;
              return (
                <button
                  key={tipo}
                  onClick={() => setTipoMovimientoFiltro(tipo)}
                  className={`cursor-pointer px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border ${
                    isActive
                      ? `${info.bgActive} ${info.textActive} border-transparent shadow-md`
                      : `${info.bg} ${info.text} ${info.border} hover:shadow-sm`
                  }`}
                >
                  <IconComponent size={14} />
                  {info.label}
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      isActive ? "bg-white/20" : "bg-white/50"
                    }`}
                  >
                    {conteosPorTipo[tipo]}
                  </span>
                </button>
              );
            })}
          </div>
          {tiposConDatos.length === 0 && (
            <p className="text-slate-400 text-sm">
              No hay movimientos registrados
            </p>
          )}
        </div>

        {/* Botón para análisis completo */}
        <button
          onClick={() => {
            onClose();
            navigate(`/inventario/movimientos/${idArticulo}`);
          }}
          className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-xl hover:from-slate-600 hover:to-slate-700 transition-all shadow-md hover:shadow-lg"
        >
          <FiExternalLink size={16} />
          <span className="font-medium ">Ver Análisis Completo</span>
          <span className="text-xs text-slate-300">
            (filtros avanzados, exportar)
          </span>
        </button>

        {/* Lista de movimientos filtrados */}
        {movimientos.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <FiActivity size={40} className="mx-auto mb-3 opacity-50" />
            <p>
              No hay movimientos de tipo "
              {tipoMovimientoFiltro
                ? getTipoOrigenInfo(tipoMovimientoFiltro).label
                : "seleccionado"}
              "
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {movimientos.map((mov) => {
              const tipoInfo = getTipoOrigenInfo(mov.tipo_origen_movimiento);
              const IconComponent = tipoInfo.icon;
              // Para ajustes, determinar si aumentó o disminuyó por el signo de cantidad_movida
              const esAjuste = mov.tipo_movimiento === "ajuste";
              const esEntrada = esAjuste
                ? mov.cantidad_movida > 0
                : mov.tipo_movimiento === "entrada";
              const cantidadAbsoluta = Math.abs(mov.cantidad_movida);

              return (
                <div
                  key={mov.id_movimiento}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Header del movimiento */}
                  <div
                    className={`px-4 py-3 ${tipoInfo.bg} border-b border-slate-100`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-white/50`}>
                          <IconComponent size={16} className={tipoInfo.text} />
                        </div>
                        <div>
                          <span className={`font-semibold ${tipoInfo.text}`}>
                            {tipoInfo.label}
                          </span>
                          {mov.referencia_documento_id && (
                            <span className="ml-2 text-xs text-slate-500">
                              #
                              {mov.referencia_documento_tipo === "orden_venta"
                                ? "OV"
                                : mov.referencia_documento_tipo ===
                                  "orden_compra"
                                ? "OC"
                                : mov.referencia_documento_tipo === "lote"
                                ? "Lote"
                                : ""}
                              -{mov.referencia_documento_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FiCalendar size={12} className="text-slate-400" />
                        <span className="text-xs text-slate-600">
                          {formatDate(mov.fecha)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contenido del movimiento */}
                  <div className="p-4">
                    {/* Fila: Entidad (Cliente/Proveedor/Trabajador) */}
                    {mov.entidad && mov.entidad !== "N/A" && (
                      <div className="flex items-center gap-2 mb-3 text-sm">
                        <FiUser size={14} className="text-slate-400" />
                        <span className="text-slate-700 font-medium">
                          {mov.entidad}
                        </span>
                      </div>
                    )}

                    {/* Fila: Artículo */}
                    <div className="flex items-center gap-2 mb-3 text-sm">
                      <FiPackage size={14} className="text-slate-400" />
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-800">
                          {mov.articulo_referencia}
                        </span>
                        {mov.articulo_descripcion && (
                          <span className="text-slate-500">
                            {" "}
                            - {mov.articulo_descripcion}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Flujo de Stock */}
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="text-xs text-slate-500 mb-1">
                            Stock Inicial
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              mov.stock_antes < 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {mov.stock_antes}
                          </div>
                        </div>

                        <div className="text-center flex flex-col items-center">
                          <div className="text-xs text-slate-500 mb-1">
                            Unidades
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`px-3 py-1 rounded-full text-sm font-bold ${
                                esEntrada
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {esEntrada ? "+" : "-"}
                              {cantidadAbsoluta}
                            </div>
                            <FiArrowRight
                              size={16}
                              className="text-slate-400"
                            />
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="text-xs text-slate-500 mb-1">
                            Stock Final
                          </div>
                          <div
                            className={`text-lg font-bold ${
                              mov.stock_despues < 0
                                ? "text-red-600"
                                : "text-slate-700"
                            }`}
                          >
                            {mov.stock_despues}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valor del documento (si aplica) */}
                    {mov.valor_documento &&
                      (() => {
                        // Determinar si el dinero entra o sale
                        const esDineroEntra =
                          mov.tipo_origen_movimiento === "venta" ||
                          mov.tipo_origen_movimiento === "anulacion_compra" ||
                          mov.tipo_origen_movimiento === "devolucion_proveedor";
                        const esDineroSale =
                          mov.tipo_origen_movimiento === "compra" ||
                          mov.tipo_origen_movimiento === "anulacion_venta" ||
                          mov.tipo_origen_movimiento === "devolucion_cliente";
                        const colorBg = esDineroEntra
                          ? "bg-emerald-50"
                          : "bg-red-50";
                        const colorIcon = esDineroEntra
                          ? "text-emerald-600"
                          : "text-red-600";
                        const colorText = esDineroEntra
                          ? "text-emerald-700"
                          : "text-red-700";

                        return (
                          <div
                            className={`flex items-center justify-between ${colorBg} rounded-lg px-3 py-2 mb-2`}
                          >
                            <div className="flex items-center gap-2">
                              <FiDollarSign size={14} className={colorIcon} />
                              <span className={`text-sm ${colorText}`}>
                                Valor del documento
                              </span>
                            </div>
                            <span className={`font-bold ${colorText}`}>
                              {esDineroSale ? "-" : ""}
                              {formatCurrency(mov.valor_documento)}
                            </span>
                          </div>
                        );
                      })()}

                    {/* Precio unitario (si aplica) */}
                    {mov.precio_unitario && (
                      <div className="flex items-center justify-between text-sm text-slate-500 px-1">
                        <span>Precio unitario:</span>
                        <span className="font-medium">
                          {formatCurrency(mov.precio_unitario)}
                        </span>
                      </div>
                    )}

                    {/* Observaciones */}
                    {mov.observaciones && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-xs text-slate-500 italic">
                          {mov.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "resumen":
        return renderResumen();
      case "movimientos":
        return renderMovimientosDetallados();
      case "ventas":
        return renderOrdenesVenta();
      case "pedidos":
        return renderOrdenesPedido();
      case "fabricacion":
        return renderOrdenesFabricacion();
      case "compras":
        return renderOrdenesCompra();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-slate-100 shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-slate-800 px-6 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-700 rounded-xl">
                <FiPackage className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Seguimiento de Artículo
                </h2>
                {data?.articulo && (
                  <p className="text-slate-300 text-sm truncate max-w-[280px]">
                    {data.articulo.referencia && (
                      <span className="text-slate-400">
                        {data.articulo.referencia} -{" "}
                      </span>
                    )}
                    {data.articulo.descripcion}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FiX className="text-slate-300 hover:text-white" size={22} />
            </button>
          </div>

          {/* Info adicional */}
          {data?.articulo && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="px-3 py-1 bg-slate-700 rounded-lg text-slate-300">
                {data.articulo.categoria || "Sin categoría"}
              </div>
              {data.articulo.precio_venta > 0 && (
                <div className="text-slate-400">
                  Precio:{" "}
                  <span className="text-white font-medium">
                    {formatCurrency(data.articulo.precio_venta)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtro de mes/año */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <FiFilter size={16} />
              <span className="font-medium">Filtrar por Fecha:</span>
            </div>
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
            >
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
            >
              {getAniosDisponibles().map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
            {(mesSeleccionado || anioSeleccionado) && (
              <button
                onClick={limpiarFiltros}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            )}
            {mesSeleccionado && anioSeleccionado && (
              <span className="text-xs text-slate-500 ml-auto">
                Mostrando:{" "}
                {MESES.find((m) => m.value === mesSeleccionado)?.label}{" "}
                {anioSeleccionado}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-slate-200 px-2 flex-shrink-0">
          <div
            className="flex overflow-x-auto gap-1 py-2"
            style={{ scrollbarWidth: "thin" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer flex-shrink-0 ${
                  activeTab === tab.id
                    ? "bg-slate-800 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FiLoader className="animate-spin mb-3" size={32} />
              <p>Cargando información...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
              <FiAlertTriangle className="mb-3" size={32} />
              <p>{error}</p>
              <button
                onClick={fetchSeguimiento}
                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default SeguimientoArticuloDrawer;
