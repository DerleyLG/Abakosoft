import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import { API_BASE_URL } from '../services/api';
import GraficoTendenciaCierres from '../components/GraficoTendenciaCierres';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FiCalendar, FiCheck, FiClock, FiDollarSign, FiPlus, FiEye, FiFilter, FiX, FiDatabase, FiRefreshCw } from 'react-icons/fi';

const CierresCajaList = () => {
  const [cierres, setCierres] = useState([]);
  const [cierresFiltrados, setCierresFiltrados] = useState([]);
  const [cierreAbierto, setCierreAbierto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inicializando, setInicializando] = useState(false);
  const [estadoSistema, setEstadoSistema] = useState(null);
  const [verificandoSistema, setVerificandoSistema] = useState(true);
  const [filtros, setFiltros] = useState({
    fechaInicio: '',
    fechaFin: '',
    estado: 'todos' // 'todos', 'abierto', 'cerrado'
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [cierres, filtros]);

  const aplicarFiltros = () => {
    let resultado = [...cierres];

    // Filtrar por fecha de inicio
    if (filtros.fechaInicio) {
      resultado = resultado.filter(c => {
        const fechaCierre = new Date(c.fecha_inicio);
        const fechaFiltro = new Date(filtros.fechaInicio);
        return fechaCierre >= fechaFiltro;
      });
    }

    // Filtrar por fecha de fin
    if (filtros.fechaFin) {
      resultado = resultado.filter(c => {
        const fechaCierre = new Date(c.fecha_fin || c.fecha_inicio);
        const fechaFiltro = new Date(filtros.fechaFin);
        return fechaCierre <= fechaFiltro;
      });
    }

    // Filtrar por estado
    if (filtros.estado !== 'todos') {
      resultado = resultado.filter(c => c.estado === filtros.estado);
    }

    setCierresFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: '',
      fechaFin: '',
      estado: 'todos'
    });
  };

  const ejecutarMigracion = async () => {
    const confirmar = await Swal.fire({
      title: ' Crear Períodos Automáticamente',
      html: `
        <div class="text-left">
          <p class="mb-3">El sistema creará períodos semanales basados en tus movimientos históricos:</p>
          <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-3">
            <p class="text-sm mb-2"><strong> Resumen:</strong></p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li><strong>Primer movimiento:</strong> ${estadoSistema.primera_fecha_movimiento}</li>
              <li><strong>Primer período:</strong> Desde ${estadoSistema.primer_lunes}</li>
              <li><strong>Total movimientos:</strong> ${estadoSistema.cantidad_movimientos}</li>
              <li><strong>Períodos a crear:</strong> ${estadoSistema.periodos_a_crear}</li>
            </ul>
          </div>
          <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
            <p class="text-sm"><strong> Qué hará el sistema:</strong></p>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>Crear períodos semanales (Lunes-Domingo)</li>
              <li>Calcular saldos automáticamente</li>
              <li>Períodos pasados quedarán cerrados</li>
              <li>Período actual quedará abierto</li>
            </ul>
          </div>
          <p class="text-amber-600 text-sm font-semibold">⚠️ Este proceso no se puede deshacer</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear períodos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      width: '600px'
    });
    
    if (!confirmar.isConfirmed) return;
    
    try {
      setInicializando(true);
      toast.loading('Creando períodos históricos...', { id: 'migracion' });
      
      const response = await cierresCajaService.migrarPeriodosHistoricos();
      
      toast.success(` ${response.periodos_creados} períodos creados`, { id: 'migracion' });
      
      await Swal.fire({
        title: ' Migración Exitosa',
        html: `
          <div class="text-left">
            <div class="bg-green-50 border border-green-200 rounded p-4">
              <p class="mb-2"><strong>Períodos creados:</strong> ${response.periodos_creados}</p>
              <p class="mb-2"><strong>Primer período:</strong> ${response.primer_periodo}</p>
              <p><strong>Período actual:</strong> #${response.periodo_actual} (abierto)</p>
            </div>
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#10b981'
      });
      
      fetchData(); // Recargar datos
      
    } catch (error) {
      console.error('Error en migración:', error);
      toast.error(error.response?.data?.error || 'Error al crear períodos', { id: 'migracion' });
      
      await Swal.fire({
        title: 'Error en Migración',
        text: error.response?.data?.error || 'Error al crear períodos históricos',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    } finally {
      setInicializando(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setVerificandoSistema(true);
      
      // Verificar estado del sistema primero (no bloquear si falla)
      try {
        const estado = await cierresCajaService.verificarEstadoSistema();
        
        setEstadoSistema(estado);
      } catch (errorEstado) {
        console.error('Error verificando estado sistema:', errorEstado);
        setEstadoSistema({ necesita: false });
      }
      
      const [historico, abierto] = await Promise.all([
        cierresCajaService.getAll(),
        cierresCajaService.getCierreAbierto().catch(() => null)
      ]);
      

      
      setCierres(historico);
      setCierreAbierto(abierto);

    } catch (error) {
      console.error('Error cargando cierres:', error);
      toast.error('Error al cargar los cierres de caja');
    } finally {
      setLoading(false);
      setVerificandoSistema(false);
    }
  };

  const crearPrimerPeriodo = async () => {
    try {
      toast.loading('Inicializando sistema de cierres...', { id: 'init-cierre' });
      

      
      // Obtener métodos de pago usando la URL correcta
      const metodosPagoUrl = `${API_BASE_URL.replace('/api', '')}/api/metodos-pago`;
      const response = await fetch(metodosPagoUrl, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const metodos = await response.json();
   

      // Crear saldos iniciales en 0
      const saldos_iniciales = metodos.map(metodo => ({
        id_metodo_pago: metodo.id_metodo_pago,
        saldo_inicial: 0
      }));

      // Obtener fecha actual en zona horaria local (Colombia)
      const fechaHoy = new Date();
      const year = fechaHoy.getFullYear();
      const month = String(fechaHoy.getMonth() + 1).padStart(2, '0');
      const day = String(fechaHoy.getDate()).padStart(2, '0');
      const fechaLocal = `${year}-${month}-${day}`;

      // Crear primer período con fecha actual y saldos en 0
      const payload = {
        fecha_inicio: fechaLocal,
        saldos_iniciales
      };

    
      
      const resultado = await cierresCajaService.create(payload);
      
    
      
      toast.success('Sistema inicializado. Los movimientos de tesorería se contarán desde hoy.', { 
        id: 'init-cierre',
        duration: 5000
      });
      
      // Actualizar estado sin hacer otra llamada recursiva
      const nuevoAbierto = await cierresCajaService.getCierreAbierto();
      setCierreAbierto(nuevoAbierto);
      setCierres([nuevoAbierto]);
      
    } catch (error) {
      console.error(' Error creando primer período:', error);
      console.error('Detalles del error:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      
      const errorMsg = error.response?.data?.error || error.message || 'Error desconocido al inicializar';
      toast.error(`Error: ${errorMsg}`, { id: 'init-cierre', duration: 6000 });
    } finally {
      setInicializando(false);
    }
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto || 0);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    // Evitar problemas de zona horaria al parsear fechas
    // Si viene en formato YYYY-MM-DD, parsearlo directamente
    const [year, month, day] = fecha.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString('es-CO');
  };

  const calcularDias = (fecha_inicio, fecha_fin) => {
    if (!fecha_fin) return 'En curso';
    // Parsear fechas evitando problemas de zona horaria
    const [yearI, monthI, dayI] = fecha_inicio.split('T')[0].split('-');
    const [yearF, monthF, dayF] = fecha_fin.split('T')[0].split('-');
    const inicio = new Date(yearI, monthI - 1, dayI);
    const fin = new Date(yearF, monthF - 1, dayF);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return `${dias} día${dias !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Cargando cierres de caja...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cierres de Caja</h1>
          <p className="text-gray-600 mt-1">Gestión de períodos de caja</p>
        </div>
      </div>

      {/* Banner de Migración (si se necesita) */}
      {estadoSistema && estadoSistema.necesita && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
              <FiDatabase className="text-blue-600" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                 Primer Uso del Sistema
                <span className="text-sm font-normal bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  Nuevo
                </span>
              </h2>
              <p className="text-blue-800 mb-3">
                Detectamos <strong>{estadoSistema.cantidad_movimientos} movimientos</strong> sin períodos asociados. 
                Crea automáticamente los períodos semanales para empezar a usar el módulo de cierres.
              </p>
              <div className="bg-white border border-blue-200 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 font-medium">Primer movimiento</p>
                    <p className="text-blue-900 font-semibold">{estadoSistema.primera_fecha_movimiento}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Primer período</p>
                    <p className="text-blue-900 font-semibold">{estadoSistema.primer_lunes}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Movimientos</p>
                    <p className="text-blue-900 font-semibold">{estadoSistema.cantidad_movimientos}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 font-medium">Períodos a crear</p>
                    <p className="text-blue-900 font-semibold">{estadoSistema.periodos_a_crear}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={ejecutarMigracion}
                disabled={inicializando}
                className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inicializando ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Creando períodos...
                  </>
                ) : (
                  <>
                    <FiDatabase />
                    Crear Períodos Automáticamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Período Actual */}
      {cierreAbierto && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-green-800">Período Actual</h2>
                <span className="bg-green-200 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">
                  ABIERTO
                </span>
              </div>
              <p className="text-gray-700">
                <span className="font-semibold">Desde:</span> {formatFecha(cierreAbierto.fecha_inicio)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/cierres-caja/${cierreAbierto.id_cierre}`)}
                className="cursor-pointer flex items-center gap-2 bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                <FiEye />
                Ver Detalle
              </button>
              <button
                onClick={() => navigate(`/cierres-caja/${cierreAbierto.id_cierre}/cerrar`)}
                className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <FiCheck />
                Cerrar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Tendencias */}
      {cierres.length > 0 && (
        <div className="mb-6">
          <GraficoTendenciaCierres cierres={cierres} />
        </div>
      )}

      {/* Tabla de Histórico */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Histórico de Cierres</h2>
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="cursor-pointer flex items-center gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FiFilter />
            {mostrarFiltros ? 'Ocultar Filtros' : 'Filtros'}
          </button>
        </div>

        {/* Panel de Filtros */}
        {mostrarFiltros && (
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="abierto">Abiertos</option>
                  <option value="cerrado">Cerrados</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiX />
                  Limpiar
                </button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {cierresFiltrados.length} de {cierres.length} cierres
            </div>
          </div>
        )}

        {cierres.length === 0 ? (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">No hay cierres registrados</p>
           
          </div>
        ) : (
          <div className="p-6">
            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cierresFiltrados.map((cierre, index) => {
                const numeroPeriodo = cierres.length - cierres.findIndex(c => c.id_cierre === cierre.id_cierre);
                const esAbierto = cierre.estado === 'abierto';
                
                return (
                  <div
                    key={cierre.id_cierre}
                    className={`bg-white rounded-lg border-2 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
                      esAbierto 
                        ? 'border-green-400 hover:border-green-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {/* Header de la Card */}
                    <div className={`px-5 py-4 ${esAbierto ? 'bg-gradient-to-r from-green-50 to-green-100' : 'bg-gray-50'}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            Período #{numeroPeriodo}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatFecha(cierre.fecha_inicio)}
                            {cierre.fecha_fin && (
                              <> - {formatFecha(cierre.fecha_fin)}</>
                            )}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            esAbierto
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-600 text-white'
                          }`}
                        >
                          {esAbierto ? (
                            <>
                              <FiClock size={12} />
                              Abierto
                            </>
                          ) : (
                            <>
                              <FiCheck size={12} />
                              Cerrado
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Body de la Card */}
                    <div className="px-5 py-4">
                      {/* Duración */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <FiCalendar size={16} className="text-gray-400" />
                        <span>{calcularDias(cierre.fecha_inicio, cierre.fecha_fin)}</span>
                      </div>

                      {/* Saldo Final o Actual */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <FiDollarSign size={18} className="text-blue-600" />
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {esAbierto ? 'Saldo Actual' : 'Saldo Final'}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatMonto(cierre.saldo_final_total)}
                        </p>
                      </div>

                      {/* Estadísticas Rápidas */}
                      {cierre.total_ingresos !== undefined && cierre.total_egresos !== undefined && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-green-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Ingresos</p>
                            <p className="text-sm font-semibold text-green-700">
                              {formatMonto(cierre.total_ingresos)}
                            </p>
                          </div>
                          <div className="bg-red-50 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Egresos</p>
                            <p className="text-sm font-semibold text-red-700">
                              {formatMonto(cierre.total_egresos)}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Botón de Acción */}
                      <button
                        onClick={() => navigate(`/cierres-caja/${cierre.id_cierre}`)}
                        className={`w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                          esAbierto
                            ? 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <FiEye size={18} />
                        {esAbierto ? 'Ver y Gestionar' : 'Ver Detalle'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CierresCajaList;
