import { useState, useEffect } from "react";
import { FiX, FiMinus, FiCalendar, FiFileText } from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";

const RegistrarConsumoModal = ({ isOpen, onClose, articulo, onSuccess }) => {
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [consumosRecientes, setConsumosRecientes] = useState([]);
  const [loadingConsumos, setLoadingConsumos] = useState(false);

  useEffect(() => {
    if (isOpen && articulo) {
      setCantidad("");
      setNotas("");
      setFecha(new Date().toISOString().split("T")[0]);
      cargarConsumosRecientes();
    }
  }, [isOpen, articulo]);

  const cargarConsumosRecientes = async () => {
    if (!articulo?.id_articulo) return;

    setLoadingConsumos(true);
    try {
      const res = await api.get(
        `/consumos-materia-prima/articulo/${articulo.id_articulo}?limite=5`,
      );
      setConsumosRecientes(res.data?.data || []);
    } catch (error) {
      console.error("Error cargando consumos recientes:", error);
    } finally {
      setLoadingConsumos(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cantidad || parseFloat(cantidad) <= 0) {
      toast.error("Ingresa una cantidad válida");
      return;
    }

    const cantidadNum = parseFloat(cantidad);
    const stockDisponible = articulo?.stock_disponible || 0;

    if (cantidadNum > stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/consumos-materia-prima", {
        fecha,
        id_articulo: articulo.id_articulo,
        cantidad: cantidadNum,
        notas: notas || null,
      });

      toast.success(
        `Consumo registrado: ${cantidadNum} ${articulo.descripcion}. Stock: ${res.data.data.stock_anterior} → ${res.data.data.stock_nuevo}`,
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Error registrando consumo:", error);
      const msg =
        error.response?.data?.error || "Error al registrar el consumo";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    const f = new Date(fecha);
    return f.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    });
  };

  const formatMoneda = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);
  };

  if (!isOpen || !articulo) return null;

  const stockDespues =
    (articulo?.stock_disponible || 0) - (parseFloat(cantidad) || 0);
  const costoEstimado =
    (parseFloat(cantidad) || 0) * (articulo?.precio_costo || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FiMinus size={20} />
                Registrar Consumo
              </h3>
              <p className="text-green-100 text-sm mt-1">
                {articulo.descripcion}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition cursor-pointer"
            >
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Info del artículo */}
        <div className="px-6 py-3 bg-green-50 border-b border-green-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Stock actual:</span>
            <span className="font-bold text-green-700">
              {articulo.stock_disponible || 0} unidades
            </span>
          </div>
          {articulo.precio_costo > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Costo unitario:</span>
              <span className="font-medium text-gray-700">
                {formatMoneda(articulo.precio_costo)}
              </span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Fecha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FiCalendar className="inline mr-1" size={14} />
                Fecha
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad a consumir
              </label>
              <input
                type="number"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej: 10"
                min="0.001"
                step="0.001"
                max={articulo.stock_disponible || 0}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
                autoFocus
              />
              {cantidad && parseFloat(cantidad) > 0 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stock después:</span>
                    <span
                      className={`font-bold ${
                        stockDespues < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {stockDespues.toFixed(2)} unidades
                    </span>
                  </div>
                  {articulo.precio_costo > 0 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-600">Costo estimado:</span>
                      <span className="font-medium text-gray-700">
                        {formatMoneda(costoEstimado)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <FiFileText className="inline mr-1" size={14} />
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Consumo para órdenes de la semana"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          {/* Consumos recientes */}
          {consumosRecientes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">
                Consumos recientes:
              </p>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {consumosRecientes.map((c) => (
                  <div
                    key={c.id_consumo}
                    className="flex justify-between text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded"
                  >
                    <span>{formatFecha(c.fecha)}</span>
                    <span className="font-medium">-{c.cantidad}</span>
                    {c.notas && (
                      <span className="text-gray-400 truncate max-w-[100px]">
                        {c.notas}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !cantidad ||
                parseFloat(cantidad) <= 0 ||
                stockDespues < 0
              }
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Registrando..." : "Registrar Consumo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrarConsumoModal;
