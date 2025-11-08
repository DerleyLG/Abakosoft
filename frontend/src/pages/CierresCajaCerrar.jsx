import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { FiArrowLeft, FiCheck, FiAlertCircle } from 'react-icons/fi';

const CierresCajaCerrar = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cierre, setCierre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fecha_fin: new Date().toISOString().split('T')[0],
    observaciones: ''
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const detalleCierre = await cierresCajaService.getById(id);
      
      if (detalleCierre.estado === 'cerrado') {
        toast.error('Este período ya está cerrado');
        navigate('/cierres-caja');
        return;
      }

      setCierre(detalleCierre);
      
      // Establecer fecha de fin como hoy
      setFormData(prev => ({
        ...prev,
        fecha_fin: new Date().toISOString().split('T')[0]
      }));
    } catch (error) {
      console.error('Error cargando cierre:', error);
      toast.error('Error al cargar el cierre');
      navigate('/cierres-caja');
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
    // Evitar problemas de zona horaria
    const [year, month, day] = fecha.split('T')[0].split('-');
    return new Date(year, month - 1, day).toLocaleDateString('es-CO');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar fecha de fin
    if (new Date(formData.fecha_fin) < new Date(cierre.fecha_inicio)) {
      toast.error('La fecha de fin no puede ser anterior a la fecha de inicio');
      return;
    }

    // Confirmar cierre
    const result = await Swal.fire({
      title: '¿Confirmar cierre de período?',
      html: `
        <div class="text-left">
          <p class="mb-2"><strong>⚠️ Una vez cerrado no se podrán:</strong></p>
          <ul class="list-disc list-inside text-sm text-gray-600">
            <li>Editar movimientos de este período</li>
            <li>Agregar movimientos en estas fechas</li>
          </ul>
          <div class="mt-4 p-3 bg-gray-100 rounded">
            <p class="text-sm"><strong>Período:</strong> ${formatFecha(cierre.fecha_inicio)} al ${formatFecha(formData.fecha_fin)}</p>
            <p class="text-sm mt-1"><strong>Saldo final total:</strong> ${formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0))}</p>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, Cerrar Período',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      setSubmitting(true);
      await cierresCajaService.cerrar(id, formData);
      
      toast.success('Período cerrado exitosamente');
      navigate('/cierres-caja');
    } catch (error) {
      console.error('Error cerrando período:', error);
      toast.error(error.response?.data?.error || 'Error al cerrar el período');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Cargando...</div>
      </div>
    );
  }

  if (!cierre) {
    return null;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cerrar Período</h1>
          <p className="text-gray-600 mt-1">
            Iniciado el {formatFecha(cierre.fecha_inicio)}
          </p>
        </div>
        <button
          onClick={() => navigate(`/cierres-caja/${id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 cursor-pointer px-4 py-2 rounded-lg hover:bg-gray-100 transition"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      {/* Alerta */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <FiAlertCircle className="text-yellow-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-yellow-800 font-semibold mb-1">Importante</h3>
            <p className="text-yellow-700 text-sm">
              Una vez cerrado el período, no podrás editar o agregar movimientos en estas fechas. 
              El sistema creará automáticamente el siguiente período con los saldos finales como saldos iniciales.
            </p>
          </div>
        </div>
      </div>

      {/* Resumen de Saldos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Resumen de Saldos</h2>
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
                <tr key={detalle.id_detalle}>
                  <td className="px-6 py-4 font-semibold text-gray-800">
                    {detalle.metodo_nombre}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700">
                    {formatMonto(detalle.saldo_inicial)}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-semibold">
                    +{formatMonto(detalle.total_ingresos)}
                  </td>
                  <td className="px-6 py-4 text-right text-red-600 font-semibold">
                    -{formatMonto(detalle.total_egresos)}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">
                    {formatMonto(detalle.saldo_final)}
                  </td>
                </tr>
              ))}
              
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

      {/* Formulario de Cierre */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Información de Cierre</h2>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={cierre.fecha_inicio ? cierre.fecha_inicio.split('T')[0] : ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Fecha de Fin
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            placeholder="Notas adicionales sobre el cierre (opcional)"
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(`/cierres-caja/${id}`)}
            className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? (
              <>Cerrando...</>
            ) : (
              <>
                <FiCheck />
                Cerrar Período
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CierresCajaCerrar;
