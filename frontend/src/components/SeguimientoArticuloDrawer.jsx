import { useState, useEffect } from "react";
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
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("resumen");
  const [error, setError] = useState(null);

  // Inicializar con mes y año actual
  const fechaActual = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(
    String(fechaActual.getMonth() + 1)
  );
  const [anioSeleccionado, setAnioSeleccionado] = useState(
    String(fechaActual.getFullYear())
  );

  useEffect(() => {
    if (isOpen && idArticulo) {
      fetchSeguimiento();
    }
  }, [isOpen, idArticulo, mesSeleccionado, anioSeleccionado]);

  const fetchSeguimiento = async () => {
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
      const res = await api.get(url);
      setData(res.data);
    } catch (err) {
      console.error("Error al cargar seguimiento:", err);
      setError("Error al cargar la información del artículo");
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    const ahora = new Date();
    setMesSeleccionado(String(ahora.getMonth() + 1));
    setAnioSeleccionado(String(ahora.getFullYear()));
  };

  if (!isOpen) return null;

  const tabs = [
    { id: "resumen", label: "Resumen", icon: FiTrendingUp },
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

  const renderContent = () => {
    switch (activeTab) {
      case "resumen":
        return renderResumen();
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
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-slate-100 shadow-2xl flex flex-col animate-slide-in-right">
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
              <span className="font-medium">Filtrar por:</span>
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
