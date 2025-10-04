import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const AbonoDrawer = ({ credito, onClose, onSaved }) => {
  const [monto, setMonto] = useState(credito?.saldo_pendiente || 0);
  const [montoDisplay, setMontoDisplay] = useState('');
  const [metodos, setMetodos] = useState([]);
  const [metodo, setMetodo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [obs, setObs] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resumen, setResumen] = useState(null);
  const drawerRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchMetodos = async () => {
      try {
        const res = await api.get('/metodos-pago');
        const filtered = (res.data || []).filter(m => (m.nombre || '').toLowerCase() !== 'credito');
        setMetodos(filtered);
      } catch (e) {
        console.debug('No se pudieron cargar metodos de pago', e);
      }
    };

    fetchMetodos();
  }, []);

  useEffect(() => {
    setMonto(credito?.saldo_pendiente || 0);
    setMetodo('');
    setReferencia('');
    setObs('');
    // cargar resumen y abonos
    const fetchResumen = async () => {
      try {
        const r = await api.get(`/creditos/${credito.id_venta_credito}/abonos`);
        // el endpoint devuelve solo abonos; intentamos obtener resumen si existe
        const resumenRes = await api.get(`/creditos/${credito.id_venta_credito}/resumen`).catch(() => null);
        setResumen({ abonos: r.data, resumen: resumenRes?.data || null });
      } catch (e) {
        console.debug('No se pudo cargar historial de abonos', e);
      }
    };
  if (credito && credito.id_venta_credito) fetchResumen();
    // animate in
    setTimeout(() => setVisible(true), 10);
    // focus
    setTimeout(() => drawerRef.current?.focus(), 60);

    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [credito]);

  useEffect(() => {
    // inicializar montoDisplay según monto
    const n = Number(monto || 0);
    const fmt = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    setMontoDisplay(n ? fmt.format(Math.round(n)) : '');
  }, [monto]);

  const fetchResumen = async () => {
    try {
      const r = await api.get(`/creditos/${credito.id_venta_credito}/abonos`);
      const resumenRes = await api.get(`/creditos/${credito.id_venta_credito}/resumen`).catch(() => null);
      setResumen({ abonos: r.data, resumen: resumenRes?.data || null });
      // actualizar monto mostrado según el resumen si viene
      if (resumenRes?.data?.saldo_pendiente !== undefined) {
        setMonto(resumenRes.data.saldo_pendiente);
      }
    } catch (e) {
      console.debug('No se pudo cargar historial de abonos', e);
    }
  };

  const handleClose = () => {
    // animar salida y luego notificar al padre
    setVisible(false);
    setTimeout(() => onClose && onClose(), 260);
  };

  const formatColombia = (v) => {
    const n = Number(String(v).replace(/[^0-9.-]+/g, ''));
    if (isNaN(n)) return '';
    return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Formatea valores en COP sin forzar siempre 2 decimales.
  // Si el valor es entero muestra sin decimales, si tiene decimales muestra hasta 2 sin ceros sobrantes.
  const formatCOP = (v) => {
    const n = Number(v);
    if (!isFinite(n)) return '';
    const isInteger = Math.abs(n % 1) < 1e-9;
    if (isInteger) return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
    // tiene decimales: mostrar hasta 2 sin ceros sobrantes
    // usamos toLocaleString y luego quitamos ceros finales en decimal
    const str = n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return str;
  };

  const parseInput = (str) => {
    const cleaned = String(str).replace(/[^0-9.-]+/g, '');
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const handleMontoChange = (e) => {
    // Solo enteros: eliminar todo lo que no sean dígitos
    let raw = String(e.target.value || '');
    raw = raw.replace(/[^0-9]/g, '');
    if (raw === '') {
      setMonto(0);
      setMontoDisplay('');
      return;
    }
    // evitar números con ceros a la izquierda innecesarios
    raw = raw.replace(/^0+(\d)/, '$1');
    const number = parseInt(raw, 10) || 0;
    setMonto(number);
    const formatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
    setMontoDisplay(formatter.format(number));
  };

  const handleSubmit = async () => {
    // monto entero en COP
    const val = Math.round(Number(monto) || 0);
    if (val <= 0) return toast.error('Ingresa un monto válido');
    if (val > (credito.saldo_pendiente || 0)) return toast.error('El monto no puede ser mayor al saldo pendiente');
    if (!metodo) return toast.error('Selecciona un método de pago');

    try {
      setGuardando(true);
      await api.post(`/creditos/${credito.id_venta_credito}/abonos`, {
        monto: val,
        id_metodo_pago: metodo,
        referencia: referencia || null,
        observaciones: obs || null,
      });
      toast.success('Abono registrado');
      // actualizar lista en padre
      onSaved && onSaved();
      // refrescar historial y monto en el drawer
      await fetchResumen();
    } catch (err) {
      console.error('Error guardando abono', err);
      toast.error(err.response?.data?.error || 'Error al registrar abono');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={`ml-auto bg-white w-full max-w-2xl h-full shadow-2xl p-6 overflow-auto transform transition-transform duration-250 ${visible ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Registrar Abono - #{credito.id_orden_venta}</h3>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900">Cerrar</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-slate-700">Saldo pendiente</label>
            <div className="font-mono text-lg">${formatCOP(credito.saldo_pendiente || 0)}</div>

            <label className="block text-sm text-slate-700 mt-4">Monto a abonar</label>
            <input
              type="text"
              inputMode="decimal"
              value={montoDisplay}
              onChange={handleMontoChange}
              onFocus={(e) => { e.target.select(); }}
              onBlur={(e) => {
                // normalize display on blur (no forced 2 decimals)
                const n = Number(monto || 0);
                const fmt = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                setMontoDisplay(n ? fmt.format(n) : '');
              }}
              className="w-full border rounded px-3 py-2"
            />

            <label className="block text-sm text-slate-700 mt-4">Método de pago</label>
            <select className="w-full border rounded px-3 py-2" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="">Seleccione</option>
              {metodos.map(m => (
                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>{m.nombre}</option>
              ))}
            </select>

            <label className="block text-sm text-slate-700 mt-4">Referencia (opcional)</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={referencia} onChange={(e) => setReferencia(e.target.value)} />

            <label className="block text-sm text-slate-700 mt-4">Observaciones</label>
            <textarea className="w-full border rounded px-3 py-2" rows="3" value={obs} onChange={(e) => setObs(e.target.value)} />

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={handleClose} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer">Cancelar</button>
                <button disabled={guardando} onClick={handleSubmit} className={`px-4 py-2 rounded ${guardando ? 'bg-slate-300' : 'bg-slate-600 text-white'} hover:brightness-110 cursor-pointer`}>{guardando ? 'Guardando...' : 'Registrar Abono'}</button>
              </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Historial de Abonos</h4>
            <div className="h-[380px] overflow-auto border rounded p-3 bg-slate-50">
              {resumen?.abonos && resumen.abonos.length > 0 ? (
                <ul className="space-y-3">
                  {resumen.abonos.map(a => (
                    <li key={a.id_abono} className="flex justify-between items-start bg-white p-2 rounded shadow-sm">
                      <div>
                        <div className="text-sm font-medium">{new Date(a.fecha).toLocaleDateString('es-CO')}</div>
                        <div className="text-xs text-slate-600">{a.observaciones}</div>
                      </div>
                      <div className="font-mono text-right">${formatCOP(a.monto)}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-slate-500">No hay abonos registrados.</div>
              )}
            </div>

            <div className="mt-4">
              <h5 className="font-semibold">Resumen</h5>
              {resumen?.resumen ? (
                <div className="mt-2 text-sm">
                  <div>Monto Total: <strong>${formatCOP(resumen.resumen.monto_total)}</strong></div>
                  <div>Total Abonado: <strong>${formatCOP(resumen.resumen.total_abonado)}</strong></div>
                  <div>Saldo Pendiente: <strong>${formatCOP(resumen.resumen.saldo_pendiente)}</strong></div>
                  <div>Estado: <strong>{resumen.resumen.estado}</strong></div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No hay resumen disponible.</div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AbonoDrawer;
