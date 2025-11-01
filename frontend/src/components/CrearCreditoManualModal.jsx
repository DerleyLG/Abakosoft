import React, { useEffect, useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const CrearCreditoManualModal = ({ open, onClose, onCreated }) => {
  const [clientes, setClientes] = useState([]);
  const [idCliente, setIdCliente] = useState('');
  const [monto, setMonto] = useState('');
  const [obs, setObs] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await api.get('/clientes');
        setClientes(r.data || []);
      } catch (e) {
        console.error('No se pudieron cargar clientes', e);
        setClientes([]);
      }
    })();
  }, [open]);

  const reset = () => {
    setIdCliente('');
    setMonto('');
    setObs('');
  };

  const handleClose = () => {
    reset();
    onClose && onClose();
  };

  const parseMonto = (val) => {
    const n = Number(String(val).replace(/[^0-9]/g, ''));
    return isFinite(n) ? n : 0;
  };

  const handleSubmit = async () => {
    const montoInt = parseMonto(monto);
    if (!idCliente) return toast.error('Selecciona un cliente');
    if (!montoInt || montoInt <= 0) return toast.error('Ingresa un monto válido');

    try {
      setGuardando(true);
      const res = await api.post('/creditos/manual', {
        id_cliente: Number(idCliente),
        monto_total: montoInt,
        observaciones: obs || null,
      });
      toast.success('Crédito creado');
      onCreated && onCreated(res.data?.id_venta_credito);
      handleClose();
    } catch (e) {
      console.error('Error creando crédito manual', e);
      toast.error(e.response?.data?.error || 'Error al crear crédito');
    } finally {
      setGuardando(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Registrar factura pendiente</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-700 mb-1">Cliente</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={idCliente}
              onChange={(e) => setIdCliente(e.target.value)}
            >
              <option value="">Seleccione</option>
              {clientes.map((c) => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Monto total (COP)</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700 mb-1">Observaciones (opcional)</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              rows={3}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={handleClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer">Cancelar</button>
          <button onClick={handleSubmit} disabled={guardando} className={`px-4 py-2 rounded ${guardando ? 'bg-slate-300' : 'bg-slate-700 text-white'} hover:brightness-110 cursor-pointer`}>
            {guardando ? 'Guardando...' : 'Crear' }
          </button>
        </div>
      </div>
    </div>
  );
};

export default CrearCreditoManualModal;
