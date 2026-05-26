import { useState, useEffect } from "react";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";

const EditarArticulo = () => {
  const [referencia, setReferencia] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [precioCosto, setPrecioCosto] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [idCategoria, setIdCategoria] = useState("");
  const [unidades, setUnidades] = useState([]);
  const [idUnidad, setIdUnidad] = useState("");
  const [esCompuesto, setEsCompuesto] = useState(false);
  const [componentes, setComponentes] = useState([]);
  const [articulosSimples, setArticulosSimples] = useState([]);

  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const { id } = useParams();

  useEffect(() => {
    const fetchArticulo = async () => {
      try {
        const resArticulo = await api.get(`/articulos/${id}`);
        const articulo = resArticulo.data;
        setReferencia(articulo.referencia);
        setDescripcion(articulo.descripcion);
        setPrecioVenta(articulo.precio_venta);
        setPrecioCosto(articulo.precio_costo);
        setIdCategoria(articulo.id_categoria);
        setIdUnidad(articulo.id_unidad || 1);
        setEsCompuesto(Boolean(articulo.es_compuesto));

        if (articulo.es_compuesto) {
          const resComponentes = await api.get(`/articulos/componentes/${id}`);
          setComponentes(
            resComponentes.data.map((comp) => ({
              id: comp.id_articulo,
              cantidad: comp.cantidad,
              referencia: comp.referencia,
              descripcion: comp.descripcion,
            })),
          );
        } else {
          setComponentes([]);
        }
      } catch (error) {
        console.error("Error al obtener el artículo", error);
        toast.error("No se pudo cargar el artículo.");
      }
    };

    const fetchAllData = async () => {
      try {
        // Obtener total de artículos primero
        const resTotal = await api.get("/articulos", {
          params: { page: 1, pageSize: 1 },
        });
        const total = resTotal.data.total || 10000;

        const [resCategorias, resArticulos, resUnidades] = await Promise.all([
          api.get("/categorias"),
          api.get("/articulos", {
            params: {
              page: 1,
              pageSize: total,
              sortBy: "descripcion",
              sortDir: "asc",
            },
          }),
          api.get("/unidades"),
        ]);
        setCategorias(resCategorias.data || []);
        setUnidades(resUnidades.data || []);
        const lista = Array.isArray(resArticulos.data?.data)
          ? resArticulos.data.data
          : Array.isArray(resArticulos.data)
            ? resArticulos.data
            : [];
        const simples = lista.filter((art) => !art.es_compuesto);
        setArticulosSimples(simples);
        fetchArticulo();
      } catch (error) {
        console.error("Error cargando datos", error);
        toast.error("Error al cargar categorías o artículos.");
      }
    };

    fetchAllData();
  }, [id]);

  const handleAddComponente = () => {
    setComponentes([...componentes, { id: "", cantidad: "" }]);
  };

  const handleRemoveComponente = (indexToRemove) => {
    setComponentes(componentes.filter((_, index) => index !== indexToRemove));
  };

  const handleComponenteChange = (indexToUpdate, field, value) => {
    const nuevosComponentes = [...componentes];
    nuevosComponentes[indexToUpdate][field] = value;
    setComponentes(nuevosComponentes);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || guardado) return;
    setLoading(true);
    try {
      if (esCompuesto) {
        if (
          componentes.some(
            (comp) =>
              !comp.id || !comp.cantidad || parseInt(comp.cantidad) <= 0,
          )
        ) {
          return toast.error(
            "Un artículo compuesto debe tener al menos un componente válido y una cantidad mayor a 0.",
          );
        }
        const idsUnicos = new Set(componentes.map((c) => c.id));
        if (idsUnicos.size !== componentes.length) {
          return toast.error(
            "No se pueden seleccionar componentes duplicados.",
          );
        }
      }

      const formData = {
        referencia: referencia.trim(),
        descripcion: descripcion.trim(),
        precio_venta: parseInt(precioVenta),
        precio_costo: parseInt(precioCosto),
        id_categoria: idCategoria ? parseInt(idCategoria) : null,
        id_unidad: idUnidad ? parseInt(idUnidad) : 1,
        es_compuesto: esCompuesto,
        componentes: esCompuesto
          ? componentes.map((c) => ({
              id: parseInt(c.id),
              cantidad: parseInt(c.cantidad),
            }))
          : [],
      };

      await api.put(`/articulos/${id}`, formData, { headers: { "X-Idempotency-Key": idempotencyKey } });
      toast.success(" Artículo actualizado correctamente");
      setGuardado(true);
      setTimeout(() => {
        navigate("/articulos");
      }, 500);
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    navigate("/articulos");
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6">
      <div className="max-w-5xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelar}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={15} />
            </button>
            <div>
              <p className="text-[11px] text-slate-500 font-medium">
                Artículos
              </p>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Editar artículo
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="editar-articulo-form"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer shadow-sm disabled:opacity-60"
              disabled={loading || guardado}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <form id="editar-articulo-form" onSubmit={handleSubmit}>
          {/* Layout principal */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Campos principales — 2/3 */}
            <div className="xl:col-span-2">
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  Información principal
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="referencia" className={labelCls}>
                      Referencia{" "}
                      <span className="text-red-500 normal-case font-normal">
                        *
                      </span>
                    </label>
                    <input
                      id="referencia"
                      type="text"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      required
                      className={inputCls}
                      placeholder="Ej: ART-001"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="descripcion" className={labelCls}>
                      Descripción
                    </label>
                    <textarea
                      id="descripcion"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      rows="3"
                      className={`${inputCls} resize-none`}
                      placeholder="Descripción del artículo"
                    />
                  </div>

                  <div>
                    <label htmlFor="precio_venta" className={labelCls}>
                      Precio de venta{" "}
                      <span className="text-red-500 normal-case font-normal">
                        *
                      </span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                        $
                      </span>
                      <input
                        id="precio_venta"
                        type="number"
                        step="1"
                        min="0"
                        value={precioVenta}
                        onChange={(e) => setPrecioVenta(e.target.value)}
                        required
                        className={`${inputCls} pl-7`}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="precio_costo" className={labelCls}>
                      Precio de costo
                      {esCompuesto && (
                        <span className="ml-1.5 text-[10px] font-medium text-amber-600 normal-case">
                          (calculado)
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
                        $
                      </span>
                      <input
                        id="precio_costo"
                        type="number"
                        step="1"
                        min="0"
                        value={precioCosto}
                        onChange={(e) => setPrecioCosto(e.target.value)}
                        disabled={esCompuesto}
                        className={`${inputCls} pl-7 ${esCompuesto ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar clasificación — 1/3 */}
            <div>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-4 pb-3 border-b border-slate-100">
                  Clasificación
                </h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="categoria" className={labelCls}>
                      Categoría
                    </label>
                    <select
                      id="categoria"
                      value={idCategoria}
                      onChange={(e) => setIdCategoria(e.target.value)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Sin categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id_categoria} value={cat.id_categoria}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="unidad" className={labelCls}>
                      Unidad de medida
                    </label>
                    <select
                      id="unidad"
                      value={idUnidad}
                      onChange={(e) => setIdUnidad(e.target.value)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Sin unidad</option>
                      {unidades.map((u) => (
                        <option key={u.id_unidad} value={u.id_unidad}>
                          {u.nombre} ({u.abreviatura})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1">
                    <label
                      htmlFor="esCompuesto"
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          id="esCompuesto"
                          checked={!!esCompuesto}
                          onChange={(e) => setEsCompuesto(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 rounded-full bg-slate-200 peer-checked:bg-slate-900 transition-colors" />
                        <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Artículo compuesto
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Definir componentes
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Componentes */}
          {!!esCompuesto && (
            <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Componentes
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {componentes.length} componente
                    {componentes.length !== 1 ? "s" : ""} añadido
                    {componentes.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddComponente}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <FiPlus size={13} /> Agregar componente
                </button>
              </div>
              <div className="space-y-2">
                {componentes.map((comp, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_120px_36px] gap-2 items-center p-2.5 border border-slate-100 rounded-lg bg-slate-50"
                  >
                    <select
                      value={comp.id}
                      onChange={(e) =>
                        handleComponenteChange(index, "id", e.target.value)
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer transition"
                      required
                    >
                      <option value="">Seleccionar artículo…</option>
                      {articulosSimples.map((art) => (
                        <option key={art.id_articulo} value={art.id_articulo}>
                          {art.referencia ? `${art.referencia} — ` : ""}
                          {art.descripcion}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={comp.cantidad}
                      onChange={(e) =>
                        handleComponenteChange(
                          index,
                          "cantidad",
                          e.target.value,
                        )
                      }
                      required
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
                      placeholder="Cant."
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveComponente(index)}
                      disabled={componentes.length === 1}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      title="Eliminar componente"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditarArticulo;
