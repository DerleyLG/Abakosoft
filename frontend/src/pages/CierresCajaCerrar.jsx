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
      
      // Calcular fecha de fin sugerida
      // Si es después de las 22:00, sugerir el día actual
      // Si es antes de las 22:00 y hay movimientos hoy, sugerir hoy
      // Caso contrario, sugerir ayer
      const ahora = new Date();
      const hora = ahora.getHours();
      const hoy = new Date().toISOString().split('T')[0];
      const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      // Por defecto usamos ayer si estamos en las primeras horas del día (00:00 - 05:59)
      // para evitar problemas cuando se cierra después de medianoche
      let fechaFinSugerida = hoy;
      if (hora < 6) {
        fechaFinSugerida = ayer;
      }
      
      setFormData(prev => ({
        ...prev,
        fecha_fin: fechaFinSugerida
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

    // Warning si se está cerrando cerca de medianoche
    const ahora = new Date();
    const hora = ahora.getHours();
    const fechaFinSeleccionada = new Date(formData.fecha_fin + 'T00:00:00');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    // Si son las 23:00 o posterior y la fecha_fin es hoy, advertir
    if (hora >= 23 && fechaFinSeleccionada.getTime() === hoy.getTime()) {
      const confirmarHoraTardia = await Swal.fire({
        title: '⚠️ Hora Tardía Detectada',
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-3">
              Son las <strong>${ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong>. 
              Has seleccionado cerrar el período hasta <strong>hoy ${formatFecha(formData.fecha_fin)}</strong>.
            </p>
            <p class="text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 mb-3 text-sm">
              Si el proceso cruza la medianoche, los movimientos después de las 00:00 pertenecerán al día siguiente 
              y NO se incluirán en este cierre.
            </p>
            <p class="text-gray-700 font-semibold">¿Qué deseas hacer?</p>
          </div>
        `,
        icon: 'warning',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Continuar con hoy',
        denyButtonText: 'Cambiar a ayer',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280'
      });

      if (confirmarHoraTardia.isDenied) {
        // Usuario eligió cambiar a ayer
        const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        setFormData(prev => ({ ...prev, fecha_fin: ayer }));
        toast.info('Fecha de fin cambiada a ayer. Revisa y confirma el cierre nuevamente.');
        return;
      } else if (!confirmarHoraTardia.isConfirmed) {
        // Usuario canceló
        return;
      }
      // Si confirmó, continúa con el proceso normal
    }

    // Validar el período antes de cerrar
    try {
      const validaciones = await cierresCajaService.validarPeriodo(id, formData.fecha_fin);
      
      // Si hay errores críticos, no permitir cerrar
      if (validaciones.errores && validaciones.errores.length > 0) {
        let errorHtml = '<div class="text-left"><p class="font-semibold mb-2">Errores encontrados:</p><ul class="list-disc pl-5">';
        validaciones.errores.forEach(error => {
          errorHtml += `<li class="text-red-600">${error.mensaje}</li>`;
        });
        errorHtml += '</ul></div>';

        await Swal.fire({
          title: 'No se puede cerrar el período',
          html: errorHtml,
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#dc2626'
        });
        return;
      }

      // Calcular totales
      const totalIngresos = cierre.detalle_metodos.reduce((sum, d) => sum + (d.total_ingresos || 0), 0);
      const totalEgresos = cierre.detalle_metodos.reduce((sum, d) => sum + (d.total_egresos || 0), 0);
      const saldoFinal = cierre.detalle_metodos.reduce((sum, d) => sum + (d.saldo_final || 0), 0);
      const saldoInicial = cierre.detalle_metodos.reduce((sum, d) => sum + (d.saldo_inicial || 0), 0);

      // Construir HTML con warnings (si los hay)
      let warningsHtml = '';
      if (validaciones.warnings && validaciones.warnings.length > 0) {
        warningsHtml = '<div class="bg-yellow-50 border border-yellow-300 rounded p-3 mb-4 text-left">';
        warningsHtml += '<p class="font-semibold text-yellow-800 mb-2">⚠️ Advertencias:</p>';
        warningsHtml += '<ul class="list-disc pl-5 text-sm text-yellow-700">';
        validaciones.warnings.forEach(warning => {
          warningsHtml += `<li>${warning.mensaje}</li>`;
        });
        warningsHtml += '</ul></div>';
      }

      // Confirmar cierre con resumen y warnings
      const result = await Swal.fire({
        title: '¿Confirmar cierre de período?',
        html: `
          ${warningsHtml}
          <div class="text-left">
            <p class="mb-2"><strong>⚠️ Una vez cerrado no se podrán:</strong></p>
            <ul class="list-disc list-inside text-sm text-gray-600 mb-4">
              <li>Editar movimientos de este período</li>
              <li>Agregar movimientos en estas fechas</li>
              <li>Modificar los saldos iniciales</li>
            </ul>
            <div class="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <p class="text-sm font-semibold mb-2 text-blue-900">📊 Resumen del Período:</p>
              <p class="text-sm"><strong>Período:</strong> ${formatFecha(cierre.fecha_inicio)} al ${formatFecha(formData.fecha_fin)}</p>
              <div class="mt-3 space-y-1">
                <p class="text-sm"><strong>Saldo Inicial:</strong> <span class="text-blue-600">${formatMonto(saldoInicial)}</span></p>
                <p class="text-sm"><strong>Total Ingresos:</strong> <span class="text-green-600">+${formatMonto(totalIngresos)}</span></p>
                <p class="text-sm"><strong>Total Egresos:</strong> <span class="text-red-600">-${formatMonto(totalEgresos)}</span></p>
                <hr class="my-2">
                <p class="text-sm font-bold"><strong>Saldo Final:</strong> <span class="text-lg">${formatMonto(saldoFinal)}</span></p>
              </div>
            </div>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, Cerrar Período',
        cancelButtonText: 'Cancelar',
        width: '600px'
      });

      if (!result.isConfirmed) return;
    } catch (error) {
      console.error('Error validando período:', error);
      toast.error('Error al validar el período');
      return;
    }

    try {
      setSubmitting(true);
      const response = await cierresCajaService.cerrar(id, formData);
      
      // Mostrar warnings si los hay en la respuesta
      if (response.warnings && response.warnings.length > 0) {
        let warningsMessage = 'Período cerrado con las siguientes advertencias:\n\n';
        response.warnings.forEach(w => {
          warningsMessage += `• ${w.mensaje}\n`;
        });
        
        await Swal.fire({
          title: 'Período Cerrado',
          text: warningsMessage,
          icon: 'info',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3b82f6'
        });
      } else {
        toast.success('Período cerrado exitosamente');
      }
      
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
          <h1 className="cursor-pointer text-3xl font-bold text-gray-800">Cerrar Período</h1>
          <p className="text-gray-600 mt-1">
            Iniciado el {formatFecha(cierre.fecha_inicio)}
          </p>
        </div>
        <button
          onClick={() => navigate(`/cierres-caja/${id}`)}
          className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <FiArrowLeft size={18} />
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

      {/* Warning horario tardío */}
      {new Date().getHours() >= 22 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex items-start">
            <FiAlertCircle className="text-amber-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-amber-800 font-semibold mb-1">⏰ Cierre en Horario Tardío</h3>
              <p className="text-amber-700 text-sm">
                Son las <strong>{new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong>. 
                Verifica cuidadosamente la <strong>fecha de fin</strong> que deseas cerrar. Si el proceso cruza la medianoche, 
                los movimientos posteriores a las 00:00 pertenecerán al día siguiente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumen de Saldos */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 transform hover:scale-[1.01] transition-transform duration-200">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiCheck className="text-slate-600" />
            Resumen de Saldos
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
                  Saldo Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cierre.detalle_metodos.map((detalle, index) => (
                <tr 
                  key={detalle.id_detalle}
                  className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-6 py-4 font-semibold text-gray-900">
                    {detalle.metodo_nombre}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-700 font-medium">
                    {formatMonto(detalle.saldo_inicial)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                      +{formatMonto(detalle.total_ingresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">
                      -{formatMonto(detalle.total_egresos)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-900 text-lg">
                    {formatMonto(detalle.saldo_final)}
                  </td>
                </tr>
              ))}
              
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
                <td className="px-6 py-5 text-right text-gray-900 text-xl font-extrabold">
                  {formatMonto(cierre.detalle_metodos.reduce((sum, d) => sum + d.saldo_final, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Formulario de Cierre */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 transform hover:scale-[1.01] transition-transform duration-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-green-100 p-3 rounded-lg">
            <FiCheck className="text-green-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Información de Cierre</h2>
            <p className="text-gray-600 text-sm">Completa los datos para cerrar el período</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FiAlertCircle className="text-blue-500" size={16} />
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={cierre.fecha_inicio ? cierre.fecha_inicio.split('T')[0] : ''}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed font-medium"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FiAlertCircle className="text-green-500" size={16} />
              Fecha de Fin <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
              min={cierre.fecha_inicio ? cierre.fecha_inicio.split('T')[0] : ''}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-medium"
            />
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <FiAlertCircle size={12} />
              Selecciona la última fecha que deseas incluir en este período
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <label className="block text-sm font-semibold text-gray-700">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
            placeholder="Notas adicionales sobre el cierre (opcional)"
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none transition-all"
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate(`/cierres-caja/${id}`)}
            className="cursor-pointer px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
          >
            <FiArrowLeft size={18} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                Cerrando...
              </>
            ) : (
              <>
                <FiCheck size={20} />
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
