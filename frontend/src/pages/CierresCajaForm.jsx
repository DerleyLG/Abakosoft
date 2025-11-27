import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cierresCajaService from '../services/cierresCajaService';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiSave, FiAlertCircle } from 'react-icons/fi';

const CierresCajaForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);
  const [formData, setFormData] = useState({
    fecha_inicio: new Date().toISOString().split('T')[0],
    saldos_iniciales: {}
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Verificar si ya hay un período abierto
      const periodoAbierto = await cierresCajaService.getCierreAbierto();
      if (periodoAbierto) {
        toast.error('Ya existe un período abierto. Debes cerrarlo antes de abrir uno nuevo.');
        navigate('/cierres-caja');
        return;
      }

      // Obtener métodos de pago (desde tu servicio existente)
      const response = await api.get('/metodos-pago');
      const metodos = response.data;
      setMetodosPago(metodos);

      // Inicializar saldos en 0
      const saldosIniciales = {};
      metodos.forEach(metodo => {
        saldosIniciales[metodo.id_metodo_pago] = 0;
      });
      setFormData(prev => ({ ...prev, saldos_iniciales: saldosIniciales }));

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos');
      navigate('/cierres-caja');
    } finally {
      setLoading(false);
    }
  };

  const handleSaldoChange = (idMetodo, value) => {
    // Solo permitir números enteros positivos
    const valorNumerico = value === '' ? 0 : parseInt(value.replace(/\D/g, ''), 10);
    
    setFormData(prev => ({
      ...prev,
      saldos_iniciales: {
        ...prev.saldos_iniciales,
        [idMetodo]: valorNumerico
      }
    }));
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(monto || 0);
  };

  const calcularTotal = () => {
    return Object.values(formData.saldos_iniciales).reduce((sum, val) => sum + (val || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      
      // Transformar saldos_iniciales de objeto a array
      const saldos_iniciales = Object.entries(formData.saldos_iniciales).map(([id_metodo_pago, saldo_inicial]) => ({
        id_metodo_pago: parseInt(id_metodo_pago),
        saldo_inicial: parseInt(saldo_inicial) || 0
      }));

      const payload = {
        fecha_inicio: formData.fecha_inicio,
        saldos_iniciales
      };

      const response = await cierresCajaService.create(payload);
      
      toast.success('Período abierto exitosamente');
      navigate(`/cierres-caja/${response.id_cierre}`);
    } catch (error) {
      console.error('Error creando período:', error);
      toast.error(error.response?.data?.error || 'Error al crear el período');
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Abrir Nuevo Período</h1>
          <p className="text-gray-600 mt-1">
            Define la fecha de inicio y los saldos iniciales por método de pago
          </p>
        </div>
        <button
          onClick={() => navigate('/cierres-caja')}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <FiArrowLeft size={18} />
          Volver
        </button>
      </div>

      {/* Alerta */}
      <div className="bg-slate-50 border-l-4 border-slate-600 p-4 mb-6">
        <div className="flex items-start">
          <FiAlertCircle className="text-slate-600 mt-0.5 mr-3 flex-shrink-0" size={20} />
          <div>
            <h3 className="text-slate-800 font-semibold mb-1">Primer Período</h3>
            <p className="text-slate-700 text-sm">
              Este es el primer cierre de caja del sistema. Los saldos iniciales representan el dinero 
              disponible en cada método de pago al momento de iniciar el control. Si es la primera vez, 
              puedes dejar todos en 0 o ingresar los saldos reales actuales.
            </p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Información del Período</h2>

        {/* Fecha de inicio */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fecha de Inicio <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Saldos Iniciales */}
        <h3 className="text-lg font-semibold text-gray-800 mb-4 mt-8">Saldos Iniciales</h3>
        
        <div className="space-y-4 mb-6">
          {metodosPago.map((metodo) => (
            <div key={metodo.id_metodo_pago} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <label className="font-semibold text-gray-700 w-1/3">
                {metodo.nombre}
              </label>
              <div className="flex items-center gap-3 w-2/3">
                <span className="text-gray-500">$</span>
                <input
                  type="text"
                  value={formData.saldos_iniciales[metodo.id_metodo_pago]?.toLocaleString('es-CO') || '0'}
                  onChange={(e) => handleSaldoChange(metodo.id_metodo_pago, e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-right"
                  placeholder="0"
                />
                <span className="text-gray-600 font-semibold min-w-[120px] text-right">
                  {formatMonto(formData.saldos_iniciales[metodo.id_metodo_pago] || 0)}
                </span>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border-2 border-green-200">
            <label className="font-bold text-gray-800 text-lg w-1/3">
              TOTAL
            </label>
            <div className="w-2/3 text-right">
              <span className="text-2xl font-bold text-green-700">
                {formatMonto(calcularTotal())}
              </span>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/cierres-caja')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>Guardando...</>
            ) : (
              <>
                <FiSave />
                Abrir Período
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CierresCajaForm;
