import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import cierresCajaService from "../services/cierresCajaService";
import { exportarCierrePDF } from "../utils/exportCierrePDF";
import EditarSaldosInicialesModal from "../components/EditarSaldosInicialesModal";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiCalendar,
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCheck,
  FiClock,
  FiUser,
  FiChevronDown,
  FiChevronRight,
  FiDownload,
  FiEdit,
} from "react-icons/fi";

const CierresCajaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cierre, setCierre] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);
  const [mostrarModalEditarSaldos, setMostrarModalEditarSaldos] =
    useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [detalleCierre, movimientosPeriodo] = await Promise.all([
        cierresCajaService.getById(id),
        cierresCajaService.getMovimientos(id),
      ]);

      setCierre(detalleCierre);
      setMovimientos(movimientosPeriodo);
    } catch (error) {
      console.error("Error cargando cierre:", error);
      toast.error("Error al cargar el detalle del cierre");
    } finally {
      setLoading(false);
    }
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
    // zona horaria
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO");
  };

  const agruparMovimientos = () => {
    const grupos = {};

    movimientos.forEach((mov) => {
      const key = `${mov.tipo_movimiento}_${mov.metodo_pago}`;
      if (!grupos[key]) {
        grupos[key] = {
          tipo: mov.tipo_movimiento,
          metodo: mov.metodo_pago,
          movimientos: [],
        };
      }
      grupos[key].movimientos.push(mov);
    });

    return grupos;
  };

  const handleExportar = () => {
    try {
      if (!cierre || !cierre.detalle_metodos) {
        toast.error("No hay datos suficientes para generar el PDF");
        return;
      }

      exportarCierrePDF(cierre, movimientos);
      toast.success("PDF generado exitosamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      console.error("Stack trace:", error.stack);
      toast.error(`Error al generar el PDF: ${error.message}`);
    }
  };

  const handleActualizarSaldos = () => {
    fetchData(); // Refrescar datos del cierre
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando detalle...</p>
      </div>
    );
  }

  if (!cierre) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-3">Cierre no encontrado</p>
          <button
            onClick={() => navigate("/cierres-caja")}
            className="text-xs text-slate-600 underline cursor-pointer"
          >
            Volver a lista
          </button>
        </div>
      </div>
    );
  }

  const movimientosAgrupados = agruparMovimientos();

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Detalle de
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
            Período #{cierre.id_cierre}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatFecha(cierre.fecha_inicio)}
            {cierre.fecha_fin
              ? ` — ${formatFecha(cierre.fecha_fin)}`
              : " — En curso"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportar}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <FiDownload size={14} />
            Exportar PDF
          </button>
          {cierre.estado === "abierto" && (
            <>
              <button
                onClick={() => setMostrarModalEditarSaldos(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                <FiEdit size={14} />
                Editar Saldos
              </button>
              <button
                onClick={() => navigate(`/cierres-caja/${id}/cerrar`)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <FiCheck size={14} />
                Cerrar Período
              </button>
            </>
          )}
          <button
            onClick={() => navigate("/cierres-caja")}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <FiArrowLeft size={14} />
            Volver
          </button>
        </div>
      </div>

      {/* Resumen 4 stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Inicial */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <FiDollarSign size={15} className="text-indigo-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Saldo Inicial
            </p>
          </div>
          <p className="text-xl font-bold text-slate-800">
            {formatMonto(
              cierre.detalle_metodos.reduce(
                (sum, d) => sum + d.saldo_inicial,
                0,
              ),
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {formatFecha(cierre.fecha_inicio)}
          </p>
        </div>
        {/* Ingresos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <FiTrendingUp size={15} className="text-emerald-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Ingresos
            </p>
          </div>
          <p className="text-xl font-bold text-emerald-700">
            +
            {formatMonto(
              cierre.detalle_metodos.reduce(
                (sum, d) => sum + d.total_ingresos,
                0,
              ),
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Entradas del período
          </p>
        </div>
        {/* Egresos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <FiTrendingDown size={15} className="text-rose-600" />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Egresos
            </p>
          </div>
          <p className="text-xl font-bold text-rose-600">
            -
            {formatMonto(
              cierre.detalle_metodos.reduce(
                (sum, d) => sum + d.total_egresos,
                0,
              ),
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Salidas del período
          </p>
        </div>
        {/* Saldo Final */}
        <div
          className={`bg-white border rounded-xl shadow-sm px-5 py-4 ${cierre.estado === "abierto" ? "border-emerald-200" : "border-slate-200"}`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cierre.estado === "abierto" ? "bg-emerald-50 border border-emerald-100" : "bg-slate-100 border border-slate-200"}`}
            >
              <FiDollarSign
                size={15}
                className={
                  cierre.estado === "abierto"
                    ? "text-emerald-600"
                    : "text-slate-600"
                }
              />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {cierre.estado === "abierto" ? "Saldo Actual" : "Saldo Final"}
            </p>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {formatMonto(
              cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0),
            )}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {cierre.estado === "abierto"
              ? "Tiempo real"
              : formatFecha(cierre.fecha_fin)}
          </p>
        </div>
      </div>

      {/* Estado del cierre */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cierre.estado === "abierto" ? "bg-emerald-50 border border-emerald-100" : "bg-slate-100 border border-slate-200"}`}
            >
              {cierre.estado === "abierto" ? (
                <FiClock size={16} className="text-emerald-600" />
              ) : (
                <FiCheck size={16} className="text-slate-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-slate-800">
                  {cierre.estado === "abierto"
                    ? "Período en curso"
                    : "Período cerrado"}
                </p>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    cierre.estado === "abierto"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  {cierre.estado === "abierto" ? "ABIERTO" : "CERRADO"}
                </span>
              </div>
              {cierre.estado === "cerrado" && (
                <p className="text-xs text-slate-500 mt-0.5">
                  <FiUser className="inline mr-1" size={11} />
                  Cerrado por: {cierre.usuario_cierre || "N/A"}
                </p>
              )}
            </div>
          </div>
          {cierre.estado === "cerrado" && cierre.fecha_cierre && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                Fecha de cierre
              </p>
              <p className="text-sm font-semibold text-slate-700">
                {new Date(cierre.fecha_cierre).toLocaleString("es-CO")}
              </p>
            </div>
          )}
        </div>
        {cierre.observaciones && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
              Observaciones
            </p>
            <p className="text-sm text-slate-700">{cierre.observaciones}</p>
          </div>
        )}
      </div>

      {/* Tabla de saldos por método */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Saldos por Método de Pago
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Saldo Inicial
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Ingresos
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Egresos
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  {cierre.estado === "abierto" ? "Saldo Actual" : "Saldo Final"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cierre.detalle_metodos.map((detalle) => (
                <tr
                  key={detalle.id_detalle}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                    {detalle.metodo_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">
                    {formatMonto(detalle.saldo_inicial)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      +{formatMonto(detalle.total_ingresos)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                      -{formatMonto(detalle.total_egresos)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-slate-900">
                      {formatMonto(detalle.saldo_final)}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="px-4 py-3 text-sm font-bold text-slate-900">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">
                  {formatMonto(
                    cierre.detalle_metodos.reduce(
                      (sum, d) => sum + d.saldo_inicial,
                      0,
                    ),
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                    +
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.total_ingresos,
                        0,
                      ),
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold">
                    -
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.total_egresos,
                        0,
                      ),
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-extrabold text-slate-900">
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.saldo_final,
                        0,
                      ),
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimientos detallados */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ">
        <button
          onClick={() => setMostrarMovimientos(!mostrarMovimientos)}
          className="w-full px-6 py-4 border-b border-slate-100 text-left hover:bg-slate-50/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between ">
            <div className="flex items-center gap-2 ">
              <h3 className="text-sm font-bold text-slate-900">
                Detalle de Movimientos
              </h3>
              <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-md">
                {movimientos.length}
              </span>
            </div>
            <span
              className={`cursor-pointer text-slate-400 transition-transform duration-200 ${mostrarMovimientos ? "rotate-180" : ""}`}
            >
              <FiChevronDown size={18} />
            </span>
          </div>
        </button>

        {mostrarMovimientos && (
          <div className="p-6 bg-slate-50/50">
            {Object.entries(movimientosAgrupados).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <FiCalendar size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No hay movimientos en este período</p>
              </div>
            ) : (
              Object.entries(movimientosAgrupados).map(([key, grupo]) => (
                <div key={key} className="mb-6 last:mb-0">
                  <div
                    className={`flex items-center gap-2 mb-3 ${grupo.tipo === "ingreso" ? "text-emerald-700" : "text-rose-600"}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${grupo.tipo === "ingreso" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}
                    >
                      {grupo.tipo === "ingreso" ? (
                        <FiTrendingUp size={14} />
                      ) : (
                        <FiTrendingDown size={14} />
                      )}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {grupo.tipo === "ingreso" ? "Ingresos" : "Egresos"} —{" "}
                      {grupo.metodo}
                    </span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Documento
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Observaciones
                          </th>
                          <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                            Monto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {grupo.movimientos.map((mov) => (
                          <tr
                            key={mov.id_movimiento}
                            className="hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-4 py-2.5 text-sm text-slate-600">
                              {formatFecha(mov.fecha)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-md">
                                {mov.tipo_documento} #{mov.id_documento}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-sm text-slate-500">
                              {mov.observaciones || "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <span
                                className={`text-sm font-bold ${grupo.tipo === "ingreso" ? "text-emerald-600" : "text-rose-600"}`}
                              >
                                {formatMonto(mov.monto)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {mostrarModalEditarSaldos && (
        <EditarSaldosInicialesModal
          cierre={cierre}
          onClose={() => setMostrarModalEditarSaldos(false)}
          onActualizar={handleActualizarSaldos}
        />
      )}
    </div>
  );
};

export default CierresCajaDetalle;
