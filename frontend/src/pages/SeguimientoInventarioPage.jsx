import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  FiArrowRight,
  FiExternalLink,
  FiX,
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
  { value: "produccion", label: "Fabricación", icon: FiSettings, color: "blue" },
  { value: "ajuste_manual", label: "Ajustes", icon: FiActivity, color: "amber" },
  { value: "inicial", label: "Inicial", icon: FiLayers, color: "slate" },
  { value: "anulacion_venta", label: "Anul. Venta", icon: FiTrendingUp, color: "teal" },
  { value: "anulacion_compra", label: "Anul. Compra", icon: FiTrendingDown, color: "rose" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const SeguimientoInventarioPage = () => {
  const navigate = useNavigate();
  
  // Estados principales
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtros
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaInput, setBusquedaInput] = useState("");
  
  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Cargar datos cuando cambian filtros o paginación
  useEffect(() => {
    fetchData();
  }, [page, pageSize, mesSeleccionado, anioSeleccionado, tipoSeleccionado, busqueda]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
      };
      if (mesSeleccionado) params.mes = mesSeleccionado;
      if (anioSeleccionado) params.anio = anioSeleccionado;
      if (tipoSeleccionado) params.tipo_origen = tipoSeleccionado;
      if (busqueda) params.buscar = busqueda;
      
      const res = await api.get("/seguimiento-articulo", { params });
      setMovimientos(res.data.data || []);
      setTotal(res.data.total || 0);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      toast.error("Error al cargar los movimientos de inventario");
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    setBusqueda(busquedaInput);
    setPage(1);
  };

  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getTipoInfo = (tipoOrigen) => {
    const info = {
      venta: { bg: "bg-red-100", text: "text-red-700", label: "Venta", icon: FiShoppingCart },
      compra: { bg: "bg-green-100", text: "text-green-700", label: "Compra", icon: FiTruck },
      produccion: { bg: "bg-blue-100", text: "text-blue-700", label: "Fabricación", icon: FiSettings },
      inicial: { bg: "bg-slate-100", text: "text-slate-700", label: "Inicial", icon: FiLayers },
      ajuste_manual: { bg: "bg-amber-100", text: "text-amber-700", label: "Ajuste", icon: FiActivity },
      anulacion_venta: { bg: "bg-teal-100", text: "text-teal-700", label: "Anul. Venta", icon: FiTrendingUp },
      anulacion_compra: { bg: "bg-rose-100", text: "text-rose-700", label: "Anul. Compra", icon: FiTrendingDown },
      devolucion_cliente: { bg: "bg-purple-100", text: "text-purple-700", label: "Dev. Cliente", icon: FiTrendingUp },
      devolucion_proveedor: { bg: "bg-pink-100", text: "text-pink-700", label: "Dev. Proveedor", icon: FiTrendingDown },
    };
    return info[tipoOrigen] || { bg: "bg-slate-100", text: "text-slate-700", label: tipoOrigen, icon: FiActivity };
  };

  // Obtener información de entidad según el tipo de movimiento
  const getEntidadInfo = (mov) => {
    const tipo = mov.tipo_origen_movimiento;
    
    // Tipos que no aplican entidad
    if (tipo === 'ajuste_manual' || tipo === 'inicial') {
      return { valor: 'No aplica', tooltip: null, aplica: false };
    }
    
    // Determinar tooltip según tipo
    let tooltip = '';
    switch (tipo) {
      case 'venta':
      case 'anulacion_venta':
      case 'devolucion_cliente':
        tooltip = 'Cliente final';
        break;
      case 'compra':
      case 'anulacion_compra':
      case 'devolucion_proveedor':
        tooltip = 'Proveedor';
        break;
      case 'produccion':
        tooltip = 'Cliente del pedido';
        break;
      default:
        tooltip = '';
    }
    
    return { 
      valor: mov.entidad || '-', 
      tooltip, 
      aplica: true 
    };
  };

  // Obtener el código del documento
  const getDocumentoInfo = (mov) => {
    // Para fabricación, mostrar la OF en lugar del lote
    if (mov.tipo_origen_movimiento === 'produccion') {
      if (mov.id_orden_fabricacion) {
        return `OF #${mov.id_orden_fabricacion}`;
      }
      return mov.referencia_documento_id ? `Lote #${mov.referencia_documento_id}` : null;
    }
    
    if (!mov.referencia_documento_id) return null;
    
    let prefijo = '';
    switch (mov.referencia_documento_tipo) {
      case 'orden_venta': prefijo = 'OV'; break;
      case 'orden_compra': prefijo = 'OC'; break;
      case 'lote': prefijo = 'Lote'; break;
      case 'reversion_orden_venta': prefijo = 'Rev.OV'; break;
      case 'reversion_orden_compra': prefijo = 'Rev.OC'; break;
      default: prefijo = mov.referencia_documento_tipo || '';
    }
    
    return `${prefijo} #${mov.referencia_documento_id}`;
  };

  // Determinar si un tipo de movimiento tiene valor monetario
  const tieneValorMonetario = (tipoOrigen) => {
    return ['venta', 'compra', 'anulacion_venta', 'anulacion_compra', 'devolucion_cliente', 'devolucion_proveedor'].includes(tipoOrigen);
  };

  const limpiarFiltros = () => {
    setMesSeleccionado("");
    setAnioSeleccionado("");
    setTipoSeleccionado("");
    setBusqueda("");
    setBusquedaInput("");
    setPage(1);
  };

  const exportarCSV = () => {
    if (movimientos.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const headers = ["Fecha", "Artículo", "Referencia", "Tipo", "Documento", "Entidad", "Tipo Entidad", "Movimiento", "Cantidad", "Stock Antes", "Stock Después", "Valor", "Observaciones"];
    const rows = movimientos.map(mov => {
      const entidadInfo = getEntidadInfo(mov);
      return [
        formatDate(mov.fecha),
        mov.articulo_descripcion || "-",
        mov.articulo_referencia || "-",
        getTipoInfo(mov.tipo_origen_movimiento).label,
        getDocumentoInfo(mov) || "N/A",
        entidadInfo.aplica ? entidadInfo.valor : "No aplica",
        entidadInfo.tooltip || "-",
        mov.tipo_movimiento,
        mov.cantidad_movida,
        mov.stock_antes,
        mov.stock_despues,
        tieneValorMonetario(mov.tipo_origen_movimiento) ? (mov.valor_documento || 0) : "No aplica",
        mov.observaciones || ""
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(row => row.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `movimientos_inventario_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Archivo exportado correctamente");
  };

  const hayFiltrosActivos = mesSeleccionado || anioSeleccionado || tipoSeleccionado || busqueda;

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-8 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/inventario")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4 transition-colors cursor-pointer"
        >
          <FiArrowLeft size={20} />
          <span>Volver a Inventario</span>
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <FiActivity className="text-slate-600" />
              Seguimiento de Inventario
            </h1>
            <p className="text-slate-500 mt-1">
              Historial completo de todos los movimientos de inventario
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualizar
            </button>
            <button
              onClick={exportarCSV}
              disabled={movimientos.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <FiDownload size={16} />
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FiFilter className="text-slate-500" />
          <span className="font-medium text-slate-700">Filtros</span>
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="ml-auto text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <FiX size={14} />
              Limpiar filtros
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Búsqueda */}
          <form onSubmit={handleBuscar} className="lg:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Buscar artículo</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Referencia o descripción..."
                value={busquedaInput}
                onChange={(e) => setBusquedaInput(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
              <button
                type="submit"
                className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <FiSearch size={16} />
              </button>
            </div>
          </form>

          {/* Mes */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mes</label>
            <select
              value={mesSeleccionado}
              onChange={(e) => handleFilterChange(setMesSeleccionado)(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
            >
              {MESES.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Año */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Año</label>
            <select
              value={anioSeleccionado}
              onChange={(e) => handleFilterChange(setAnioSeleccionado)(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
            >
              {getAniosDisponibles().map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de movimiento</label>
            <select
              value={tipoSeleccionado}
              onChange={(e) => handleFilterChange(setTipoSeleccionado)(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-500 focus:border-slate-500 cursor-pointer"
            >
              {TIPOS_MOVIMIENTO.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Leyenda informativa */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span className="font-medium">ℹ️ Columna "Entidad":</span>
            <span className="text-slate-400">
              Venta → Cliente final | Compra → Proveedor | Fabricación → Cliente del pedido | Ajuste/Inicial → No aplica
            </span>
          </p>
        </div>
      </div>

      {/* Resumen rápido */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{total}</span> movimientos encontrados
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Mostrar:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="border border-slate-300 rounded px-2 py-1 text-sm cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span className="text-sm text-slate-500">por página</span>
          </div>
        </div>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FiPackage size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg">No se encontraron movimientos</p>
            <p className="text-sm mt-1">Prueba ajustando los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Fecha</th>
                  <th className="px-4 py-3 text-left font-semibold">Artículo</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Documento</th>
                  <th className="px-4 py-3 text-left font-semibold" title="Venta: Cliente final | Compra: Proveedor | Fabricación: Cliente del pedido">
                    Entidad
                    
                  </th>
                  <th className="px-4 py-3 text-center font-semibold">Stock Antes</th>
                  <th className="px-4 py-3 text-center font-semibold">Cantidad</th>
                  <th className="px-4 py-3 text-center font-semibold">Stock Después</th>
                  <th className="px-4 py-3 text-right font-semibold">Valor</th>
                  <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map((mov) => {
                  const tipoInfo = getTipoInfo(mov.tipo_origen_movimiento);
                  const IconComponent = tipoInfo.icon;
                  const esEntrada = mov.tipo_movimiento === 'entrada';
                  const entidadInfo = getEntidadInfo(mov);
                  const documentoInfo = getDocumentoInfo(mov);
                  
                  return (
                    <tr key={mov.id_movimiento} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FiCalendar size={14} className="text-slate-400" />
                          <span className="text-slate-700">{formatDate(mov.fecha)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-800">{mov.articulo_referencia}</div>
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {mov.articulo_descripcion || "-"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tipoInfo.bg} ${tipoInfo.text}`}>
                          <IconComponent size={12} />
                          {tipoInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {documentoInfo ? (
                          <span className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            {documentoInfo}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entidadInfo.aplica ? (
                          <div className="flex items-center gap-2" title={entidadInfo.tooltip}>
                            <FiUser size={14} className="text-slate-400" />
                            <div>
                              <span className="text-slate-700 truncate max-w-[150px] block">{entidadInfo.valor}</span>
                              {entidadInfo.tooltip && (
                                <span className="text-[10px] text-slate-400">{entidadInfo.tooltip}</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-sm">{entidadInfo.valor}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-slate-700">{mov.stock_antes}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-sm ${
                          esEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {esEntrada ? '+' : '-'}{mov.cantidad_movida}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium text-slate-700">{mov.stock_despues}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tieneValorMonetario(mov.tipo_origen_movimiento) ? (
                          mov.valor_documento ? (
                            <span className="font-medium text-emerald-700">
                              {formatCurrency(mov.valor_documento)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )
                        ) : (
                          <span className="text-slate-400 italic text-xs">No aplica</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/inventario/movimientos/${mov.id_articulo}`)}
                          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ver detalle del artículo"
                        >
                          <FiExternalLink size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && movimientos.length > 0 && (
          <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-600">
                Mostrando{" "}
                <span className="font-semibold">{((page - 1) * pageSize) + 1}</span>
                {" "}-{" "}
                <span className="font-semibold">{Math.min(page * pageSize, total)}</span>
                {" "}de{" "}
                <span className="font-semibold">{total}</span> movimientos
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  className="px-4 py-2  border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Primera página"
                >
                 
                  <FiChevronLeft size={16} className="-ml-2" />
                </button>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  <FiChevronLeft size={16} />
                  Anterior
                </button>
                <span className="px-4 py-2 bg-slate-700 text-white rounded-lg font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                >
                  Siguiente
                  <FiChevronRight size={16} />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-4 py-2  border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Última página"
                >
                  
                  <FiChevronRight size={16} className="-ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeguimientoInventarioPage;
