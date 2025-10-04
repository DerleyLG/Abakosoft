import React, { useEffect, useState } from 'react';
import { FiX, FiClock } from 'react-icons/fi';
import api from '../services/api';

const CreditoHistorialDrawer = ({ creditoId, onClose }) => {
  const [abonos, setAbonos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!creditoId) return;
    let mounted = true;
    const fetchAbonos = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/creditos/${creditoId}/abonos`);
        if (mounted) setAbonos(res.data || []);
      } catch (e) {
        console.error('Error fetching abonos', e);
        if (mounted) setError('No se pudo cargar el historial');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchAbonos();
    return () => { mounted = false; };
  }, [creditoId]);

  // trigger enter animation after mount
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/30" />
      {/* Drawer derecho */}
      <div className={`absolute right-0 top-0 bottom-0 w-full md:w-96 bg-white shadow-xl p-4 overflow-auto transform transition-transform duration-300 ease-out ${entered ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Historial de Abonos</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100">
            <FiX />
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-6">Cargando abonos...</div>
        ) : error ? (
          <div className="text-center text-red-500 py-6">{error}</div>
        ) : abonos.length === 0 ? (
          <div className="text-center text-gray-500 py-6">No hay abonos registrados.</div>
        ) : (
          <ul className="space-y-3">
            {abonos.map(a => (
              <li key={a.id_abono} className="flex items-start gap-3 p-3 border rounded">
                <div className="text-slate-500"><FiClock /></div>
                <div className="flex-1">
                  {/* Mostrar solo fecha sin hora */}
                  <div className="text-sm text-gray-700 font-medium">{new Date(a.fecha).toLocaleDateString('es-CO')}</div>
                  <div className="text-sm text-green-600 font-semibold">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(a.monto)}</div>
                  <div className="text-xs text-gray-500">Método: {a.metodo_nombre || '-' } · Ref: {a.referencia || '-'}</div>
                  {a.observaciones && <div className="text-xs text-gray-500 mt-1">{a.observaciones}</div>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CreditoHistorialDrawer;
