import { useState, useEffect } from "react";
import { FiX, FiDollarSign, FiCalendar, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../services/api";

const IniciarPeriodoModal = ({ onClose, onSuccess }) => {
  const [metodosPago, setMetodosPago] = useState([]);
  const [saldos, setSaldos] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargarMetodosPago();
  }, []);

  const cargarMetodosPago = async () => {
    try {
      const response = await api.get("/metodos-pago");
      const metodos = response.data.filter(
        (m) =>
          m.nombre.toLowerCase() !== "credito" &&
          m.nombre.toLowerCase() !== "crédito"
      );

      setMetodosPago(metodos);

      // Inicializar saldos en 0
      const saldosIniciales = {};
      metodos.forEach((metodo) => {
        saldosIniciales[metodo.id_metodo_pago] = 0;
      });
      setSaldos(saldosIniciales);
    } catch (error) {
      console.error("Error cargando métodos de pago:", error);
      toast.error("Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id_metodo_pago, valor) => {
    const valorLimpio = valor.replace(/\D/g, "");
    const valorNumerico = parseFloat(valorLimpio) || 0;
    setSaldos((prev) => ({
      ...prev,
      [id_metodo_pago]: valorNumerico,
    }));
  };

  const formatearInputCOP = (valor) => {
    return new Intl.NumberFormat("es-CO").format(valor);
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto);
  };

  const calcularTotal = () => {
    return Object.values(saldos).reduce((sum, val) => sum + (val || 0), 0);
  };

  const handleIniciar = async () => {
    try {
      // Validar que al menos un saldo sea > 0
      const total = calcularTotal();
      if (total === 0) {
        toast.error("Debes ingresar al menos un saldo inicial");
        return;
      }

      setGuardando(true);

      // Preparar datos - Obtener fecha local sin conversión UTC
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = String(hoy.getMonth() + 1).padStart(2, "0");
      const day = String(hoy.getDate()).padStart(2, "0");
      const fecha_inicio = `${year}-${month}-${day}`;

      const saldos_iniciales = Object.entries(saldos).map(
        ([id_metodo_pago, saldo_inicial]) => ({
          id_metodo_pago: parseInt(id_metodo_pago),
          saldo_inicial,
        })
      );

      await api.post("/cierres-caja", {
        fecha_inicio,
        saldos_iniciales,
      });

      toast.success("Período iniciado exitosamente");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error iniciando período:", error);
      toast.error(error.response?.data?.error || "Error al iniciar el período");
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-4 rounded-xl">
                <FiCalendar size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Iniciar Período de Caja</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {new Date().toLocaleDateString("es-CO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="cursor-pointer hover:bg-white/20 p-2 rounded-lg transition-colors"
              disabled={guardando}
            >
              <FiX size={28} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gradient-to-b from-gray-50 to-white">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
            <p className="text-sm text-blue-900">
              <strong>💡 Instrucción:</strong> Ingresa el saldo inicial
              disponible para cada método de pago. Este será el punto de partida
              de tu control de caja.
            </p>
          </div>

          <div className="space-y-4">
            {metodosPago.map((metodo) => (
              <div
                key={metodo.id_metodo_pago}
                className="bg-white p-5 rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <label
                    htmlFor={`saldo-${metodo.id_metodo_pago}`}
                    className="text-lg font-bold text-gray-800 flex items-center gap-2"
                  >
                    <FiDollarSign className="text-green-600" size={20} />
                    {metodo.nombre}
                  </label>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">
                    $
                  </span>
                  <input
                    id={`saldo-${metodo.id_metodo_pago}`}
                    type="text"
                    value={formatearInputCOP(saldos[metodo.id_metodo_pago])}
                    onChange={(e) =>
                      handleChange(metodo.id_metodo_pago, e.target.value)
                    }
                    className="w-full pl-10 pr-4 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right font-mono text-xl transition-all"
                    placeholder="0"
                    disabled={guardando}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 text-right font-semibold">
                  {formatMonto(saldos[metodo.id_metodo_pago])}
                </p>
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-700">
                Saldo Total Inicial
              </span>
              <span className="text-3xl font-bold text-green-700">
                {formatMonto(calcularTotal())}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 border-t flex gap-3">
          <button
            onClick={onClose}
            disabled={guardando}
            className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleIniciar}
            disabled={guardando || calcularTotal() === 0}
            className="cursor-pointer flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
          >
            {guardando ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Iniciando...
              </>
            ) : (
              <>
                <FiCheckCircle size={20} />
                Iniciar Período
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IniciarPeriodoModal;
