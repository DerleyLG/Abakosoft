import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiX,
  FiClock,
  FiDollarSign,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiCalendar,
} from "react-icons/fi";

const formatCurrency = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const quickDates = [
  { label: "Hoy", days: 0 },
  { label: "Ayer", days: 1 },
  { label: "Últ. 7 días", days: 7 },
  { label: "Este mes", days: "month" },
];

const HistorialSaldoDrawer = ({ isOpen, onClose, cliente }) => {
  const [movimientos, setMovimientos] = useState([]);
  const [saldoActual, setSaldoActual] = useState(0);
  const [loading, setLoading] = useState(false);
  const [desde, setDesde] = useState(new Date().toISOString().split("T")[0]);
  const [hasta, setHasta] = useState(new Date().toISOString().split("T")[0]);
  const [fechaInput, setFechaInput] = useState(
    new Date().toISOString().split("T")[0],
  );

  const getDateRange = useCallback((days) => {
    const hoy = new Date();
    if (days === "month") {
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1)
          .toISOString()
          .split("T")[0],
        hasta: hoy.toISOString().split("T")[0],
      };
    }
    const desdeDate = new Date(hoy);
    desdeDate.setDate(hoy.getDate() - days);
    return {
      desde: desdeDate.toISOString().split("T")[0],
      hasta: hoy.toISOString().split("T")[0],
    };
  }, []);

  const fetchHistorial = useCallback(
    async (desdeFecha, hastaFecha) => {
      if (!cliente) return;
      setLoading(true);
      try {
        const res = await api.get(
          `/clientes/saldo-favor/${cliente.value}/historial`,
          {
            params: { desde: desdeFecha, hasta: hastaFecha },
          },
        );
        setMovimientos(
          Array.isArray(res.data.movimientos) ? res.data.movimientos : [],
        );
        setSaldoActual(Number(res.data.saldo_actual) || 0);
      } catch (error) {
        toast.error("Error al cargar historial");
        setMovimientos([]);
      } finally {
        setLoading(false);
      }
    },
    [cliente],
  );

  useEffect(() => {
    if (isOpen && cliente) {
      setDesde(fechaInput);
      setHasta(fechaInput);
      fetchHistorial(fechaInput, fechaInput);
    }
  }, [isOpen, cliente, fechaInput, fetchHistorial]);

  const handleQuickDate = (days) => {
    const range = getDateRange(days);
    setDesde(range.desde);
    setHasta(range.hasta);
    fetchHistorial(range.desde, range.hasta);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setFechaInput(val);
    setDesde(val);
    setHasta(val);
    fetchHistorial(val, val);
  };

  const totalAbonos = movimientos
    .filter((m) => m.tipo === "abono")
    .reduce((sum, m) => sum + Math.abs(Number(m.monto || 0)), 0);

  const totalUsos = movimientos
    .filter((m) => m.tipo === "usado")
    .reduce((sum, m) => sum + Math.abs(Number(m.monto || 0)), 0);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <FiClock className="text-slate-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Historial de saldo
              </h2>
              <p className="text-xs text-slate-500">{cliente?.label || ""}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        <div
          className="p-6 space-y-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {/* Saldo actual */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
              Saldo actual
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${saldoActual > 0 ? "text-emerald-600" : "text-slate-400"}`}
            >
              {formatCurrency(saldoActual)}
            </p>
          </div>

          {/* Filtro rápido */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Filtrar por fecha
            </p>
            <div className="flex items-center gap-2 mb-3">
              {quickDates.map((qd) => (
                <button
                  key={qd.label}
                  onClick={() => handleQuickDate(qd.days)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                >
                  {qd.label}
                </button>
              ))}
            </div>
            <div className="relative">
              <FiCalendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="date"
                value={fechaInput}
                onChange={handleDateChange}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
              />
            </div>
          </div>

          {/* Resumen del período */}
          {movimientos.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <p className="text-[10px] text-emerald-600 uppercase font-semibold tracking-wider">
                  Abonos
                </p>
                <p className="text-sm font-bold text-emerald-700 mt-0.5">
                  {formatCurrency(totalAbonos)}
                </p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-center">
                <p className="text-[10px] text-rose-600 uppercase font-semibold tracking-wider">
                  Usado
                </p>
                <p className="text-sm font-bold text-rose-700 mt-0.5">
                  {formatCurrency(totalUsos)}
                </p>
              </div>
            </div>
          )}

          {/* Lista de movimientos */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Movimientos{" "}
              {desde === hasta
                ? formatDate(desde)
                : `${formatDate(desde)} - ${formatDate(hasta)}`}
            </p>

            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-slate-100 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FiClock size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin movimientos en este período</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movimientos.map((mov) => {
                  const esAbono = mov.tipo === "abono";
                  const monto = Math.abs(Number(mov.monto || 0));
                  return (
                    <div
                      key={mov.id_unico}
                      className={`p-3 rounded-xl border ${esAbono ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${esAbono ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}
                          >
                            {esAbono ? (
                              <FiArrowDownLeft size={14} />
                            ) : (
                              <FiArrowUpRight size={14} />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700">
                              {esAbono ? "Abono" : "Usado en venta"}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {mov.metodo_pago ? `${mov.metodo_pago}` : ""}
                              {mov.referencia ? ` · ${mov.referencia}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-xs font-bold ${esAbono ? "text-emerald-600" : "text-rose-600"}`}
                          >
                            {esAbono ? "+" : "-"}
                            {formatCurrency(monto)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {formatDate(mov.fecha)}
                          </p>
                        </div>
                      </div>
                      {mov.observaciones && (
                        <p className="text-[10px] text-slate-500 mt-1.5 ml-9 leading-relaxed">
                          {mov.observaciones}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default HistorialSaldoDrawer;
