import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import cierresCajaService from "../services/cierresCajaService";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiSave, FiAlertCircle } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const CierresCajaForm = () => {
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [metodosPago, setMetodosPago] = useState([]);
  const [formData, setFormData] = useState({
    fecha_inicio: new Date().toISOString().split("T")[0],
    saldos_iniciales: {},
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
        toast.error(
          "Ya existe un período abierto. Debes cerrarlo antes de abrir uno nuevo.",
        );
        navigate("/cierres-caja");
        return;
      }

      // Obtener métodos de pago (desde tu servicio existente)
      const response = await api.get("/metodos-pago");
      const metodos = response.data;
      setMetodosPago(metodos);

      // Inicializar saldos en 0
      const saldosIniciales = {};
      metodos.forEach((metodo) => {
        saldosIniciales[metodo.id_metodo_pago] = 0;
      });
      setFormData((prev) => ({ ...prev, saldos_iniciales: saldosIniciales }));
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar datos");
      navigate("/cierres-caja");
    } finally {
      setLoading(false);
    }
  };

  const handleSaldoChange = (idMetodo, value) => {
    // Solo permitir números enteros positivos
    const valorNumerico =
      value === "" ? 0 : parseInt(value.replace(/\D/g, ""), 10);

    setFormData((prev) => ({
      ...prev,
      saldos_iniciales: {
        ...prev.saldos_iniciales,
        [idMetodo]: valorNumerico,
      },
    }));
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto || 0);
  };

  const calcularTotal = () => {
    return Object.values(formData.saldos_iniciales).reduce(
      (sum, val) => sum + (val || 0),
      0,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      // Transformar saldos_iniciales de objeto a array
      const saldos_iniciales = Object.entries(formData.saldos_iniciales).map(
        ([id_metodo_pago, saldo_inicial]) => ({
          id_metodo_pago: parseInt(id_metodo_pago),
          saldo_inicial: parseInt(saldo_inicial) || 0,
        }),
      );

      const payload = {
        fecha_inicio: formData.fecha_inicio,
        saldos_iniciales,
      };

      const response = await cierresCajaService.create(payload, idempotencyKey);

      toast.success("Período abierto exitosamente");
      navigate(`/cierres-caja/${response.id_cierre}`);
    } catch (error) {
      console.error("Error creando período:", error);
      toast.error(error.response?.data?.error || "Error al crear el período");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Nuevo
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
            Abrir Período
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define la fecha de inicio y los saldos iniciales
          </p>
        </div>
        <button
          onClick={() => navigate("/cierres-caja")}
          className="self-start flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
        >
          <FiArrowLeft size={14} />
          Volver
        </button>
      </div>

      {/* Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <FiAlertCircle className="text-indigo-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-indigo-800">Primer Período</p>
          <p className="text-sm text-indigo-700 mt-0.5">
            Los saldos iniciales representan el dinero disponible en cada método
            de pago al inicio del control. Puedes dejar todos en 0 o ingresar
            los saldos reales actuales.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col gap-6"
      >
        {/* Fecha de inicio */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Fecha de Inicio <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={formData.fecha_inicio}
            onChange={(e) =>
              setFormData({ ...formData, fecha_inicio: e.target.value })
            }
            required
            className="w-full sm:w-64 px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 transition-all"
          />
        </div>

        {/* Saldos iniciales */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Saldos Iniciales
          </p>
          <div className="flex flex-col gap-2">
            {metodosPago.map((metodo) => (
              <div
                key={metodo.id_metodo_pago}
                className="flex items-center gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <label className="text-sm font-semibold text-slate-700 w-36 shrink-0">
                  {metodo.nombre}
                </label>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="text"
                    value={
                      formData.saldos_iniciales[
                        metodo.id_metodo_pago
                      ]?.toLocaleString("es-CO") || "0"
                    }
                    onChange={(e) =>
                      handleSaldoChange(metodo.id_metodo_pago, e.target.value)
                    }
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-right transition-all bg-white"
                    placeholder="0"
                  />
                  <span className="text-xs font-semibold text-slate-500 min-w-[110px] text-right">
                    {formatMonto(
                      formData.saldos_iniciales[metodo.id_metodo_pago] || 0,
                    )}
                  </span>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex items-center gap-4 px-4 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl mt-1">
              <span className="text-sm font-extrabold text-slate-900 w-36 shrink-0">
                TOTAL
              </span>
              <div className="flex-1 text-right">
                <span className="text-lg font-extrabold text-emerald-700">
                  {formatMonto(calcularTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate("/cierres-caja")}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FiArrowLeft size={14} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Abriendo...
              </>
            ) : (
              <>
                <FiSave size={14} />
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
