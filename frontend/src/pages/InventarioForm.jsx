import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const NuevoInventario = () => {
  const idempotencyKey = useIdempotencyKey();
  const [articulos, setArticulos] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(0);
  const [stockMinimo, setStockMinimo] = useState(0);
  const navigate = useNavigate();
  const cacheRef = useRef({});
  const timerRef = useRef(null);

  // Cargar las primeras 20 sugerencias al inicio
  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const res = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const lista = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];
        const opciones = lista.map((art) => ({
          value: art.id_articulo,
          label: art.descripcion,
          ...art,
        }));
        setArticulos(opciones);
        cacheRef.current[""] = opciones;
      } catch (error) {
        console.error("Error al cargar artículos", error);
        toast.error("Error al cargar artículos");
      }
    };
    fetchArticulos();
  }, []);

  // Búsqueda remota: consulta al backend por cada término (todos los artículos)
  const loadArticulosOptions = useCallback((inputValue, callback) => {
    const cacheKey = inputValue?.toLowerCase() || "";
    if (cacheRef.current[cacheKey]) {
      callback(cacheRef.current[cacheKey]);
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.get("/articulos", {
          params: {
            buscar: inputValue || "",
            page: 1,
            pageSize: 20,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        const opciones = rows.map((art) => ({
          value: art.id_articulo,
          label: art.descripcion,
          ...art,
        }));
        cacheRef.current[cacheKey] = opciones;
        callback(opciones);
      } catch (error) {
        console.error("Error buscando artículos", error);
        callback([]);
      }
    }, 300);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!articuloSeleccionado)
      return toast.error("Por favor selecciona un artículo");
    if (cantidad < 0)
      return toast.error("La cantidad inicial no puede ser negativa");
    if (stockMinimo < 0)
      return toast.error("El stock mínimo no puede ser negativo");
    try {
      await api.post("/inventario/movimientos", {
        id_articulo: Number(articuloSeleccionado.value),
        cantidad: Number(cantidad),
        tipo_movimiento: "entrada",
        descripcion: "Ingreso inicial de artículo al inventario",
        origen: "inicial",
        stock_minimo: Number(stockMinimo),
      }, { headers: { "X-Idempotency-Key": idempotencyKey } });
      toast.success("Artículo agregado al inventario");
      navigate("/inventario");
    } catch (error) {
      const mensajeError =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "No se pudo agregar el artículo al inventario";
      toast.error(mensajeError);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls = "block text-sm font-semibold text-slate-600 mb-2";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/inventario")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={17} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Inventario
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Agregar artículo
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/inventario")}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="inventario-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form
            id="inventario-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            <div>
              <label className={labelCls}>
                Artículo <span className="text-red-400">*</span>
              </label>
              <AsyncSelect
                cacheOptions
                loadOptions={loadArticulosOptions}
                defaultOptions={articulos}
                value={articuloSeleccionado}
                onChange={setArticuloSeleccionado}
                placeholder="Busca un artículo…"
                isClearable
                className="text-sm"
                noOptionsMessage={() => "No se encontraron artículos"}
                loadingMessage={() => "Buscando…"}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: state.isFocused ? "#94a3b8" : "#e2e8f0",
                    boxShadow: state.isFocused
                      ? "0 0 0 2px rgba(148,163,184,0.4)"
                      : "0 1px 2px rgba(0,0,0,0.05)",
                    borderRadius: "0.75rem",
                    padding: "2px 4px",
                    "&:hover": { borderColor: "#94a3b8" },
                  }),
                  option: (base, state) => ({
                    ...base,
                    fontSize: "0.875rem",
                    backgroundColor: state.isSelected
                      ? "#1e293b"
                      : state.isFocused
                        ? "#f1f5f9"
                        : "white",
                    color: state.isSelected ? "white" : "#1e293b",
                  }),
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Cantidad inicial</label>
                <input
                  type="number"
                  min="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className={inputCls}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Stock con el que entra al inventario
                </p>
              </div>
              <div>
                <label className={labelCls}>Stock mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(Number(e.target.value))}
                  className={inputCls}
                  required
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Alerta cuando el stock baje de este valor
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NuevoInventario;
