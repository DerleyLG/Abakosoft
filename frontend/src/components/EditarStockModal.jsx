import { useState, useEffect } from "react";
import formateaCantidad from "../utils/formateaCantidad";
import { generateUUID } from "../utils/uuid";
import { FiX, FiPackage, FiAlertTriangle, FiClock } from "react-icons/fi";
import api from "../services/api";
import useModalTransition from "../hooks/useModalTransition";

const TIPO_LABEL = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
};

const TIPO_COLOR = {
  entrada: "text-emerald-600",
  salida: "text-red-600",
  ajuste: "text-amber-600",
};

const ORIGEN_LABEL = {
  inicial: "Inicial",
  produccion: "Producción",
  venta: "Venta",
  compra: "Compra",
  ajuste_manual: "Ajuste manual",
  anulacion_venta: "Anulación de venta",
  anulacion_compra: "Anulación de compra",
  devolucion_cliente: "Devolución de cliente",
  devolucion_proveedor: "Devolución a proveedor",
  reparacion: "Reparación",
};

const EditarStockModal = ({ isOpen, onClose, item, onSave }) => {
  const { mostrar, cerrando, cerrar } = useModalTransition(isOpen, onClose);
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateUUID());
  const [stockDisponible, setStockDisponible] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Copia local del item: persiste durante la animación de salida aunque
  // el padre limpie `item` al cerrar (evita que el contenido desaparezca de golpe).
  const [itemActual, setItemActual] = useState(item);

  useEffect(() => {
    if (item) setItemActual(item);
  }, [item]);

  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(generateUUID());
    }
  }, [isOpen]);

  // Cargar historial reciente del artículo al abrir el modal
  useEffect(() => {
    if (isOpen && itemActual?.id_articulo) {
      setCargandoHistorial(true);
      setHistorial([]);
      api
        .get(`/inventario/${itemActual.id_articulo}/movimientos?limit=5`)
        .then((res) => {
          setHistorial(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => {
          setHistorial([]);
        })
        .finally(() => {
          setCargandoHistorial(false);
        });
    }
  }, [isOpen, itemActual?.id_articulo]);

  useEffect(() => {
    if (itemActual) {
      // Limpiar valor inicial: solo número o string numérico limpio
      let stockInit = itemActual.stock_disponible;
      if (typeof stockInit === "string") {
        stockInit = stockInit.replace(/[^0-9.]/g, "");
        const parts = stockInit.split(".");
        if (parts.length > 2) {
          stockInit = parts[0] + "." + parts.slice(1).join("");
        }
      }
      if (stockInit === undefined || stockInit === null || stockInit === "")
        stockInit = 0;
      // Mostrar como entero si es entero, como decimal si es decimal
      const num = Number(stockInit);
      setStockDisponible(Number.isInteger(num) ? String(num) : String(num));
      setStockMinimo(itemActual.stock_minimo || 0);
      setErrors({});
    }
  }, [itemActual]);

  const validate = () => {
    const newErrors = {};

    if (
      stockDisponible === "" ||
      isNaN(stockDisponible) ||
      stockDisponible < 0
    ) {
      newErrors.stockDisponible =
        "El stock debe ser un número mayor o igual a 0";
    }

    if (stockMinimo === "" || isNaN(stockMinimo) || stockMinimo < 0) {
      newErrors.stockMinimo =
        "El stock mínimo debe ser un número mayor o igual a 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      // Limpiar y validar valores
      let stockValue = parseFloat(stockDisponible);
      if (isNaN(stockValue) || stockValue < 0) stockValue = 0;
      let stockMinValue = parseInt(stockMinimo, 10);
      if (isNaN(stockMinValue) || stockMinValue < 0) stockMinValue = 0;

      await onSave({
        id_articulo: itemActual.id_articulo,
        stock: stockValue,
        stock_minimo: stockMinValue,
        idempotencyKey,
      });
      cerrar();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 ${
          cerrando ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        }`}
        onClick={cerrar}
      />

      {/* Modal */}
      <div
        className={`relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden ${
          cerrando ? "animate-modal-card-out" : "animate-modal-card-in"
        }`}
      >
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-700 rounded-lg">
                <FiPackage className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Editar Stock
                </h3>
                <p className="text-slate-300 text-sm truncate max-w-[250px]">
                  {itemActual?.descripcion}
                </p>
              </div>
            </div>
            <button
              onClick={cerrar}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <FiX className="text-slate-300 hover:text-white" size={20} />
            </button>
          </div>
        </div>

        {/* Info del artículo */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Referencia:</span>
            <span className="font-medium text-slate-800">
              {itemActual?.referencia || "N/A"}
            </span>
          </div>
          {itemActual?.nombre_categoria && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600">Categoría:</span>
              <span className="font-medium text-slate-800">
                {itemActual.nombre_categoria}
              </span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Stock Disponible */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Stock Disponible
            </label>
            <input
              type="text"
              inputMode="decimal"
              min="0"
              value={
                stockDisponible === "" ? "" : formateaCantidad(stockDisponible)
              }
              onChange={(e) => {
                // Permitir solo números y un solo punto decimal
                let val = e.target.value.replace(/[^0-9.]/g, "");
                // Evitar más de un punto decimal
                const parts = val.split(".");
                if (parts.length > 2) {
                  val = parts[0] + "." + parts.slice(1).join("");
                }
                setStockDisponible(val);
              }}
              className={`w-full px-4 py-3 border rounded-lg text-lg font-medium transition-colors focus:outline-none focus:ring-2 ${
                errors.stockDisponible
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-300 focus:ring-slate-500 focus:border-slate-500"
              }`}
              placeholder="0"
            />
            {errors.stockDisponible && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertTriangle size={14} />
                {errors.stockDisponible}
              </p>
            )}
          </div>

          {/* Stock Mínimo */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Stock Mínimo
              <span className="font-normal text-slate-500 ml-1">
                (alerta cuando sea menor)
              </span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              min="0"
              value={stockMinimo === "" ? "" : formateaCantidad(stockMinimo)}
              onChange={(e) => {
                // Permitir solo números y un solo punto decimal
                let val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) {
                  val = parts[0] + "." + parts.slice(1).join("");
                }
                setStockMinimo(val);
              }}
              className={`w-full px-4 py-3 border rounded-lg text-lg font-medium transition-colors focus:outline-none focus:ring-2 ${
                errors.stockMinimo
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : "border-slate-300 focus:ring-slate-500 focus:border-slate-500"
              }`}
              placeholder="0"
            />
            {errors.stockMinimo && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <FiAlertTriangle size={14} />
                {errors.stockMinimo}
              </p>
            )}
          </div>

          {/* Indicador visual de stock */}
          {stockDisponible !== "" && stockMinimo !== "" && (
            <div
              className={`p-3 rounded-lg ${
                parseInt(stockDisponible) <= parseInt(stockMinimo)
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {parseInt(stockDisponible) <= parseInt(stockMinimo) ? (
                  <>
                    <FiAlertTriangle className="text-amber-600" size={18} />
                    <span className="text-sm text-amber-700 font-medium">
                      Stock bajo o igual al mínimo
                    </span>
                  </>
                ) : (
                  <>
                    <FiPackage className="text-green-600" size={18} />
                    <span className="text-sm text-green-700 font-medium">
                      Stock en nivel adecuado
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={cerrar}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>

        {/* Historial reciente */}
        <div className="px-6 pb-5 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 pt-4 mb-2 flex items-center gap-2">
            <FiClock size={14} className="text-slate-400" />
            Historial reciente
          </h4>
          {cargandoHistorial ? (
            <p className="text-xs text-slate-400 animate-pulse">
              Cargando movimientos…
            </p>
          ) : historial.length === 0 ? (
            <p className="text-xs text-slate-400">
              Sin movimientos registrados para este artículo.
            </p>
          ) : (
            <ul className="space-y-1.5 max-h-44 overflow-auto pr-1">
              {historial.map((mov) => (
                <li
                  key={mov.id_movimiento}
                  className="flex items-start justify-between gap-2 text-xs border border-slate-100 rounded-lg px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="text-slate-700 font-medium">
                      <span
                        className={
                          TIPO_COLOR[mov.tipo_movimiento] || "text-slate-600"
                        }
                      >
                        {TIPO_LABEL[mov.tipo_movimiento] || mov.tipo_movimiento}
                      </span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="tabular-nums">
                        {Number(mov.cantidad_movida) > 0 ? "+" : ""}
                        {formateaCantidad(mov.cantidad_movida)}
                      </span>
                      <span className="text-slate-400 mx-1">·</span>
                      <span className="text-slate-500">
                        {ORIGEN_LABEL[mov.tipo_origen_movimiento] ||
                          mov.tipo_origen_movimiento}
                      </span>
                    </p>
                    {mov.observaciones && (
                      <p
                        className="text-slate-400 truncate mt-0.5"
                        title={mov.observaciones}
                      >
                        {mov.observaciones}
                      </p>
                    )}
                  </div>
                  <span className="text-slate-400 whitespace-nowrap shrink-0">
                    {mov.fecha_movimiento
                      ? new Date(mov.fecha_movimiento).toLocaleDateString(
                          "es-CO",
                          { day: "2-digit", month: "2-digit" },
                        ) +
                        " " +
                        new Date(mov.fecha_movimiento).toLocaleTimeString(
                          "es-CO",
                          { hour: "2-digit", minute: "2-digit" },
                        )
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditarStockModal;
