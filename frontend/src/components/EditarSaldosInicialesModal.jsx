import { useState, useEffect } from "react";
import { FiX, FiDollarSign, FiSave } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../services/api";

const EditarSaldosInicialesModal = ({ cierre, onClose, onActualizar }) => {
  const [saldos, setSaldos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Inicializar saldos con los valores actuales
    if (cierre && cierre.detalle_metodos) {
      const saldosIniciales = cierre.detalle_metodos.map((detalle) => ({
        id_metodo_pago: detalle.id_metodo_pago,
        metodo_nombre: detalle.metodo_nombre,
        saldo_inicial: detalle.saldo_inicial || 0,
      }));
      setSaldos(saldosIniciales);
    }
  }, [cierre]);

  const handleChange = (id_metodo_pago, valor) => {
    // Permitir signo negativo y números
    const esNegativo = valor.startsWith("-") || valor.includes("-");
    const valorLimpio = valor.replace(/[^\d]/g, "");
    const valorNumerico = parseFloat(valorLimpio) || 0;
    const valorFinal = esNegativo ? -valorNumerico : valorNumerico;
    setSaldos((prevSaldos) =>
      prevSaldos.map((s) =>
        s.id_metodo_pago === id_metodo_pago
          ? { ...s, saldo_inicial: valorFinal }
          : s,
      ),
    );
  };

  const formatearInputCOP = (valor) => {
    return new Intl.NumberFormat("es-CO").format(valor);
  };

  const handleGuardar = async () => {
    try {
      setGuardando(true);

      // Enviar solo id_metodo_pago y saldo_inicial
      const saldosActualizar = saldos.map((s) => ({
        id_metodo_pago: s.id_metodo_pago,
        saldo_inicial: s.saldo_inicial,
      }));

      await api.put(`/cierres-caja/${cierre.id_cierre}/saldos-iniciales`, {
        saldos_iniciales: saldosActualizar,
      });

      toast.success("Saldos iniciales actualizados exitosamente");
      onActualizar(); // Refrescar datos del cierre
      onClose();
    } catch (error) {
      console.error("Error actualizando saldos iniciales:", error);
      toast.error(
        error.response?.data?.error ||
          "Error al actualizar los saldos iniciales",
      );
    } finally {
      setGuardando(false);
    }
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Período #{cierre.id_cierre}
            </p>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Saldos Iniciales
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-slate-50 space-y-3">
          {/* Aviso */}
          <div className="flex gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="shrink-0 text-sm mt-px">⚠️</span>
            <p className="text-xs text-amber-800">
              Estos valores son el punto de partida para el cálculo de saldos
              finales. Solo modificables mientras el período esté abierto.
            </p>
          </div>

          {/* Filas por método */}
          {saldos.map((saldo) => (
            <div
              key={saldo.id_metodo_pago}
              className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3"
            >
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                {saldo.metodo_nombre}
              </p>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">
                    $
                  </span>
                  <input
                    id={`saldo-${saldo.id_metodo_pago}`}
                    type="text"
                    value={formatearInputCOP(saldo.saldo_inicial)}
                    onChange={(e) =>
                      handleChange(saldo.id_metodo_pago, e.target.value)
                    }
                    className="w-full pl-7 pr-3 py-2.5 text-right text-sm font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition-colors"
                    placeholder="0"
                  />
                </div>
                <span className="text-xs text-slate-400 w-28 text-right shrink-0 tabular-nums">
                  {formatMonto(saldo.saldo_inicial)}
                </span>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total saldo inicial
              </p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatMonto(
                  saldos.reduce((sum, s) => sum + s.saldo_inicial, 0),
                )}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <FiDollarSign size={18} className="text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 shrink-0 bg-white">
          <button
            onClick={onClose}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSave size={14} />
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarSaldosInicialesModal;
