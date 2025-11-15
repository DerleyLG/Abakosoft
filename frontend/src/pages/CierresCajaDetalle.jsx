import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import { exportarCierrePDF } from '../utils/exportCierrePDF';
import EditarSaldosInicialesModal from '../components/EditarSaldosInicialesModal';
import toast from 'react-hot-toast';
import { 
  FiArrowLeft, FiCalendar, FiDollarSign, FiTrendingUp, 
  FiTrendingDown, FiCheck, FiClock, FiUser, FiChevronDown, FiChevronRight, FiDownload, FiEdit
} from 'react-icons/fi';

const CierresCajaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cierre, setCierre] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);
  const [mostrarModalEditarSaldos, setMostrarModalEditarSaldos] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [detalleCierre, movimientosPeriodo] = await Promise.all([
        cierresCajaService.getById(id),
        cierresCajaService.getMovimientos(id)
      ]);
      
      console.log('[CierresCajaDetalle] Movimientos recibidos:', movimientosPeriodo.length, movimientosPeriodo);
      
      setCierre(detalleCierre);
      setMovimientos(movimientosPeriodo);
    } catch (error) {
      console.error('Error cargando cierre:', error);
      toast.error('Error al cargar el detalle del cierre');
    } finally {
      setLoading(false);
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
    // zona horaria
    const [year, month, day] = fecha.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString('es-CO');
  };

  const agruparMovimientos = () => {
    const grupos = {};
    
    movimientos.forEach(mov => {
      const key = `${mov.tipo_movimiento}_${mov.metodo_pago}`;
      if (!grupos[key]) {
        grupos[key] = {
          tipo: mov.tipo_movimiento,
          metodo: mov.metodo_pago,
          movimientos: []
        };
      }
      grupos[key].movimientos.push(mov);
    });

    return grupos;
  };

  const handleExportar = () => {
    try {
      console.log('[handleExportar] Cierre:', cierre);
      console.log('[handleExportar] Movimientos:', movimientos);
      
      if (!cierre || !cierre.detalle_metodos) {
        toast.error('No hay datos suficientes para generar el PDF');
        return;
      }
      
      exportarCierrePDF(cierre, movimientos);
      toast.success('PDF generado exitosamente');
    } catch (error) {
      console.error('Error generando PDF:', error);
      console.error('Stack trace:', error.stack);
      toast.error(`Error al generar el PDF: ${error.message}`);
    }
  };

  const handleActualizarSaldos = () => {
    fetchData(); // Refrescar datos del cierre
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Cargando detalle...</div>
      </div>
    );
  }

  if (!cierre) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Cierre no encontrado</p>
          <button
            onClick={() => navigate('/cierres-caja')}
            className="mt-4 cursor-pointer text-slate-600 hover:text-slate-700 font-semibold"
          >
            Volver a lista
          </button>
        </div>
      </div>
    );
  }

  const movimientosAgrupados = agruparMovimientos();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
         
          <h1 className="text-3xl font-bold text-gray-800">Detalle de Cierre</h1>
          <p className="text-gray-600 mt-1">
            Del {formatFecha(cierre.fecha_inicio)} al {formatFecha(cierre.fecha_fin)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportar}
            className="cursor-pointer flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <FiDownload size={18} />
            Exportar PDF
          </button>
          {cierre.estado === 'abierto' && (
            <>
              <button
                onClick={() => setMostrarModalEditarSaldos(true)}
                className="cursor-pointer flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FiEdit size={18} />
                Editar Saldos
              </button>
              <button
                onClick={() => navigate(`/cierres-caja/${id}/cerrar`)}
                className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg animate-pulse"
              >
                <FiCheck size={18} />
                Cerrar Período
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/cierres-caja')}
            className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <FiArrowLeft size={18} />
            Volver
          </button>
        </div>
      </div>

      {/* Estado del Cierre */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {cierre.estado === 'abierto' ? (
              <div className="bg-green-100 p-3 rounded-full">
                <FiClock className="text-green-600" size={24} />
              </div>
            ) : (
              <div className="bg-gray-100 p-3 rounded-full">
                <FiCheck className="text-gray-600" size={24} />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                Estado: {cierre.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
              </h2>
              {cierre.estado === 'cerrado' && (
                <p className="text-gray-600 text-sm mt-1">
                  <FiUser className="inline mr-1" />
                  Cerrado por: {cierre.usuario_cierre || 'N/A'}
                </p>
              )}
            </div>
          </div>

          {cierre.estado === 'cerrado' && cierre.fecha_cierre && (
            <div className="text-right">
              <p className="text-gray-600 text-sm">Fecha de cierre</p>
              <p className="font-semibold text-gray-800">
                {new Date(cierre.fecha_cierre).toLocaleString('es-CO')}
              </p>
            </div>
          )}
        </div>

        {cierre.observaciones && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-gray-600 text-sm mb-1">Observaciones:</p>
            <p className="text-gray-800">{cierre.observaciones}</p>
          </div>
        )}
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Saldo Inicial */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <FiDollarSign size={24} />
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm font-medium">Saldo Inicial</p>
              <p className="text-2xl font-bold mt-1">
                {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_inicial, 0))}
              </p>
            </div>
          </div>
          <div className="flex items-center text-blue-100 text-xs">
            <FiCalendar className="mr-1" size={12} />
            {formatFecha(cierre.fecha_inicio)}
          </div>
        </div>

        {/* Total Ingresos */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <FiTrendingUp size={24} />
            </div>
            <div className="text-right">
              <p className="text-green-100 text-sm font-medium">Ingresos</p>
              <p className="text-2xl font-bold mt-1">
                {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_ingresos, 0))}
              </p>
            </div>
          </div>
          <div className="flex items-center text-green-100 text-xs">
            <FiTrendingUp className="mr-1" size={12} />
            Entradas del período
          </div>
        </div>

        {/* Total Egresos */}
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <FiTrendingDown size={24} />
            </div>
            <div className="text-right">
              <p className="text-red-100 text-sm font-medium">Egresos</p>
              <p className="text-2xl font-bold mt-1">
                {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_egresos, 0))}
              </p>
            </div>
          </div>
          <div className="flex items-center text-red-100 text-xs">
            <FiTrendingDown className="mr-1" size={12} />
            Salidas del período
          </div>
        </div>

        {/* Saldo Final/Actual */}
        <div className={`bg-gradient-to-br ${cierre.estado === 'abierto' ? 'from-purple-500 to-purple-600' : 'from-slate-600 to-slate-700'} rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-200`}>
          <div className="flex items-center justify-between mb-3">
            <div className="bg-white bg-opacity-20 p-3 rounded-lg">
              <FiDollarSign size={24} />
            </div>
            <div className="text-right">
              <p className={`${cierre.estado === 'abierto' ? 'text-purple-100' : 'text-slate-100'} text-sm font-medium`}>
                {cierre.estado === 'abierto' ? 'Saldo Actual' : 'Saldo Final'}
              </p>
              <p className="text-2xl font-bold mt-1">
                {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0))}
              </p>
            </div>
          </div>
          <div className={`flex items-center ${cierre.estado === 'abierto' ? 'text-purple-100' : 'text-slate-100'} text-xs`}>
            {cierre.estado === 'abierto' ? (
              <>
                <FiClock className="mr-1" size={12} />
                Actualizado en tiempo real
              </>
            ) : (
              <>
                <FiCalendar className="mr-1" size={12} />
                {formatFecha(cierre.fecha_fin)}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Saldos por Método */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiDollarSign className="text-slate-600" />
            Saldos por Método de Pago
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Saldo Inicial
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Ingresos
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Egresos
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                  {cierre.estado === 'abierto' ? 'Saldo Actual' : 'Saldo Final'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cierre.detalle_metodos.map((detalle, index) => (
                <tr 
                  key={detalle.id_detalle} 
                  className={`hover:bg-blue-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{detalle.metodo_nombre}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-700 font-medium">{formatMonto(detalle.saldo_inicial)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm">
                      +{formatMonto(detalle.total_ingresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold text-sm">
                      -{formatMonto(detalle.total_egresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-900 font-bold text-lg">{formatMonto(detalle.saldo_final)}</span>
                  </td>
                </tr>
              ))}
              
              {/* Totales */}
              <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold border-t-2 border-slate-300">
                <td className="px-6 py-5 text-gray-900 text-lg">TOTAL</td>
                <td className="px-6 py-5 text-right text-gray-900">
                  {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_inicial, 0))}
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-green-600 text-white font-bold">
                    +{formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_ingresos, 0))}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-red-600 text-white font-bold">
                    -{formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_egresos, 0))}
                  </span>
                </td>
                <td className="px-6 py-5 text-right">
                  <span className="text-gray-900 text-xl font-extrabold">
                    {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0))}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimientos Detallados */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setMostrarMovimientos(!mostrarMovimientos)}
          className="w-full bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200 text-left hover:from-slate-100 hover:to-slate-200 transition-all duration-200"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <FiCalendar className="text-slate-600" />
              Detalle de Movimientos 
              <span className="ml-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                {movimientos.length}
              </span>
            </h2>
            <span className={`text-gray-600 transform transition-transform duration-200 ${mostrarMovimientos ? 'rotate-180' : ''}`}>
              <FiChevronDown size={20} />
            </span>
          </div>
        </button>

        {mostrarMovimientos && (
          <div className="p-6 bg-gray-50">
            {Object.entries(movimientosAgrupados).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FiCalendar size={48} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg">No hay movimientos en este período</p>
              </div>
            ) : (
              Object.entries(movimientosAgrupados).map(([key, grupo]) => (
                <div key={key} className="mb-6 last:mb-0">
                  <div className={`flex items-center gap-2 mb-3 ${grupo.tipo === 'ingreso' ? 'text-green-700' : 'text-red-700'}`}>
                    {grupo.tipo === 'ingreso' ? (
                      <div className="bg-green-100 p-2 rounded-lg">
                        <FiTrendingUp size={20} />
                      </div>
                    ) : (
                      <div className="bg-red-100 p-2 rounded-lg">
                        <FiTrendingDown size={20} />
                      </div>
                    )}
                    <h3 className="font-bold text-lg">
                      {grupo.tipo === 'ingreso' ? 'INGRESOS' : 'EGRESOS'} - {grupo.metodo}
                    </h3>
                  </div>
                  
                  <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Documento</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Observaciones</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.movimientos.map((mov, index) => (
                          <tr 
                            key={mov.id_movimiento} 
                            className={`border-t border-gray-200 hover:bg-blue-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center text-gray-700 font-medium">
                                <FiCalendar className="mr-1 text-gray-400" size={14} />
                                {formatFecha(mov.fecha)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold text-xs">
                                {mov.tipo_documento} #{mov.id_documento}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{mov.observaciones || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-bold text-base ${grupo.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                                {formatMonto(mov.monto)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Editar Saldos Iniciales */}
      {mostrarModalEditarSaldos && (
        <EditarSaldosInicialesModal
          cierre={cierre}
          onClose={() => setMostrarModalEditarSaldos(false)}
          onActualizar={handleActualizarSaldos}
        />
      )}
    </div>
  );
};

export default CierresCajaDetalle;
