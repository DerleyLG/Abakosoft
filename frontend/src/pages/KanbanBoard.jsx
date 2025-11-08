import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import React from 'react';

const KanbanBoard = () => {
  const [columnas, setColumnas] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchKanbanData();
  }, []);

  const fetchKanbanData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/kanban/ordenes-fabricacion');
      setColumnas(res.data.columnas || {});
      setEtapas(res.data.etapas || []);
    } catch (error) {
      console.error('Error cargando datos del Kanban:', error);
      toast.error('Error al cargar el tablero Kanban');
    } finally {
      setLoading(false);
    }
  };

  const getBadgeColor = (prioridad) => {
    switch (prioridad) {
      case 'retrasada':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'urgente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-green-100 text-green-800 border-green-300';
    }
  };

  const getPrioridadTexto = (prioridad, dias) => {
    if (prioridad === 'retrasada') return `Retrasada ${Math.abs(dias)} días`;
    if (prioridad === 'urgente') return `${dias} días restantes`;
    if (dias !== null) return `${dias} días restantes`;
    return 'Sin fecha estimada';
  };

  // Estructura de columnas con sus configuraciones
  const columnasConfig = [
    { key: 'etapa_11', titulo: 'Carpintería', icon: FiClock, color: 'bg-blue-50' },
    { key: 'etapa_12', titulo: 'Pulido', icon: FiClock, color: 'bg-indigo-50' },
    { key: 'etapa_3', titulo: 'Pintura', icon: FiClock, color: 'bg-purple-50' },
    { key: 'etapa_13', titulo: 'Tapizado', icon: FiClock, color: 'bg-pink-50' },
    { key: 'finalizada', titulo: 'Finalizado', icon: FiCheckCircle, color: 'bg-green-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Cargando tablero de produccion...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col px-4 md:px-8 py-4 select-none overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tablero de produccion</h2>
          <p className="text-gray-600 text-sm mt-1">Seguimiento de órdenes de fabricación</p>
          <p className="text-gray-500 text-xs mt-1 italic">
             Las órdenes finalizadas se ocultan automáticamente después de 15 días
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-semibold transition"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      {/* Tablero Kanban */}
      <div className="bg-white rounded-xl shadow-lg p-3 flex-1 overflow-hidden">
        <div className="flex gap-4 h-full overflow-x-auto">
          {columnasConfig.map((config) => {
            const ordenes = columnas[config.key] || [];
            const Icon = config.icon;

            // Ordenar: primero las que están en proceso, después las pendientes
            const ordenesOrdenadas = [...ordenes].sort((a, b) => {
              if (a.estado_etapa === 'en_proceso' && b.estado_etapa !== 'en_proceso') return -1;
              if (a.estado_etapa !== 'en_proceso' && b.estado_etapa === 'en_proceso') return 1;
              return 0; // Mantener orden original si ambas tienen el mismo estado
            });

            return (
              <div key={config.key} className="flex-shrink-0 w-72 h-full flex flex-col">
                {/* Header de columna */}
                <div className={`${config.color} rounded-lg p-2.5 mb-2 border-2 border-gray-200 flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="text-gray-700" size={18} />
                      <h3 className="font-bold text-gray-800 text-sm">{config.titulo}</h3>
                    </div>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-semibold text-gray-700">
                      {ordenes.length}
                    </span>
                  </div>
                </div>

                {/* Lista de tarjetas */}
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
                  {ordenes.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      No hay órdenes
                    </div>
                  ) : (
                    ordenesOrdenadas.map((orden) => (
                      <div
                        key={orden.id_orden_fabricacion}
                        className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/ordenes_fabricacion/editar/${orden.id_orden_fabricacion}`)}
                      >
                        {/* Header de tarjeta */}
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="font-bold text-gray-800 text-sm">
                            OF #{orden.id_orden_fabricacion}
                          </div>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full border ${getBadgeColor(
                              orden.prioridad
                            )}`}
                          >
                            {getPrioridadTexto(orden.prioridad, orden.dias_restantes)}
                          </span>
                        </div>

                        {/* Cliente */}
                        <div className="text-xs text-gray-600 mb-1.5">
                          <span className="font-semibold">Cliente:</span>{' '}
                          {orden.nombre_cliente || 'Sin cliente'}
                        </div>

                        {/* Badge de estado de etapa */}
                        {orden.estado_etapa === 'en_proceso' ? (
                          <div className="mb-1.5">
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                               En proceso
                            </span>
                          </div>
                        ) : config.key !== 'finalizada' && (
                          <div className="mb-1.5">
                            <span className="inline-block text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                               Sin iniciar
                            </span>
                          </div>
                        )}

                        {/* Productos */}
                        <div className="text-xs text-gray-700 mb-2 bg-gray-50 p-1.5 rounded">
                          {orden.productos || 'Sin productos'}
                        </div>

                        {/* Etapas completadas */}
                        <div className="text-xs text-gray-500 mb-1.5">
                          Etapas: {orden.etapas_completadas || 0} / {orden.total_etapas_requeridas || 0}
                        </div>

                        {/* Trabajador */}
                        {orden.nombre_trabajador && (
                          <div className="text-xs text-gray-500 mb-1.5">
                            👤 {orden.nombre_trabajador}
                          </div>
                        )}

                        {/* Fechas */}
                        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-1.5">
                          <div>
                            Inicio: {new Date(orden.fecha_inicio).toLocaleDateString('es-CO')}
                          </div>
                          {orden.fecha_fin_estimada && (
                            <div>
                              Est: {new Date(orden.fecha_fin_estimada).toLocaleDateString('es-CO')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
      </div>
    </div>
  );
};

export default KanbanBoard;
