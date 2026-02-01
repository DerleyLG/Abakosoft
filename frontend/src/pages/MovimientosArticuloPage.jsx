import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiPackage,
  FiShoppingCart,
  FiTruck,
  FiSettings,
  FiActivity,
  FiLayers,
  FiTrendingUp,
  FiTrendingDown,
  FiCalendar,
  FiUser,
  FiDollarSign,
  FiFilter,
  FiSearch,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiHash,
  FiBox,
  FiBarChart2,
  FiArrowDownRight,
  FiArrowUpRight,
} from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

const MESES = [
  { value: "", label: "Todos los meses" },
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
  const anios = [{ value: "", label: "Todos los años" }];
  for (let i = anioActual; i >= anioActual - 5; i--) {
    anios.push({ value: String(i), label: String(i) });
  }
  return anios;
};

const TIPOS_MOVIMIENTO = [
  { value: "", label: "Todos los tipos", icon: FiActivity, color: "slate" },
  { value: "venta", label: "Ventas", icon: FiShoppingCart, color: "red" },
  { value: "compra", label: "Compras", icon: FiTruck, color: "green" },
  {
    value: "produccion",
    label: "Fabricación",
    icon: FiSettings,
    color: "blue",
  },
  {
    value: "ajuste_manual",
    label: "Ajustes",
    icon: FiActivity,
    color: "amber",
  },
  {
    value: "anulacion_venta",
    label: "Anul. Venta",
    icon: FiTrendingUp,
    color: "teal",
  },
  {
    value: "anulacion_compra",
    label: "Anul. Compra",
    icon: FiTrendingDown,
    color: "rose",
  },
];

const ITEMS_POR_PAGINA = 15;

const MovimientosArticuloPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [articulo, setArticulo] = useState(null);
  const [movimientos, setMovimientos] = useState([]);

  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Obtener todos los movimientos sin filtro de fecha para tener el historial completo
      const res = await api.get(`/seguimiento-articulo/${id}`);
      setArticulo(res.data.articulo);
      setMovimientos(res.data.movimientosDetallados || []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      toast.error("Error al cargar la información del artículo");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar movimientos
  const movimientosFiltrados = useMemo(() => {
    let resultado = [...movimientos];

    // Filtrar por mes
    if (mesSeleccionado) {
      resultado = resultado.filter((mov) => {
        const fecha = new Date(mov.fecha);
        return fecha.getMonth() + 1 === parseInt(mesSeleccionado);
      });
    }

    // Filtrar por año
    if (anioSeleccionado) {
      resultado = resultado.filter((mov) => {
        const fecha = new Date(mov.fecha);
        return fecha.getFullYear() === parseInt(anioSeleccionado);
      });
    }

    // Filtrar por tipo
    if (tipoSeleccionado) {
      resultado = resultado.filter(
        (mov) => mov.tipo_origen_movimiento === tipoSeleccionado
      );
    }

    // Filtrar por búsqueda (entidad, observaciones, referencia de documento)
    if (busqueda.trim()) {
      const searchLower = busqueda.toLowerCase();
      resultado = resultado.filter(
        (mov) =>
          (mov.entidad && mov.entidad.toLowerCase().includes(searchLower)) ||
          (mov.observaciones &&
            mov.observaciones.toLowerCase().includes(searchLower)) ||
          (mov.referencia_documento_id &&
            String(mov.referencia_documento_id).includes(searchLower))
      );
    }

    return resultado;
  }, [
    movimientos,
    mesSeleccionado,
    anioSeleccionado,
    tipoSeleccionado,
    busqueda,
  ]);

  // Calcular resumen
  const resumen = useMemo(() => {
    const stats = {
      ventas: { cantidad: 0, valor: 0, unidades: 0 },
      compras: { cantidad: 0, valor: 0, unidades: 0 },
      produccion: { cantidad: 0, unidades: 0 },
      ajustes: { cantidad: 0, unidades: 0 },
      anulacionesVenta: { cantidad: 0, valor: 0, unidades: 0 },
      anulacionesCompra: { cantidad: 0, valor: 0, unidades: 0 },
      ajusteInicial: { cantidad: 0, unidades: 0 },
      entradas: 0,
      salidas: 0,
      ajustesPositivos: 0,
      ajustesNegativos: 0,
    };

    movimientosFiltrados.forEach((mov) => {
      const cantidad = Number(mov.cantidad_movida) || 0;
      const valor = Number(mov.valor_documento) || 0;

      if (mov.tipo_movimiento === "entrada") stats.entradas += cantidad;
      else if (mov.tipo_movimiento === "salida") stats.salidas += cantidad;
      else if (mov.tipo_movimiento === "ajuste") {
        if (cantidad > 0) stats.ajustesPositivos += cantidad;
        else if (cantidad < 0) stats.ajustesNegativos += Math.abs(cantidad);
      }

      switch (mov.tipo_origen_movimiento) {
        case "venta":
          stats.ventas.cantidad++;
          stats.ventas.valor += valor;
          stats.ventas.unidades += Math.abs(cantidad);
          break;
        case "compra":
          stats.compras.cantidad++;
          stats.compras.valor += valor;
          stats.compras.unidades += Math.abs(cantidad);
          break;
        case "produccion":
          stats.produccion.cantidad++;
          stats.produccion.unidades += Math.abs(cantidad);
          break;
        case "ajuste_manual":
          stats.ajustes.cantidad++;
          stats.ajustes.unidades += Math.abs(cantidad);
          break;
        case "anulacion_venta":
          stats.anulacionesVenta.cantidad++;
          stats.anulacionesVenta.valor += valor;
          stats.anulacionesVenta.unidades += Math.abs(cantidad);
          break;
        case "anulacion_compra":
          stats.anulacionesCompra.cantidad++;
          stats.anulacionesCompra.valor += valor;
          stats.anulacionesCompra.unidades += Math.abs(cantidad);
          break;
        case "inicial":
        case "ajuste_inicial":
          stats.ajusteInicial.cantidad++;
          stats.ajusteInicial.unidades += Math.abs(cantidad);
          break;
      }
    });

    const balance = {
      dinero: {
        ingresos: stats.ventas.valor - stats.anulacionesVenta.valor,
        egresos: stats.compras.valor - stats.anulacionesCompra.valor,
        neto:
          stats.ventas.valor -
          stats.anulacionesVenta.valor -
          (stats.compras.valor - stats.anulacionesCompra.valor),
      },
      stock: {
        entradas: stats.entradas + stats.ajustesPositivos,
        salidas: stats.salidas + stats.ajustesNegativos,
        ajustesPositivos: stats.ajustesPositivos,
        ajustesNegativos: stats.ajustesNegativos,
        neto:
          stats.entradas +
          stats.ajustesPositivos -
          (stats.salidas + stats.ajustesNegativos),
      },
    };

    return { ...stats, balance };
  }, [movimientosFiltrados]);

  // Paginación
  const totalPaginas = Math.ceil(
    movimientosFiltrados.length / ITEMS_POR_PAGINA
  );
  const movimientosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    return movimientosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [movimientosFiltrados, paginaActual]);

  // Reset página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [mesSeleccionado, anioSeleccionado, tipoSeleccionado, busqueda]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (value) => {
    const numValue = Number(value);
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(isNaN(numValue) ? 0 : numValue);
  };

  const getTipoInfo = (tipoOrigen) => {
    const info = {
      venta: {
        bg: "bg-red-100",
        text: "text-red-700",
        label: "Venta",
        icon: FiShoppingCart,
      },
      compra: {
        bg: "bg-green-100",
        text: "text-green-700",
        label: "Compra",
        icon: FiTruck,
      },
      produccion: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        label: "Fabricación",
        icon: FiSettings,
      },
      inicial: {
        bg: "bg-slate-100",
        text: "text-slate-700",
        label: "Inicial",
        icon: FiLayers,
      },
      ajuste_manual: {
        bg: "bg-amber-100",
        text: "text-amber-700",
        label: "Ajuste",
        icon: FiActivity,
      },
      anulacion_venta: {
        bg: "bg-teal-100",
        text: "text-teal-700",
        label: "Anul. Venta",
        icon: FiTrendingUp,
      },
      anulacion_compra: {
        bg: "bg-rose-100",
        text: "text-rose-700",
        label: "Anul. Compra",
        icon: FiTrendingDown,
      },
      devolucion_cliente: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        label: "Dev. Cliente",
        icon: FiTrendingUp,
      },
      devolucion_proveedor: {
        bg: "bg-pink-100",
        text: "text-pink-700",
        label: "Dev. Proveedor",
        icon: FiTrendingDown,
      },
    };
    return (
      info[tipoOrigen] || {
        bg: "bg-slate-100",
        text: "text-slate-700",
        label: tipoOrigen,
        icon: FiActivity,
      }
    );
  };

  const limpiarFiltros = () => {
    setMesSeleccionado("");
    setAnioSeleccionado("");
    setTipoSeleccionado("");
    setBusqueda("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <FiRefreshCw className="animate-spin text-slate-400" size={40} />
          <p className="text-slate-500">Cargando información...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            {/* Navegación y título */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 cursor-pointer"
                >
                  <FiArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-slate-800">
                    Análisis de Movimientos
                  </h1>
                  <p className="text-sm text-slate-500">
                    Historial completo de movimientos de inventario
                  </p>
                </div>
              </div>
            </div>

            {/* Info del artículo */}
            {articulo && (
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-xl">
                    <FiPackage size={28} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 bg-white/20 rounded text-xs font-medium">
                        {articulo.referencia}
                      </span>
                      <h2 className="text-lg font-semibold">
                        {articulo.descripcion}
                      </h2>
                    </div>
                    <div className="flex items-center gap-6 mt-2 text-sm text-slate-300">
                      <span className="flex items-center gap-1">
                        <FiBox size={14} />
                        Stock:{" "}
                        <strong className="text-white">
                          {articulo.stock_disponible || 0}
                        </strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <FiSettings size={14} />
                        Fabricado:{" "}
                        <strong className="text-white">
                          {articulo.stock_fabricado || 0}
                        </strong>
                      </span>
                      {articulo.categoria && (
                        <span className="flex items-center gap-1">
                          <FiLayers size={14} />
                          {articulo.categoria}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FiFilter className="text-slate-400" size={18} />
            <h3 className="font-medium text-slate-700">Filtros</h3>
            {(mesSeleccionado ||
              anioSeleccionado ||
              tipoSeleccionado ||
              busqueda) && (
              <button
                onClick={limpiarFiltros}
                className="ml-auto text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mes */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Mes</label>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MESES.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Año */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Año</label>
              <select
                value={anioSeleccionado}
                onChange={(e) => setAnioSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {getAniosDisponibles().map((anio) => (
                  <option key={anio.value} value={anio.value}>
                    {anio.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Tipo de Movimiento
              </label>
              <select
                value={tipoSeleccionado}
                onChange={(e) => setTipoSeleccionado(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {TIPOS_MOVIMIENTO.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Buscar
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Cliente, proveedor, observación..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resumen del periodo */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* Ventas */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiShoppingCart className="text-red-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">Ventas</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.ventas.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.ventas.unidades} uds ·{" "}
              {formatCurrency(resumen.ventas.valor)}
            </div>
          </div>

          {/* Compras */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiTruck className="text-green-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Compras
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.compras.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.compras.unidades} uds ·{" "}
              {formatCurrency(resumen.compras.valor)}
            </div>
          </div>

          {/* Fabricación */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiSettings className="text-blue-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Fabricación
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.produccion.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.produccion.unidades} unidades
            </div>
          </div>

          {/* Ajustes */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <FiActivity className="text-amber-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Ajustes
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.ajustes.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.ajustes.unidades} unidades
            </div>
          </div>

          {/* Anulaciones de Venta */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <FiTrendingUp className="text-teal-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Anul. Venta
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.anulacionesVenta.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.anulacionesVenta.unidades} uds ·{" "}
              {formatCurrency(resumen.anulacionesVenta.valor)}
            </div>
          </div>

          {/* Anulaciones de Compra */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <FiTrendingDown className="text-rose-600" size={18} />
              </div>
              <span className="text-sm font-medium text-slate-600">
                Anul. Compra
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {resumen.anulacionesCompra.cantidad}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {resumen.anulacionesCompra.unidades} uds ·{" "}
              {formatCurrency(resumen.anulacionesCompra.valor)}
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Balance de Dinero */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <FiDollarSign className="text-emerald-600" size={20} />
              </div>
              <h3 className="font-semibold text-slate-700">
                Balance de Dinero
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiArrowDownRight className="text-emerald-500" size={16} />
                  <span className="text-sm text-slate-600">Ingresos netos</span>
                  <span className="text-xs text-slate-400">
                    (Ventas - Anul. Ventas)
                  </span>
                </div>
                <span
                  className={`font-semibold ${
                    resumen.balance.dinero.ingresos >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(resumen.balance.dinero.ingresos)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiArrowUpRight className="text-red-500" size={16} />
                  <span className="text-sm text-slate-600">Egresos netos</span>
                  <span className="text-xs text-slate-400">
                    (Compras - Anul. Compras)
                  </span>
                </div>
                <span
                  className={`font-semibold ${
                    resumen.balance.dinero.egresos > 0
                      ? "text-red-600"
                      : "text-emerald-600"
                  }`}
                >
                  {resumen.balance.dinero.egresos > 0 ? "-" : ""}
                  {formatCurrency(Math.abs(resumen.balance.dinero.egresos))}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-medium text-slate-700">Margen Neto</span>
                <span
                  className={`text-lg font-bold ${
                    resumen.balance.dinero.neto >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {resumen.balance.dinero.neto >= 0 ? "" : "-"}
                  {formatCurrency(Math.abs(resumen.balance.dinero.neto))}
                </span>
              </div>
            </div>
          </div>

          {/* Balance de Stock */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiPackage className="text-blue-600" size={20} />
              </div>
              <h3 className="font-semibold text-slate-700">Balance de Stock</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiArrowDownRight className="text-emerald-500" size={16} />
                  <span className="text-sm text-slate-600">Entradas</span>
                  <span className="text-xs text-slate-400">
                    (Compras + Anul. Ventas + Fab. + Ajustes positivos)
                  </span>
                </div>
                <span className="font-semibold text-emerald-600">
                  +{resumen.balance.stock.entradas} uds
                  {resumen.balance.stock.ajustesPositivos > 0}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FiArrowUpRight className="text-red-500" size={16} />
                  <span className="text-sm text-slate-600">Salidas</span>
                  <span className="text-xs text-slate-400">
                    (Ventas + Anul. Compras + Ajustes negativos)
                  </span>
                </div>
                <span className="font-semibold text-red-600">
                  -{resumen.balance.stock.salidas} uds
                  {resumen.balance.stock.ajustesNegativos > 0}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-medium text-slate-700">
                  Variación Neta
                </span>
                <span
                  className={`text-lg font-bold ${
                    resumen.balance.stock.neto >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {resumen.balance.stock.neto >= 0 ? "+" : ""}
                  {resumen.balance.stock.neto} uds
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de movimientos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiBarChart2 className="text-slate-400" size={18} />
              <h3 className="font-medium text-slate-700">
                Historial de Movimientos
              </h3>
              <span className="text-xs text-slate-400">
                ({movimientosFiltrados.length} registros)
              </span>
            </div>
          </div>

          {movimientosFiltrados.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FiActivity size={40} className="mx-auto mb-3 opacity-50" />
              <p>No se encontraron movimientos con los filtros seleccionados</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Entidad
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Documento
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Stock Inicial
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Stock Final
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosPaginados.map((mov) => {
                      const tipoInfo = getTipoInfo(mov.tipo_origen_movimiento);
                      const IconComponent = tipoInfo.icon;
               
                      const esAjuste = mov.tipo_movimiento === "ajuste";
                      const esEntrada = esAjuste
                        ? mov.cantidad_movida > 0
                        : mov.tipo_movimiento === "entrada";
                      const cantidadAbsoluta = Math.abs(mov.cantidad_movida);

                      return (
                        <tr
                          key={mov.id_movimiento}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FiCalendar
                                size={14}
                                className="text-slate-400"
                              />
                              <span className="text-sm text-slate-700">
                                {formatDate(mov.fecha)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tipoInfo.bg} ${tipoInfo.text}`}
                            >
                              <IconComponent size={12} />
                              {tipoInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {mov.entidad && mov.entidad !== "N/A" ? (
                              <div className="flex items-center gap-2">
                                <FiUser size={14} className="text-slate-400" />
                                <span className="text-sm text-slate-700">
                                  {mov.entidad}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {mov.referencia_documento_id ? (
                              <span className="text-sm text-slate-600 font-mono">
                                {mov.tipo_origen_movimiento === "venta"
                                  ? `OV #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento ===
                                    "anulacion_venta"
                                  ? `Anul. OV #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento === "compra"
                                  ? `OC #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento ===
                                    "anulacion_compra"
                                  ? `Anul. OC #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento === "produccion"
                                  ? `OF #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento ===
                                    "devolucion_cliente"
                                  ? `Dev. OV #${mov.referencia_documento_id}`
                                  : mov.tipo_origen_movimiento ===
                                    "devolucion_proveedor"
                                  ? `Dev. OC #${mov.referencia_documento_id}`
                                  : `#${mov.referencia_documento_id}`}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-medium ${
                                mov.stock_antes < 0
                                  ? "text-red-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {mov.stock_antes}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-bold ${
                                esEntrada
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {esEntrada ? "+" : "-"}
                              {cantidadAbsoluta}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`font-medium ${
                                mov.stock_despues < 0
                                  ? "text-red-600"
                                  : "text-slate-700"
                              }`}
                            >
                              {mov.stock_despues}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {mov.valor_documento ? (
                              (() => {
                                const esDineroEntra =
                                  mov.tipo_origen_movimiento === "venta" ||
                                  mov.tipo_origen_movimiento ===
                                    "anulacion_compra" ||
                                  mov.tipo_origen_movimiento ===
                                    "devolucion_proveedor";
                                const esDineroSale =
                                  mov.tipo_origen_movimiento === "compra" ||
                                  mov.tipo_origen_movimiento ===
                                    "anulacion_venta" ||
                                  mov.tipo_origen_movimiento ===
                                    "devolucion_cliente";
                                const colorClass = esDineroEntra
                                  ? "text-emerald-600"
                                  : esDineroSale
                                  ? "text-red-600"
                                  : "text-slate-600";

                                return (
                                  <span
                                    className={`text-sm font-medium ${colorClass}`}
                                  >
                                    {esDineroSale ? "-" : ""}
                                    {formatCurrency(mov.valor_documento)}
                                  </span>
                                );
                              })()
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPaginas > 1 && (
                <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
                  <div className="text-sm text-slate-500">
                    Mostrando {(paginaActual - 1) * ITEMS_POR_PAGINA + 1} -{" "}
                    {Math.min(
                      paginaActual * ITEMS_POR_PAGINA,
                      movimientosFiltrados.length
                    )}{" "}
                    de {movimientosFiltrados.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                      disabled={paginaActual === 1}
                      className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiChevronLeft size={18} />
                    </button>

                    {Array.from(
                      { length: Math.min(5, totalPaginas) },
                      (_, i) => {
                        let pageNum;
                        if (totalPaginas <= 5) {
                          pageNum = i + 1;
                        } else if (paginaActual <= 3) {
                          pageNum = i + 1;
                        } else if (paginaActual >= totalPaginas - 2) {
                          pageNum = totalPaginas - 4 + i;
                        } else {
                          pageNum = paginaActual - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPaginaActual(pageNum)}
                            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                              paginaActual === pageNum
                                ? "bg-slate-800 text-white"
                                : "hover:bg-slate-100 text-slate-600"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                    )}

                    <button
                      onClick={() =>
                        setPaginaActual((p) => Math.min(totalPaginas, p + 1))
                      }
                      disabled={paginaActual === totalPaginas}
                      className="cursor-pointer p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <FiChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovimientosArticuloPage;
