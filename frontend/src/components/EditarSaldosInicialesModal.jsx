import { useState, useEffect } from 'react';
import { FiX, FiDollarSign, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../services/api';

/**
 * Modal para editar los saldos iniciales de un período de caja abierto
 * @param {Object} cierre - Datos del cierre actual
 * @param {Function} onClose - Callback al cerrar el modal
 * @param {Function} onActualizar - Callback al actualizar exitosamente
 */
const EditarSaldosInicialesModal = ({ cierre, onClose, onActualizar }) => {
  const [saldos, setSaldos] = useState([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Inicializar saldos con los valores actuales
    if (cierre && cierre.detalle_metodos) {
      const saldosIniciales = cierre.detalle_metodos.map(detalle => ({
        id_metodo_pago: detalle.id_metodo_pago,
        nombre_metodo: detalle.nombre_metodo,
        saldo_inicial: detalle.saldo_inicial || 0
      }));
      setSaldos(saldosIniciales);
    }
  }, [cierre]);

  const handleChange = (id_metodo_pago, valor) => {
    const valorNumerico = parseFloat(valor) || 0;
    setSaldos(prevSaldos =>
      prevSaldos.map(s =>
        s.id_metodo_pago === id_metodo_pago
          ? { ...s, saldo_inicial: valorNumerico }
          : s
      )
    );
  };

  const handleGuardar = async () => {
    try {
      // Validar que todos los saldos sean >= 0
      const saldosInvalidos = saldos.filter(s => s.saldo_inicial < 0);
      if (saldosInvalidos.length > 0) {
        toast.error('Los saldos iniciales no pueden ser negativos');
        return;
      }

      setGuardando(true);

      // Enviar solo id_metodo_pago y saldo_inicial
      const saldosActualizar = saldos.map(s => ({
        id_metodo_pago: s.id_metodo_pago,
        saldo_inicial: s.saldo_inicial
      }));

      await api.put(`/cierres-caja/${cierre.id_cierre}/saldos-iniciales`, {
        saldos_iniciales: saldosActualizar
      });

      toast.success('Saldos iniciales actualizados exitosamente');
      onActualizar(); // Refrescar datos del cierre
      onClose();
    } catch (error) {
      console.error('Error actualizando saldos iniciales:', error);
      toast.error(error.response?.data?.error || 'Error al actualizar los saldos iniciales');
    } finally {
      setGuardando(false);
    }
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <FiDollarSign className="text-blue-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Editar Saldos Iniciales
              </h2>
              <p className="text-sm text-gray-500">
                Período del {new Date(cierre.fecha_inicio).toLocaleDateString('es-CO')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los saldos iniciales se utilizan como punto de partida
              para el cálculo de los saldos finales de este período. Solo puedes modificar
              estos valores mientras el período esté abierto.
            </p>
          </div>

          <div className="space-y-4">
            {saldos.map((saldo) => (
              <div
                key={saldo.id_metodo_pago}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <label
                    htmlFor={`saldo-${saldo.id_metodo_pago}`}
                    className="text-sm font-medium text-gray-700"
                  >
                    {saldo.nombre_metodo}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Saldo actual: {formatMonto(saldo.saldo_inicial)}
                  </p>
                </div>
                <div className="w-48">
                  <input
                    id={`saldo-${saldo.id_metodo_pago}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={saldo.saldo_inicial}
                    onChange={(e) => handleChange(saldo.id_metodo_pago, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Resumen total */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Total Saldo Inicial:</span>
              <span className="text-xl font-bold text-blue-600">
                {formatMonto(saldos.reduce((sum, s) => sum + s.saldo_inicial, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={guardando}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <FiSave />
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarSaldosInicialesModal;
