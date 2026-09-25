import { useEffect, useState, useCallback, useRef } from "react";
import { Listbox } from "@headlessui/react";
import { format } from "date-fns";
import { Plus, X, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { toast } from "react-hot-toast";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import { useLocation } from "react-router-dom";

const CrearOrdenFabricacion = () => {
  const location = useLocation();
  const { id: idEditar } = useParams();
  const modoEdicion = !!idEditar;
  const idPedidoSeleccionado = location.state?.idPedidoSeleccionado || null;
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const [cargandoEdicion, setCargandoEdicion] = useState(false);
  const [ordenesPedido, setOrdenesPedido] = useState([]);
  const [ordenPedido, setOrdenPedido] = useState(null);

  // Calcular fecha actual y fecha +1 mes
  const obtenerFechaActual = () => format(new Date(), "yyyy-MM-dd");
  const obtenerFechaMasMes = (fechaBase) => {
    const fecha = new Date(fechaBase);
    fecha.setMonth(fecha.getMonth() + 1);
    return format(fecha, "yyyy-MM-dd");
  };

  const [fechaInicio, setFechaInicio] = useState(obtenerFechaActual());
  const [fechaFinEstimada, setFechaFinEstimada] = useState(
    obtenerFechaMasMes(new Date()),
  );
  const [estado, setEstado] = useState("pendiente");
  const [articulos, setArticulos] = useState([]);
  const [articulosOptions, setArticulosOptions] = useState([]);
  const [etapasProduccion, setEtapasProduccion] = useState([]);
  const [idEtapaDefault, setIdEtapaDefault] = useState(null);
  const [hayArticuloCompuesto, setHayArticuloCompuesto] = useState(false);
  const [detalles, setDetalles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Para AsyncSelect
  const cacheRef = useRef({});
  const timerRef = useRef(null);

  // Función para cargar artículos con búsqueda REMOTA (solo fabricables)
  const loadArticulosOptions = useCallback(
    (inputValue, callback) => {
      const cacheKey = inputValue?.toLowerCase() || "";

      // Si ya está en caché, retornar inmediatamente
      if (cacheRef.current[cacheKey]) {
        callback(cacheRef.current[cacheKey]);
        return;
      }

      // Limpiar el timer anterior
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Debounce: esperar 300ms
      timerRef.current = setTimeout(async () => {
        try {
          const res = await api.get("/articulos", {
            params: {
              buscar: inputValue || "",
              tipo_categoria: "articulo_fabricable",
              page: 1,
              pageSize: 20,
              sortBy: "descripcion",
              sortDir: "asc",
            },
          });
          const rows = Array.isArray(res.data?.data) ? res.data.data : [];
          const opciones = rows.map((art) => ({
            value: art.id_articulo,
            label: `${art.descripcion} (Ref: ${art.referencia || "N/A"})`,
            referencia: art.referencia,
            descripcion: art.descripcion,
            ...art,
          }));
          // Guardar en caché
          cacheRef.current[cacheKey] = opciones;
          callback(opciones);
        } catch (error) {
          console.error("Error buscando artículos:", error);
          callback([]);
        }
      }, 300);
    },
    [],
  );

  useEffect(() => {
    if (etapasProduccion.length > 0) {
      const tapizado = etapasProduccion.find(
        (e) => e.nombre.toLowerCase() === "tapizado",
      );
      if (tapizado) {
        setIdEtapaDefault(tapizado.id_etapa);

        setDetalles([
          {
            id: Date.now(),
            articulo: null,
            cantidad: 1,
            descripcion: "",
            id_etapa_final: tapizado.id_etapa,
          },
        ]);
      }
    }
  }, [etapasProduccion]);

  useEffect(() => {
    const fetchOrdenesPedido = async () => {
      try {
        const res = await api.get("/pedidos");
        const payload = res.data || {};
        const rows = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setOrdenesPedido(rows);

        if (idPedidoSeleccionado) {
          const seleccionada = rows.find(
            (p) => p.id_pedido === idPedidoSeleccionado,
          );
          if (seleccionada) {
            setOrdenPedido(seleccionada);
          }
        }
      } catch (error) {
        toast.error("Error al cargar órdenes de pedido");
      }
    };

    const fetchArticulos = async () => {
      try {
        // Cargar solo las primeras 20 sugerencias (búsqueda remota al escribir)
        const res = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            tipo_categoria: "articulo_fabricable",
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const payload = res.data || {};
        const rows = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

        setArticulos(rows);

        // Crear opciones para AsyncSelect
        const opciones = rows.map((art) => ({
          value: art.id_articulo,
          label: `${art.descripcion} (Ref: ${art.referencia || "N/A"})`,
          referencia: art.referencia,
          descripcion: art.descripcion,
          ...art,
        }));
        setArticulosOptions(opciones);
        cacheRef.current[""] = opciones;
      } catch (error) {
        console.error("Error al cargar artículos:", error);
        toast.error("Error al cargar artículos");
      }
    };

    const fetchEtapas = async () => {
      try {
        const res = await api.get("/etapas-produccion");
        const payload = res.data || {};
        const rows = Array.isArray(payload.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
        setEtapasProduccion(rows);
      } catch (error) {
        toast.error("Error al cargar etapas de producción");
      }
    };

    fetchOrdenesPedido();
    fetchArticulos();
    fetchEtapas();
  }, []);

  useEffect(() => {
    const cargarArticulosDelPedido = async () => {
      try {
        const res = await api.get(
          `/detalle-orden-pedido/${idPedidoSeleccionado}`,
        );
        const detallesPedido = res.data || [];

        // manejar artículos compuestos y no compuestos
        const nuevosDetallesPromises = detallesPedido.map(async (item) => {
          let articuloOriginal = articulos.find(
            (a) => a.id_articulo === item.id_articulo,
          );

          // Si no está en la lista cargada (búsqueda remota), buscarlo por id
          if (!articuloOriginal) {
            try {
              const resArt = await api.get(`/articulos/${item.id_articulo}`);
              articuloOriginal = resArt.data;
            } catch (e) {
              articuloOriginal = null;
            }
          }

          // Si el artículo es compuesto, hace una llamada para obtener sus componentes
          if (articuloOriginal?.es_compuesto) {
            const componentesRes = await api.get(
              `/articulos/componentes/${articuloOriginal.id_articulo}?cantidad_padre=${item.cantidad}`,
            );
            return componentesRes.data.map((comp) => ({
              id: Date.now() + Math.random(),
              articulo: comp,
              cantidad: comp.cantidad,
              descripcion: `Componente para: ${articuloOriginal.descripcion}`,
              id_etapa_final: idEtapaDefault || "",
            }));
          } else {
            // Si no es compuesto, devolvemos el artículo original
            return [
              {
                id: Date.now() + Math.random(),
                articulo: articuloOriginal || {
                  id_articulo: item.id_articulo,
                  descripcion: item.descripcion,
                },
                cantidad: item.cantidad,
                descripcion: "",
                id_etapa_final: idEtapaDefault || "",
              },
            ];
          }
        });

        const nuevosDetallesArray = await Promise.all(nuevosDetallesPromises);
        setDetalles(nuevosDetallesArray.flat());
      } catch (error) {
        toast.error("Error al cargar los artículos del pedido");
        console.error(error);
      }
    };

    if (idPedidoSeleccionado && articulos.length > 0) {
      cargarArticulosDelPedido();
    }
  }, [idPedidoSeleccionado, articulos, idEtapaDefault]);

  // Cargar datos de la orden en modo edición
  useEffect(() => {
    if (
      !modoEdicion ||
      articulosOptions.length === 0 ||
      etapasProduccion.length === 0
    )
      return;

    const cargarOrden = async () => {
      setCargandoEdicion(true);
      try {
        const res = await api.get(`/ordenes-fabricacion/${idEditar}`);
        const orden = res.data;

        setFechaInicio(
          orden.fecha_inicio
            ? String(orden.fecha_inicio).substring(0, 10)
            : obtenerFechaActual(),
        );
        setFechaFinEstimada(
          orden.fecha_fin_estimada
            ? String(orden.fecha_fin_estimada).substring(0, 10)
            : "",
        );
        setEstado(orden.estado || "pendiente");

        // Buscar la orden de pedido asociada
        if (orden.id_pedido) {
          const pedido = ordenesPedido.find(
            (p) => p.id_pedido === orden.id_pedido,
          );
          if (pedido) setOrdenPedido(pedido);
        }

        // Mapear detalles
        if (orden.detalles && orden.detalles.length > 0) {
          const detallesMapeados = orden.detalles.map((d) => {
            const artOption = articulosOptions.find(
              (a) => a.value === d.id_articulo,
            );
            const tieneEtapasPersonalizadas =
              d.etapas_personalizadas && d.etapas_personalizadas.length > 0;

            const etapasPersonalizadas = {};
            if (tieneEtapasPersonalizadas) {
              d.etapas_personalizadas.forEach((ep) => {
                etapasPersonalizadas[ep.id_etapa] = {
                  orden: ep.orden,
                  activa: true,
                };
              });
            }

            return {
              id: d.id_detalle_fabricacion || Date.now() + Math.random(),
              articulo: artOption || {
                id_articulo: d.id_articulo,
                descripcion: d.descripcion || "Artículo",
              },
              cantidad: d.cantidad,
              descripcion: "",
              id_etapa_final: d.id_etapa_final || "",
              personalizarFlujo: tieneEtapasPersonalizadas,
              etapasPersonalizadas: tieneEtapasPersonalizadas
                ? etapasPersonalizadas
                : {},
              mostrarConfigEtapas: false,
            };
          });
          setDetalles(detallesMapeados);
        }
      } catch (error) {
        toast.error("Error al cargar la orden para edición");
        console.error(error);
      } finally {
        setCargandoEdicion(false);
      }
    };

    cargarOrden();
  }, [
    modoEdicion,
    idEditar,
    articulosOptions,
    etapasProduccion,
    ordenesPedido,
  ]);

  const handleDetalleChange = (index, campo, valor) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index][campo] = campo === "cantidad" ? Number(valor) : valor;

    if (campo === "articulo") {
      const esCompuesto = valor?.es_compuesto === 1;
      nuevosDetalles[index].mensajeError = esCompuesto
        ? "Este artículo es compuesto. No se puede fabricar manualmente."
        : null;
    }

    setDetalles(nuevosDetalles);
    const tieneCompuesto = nuevosDetalles.some(
      (d) => d.articulo?.es_compuesto === 1,
    );
    setHayArticuloCompuesto(tieneCompuesto);
  };

  const handleRemoveDetalle = (index) => {
    setDetalles((prevDetalles) => prevDetalles.filter((_, i) => i !== index));
  };

  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      {
        id: Date.now(),
        articulo: null,
        cantidad: 1,
        descripcion: "",
        id_etapa_final: idEtapaDefault || "",
        personalizarFlujo: false,
        etapasPersonalizadas: {},
        mostrarConfigEtapas: false,
      },
    ]);
  };

  // Toggle para personalizar flujo de etapas
  const togglePersonalizarFlujo = (index) => {
    const nuevosDetalles = [...detalles];
    const activando = !nuevosDetalles[index].personalizarFlujo;
    nuevosDetalles[index].personalizarFlujo = activando;

    // Si se activa, inicializar con todas las etapas hasta la etapa final Y mostrar el panel
    if (activando) {
      nuevosDetalles[index].mostrarConfigEtapas = true; // Auto-expandir el panel

      if (
        Object.keys(nuevosDetalles[index].etapasPersonalizadas || {}).length ===
        0
      ) {
        const etapaFinalOrden =
          etapasProduccion.find(
            (e) =>
              e.id_etapa === parseInt(nuevosDetalles[index].id_etapa_final),
          )?.orden || 999;
        const etapasIniciales = {};
        etapasProduccion
          .filter((e) => e.orden <= etapaFinalOrden)
          .forEach((e, idx) => {
            etapasIniciales[e.id_etapa] = { orden: idx + 1, activa: true };
          });
        nuevosDetalles[index].etapasPersonalizadas = etapasIniciales;
      }
    }

    setDetalles(nuevosDetalles);
  };

  // Toggle etapa individual
  const toggleEtapaPersonalizada = (detalleIndex, idEtapa) => {
    const nuevosDetalles = [...detalles];
    const etapas = nuevosDetalles[detalleIndex].etapasPersonalizadas || {};

    if (etapas[idEtapa]?.activa) {
      etapas[idEtapa] = { ...etapas[idEtapa], activa: false };
    } else {
      const ordenesActivos = Object.values(etapas)
        .filter((e) => e.activa)
        .map((e) => e.orden);
      const siguienteOrden =
        ordenesActivos.length > 0 ? Math.max(...ordenesActivos) + 1 : 1;
      etapas[idEtapa] = { orden: siguienteOrden, activa: true };
    }

    nuevosDetalles[detalleIndex].etapasPersonalizadas = { ...etapas };
    setDetalles(nuevosDetalles);
  };

  // Cambiar orden de etapa
  const cambiarOrdenEtapa = (detalleIndex, idEtapa, nuevoOrden) => {
    const nuevosDetalles = [...detalles];
    const etapas = nuevosDetalles[detalleIndex].etapasPersonalizadas || {};
    if (etapas[idEtapa]) {
      etapas[idEtapa] = {
        ...etapas[idEtapa],
        orden: parseInt(nuevoOrden) || 1,
      };
    }
    nuevosDetalles[detalleIndex].etapasPersonalizadas = { ...etapas };
    setDetalles(nuevosDetalles);
  };

  // Obtener flujo visual de etapas
  const obtenerFlujoEtapas = (detalleIndex) => {
    const detalle = detalles[detalleIndex];
    if (!detalle.personalizarFlujo || !detalle.etapasPersonalizadas) return [];

    return Object.entries(detalle.etapasPersonalizadas)
      .filter(([_, data]) => data.activa)
      .sort((a, b) => a[1].orden - b[1].orden)
      .map(([idEtapa, data]) => ({
        id_etapa: parseInt(idEtapa),
        nombre:
          etapasProduccion.find((e) => e.id_etapa === parseInt(idEtapa))
            ?.nombre || "Desconocida",
        orden: data.orden,
      }));
  };

  const validarFormulario = () => {
    if (!ordenesPedido) {
      toast.error("Selecciona una orden de pedido");
      return false;
    }
    if (!fechaInicio) {
      toast.error("Selecciona la fecha de inicio");
      return false;
    }
    if (detalles.some((d) => !d.articulo || d.cantidad <= 0)) {
      toast.error("Completa correctamente todos los detalles");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    if (submitting) return;

    setSubmitting(true);
    try {
      const payload = {
        orden: {
          id_pedido: ordenPedido?.id_pedido,
          fecha_inicio: fechaInicio,
          fecha_fin_estimada: fechaFinEstimada || null,
          estado,
        },
        detalles: detalles.map((d) => {
          const detalle = {
            id_articulo: d.articulo.id_articulo,
            cantidad: d.cantidad,
            descripcion: d.descripcion || "Sin descripción",
            id_etapa_final: parseInt(d.id_etapa_final),
          };

          // Si tiene flujo personalizado, incluir las etapas
          if (d.personalizarFlujo && d.etapasPersonalizadas) {
            const etapasActivas = Object.entries(d.etapasPersonalizadas)
              .filter(([_, data]) => data.activa)
              .map(([idEtapa, data]) => ({
                id_etapa: parseInt(idEtapa),
                orden: data.orden,
              }))
              .sort((a, b) => a.orden - b.orden);

            if (etapasActivas.length > 0) {
              detalle.etapas_personalizadas = etapasActivas;
              // La etapa final es la última del flujo personalizado
              detalle.id_etapa_final =
                etapasActivas[etapasActivas.length - 1].id_etapa;
            }
          }

          return detalle;
        }),
      };

      if (modoEdicion) {
        await api.put(`/ordenes-fabricacion/${idEditar}`, payload, { headers: { "X-Idempotency-Key": idempotencyKey } });
        toast.success("Orden de fabricación actualizada");
      } else {
        await api.post("/ordenes-fabricacion", payload, { headers: { "X-Idempotency-Key": idempotencyKey } });
        toast.success("Orden de fabricación creada");
      }
      navigate("/ordenes_fabricacion");
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    } finally {
      setSubmitting(false);
    }
  };

  if (cargandoEdicion) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Cargando orden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/ordenes_fabricacion")}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={17} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Órdenes de Fabricación
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                {modoEdicion
                  ? `Editar orden #${idEditar}`
                  : "Nueva orden de fabricación"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/ordenes_fabricacion")}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="fabricacion-form"
              disabled={hayArticuloCompuesto || submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
            >
              {submitting
                ? modoEdicion
                  ? "Guardando..."
                  : "Creando..."
                : modoEdicion
                  ? "Guardar cambios"
                  : "Crear orden"}
            </button>
          </div>
        </div>

        <form
          id="fabricacion-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Información general */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Información general
            </h2>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-600 mb-2">
                Orden de pedido
              </label>
              <Listbox value={ordenPedido} onChange={setOrdenPedido}>
                <div className="relative">
                  <Listbox.Button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition">
                    {ordenPedido ? (
                      `#${ordenPedido.id_pedido} - ${ordenPedido.cliente_nombre || "Sin cliente"} - ${format(new Date(ordenPedido.fecha_pedido), "dd/MM/yyyy")}`
                    ) : (
                      <span className="text-slate-400">
                        Selecciona una orden de pedido
                      </span>
                    )}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {ordenesPedido.map((op) => (
                      <Listbox.Option
                        key={op.id_pedido}
                        value={op}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2.5 text-sm ${active ? "bg-slate-50" : ""}`
                        }
                      >
                        {`#${op.id_pedido} - ${op.cliente_nombre || "Sin cliente"} - ${format(new Date(op.fecha_pedido), "dd/MM/yyyy")}`}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Fecha de inicio <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Fecha fin estimada
                </label>
                <input
                  type="date"
                  value={fechaFinEstimada}
                  onChange={(e) => setFechaFinEstimada(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Estado
                </label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
          </div>

          {/* Detalles */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detalles de la orden
              </h2>
              <button
                type="button"
                onClick={agregarDetalle}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={15} />
                Agregar artículo
              </button>
            </div>

            <div className="flex flex-col gap-4">
              {detalles.map((detalle, index) => (
                <div
                  key={detalle.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-5"
                >
                  <div className="grid grid-cols-6 md:grid-cols-6 gap-4 items-end">
                    <div className="col-span-2">
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Artículo <span className="text-red-400">*</span>
                      </label>
                      <AsyncSelect
                        cacheOptions
                        loadOptions={loadArticulosOptions}
                        defaultOptions={articulosOptions}
                        value={
                          articulosOptions.find(
                            (opt) =>
                              opt.value === detalle.articulo?.id_articulo,
                          ) || null
                        }
                        onChange={(option) => {
                          const articuloSeleccionado = option
                            ? articulos.find(
                                (a) => a.id_articulo === option.value,
                              )
                            : null;
                          handleDetalleChange(
                            index,
                            "articulo",
                            articuloSeleccionado,
                          );
                        }}
                        placeholder="Busca o selecciona..."
                        isClearable
                        styles={{
                          control: (base) => ({
                            ...base,
                            borderColor: "#e2e8f0",
                            borderRadius: "0.75rem",
                            boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                            minHeight: "46px",
                            "&:hover": { borderColor: "#94a3b8" },
                          }),
                          menuList: (base) => ({ ...base, maxHeight: "250px" }),
                        }}
                        noOptionsMessage={() => "No se encontraron artículos"}
                        loadingMessage={() => "Cargando..."}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Cantidad <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={detalle.cantidad}
                        onChange={(e) =>
                          handleDetalleChange(index, "cantidad", e.target.value)
                        }
                        required
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-2">
                        Etapa final
                        {detalle.personalizarFlujo && (
                          <span className="text-xs text-amber-600 ml-1">
                            (flujo pers.)
                          </span>
                        )}
                      </label>
                      <select
                        value={detalle.id_etapa_final || ""}
                        onChange={(e) =>
                          handleDetalleChange(
                            index,
                            "id_etapa_final",
                            e.target.value,
                          )
                        }
                        disabled={detalle.personalizarFlujo}
                        className={`w-full rounded-xl border px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition ${
                          detalle.personalizarFlujo
                            ? "border-amber-200 bg-amber-50 text-slate-400 cursor-not-allowed line-through"
                            : "border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <option value="">Seleccionar etapa</option>
                        {etapasProduccion.map((etapa) => (
                          <option key={etapa.id_etapa} value={etapa.id_etapa}>
                            {etapa.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-semibold text-slate-600 mb-2">
                          Observaciones
                        </label>
                        <input
                          type="text"
                          value={detalle.descripcion}
                          onChange={(e) =>
                            handleDetalleChange(
                              index,
                              "descripcion",
                              e.target.value,
                            )
                          }
                          placeholder="Opcional"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDetalle(index)}
                          className="mb-0.5 p-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer border border-slate-200 bg-white shadow-sm"
                          title="Eliminar artículo"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Personalizar flujo */}
                  <div className="mt-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={detalle.personalizarFlujo || false}
                        onClick={() => togglePersonalizarFlujo(index)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                          detalle.personalizarFlujo
                            ? "bg-amber-500"
                            : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                            detalle.personalizarFlujo
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span
                        className="text-sm font-medium text-slate-600 flex items-center gap-1.5 cursor-pointer select-none"
                        onClick={() => togglePersonalizarFlujo(index)}
                      >
                        <Settings size={14} className="text-slate-400" />
                        Personalizar flujo de etapas
                      </span>
                      {detalle.personalizarFlujo && (
                        <button
                          type="button"
                          onClick={() => {
                            const nuevosDetalles = [...detalles];
                            nuevosDetalles[index].mostrarConfigEtapas =
                              !nuevosDetalles[index].mostrarConfigEtapas;
                            setDetalles(nuevosDetalles);
                          }}
                          className="ml-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {detalle.mostrarConfigEtapas ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      )}
                    </div>

                    {detalle.personalizarFlujo &&
                      detalle.mostrarConfigEtapas && (
                        <div className="mt-3 p-4 bg-white rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Selecciona las etapas y su orden
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {etapasProduccion.map((etapa) => {
                              const etapaConfig =
                                detalle.etapasPersonalizadas?.[etapa.id_etapa];
                              const isActiva = etapaConfig?.activa || false;
                              return (
                                <div
                                  key={etapa.id_etapa}
                                  className={`p-3 rounded-xl border-2 transition-all ${
                                    isActiva
                                      ? "border-slate-400 bg-slate-50 shadow-sm"
                                      : "border-slate-100 bg-white"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="checkbox"
                                      checked={isActiva}
                                      onChange={() =>
                                        toggleEtapaPersonalizada(
                                          index,
                                          etapa.id_etapa,
                                        )
                                      }
                                      className="w-4 h-4 text-slate-600 rounded border-slate-300 focus:ring-slate-400"
                                    />
                                    <span
                                      className={`text-xs font-semibold ${isActiva ? "text-slate-700" : "text-slate-400"}`}
                                    >
                                      {etapa.nombre}
                                    </span>
                                  </div>
                                  {isActiva && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-slate-400">
                                        Orden:
                                      </span>
                                      <input
                                        type="number"
                                        min={1}
                                        value={etapaConfig?.orden || 1}
                                        onChange={(e) =>
                                          cambiarOrdenEtapa(
                                            index,
                                            etapa.id_etapa,
                                            e.target.value,
                                          )
                                        }
                                        className="w-12 text-center border border-slate-200 rounded-lg px-1 py-0.5 text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                    {detalle.personalizarFlujo &&
                      obtenerFlujoEtapas(index).length > 0 && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Flujo de producción
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            {obtenerFlujoEtapas(index).map(
                              (etapa, idx, arr) => (
                                <div
                                  key={etapa.id_etapa}
                                  className="flex items-center gap-2"
                                >
                                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 shadow-sm">
                                    {idx + 1}. {etapa.nombre}
                                  </span>
                                  {idx < arr.length - 1 && (
                                    <span className="text-slate-300 font-bold">
                                      →
                                    </span>
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  {detalle.mensajeError && (
                    <div className="mt-3 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl">
                      {detalle.mensajeError}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearOrdenFabricacion;
