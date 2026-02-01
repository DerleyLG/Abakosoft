import { useState, useEffect } from "react";
import formateaCantidad from "../utils/formateaCantidad";
import { FiX, FiPackage, FiAlertTriangle } from "react-icons/fi";

const EditarStockModal = ({ isOpen, onClose, item, onSave }) => {
  const [stockDisponible, setStockDisponible] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (item) {
      // Limpiar valor inicial: solo número o string numérico limpio
      let stockInit = item.stock_disponible;
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
      setStockMinimo(item.stock_minimo || 0);
      setErrors({});
    }
  }, [item]);

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
        id_articulo: item.id_articulo,
        stock: stockValue,
        stock_minimo: stockMinValue,
      });
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
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
                  {item?.descripcion}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
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
              {item?.referencia || "N/A"}
            </span>
          </div>
          {item?.nombre_categoria && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-slate-600">Categoría:</span>
              <span className="font-medium text-slate-800">
                {item.nombre_categoria}
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
              onClick={onClose}
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
      </div>
    </div>
  );
};

export default EditarStockModal;
