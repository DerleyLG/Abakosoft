import { useState, useEffect } from "react";
import api from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiPlus, FiTrash2 } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const CrearEtapa = () => {
  const idempotencyKey = useIdempotencyKey();
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cargo, setCargo] = useState("");
  const [orden, setOrden] = useState("");
  const [etapasExistentes, setEtapasExistentes] = useState([]);
  const [eliminando, setEliminando] = useState(null);
  const navigate = useNavigate();

  const fetchEtapas = async () => {
    try {
      const res = await api.get("/etapas-produccion");
      const data = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setEtapasExistentes(data.sort((a, b) => a.orden - b.orden));
    } catch (error) {
      console.error("Error al cargar etapas existentes:", error);
      toast.error("Error al cargar etapas existentes.");
    }
  };

  useEffect(() => {
    fetchEtapas();
  }, []);

  const generarOpcionesOrden = () => {
    const maxOrden =
      etapasExistentes.length > 0
        ? Math.max(...etapasExistentes.map((e) => e.orden))
        : 0;
    const opciones = [];
    for (let i = 1; i <= maxOrden + 1; i++) {
      opciones.push(i);
    }
    return opciones;
  };

  // Genera la previsualización del flujo con la nueva etapa insertada
  const generarPrevisualizacion = () => {
    const ordenNum = Number(orden);
    if (!ordenNum) return null;

    const etapasOrdenadas = [...etapasExistentes].sort(
      (a, b) => a.orden - b.orden,
    );
    const nuevaEtapa = {
      nombre: nombre || "Nueva etapa",
      orden: ordenNum,
      esNueva: true,
    };

    // Insertar la nueva etapa en la posición correcta
    // Las etapas con orden >= al seleccionado se desplazan
    const resultado = [];
    let insertada = false;

    for (const etapa of etapasOrdenadas) {
      if (!insertada && etapa.orden >= ordenNum) {
        resultado.push(nuevaEtapa);
        insertada = true;
      }
      resultado.push({ ...etapa, esNueva: false });
    }

    if (!insertada) {
      resultado.push(nuevaEtapa);
    }

    return resultado;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orden) {
      toast.error("Por favor, selecciona un orden para la etapa.");
      return;
    }

    try {
      await api.post(
        "/etapas-produccion",
        {
          nombre,
          descripcion,
          orden: Number(orden),
          cargo: cargo.trim() || null,
        },
        { headers: { "X-Idempotency-Key": idempotencyKey } },
      );
      toast.success("Etapa registrada exitosamente");
      navigate("/ordenes_fabricacion");
    } catch (error) {
      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al registrar etapa";
      toast.error(msg);
      console.error(error);
    }
  };

  const handleEliminar = async (etapa) => {
    if (eliminando === etapa.id_etapa) {
      // Segundo click: confirmar
      try {
        await api.delete(`/etapas-produccion/${etapa.id_etapa}`);
        toast.success(`Etapa "${etapa.nombre}" eliminada`);
        setEliminando(null);
        setOrden("");
        fetchEtapas();
      } catch (error) {
        const msg =
          error.response?.data?.error ||
          error.response?.data?.message ||
          "Error al eliminar etapa";
        toast.error(msg);
      }
    } else {
      // Primer click: pedir confirmación
      setEliminando(etapa.id_etapa);
      setTimeout(() => setEliminando(null), 3000);
    }
  };

  const ordenNum = Number(orden);
  // Contar cuántas etapas se desplazarán
  const etapasDesplazadas = etapasExistentes.filter((e) => e.orden >= ordenNum);
  const previsualizacion = generarPrevisualizacion();

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 px-8 py-6 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-slate-700">
            Registrar Nueva Etapa
          </h2>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition cursor-pointer text-sm font-medium"
          >
            <FiArrowLeft size={16} />
            Volver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Nombre y Orden en fila */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
                Nombre de la etapa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Corte, Tapizado, Ensamble..."
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                required
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
                Posición en el flujo <span className="text-red-500">*</span>
              </label>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                required
              >
                <option value="">Seleccionar...</option>
                {generarOpcionesOrden().map((opt) => {
                  const etapaEnPosicion = etapasExistentes.find(
                    (e) => e.orden === opt,
                  );
                  const esUltima = opt === generarOpcionesOrden().length;
                  return (
                    <option key={opt} value={opt}>
                      {opt} —{" "}
                      {esUltima
                        ? "Al final (nueva posición)"
                        : `Antes de "${etapaEnPosicion?.nombre || ""}"`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Cargo responsable */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
              Cargo responsable{" "}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition bg-white"
            >
              <option value="">— Sin cargo (cualquier trabajador) —</option>
              <option value="Carpintero">Carpintero</option>
              <option value="Pintor">Pintor</option>
              <option value="Tapizador">Tapizador</option>
              <option value="Pulidor">Pulidor</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Indica el cargo del trabajador que realiza esta etapa. Se usará
              para filtrar trabajadores al registrar avances.
            </p>
          </div>

          {/* Descripción */}
          <div>
            <label className="text-sm font-semibold text-slate-600 mb-1.5 block">
              Descripción{" "}
              <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe brevemente qué se realiza en esta etapa..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition resize-none"
              rows={3}
            />
          </div>

          {/* Previsualización del flujo */}
          <div>
            <h4 className="text-sm font-semibold text-slate-600 mb-3">
              Previsualización del flujo de producción
            </h4>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
              {!orden ? (
                <p className="text-slate-400 text-sm text-center py-2">
                  Selecciona una posición para ver cómo quedará el flujo
                </p>
              ) : (
                <>
                  {etapasDesplazadas.length > 0 && (
                    <p className="text-amber-600 text-xs font-medium mb-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      ⚠{" "}
                      {etapasDesplazadas.length === 1
                        ? `La etapa "${etapasDesplazadas[0].nombre}" se desplazará una posición hacia adelante.`
                        : `${etapasDesplazadas.length} etapas se desplazarán una posición hacia adelante: ${etapasDesplazadas.map((e) => `"${e.nombre}"`).join(", ")}.`}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {previsualizacion &&
                      previsualizacion.map((etapa, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div
                            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                              etapa.esNueva
                                ? "bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200"
                            }`}
                          >
                            <span
                              className={`inline-block w-5 h-5 text-xs rounded-full text-center leading-5 mr-2 ${
                                etapa.esNueva
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {idx + 1}
                            </span>
                            {etapa.esNueva && (
                              <FiPlus
                                className="inline mr-1 mb-0.5"
                                size={12}
                              />
                            )}
                            {etapa.nombre}
                          </div>
                          {idx < previsualizacion.length - 1 && (
                            <FiArrowRight
                              className="text-slate-300 flex-shrink-0"
                              size={16}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Etapas actuales */}
          {etapasExistentes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-600 mb-3">
                Flujo actual ({etapasExistentes.length} etapas)
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                {etapasExistentes.map((etapa, idx) => (
                  <div key={etapa.id_etapa} className="flex items-center gap-2">
                    <div className="group relative px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-500 border border-slate-200 flex items-center gap-1.5">
                      <span className="inline-block w-4 h-4 text-[10px] rounded-full bg-slate-100 text-slate-400 text-center leading-4">
                        {etapa.orden}
                      </span>
                      {etapa.nombre}
                      <button
                        type="button"
                        onClick={() => handleEliminar(etapa)}
                        className={`ml-1 transition cursor-pointer ${
                          eliminando === etapa.id_etapa
                            ? "text-red-500"
                            : "text-slate-300 hover:text-red-500"
                        }`}
                        title={
                          eliminando === etapa.id_etapa
                            ? "Click para confirmar"
                            : `Eliminar "${etapa.nombre}"`
                        }
                      >
                        <FiTrash2 size={12} />
                      </button>
                      {eliminando === etapa.id_etapa && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap">
                          Click de nuevo para confirmar
                        </span>
                      )}
                    </div>
                    {idx < etapasExistentes.length - 1 && (
                      <FiArrowRight
                        className="text-slate-200 flex-shrink-0"
                        size={14}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition cursor-pointer text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition shadow-sm cursor-pointer text-sm font-medium"
            >
              Registrar Etapa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearEtapa;
