import { useState, useEffect } from 'react';
import { FiX, FiPackage, FiCalendar, FiUser, FiPhone, FiClock } from 'react-icons/fi';
import api from '../services/api';
import toast from 'react-hot-toast';

const DrawerOrdenesEntregadas = ({ isOpen, onClose, mesInicial, anioInicial }) => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(mesInicial || new Date().getMonth() + 1);
  const [anio, setAnio] = useState(anioInicial || new Date().getFullYear());

  useEffect(() => {
    if (isOpen) {
      // Actualizar filtros si se pasan nuevos valores
      if (mesInicial) setMes(mesInicial);
      if (anioInicial) setAnio(anioInicial);
      fetchOrdenesEntregadas();
    }
  }, [isOpen, mesInicial, anioInicial]);

  useEffect(() => {
    if (isOpen) {
      fetchOrdenesEntregadas();
    }
  }, [mes, anio]);

  const fetchOrdenesEntregadas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kanban/ordenes-entregadas', {
        params: { mes, anio }
      });
      setOrdenes(res.data.ordenes || []);
    } catch (error) {
      console.error('Error cargando órdenes entregadas:', error);
      toast.error('Error al cargar órdenes entregadas');
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  const anios = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-2/3 lg:w-1/2 xl:w-2/5 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-3 rounded-lg">
              <FiPackage size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Órdenes Entregadas</h2>
              <p className="text-green-100 text-sm">Historial de entregas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer hover:bg-white/20 p-2 rounded-lg transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-gray-50 p-4 border-b flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Mes</label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Año</label>
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de órdenes */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Cargando órdenes...</div>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <FiPackage size={64} className="mb-4 opacity-50" />
              <p className="text-lg font-semibold">No hay órdenes entregadas</p>
              <p className="text-sm">en {meses[mes - 1].label} {anio}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordenes.map((orden) => (
                <div
                  key={orden.id_orden_fabricacion}
                  className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 text-lg">
                          OF #{orden.id_orden_fabricacion}
                        </span>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                          ✓ Entregada
                        </span>
                      </div>
                      {orden.id_pedido && (
                        <p className="text-xs text-gray-500 mt-1">
                          Pedido #{orden.id_pedido}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                      <FiClock size={14} />
                      <span className="text-xs">Entregada:</span>
                      {formatFecha(orden.fecha_entrega)}
                    </div>
                  </div>

                  {/* Cliente */}
                  {orden.nombre_cliente && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <FiUser size={14} className="text-gray-600" />
                        <span className="font-semibold text-gray-700 text-sm">
                          {orden.nombre_cliente}
                        </span>
                      </div>
                      {orden.telefono_cliente && (
                        <div className="flex items-center gap-2">
                          <FiPhone size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {orden.telefono_cliente}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Productos */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FiPackage size={14} className="text-gray-600" />
                      <span className="text-xs font-semibold text-gray-600 uppercase">
                        Productos
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {orden.productos}
                    </p>
                  </div>

                  {/* Fechas adicionales */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t">
                    <div>
                      <p className="text-xs text-gray-500">Inicio</p>
                      <p className="text-sm font-medium text-gray-700">
                        {formatFecha(orden.fecha_inicio)}
                      </p>
                    </div>
                    {orden.fecha_fin_estimada && (
                      <div>
                        <p className="text-xs text-gray-500">Estimada</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatFecha(orden.fecha_fin_estimada)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Total: <strong>{ordenes.length}</strong> orden{ordenes.length !== 1 ? 'es' : ''}
          </span>
          <button
            onClick={onClose}
            className="cursor-pointer bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
  );
};

export default DrawerOrdenesEntregadas;
