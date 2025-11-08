import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import toast from 'react-hot-toast';
import { 
  FiArrowLeft, FiCalendar, FiDollarSign, FiTrendingUp, 
  FiTrendingDown, FiCheck, FiClock, FiUser, FiChevronDown, FiChevronRight
} from 'react-icons/fi';

const CierresCajaDetalle = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cierre, setCierre] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mostrarMovimientos, setMostrarMovimientos] = useState(false);

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
          {cierre.estado === 'abierto' && (
            <button
              onClick={() => navigate(`/cierres-caja/${id}/cerrar`)}
              className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              <FiCheck />
              Cerrar Período
            </button>
          )}
          <button
            onClick={() => navigate('/cierres-caja')}
            className="cursor-pointer flex items-center gap-2 text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <FiArrowLeft />
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

      {/* Tabla de Saldos por Método */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Saldos por Método de Pago</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Saldo Inicial
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Ingresos
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Egresos
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                  Saldo Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cierre.detalle_metodos.map((detalle) => (
                <tr key={detalle.id_detalle} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {detalle.metodo_nombre}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatMonto(detalle.saldo_inicial)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-green-600 font-semibold">
                      +{formatMonto(detalle.total_ingresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-red-600 font-semibold">
                      -{formatMonto(detalle.total_egresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">
                    {formatMonto(detalle.saldo_final)}
                  </td>
                </tr>
              ))}
              
              {/* Totales */}
              <tr className="bg-gray-50 font-bold">
                <td className="px-6 py-4 text-gray-800">TOTAL</td>
                <td className="px-6 py-4 text-right text-gray-800">
                  {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_inicial, 0))}
                </td>
                <td className="px-6 py-4 text-right text-green-600">
                  +{formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_ingresos, 0))}
                </td>
                <td className="px-6 py-4 text-right text-red-600">
                  -{formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.total_egresos, 0))}
                </td>
                <td className="px-6 py-4 text-right text-gray-800 text-lg">
                  {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0))}
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
          className="cursor-pointer w-full bg-gray-50 px-6 py-4 border-b text-left hover:bg-gray-100 transition"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              Detalle de Movimientos ({movimientos.length})
            </h2>
            <span className="text-gray-600">
              {mostrarMovimientos ? <FiChevronDown size={20} /> : <FiChevronRight size={20} />}
            </span>
          </div>
        </button>

        {mostrarMovimientos && (
          <div className="p-6">
            {Object.entries(movimientosAgrupados).map(([key, grupo]) => (
              <div key={key} className="mb-6 last:mb-0">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  {grupo.tipo === 'ingreso' ? (
                    <FiTrendingUp className="text-green-600" />
                  ) : (
                    <FiTrendingDown className="text-red-600" />
                  )}
                  {grupo.tipo === 'ingreso' ? 'INGRESOS' : 'EGRESOS'} - {grupo.metodo}
                </h3>
                
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Fecha</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Documento</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Observaciones</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.movimientos.map((mov) => (
                        <tr key={mov.id_movimiento} className="border-t border-gray-200">
                          <td className="px-4 py-2">{formatFecha(mov.fecha)}</td>
                          <td className="px-4 py-2">
                            {mov.tipo_documento} #{mov.id_documento}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{mov.observaciones || '-'}</td>
                          <td className="px-4 py-2 text-right font-semibold">
                            {formatMonto(mov.monto)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CierresCajaDetalle;
