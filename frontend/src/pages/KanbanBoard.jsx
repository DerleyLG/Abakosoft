import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiArrowLeft, FiMenu, FiPackage, FiTruck, FiSearch } from 'react-icons/fi';
import React from 'react';
import { useSidebar } from '../context/SidebarContext';
import DrawerOrdenesEntregadas from '../components/DrawerOrdenesEntregadas';
import Swal from 'sweetalert2';

const KanbanBoard = () => {
  const [columnas, setColumnas] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFloatingButton, setShowFloatingButton] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMes, setDrawerMes] = useState(null);
  const [drawerAnio, setDrawerAnio] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { sidebarOpen, closeSidebar, toggleSidebar, openSidebar } = useSidebar();

  useEffect(() => {
    // Ocultar sidebar al entrar a Kanban
    closeSidebar();
    
    // Retrasar aparición del botón flotante para coincidir con animación del sidebar (600ms)
    const timer = setTimeout(() => {
      setShowFloatingButton(true);
    }, 600);
    
    fetchKanbanData();

    // Cleanup: Restaurar sidebar al salir del componente
    return () => {
      clearTimeout(timer);
      openSidebar();
    };
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

  const marcarComoEntregada = async (id_orden) => {
    const result = await Swal.fire({
      title: '¿Marcar como entregada?',
      html: `
        <p class="mb-2">La orden <strong>OF #${id_orden}</strong> será marcada como entregada.</p>
        <p class="text-sm text-gray-600">Esto la moverá al historial de órdenes entregadas.</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, marcar como entregada',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(`/kanban/marcar-entregada/${id_orden}`);
        toast.success('Orden marcada como entregada exitosamente');
        
        // Usar la fecha retornada por el backend para el filtro del drawer
        if (response.data && response.data.fecha_entrega) {
          const fechaEntrega = new Date(response.data.fecha_entrega);
          setDrawerMes(fechaEntrega.getMonth() + 1);
          setDrawerAnio(fechaEntrega.getFullYear());
        } else {
          // Fallback a fecha actual si no viene en la respuesta
          const ahora = new Date();
          setDrawerMes(ahora.getMonth() + 1);
          setDrawerAnio(ahora.getFullYear());
        }
        
        fetchKanbanData(); // Recargar datos
        setDrawerOpen(true); // Abrir drawer para ver la orden entregada
      } catch (error) {
        console.error('Error marcando orden como entregada:', error);
        toast.error('Error al marcar la orden como entregada');
      }
    }
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
      {/* Botón flotante para toggle sidebar con animación suave */}
      {!sidebarOpen && showFloatingButton && !drawerOpen && (
        <button
          onClick={toggleSidebar}
          className="cursor-pointer fixed top-4 left-4 z-50 bg-slate-700 hover:bg-slate-800 text-white p-3 rounded-lg shadow-lg transition-all duration-300 hover:scale-110 animate-fade-in"
          title="Mostrar menú"
        >
          <FiMenu size={20} />
        </button>
      )}

      {/* Header */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Tablero de produccion</h2>
            <p className="text-gray-600 text-sm mt-1">Seguimiento de órdenes de fabricación • Marca las órdenes finalizadas como entregadas</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-semibold transition-colors shadow-md hover:shadow-lg"
              title="Ver órdenes entregadas"
            >
              <FiPackage size={18} />
              Ver entregadas
            </button>
            {sidebarOpen && (
              <button
                onClick={closeSidebar}
                className="cursor-pointer flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-md font-semibold transition"
                title="Maximizar tablero"
              >
                <FiMenu />
                Ocultar menú
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-semibold transition"
            >
              <FiArrowLeft />
              Volver
            </button>
          </div>
        </div>
        
        {/* Filtro de búsqueda */}
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por ID de orden o nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tablero Kanban */}
      <div className="bg-white rounded-xl shadow-lg p-3 flex-1 overflow-hidden">
        <div className="flex gap-2.5 h-full overflow-x-auto pb-2">
          {columnasConfig.map((config) => {
            const ordenes = columnas[config.key] || [];
            const Icon = config.icon;

            // Filtrar por término de búsqueda
            const ordenesFiltradas = ordenes.filter((orden) => {
              if (!searchTerm) return true;
              const term = searchTerm.toLowerCase();
              const matchId = orden.id_orden_fabricacion.toString().includes(term);
              const matchCliente = orden.nombre_cliente?.toLowerCase().includes(term);
              return matchId || matchCliente;
            });

            // Ordenar: primero las que están en proceso, después las pendientes
            const ordenesOrdenadas = [...ordenesFiltradas].sort((a, b) => {
              if (a.estado_etapa === 'en_proceso' && b.estado_etapa !== 'en_proceso') return -1;
              if (a.estado_etapa !== 'en_proceso' && b.estado_etapa === 'en_proceso') return 1;
              return 0; // Mantener orden original si ambas tienen el mismo estado
            });

            return (
              <div key={config.key} className="flex-shrink-0 w-56 md:w-60 lg:w-64 xl:w-72 h-full flex flex-col">
                {/* Header de columna */}
                <div className={`${config.color} rounded-lg p-2 mb-2 border-2 border-gray-200 flex-shrink-0`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="text-gray-700" size={18} />
                      <h3 className="font-bold text-gray-800 text-sm">{config.titulo}</h3>
                    </div>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-semibold text-gray-700">
                      {ordenesOrdenadas.length}
                    </span>
                  </div>
                </div>

                {/* Lista de tarjetas */}
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 min-h-0">
                  {ordenesOrdenadas.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8">
                      {searchTerm ? 'No se encontraron órdenes' : 'No hay órdenes'}
                    </div>
                  ) : (
                    ordenesOrdenadas.map((orden) => (
                      <div
                        key={orden.id_orden_fabricacion}
                        className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow"
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

                        {/*Articulos */}
                        <div className="mb-2">
                          <div className="text-xs font-semibold text-gray-600 mb-1">
                            Articulos:
                          </div>
                          <div className="bg-gray-50 rounded p-1.5 space-y-0.5">
                            {orden.productos ? (
                              orden.productos.split(',').map((producto, idx) => (
                                <div key={idx} className="text-xs text-gray-700 flex items-start">
                                  <span className="text-gray-400 mr-1">•</span>
                                  <span className="flex-1">{producto.trim()}</span>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-400 italic">Sin Articulos</div>
                            )}
                          </div>
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

                        {/* Botón marcar como entregada (solo en columna finalizada) */}
                        {config.key === 'finalizada' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              marcarComoEntregada(orden.id_orden_fabricacion);
                            }}
                            className="cursor-pointer w-full mt-2 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
                          >
                            <FiPackage size={14} />
                            Marcar como entregada
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
      </div>

      {/* Drawer de órdenes entregadas */}
      <DrawerOrdenesEntregadas 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)}
        mesInicial={drawerMes}
        anioInicial={drawerAnio}
      />
    </div>
  );
};

export default KanbanBoard;
