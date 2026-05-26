import {
  FiX,
  FiCheck,
  FiAlertTriangle,
  FiTrendingUp,
  FiTrendingDown,
  FiDollarSign,
  FiCalendar,
  FiLock,
} from "react-icons/fi";

const ConfirmarCierrePeriodoModal = ({
  datos,
  onConfirmar,
  onCancelar,
  submitting,
}) => {
  const { resumen, warnings, fechaInicio, fechaFin } = datos;

  const formatMonto = (monto) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={!submitting ? onCancelar : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Confirmar
            </p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Cierre de Período
            </h2>
          </div>
          <button
            onClick={onCancelar}
            disabled={submitting}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600 disabled:opacity-40"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto max-h-[60vh]">
          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="flex flex-col gap-1.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2 text-amber-700">
                <FiAlertTriangle size={14} />
                <p className="text-xs font-bold uppercase tracking-wider">
                  Advertencias
                </p>
              </div>
              <ul className="space-y-1">
                {warnings.map((w, i) => (
                  <li
                    key={i}
                    className="text-xs text-amber-800 flex items-start gap-1.5"
                  >
                    <span className="mt-px text-amber-500">•</span>
                    {w.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Período */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              <FiCalendar size={14} className="text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Período
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {fechaInicio} — {fechaFin}
              </p>
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Resumen del período
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-slate-500">
                  <FiDollarSign size={13} />
                  <span className="text-xs">Saldo inicial</span>
                </div>
                <span className="text-sm font-semibold text-slate-700 tabular-nums">
                  {formatMonto(resumen.saldoInicial)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FiTrendingUp size={13} />
                  <span className="text-xs">Total ingresos</span>
                </div>
                <span className="text-sm font-semibold text-emerald-600 tabular-nums">
                  +{formatMonto(resumen.totalIngresos)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2 text-rose-500">
                  <FiTrendingDown size={13} />
                  <span className="text-xs">Total egresos</span>
                </div>
                <span className="text-sm font-semibold text-rose-500 tabular-nums">
                  -{formatMonto(resumen.totalEgresos)}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-700">
                  <FiDollarSign size={13} />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Saldo final
                  </span>
                </div>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">
                  {formatMonto(resumen.saldoFinal)}
                </span>
              </div>
            </div>
          </div>

          {/* Restricciones */}
          <div className="flex gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-xl">
            <FiLock size={13} className="text-rose-500 shrink-0 mt-px" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-rose-700">
                Una vez cerrado no se podrá:
              </p>
              <ul className="space-y-0.5">
                {[
                  "Editar movimientos de este período",
                  "Agregar movimientos en estas fechas",
                  "Modificar los saldos iniciales",
                ].map((texto, i) => (
                  <li
                    key={i}
                    className="text-xs text-rose-600 flex items-start gap-1.5"
                  >
                    <span className="mt-px">•</span>
                    {texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-white">
          <button
            onClick={onCancelar}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cerrando...
              </>
            ) : (
              <>
                <FiCheck size={14} />
                Cerrar Período
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarCierrePeriodoModal;
