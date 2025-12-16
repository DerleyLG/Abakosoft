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
    // Remover formato y parsear
    const valorLimpio = valor.replace(/\D/g, "");
    const valorNumerico = parseFloat(valorLimpio) || 0;
    setSaldos((prevSaldos) =>
      prevSaldos.map((s) =>
        s.id_metodo_pago === id_metodo_pago
          ? { ...s, saldo_inicial: valorNumerico }
          : s
      )
    );
  };

  const formatearInputCOP = (valor) => {
    return new Intl.NumberFormat("es-CO").format(valor);
  };

  const handleGuardar = async () => {
    try {
      // Validar que todos los saldos sean >= 0
      const saldosInvalidos = saldos.filter((s) => s.saldo_inicial < 0);
      if (saldosInvalidos.length > 0) {
        toast.error("Los saldos iniciales no pueden ser negativos");
        return;
      }

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
    <div className="fixed right-0 top-0 h-full w-full md:w-1/2 lg:w-2/5 xl:w-1/3 bg-black/40 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-3 rounded-lg">
            <FiDollarSign size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Editar Saldos Iniciales</h2>
            <p className="text-blue-100 text-sm">
              Período del{" "}
              {new Date(cierre.fecha_inicio).toLocaleDateString("es-CO")}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer hover:bg-white/20 p-2 rounded-lg transition-colors"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
          <p className="text-sm text-yellow-800">
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
              className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <label
                  htmlFor={`saldo-${saldo.id_metodo_pago}`}
                  className="text-base font-bold text-gray-800 flex items-center gap-2"
                >
                  <FiDollarSign className="text-blue-600" size={18} />
                  {saldo.metodo_nombre}
                </label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  id={`saldo-${saldo.id_metodo_pago}`}
                  type="text"
                  value={formatearInputCOP(saldo.saldo_inicial)}
                  onChange={(e) =>
                    handleChange(saldo.id_metodo_pago, e.target.value)
                  }
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right font-mono text-lg"
                  placeholder="0"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-right">
                {formatMonto(saldo.saldo_inicial)}
              </p>
            </div>
          ))}
        </div>

        {/* Resumen total */}
        <div className="mt-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700 text-lg">
              Total Saldo Inicial:
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {formatMonto(saldos.reduce((sum, s) => sum + s.saldo_inicial, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white">
        <button
          onClick={onClose}
          disabled={guardando}
          className="cursor-pointer px-6 py-3 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-semibold"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          disabled={guardando}
          className="cursor-pointer px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2 font-semibold shadow-lg hover:shadow-xl"
        >
          <FiSave />
          {guardando ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </div>
  );
};

export default EditarSaldosInicialesModal;
