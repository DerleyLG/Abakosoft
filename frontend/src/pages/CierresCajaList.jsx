import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import { API_BASE_URL } from '../services/api';
import toast from 'react-hot-toast';
import { FiCalendar, FiCheck, FiClock, FiDollarSign, FiPlus, FiEye } from 'react-icons/fi';

const CierresCajaList = () => {
  const [cierres, setCierres] = useState([]);
  const [cierreAbierto, setCierreAbierto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inicializando, setInicializando] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [historico, abierto] = await Promise.all([
        cierresCajaService.getAll(),
        cierresCajaService.getCierreAbierto().catch(() => null)
      ]);
      
      setCierres(historico);
      setCierreAbierto(abierto);

      // Si es la primera vez (no hay ningún cierre), crear automáticamente
      if (!abierto && historico.length === 0 && !inicializando) {
        setInicializando(true);
        await crearPrimerPeriodo();
      }
    } catch (error) {
      console.error('Error cargando cierres:', error);
      toast.error('Error al cargar los cierres de caja');
    } finally {
      setLoading(false);
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
      console.log(' Métodos de pago obtenidos:', metodos);

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
      
      console.log(' Período creado:', resultado);
      
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

      {/* Tabla de Histórico */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Histórico de Cierres</h2>
        </div>

        {cierres.length === 0 ? (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">No hay cierres registrados</p>
            <button
              onClick={() => navigate('/cierres-caja/crear')}
              className="mt-4 cursor-pointer text-slate-600 hover:text-slate-700 font-semibold"
            >
              Crear primer período
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Período
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Fecha Fin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Duración
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Saldo Final
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cierres.map((cierre, index) => (
                  <tr key={cierre.id_cierre} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-800">
                        Período #{cierres.length - index}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatFecha(cierre.fecha_inicio)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatFecha(cierre.fecha_fin)}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {calcularDias(cierre.fecha_inicio, cierre.fecha_fin)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-gray-800">
                      {formatMonto(cierre.saldo_final_total)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {cierre.estado === 'abierto' ? (
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">
                          Abierto
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-800 text-xs px-3 py-1 rounded-full font-semibold">
                          Cerrado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => navigate(`/cierres-caja/${cierre.id_cierre}`)}
                        className="cursor-pointer text-slate-600 hover:text-slate-800 font-semibold text-sm"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CierresCajaList;
