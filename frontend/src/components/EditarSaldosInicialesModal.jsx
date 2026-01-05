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
ñ    // Permitir signo negativo y números
    const esNegativo = valor.startsWith("-") || valor.includes("-");
    const valorLimpio = valor.replace(/[^\d]/g, "");
    const valorNumerico = parseFloat(valorLimpio) || 0;
    const valorFinal = esNegativo ? -valorNumerico : valorNumerico;
    setSaldos((prevSaldos) =>
      prevSaldos.map((s) =>
        s.id_metodo_pago === id_metodo_pago
          ? { ...s, saldo_inicial: valorFinal }
          : s
      )
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
          "Error al actualizar los saldos iniciales"
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
      {/* Overlay con difuminado */}
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
                <FiDollarSign className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Editar Saldos Iniciales
                </h2>
                <p className="text-slate-300 text-sm">
                  Período del{" "}
                  {new Date(cierre.fecha_inicio).toLocaleDateString("es-CO")}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FiX className="text-slate-300 hover:text-white" size={22} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-amber-50 border border-amber-200 p-4 mb-6 rounded-xl">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Importante:</strong> Los saldos iniciales se utilizan
              como punto de partida para el cálculo de los saldos finales de este
              período. Solo puedes modificar estos valores mientras el período
              esté abierto.
            </p>
          </div>

          <div className="space-y-3">
            {saldos.map((saldo) => (
              <div
                key={saldo.id_metodo_pago}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor={`saldo-${saldo.id_metodo_pago}`}
                    className="text-base font-bold text-slate-800 flex items-center gap-2"
                  >
                    <FiDollarSign className="text-slate-600" size={18} />
                    {saldo.metodo_nombre}
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                    $
                  </span>
                  <input
                    id={`saldo-${saldo.id_metodo_pago}`}
                    type="text"
                    value={formatearInputCOP(saldo.saldo_inicial)}
                    onChange={(e) =>
                      handleChange(saldo.id_metodo_pago, e.target.value)
                    }
                    className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-right font-mono text-lg transition-colors"
                    placeholder="0"
                  />
                </div>
                <p className="text-sm text-slate-500 mt-2 text-right">
                  {formatMonto(saldo.saldo_inicial)}
                </p>
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="mt-6 bg-slate-100 border border-slate-300 p-5 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 font-semibold text-lg">
                Total Saldo Inicial:
              </span>
              <span className="text-slate-900 font-bold text-2xl">
                {formatMonto(saldos.reduce((sum, s) => sum + s.saldo_inicial, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-5 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-400 transition-colors flex items-center gap-2 cursor-pointer font-medium"
          >
            <FiSave />
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarSaldosInicialesModal;
