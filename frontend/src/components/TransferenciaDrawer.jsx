import React, { useState, useEffect } from 'react';
import { FiRepeat, FiX, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import toast from 'react-hot-toast';

const TransferenciaDrawer = ({ 
  isOpen, 
  onClose, 
  metodosPago, 
  balanceEfectivo, 
  balanceTransferencia,
  onTransferenciaExitosa 
}) => {
  const [transferencia, setTransferencia] = useState({
    metodoOrigen: '',
    metodoDestino: '',
    monto: '',
    observaciones: ''
  });
  const [procesando, setProcesando] = useState(false);

  // Formatear número con separadores de miles
  const formatNumber = (value) => {
    if (!value) return '';
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleMontoChange = (e) => {
    const value = e.target.value.replace(/,/g, '');
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTransferencia({ ...transferencia, monto: value });
    }
  };

  const efectivo = metodosPago.find(m => m.nombre.toLowerCase().includes('efectivo'));
  const transferenciaMetodo = metodosPago.find(m => m.nombre.toLowerCase().includes('transferencia'));

  const getMetodoNombre = (id) => {
    const metodo = metodosPago.find(m => m.id_metodo_pago === parseInt(id));
    return metodo?.nombre || '';
  };

  // Calcular balances proyectados
  const calcularBalanceProyectado = () => {
    const monto = parseFloat(transferencia.monto) || 0;
    const origenId = parseInt(transferencia.metodoOrigen);
    const destinoId = parseInt(transferencia.metodoDestino);

    let nuevoBalanceEfectivo = balanceEfectivo;
    let nuevoBalanceTransferencia = balanceTransferencia;

    // Restar del origen
    if (origenId === efectivo?.id_metodo_pago) {
      nuevoBalanceEfectivo -= monto;
    } else if (origenId === transferenciaMetodo?.id_metodo_pago) {
      nuevoBalanceTransferencia -= monto;
    }

    // Sumar al destino
    if (destinoId === efectivo?.id_metodo_pago) {
      nuevoBalanceEfectivo += monto;
    } else if (destinoId === transferenciaMetodo?.id_metodo_pago) {
      nuevoBalanceTransferencia += monto;
    }

    return { nuevoBalanceEfectivo, nuevoBalanceTransferencia };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!transferencia.metodoOrigen || !transferencia.metodoDestino) {
      toast.error('Debes seleccionar método origen y destino');
      return;
    }

    if (transferencia.metodoOrigen === transferencia.metodoDestino) {
      toast.error('No puedes transferir al mismo método');
      return;
    }

    const monto = parseFloat(transferencia.monto);
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    const origenNombre = getMetodoNombre(transferencia.metodoOrigen);
    const destinoNombre = getMetodoNombre(transferencia.metodoDestino);
    let tipoMovimiento = 'Transferencia de fondos';

    // La referencia se envía vacía
    let referencia = '';

    // Observación automática si el usuario la deja en blanco
    let observaciones = transferencia.observaciones;
    if (!observaciones) {
      observaciones = `Fondo transferido de ${origenNombre} a ${destinoNombre}`;
    }

    setProcesando(true);
    try {
      await onTransferenciaExitosa({
        id_metodo_origen: parseInt(transferencia.metodoOrigen),
        id_metodo_destino: parseInt(transferencia.metodoDestino),
        monto: monto,
        observaciones,
        referencia,
        tipo_movimiento: tipoMovimiento
      });

      // Limpiar formulario
      setTransferencia({ metodoOrigen: '', metodoDestino: '', monto: '', observaciones: '' });
      onClose();
    } catch (error) {
      // El error ya se maneja en el componente padre
    } finally {
      setProcesando(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const { nuevoBalanceEfectivo, nuevoBalanceTransferencia } = calcularBalanceProyectado();
  const mostrarProyeccion = transferencia.metodoOrigen && transferencia.metodoDestino && transferencia.monto;

  // Determinar si es retiro o ingreso
  const esRetiro = parseInt(transferencia.metodoOrigen) === transferenciaMetodo?.id_metodo_pago;
  const esIngresoEfectivo = parseInt(transferencia.metodoDestino) === efectivo?.id_metodo_pago;
  const tipoOperacion = esRetiro ? 'Retiro' : 'Ingreso';
  const iconoOperacion = esRetiro ? <FiTrendingDown className="text-red-600" size={20} /> : <FiTrendingUp className={esIngresoEfectivo ? "text-green-600" : "text-blue-600"} size={20} />;
  const colorOperacion = esRetiro ? 'text-red-600' : esIngresoEfectivo ? 'text-green-600' : 'text-blue-600';

  // Animación del drawer y overlay
  // Si no está abierto, no renderizar nada
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay con opacidad igual a AbonoDrawer (bg-black/40) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
        style={{ animation: 'fadeIn 0.3s' }}
      />

      {/* Drawer con animación slide-in */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300"
        style={{
          animation: 'slideInRight 0.3s',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-slate-700 text-white">
            <div className="flex items-center gap-3">
              <FiRepeat size={24} />
              <h3 className="text-xl font-bold">Transferir Fondos</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-600 rounded-lg transition cursor-pointer"
              disabled={procesando}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Saldos Actuales */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-700 mb-3"> Saldos Actuales (mes en curso)</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Efectivo:</span>
                    <span className={`font-bold ${balanceEfectivo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balanceEfectivo)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Transferencia Bancaria:</span>
                    <span className={`font-bold ${balanceTransferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balanceTransferencia)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Método Origen */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Desde (Método Origen)
                </label>
                <select
                  value={transferencia.metodoOrigen}
                  onChange={(e) => setTransferencia({ ...transferencia, metodoOrigen: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 bg-white"
                  required
                >
                  <option value="">Seleccionar método</option>
                  {metodosPago
                    .filter(m => {
                      const nombre = (m.nombre || '').toLowerCase();
                      const esVisible = nombre.includes('efectivo') || nombre.includes('transferencia');
                      return esVisible && String(m.id_metodo_pago) !== String(transferencia.metodoDestino);
                    })
                    .map(m => (
                      <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                    ))}
                </select>
              </div>

              {/* Método Destino */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hacia (Método Destino)
                </label>
                <select
                  value={transferencia.metodoDestino}
                  onChange={(e) => setTransferencia({ ...transferencia, metodoDestino: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 bg-white"
                  required
                >
                  <option value="">Seleccionar método</option>
                  {metodosPago
                    .filter(m => {
                      const nombre = (m.nombre || '').toLowerCase();
                      const esVisible = nombre.includes('efectivo') || nombre.includes('transferencia');
                      return esVisible && String(m.id_metodo_pago) !== String(transferencia.metodoOrigen);
                    })
                    .map(m => (
                      <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
                    ))}
                </select>
              </div>

              {/* Tipo de Operación */}
              {transferencia.metodoOrigen && transferencia.metodoDestino && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${esRetiro ? 'bg-red-50 border-red-200' : esIngresoEfectivo ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                  {iconoOperacion}
                  <span className={`font-semibold ${colorOperacion}`}>
                    {tipoOperacion} {esRetiro ? 'desde cuenta bancaria' : esIngresoEfectivo ? 'a efectivo' : 'a cuenta bancaria'}
                  </span>
                </div>
              )}

              {/* Monto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto a transferir
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    value={formatNumber(transferencia.monto)}
                    onChange={handleMontoChange}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600 font-medium text-lg"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Observaciones (Opcional)
                </label>
                <textarea
                  value={transferencia.observaciones}
                  onChange={(e) => setTransferencia({ ...transferencia, observaciones: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-600"
                  rows={3}
                  placeholder="Descripción adicional de la transferencia..."
                />
              </div>

              {/* Balance Proyectado */}
              {mostrarProyeccion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-semibold text-blue-900">Balance Proyectado Después de la Transferencia</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Efectivo:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{formatCurrency(balanceEfectivo)}</span>
                        <span className="text-lg">→</span>
                        <span className={`font-bold ${nuevoBalanceEfectivo > balanceEfectivo ? 'text-green-600' : nuevoBalanceEfectivo < balanceEfectivo ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatCurrency(nuevoBalanceEfectivo)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-blue-700">Transferencia:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{formatCurrency(balanceTransferencia)}</span>
                        <span className="text-lg">→</span>
                        <span className={`font-bold ${nuevoBalanceTransferencia > balanceTransferencia ? 'text-green-600' : nuevoBalanceTransferencia < balanceTransferencia ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatCurrency(nuevoBalanceTransferencia)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition cursor-pointer"
                  disabled={procesando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  disabled={procesando}
                >
                  {procesando ? 'Procesando...' : 'Transferir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

// Animaciones CSS
const style = document.createElement('style');
style.innerHTML = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
`;
if (!document.head.querySelector('style[data-transferencia-drawer]')) {
  style.setAttribute('data-transferencia-drawer', 'true');
  document.head.appendChild(style);
}

export default TransferenciaDrawer;
