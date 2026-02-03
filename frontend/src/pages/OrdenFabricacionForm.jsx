import { useEffect, useState, useCallback, useRef } from "react";
import { Listbox } from "@headlessui/react";
import { format } from "date-fns";
import { Plus, X, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import { useLocation } from "react-router-dom";

const CrearOrdenFabricacion = () => {
  const location = useLocation();
  const idPedidoSeleccionado = location.state?.idPedidoSeleccionado || null;
  const navigate = useNavigate();
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

  // Para AsyncSelect
  const cacheRef = useRef({});
  const timerRef = useRef(null);

  // Función para cargar artículos con búsqueda
  const loadArticulosOptions = useCallback(
    (inputValue, callback) => {
      const cacheKey = inputValue?.toLowerCase() || "";

      // Si no hay búsqueda, retornar todos los artículos
      if (!inputValue || inputValue.trim() === "") {
        callback(articulosOptions);
        return;
      }

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
      timerRef.current = setTimeout(() => {
        // Filtrar localmente
        const filtered = articulosOptions.filter(
          (art) =>
            art.label.toLowerCase().includes(inputValue.toLowerCase()) ||
            art.referencia?.toLowerCase().includes(inputValue.toLowerCase()) ||
            art.descripcion?.toLowerCase().includes(inputValue.toLowerCase()),
        );

        // Guardar en caché
        cacheRef.current[cacheKey] = filtered;
        callback(filtered);
      }, 300);
    },
    [articulosOptions],
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
        // Primera llamada para saber cuántos artículos hay en total
        const resInicial = await api.get("/articulos", {
          params: { page: 1, pageSize: 1 },
        });
        const total = resInicial.data.total || 0;

        // Ahora obtener TODOS los artículos en una sola llamada
        const res = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: total || 10000,
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

        // Obtener categorías para filtrar solo artículos fabricables
        const resCategorias = await api.get("/categorias");
        const categorias = Array.isArray(resCategorias.data)
          ? resCategorias.data
          : [];
        const categoriasMap = {};
        categorias.forEach((cat) => {
          categoriasMap[cat.id_categoria] = cat.tipo;
        });

        // Filtrar solo artículos fabricables
        const articulosFabricables = rows.filter(
          (art) => categoriasMap[art.id_categoria] === "articulo_fabricable",
        );

        setArticulos(articulosFabricables);

        // Crear opciones para AsyncSelect
        const opciones = articulosFabricables.map((art) => ({
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
          const articuloOriginal = articulos.find(
            (a) => a.id_articulo === item.id_articulo,
          );

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

      await api.post("/ordenes-fabricacion", payload);

      toast.success("Orden de fabricación creada");
      navigate("/ordenes_fabricacion");
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    }
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nueva orden de fabricación
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Orden de pedido <span className="text-red-500">*</span>
            </label>
            <Listbox value={ordenPedido} onChange={setOrdenPedido}>
              <div className="relative">
                <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                  {ordenPedido
                    ? `#${ordenPedido.id_pedido} - ${
                        ordenPedido.cliente_nombre || "Sin cliente"
                      } - ${format(
                        new Date(ordenPedido.fecha_pedido),
                        "dd/MM/yyyy",
                      )}`
                    : "Selecciona una orden"}
                </Listbox.Button>

                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {ordenesPedido.map((op) => (
                    <Listbox.Option
                      key={op.id_pedido}
                      value={op}
                      className={({ active }) =>
                        `cursor-pointer select-none px-4 py-2 ${
                          active ? "bg-slate-100" : ""
                        }`
                      }
                    >
                      {`#${op.id_pedido} - ${
                        op.cliente_nombre || "Sin cliente"
                      } - ${format(new Date(op.fecha_pedido), "dd/MM/yyyy")}`}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Fechas y estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha Fin Estimada
              </label>
              <input
                type="date"
                value={fechaFinEstimada}
                onChange={(e) => setFechaFinEstimada(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              >
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Detalles */}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Detalles de la orden</h3>
              <button
                type="button"
                onClick={agregarDetalle}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 cursor-pointer"
              >
                <Plus size={18} />
                Agregar detalle
              </button>
            </div>

            {detalles.map((detalle, index) => (
              <div
                key={detalle.id}
                className="grid grid-cols-6 md:grid-cols-6 gap-4 mb-4 items-end relative"
              >
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Artículo <span className="text-red-500">*</span>
                  </label>
                  <AsyncSelect
                    cacheOptions
                    loadOptions={loadArticulosOptions}
                    defaultOptions={articulosOptions}
                    value={
                      articulosOptions.find(
                        (opt) => opt.value === detalle.articulo?.id_articulo,
                      ) || null
                    }
                    onChange={(option) => {
                      const articuloSeleccionado = option
                        ? articulos.find((a) => a.id_articulo === option.value)
                        : null;
                      handleDetalleChange(
                        index,
                        "articulo",
                        articuloSeleccionado,
                      );
                    }}
                    placeholder="Busca o selecciona un artículo..."
                    isClearable
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#d1d5db",
                        boxShadow: "none",
                        "&:hover": { borderColor: "#64748b" },
                        borderRadius: "0.375rem",
                        minHeight: "42px",
                      }),
                      menuList: (base) => ({
                        ...base,
                        maxHeight: "250px",
                      }),
                    }}
                    noOptionsMessage={() => "No se encontraron artículos"}
                    loadingMessage={() => "Cargando artículos..."}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={detalle.cantidad}
                    onChange={(e) =>
                      handleDetalleChange(index, "cantidad", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Etapa final
                    {detalle.personalizarFlujo && (
                      <span className="text-xs text-amber-600 ml-2">
                        (usando flujo personalizado)
                      </span>
                    )}
                  </label>
                  <select
                    className={`w-full border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 ${
                      detalle.personalizarFlujo
                        ? "border-amber-300 bg-amber-50 text-gray-500 line-through cursor-not-allowed"
                        : "border-gray-300"
                    }`}
                    value={detalle.id_etapa_final || ""}
                    onChange={(e) =>
                      handleDetalleChange(
                        index,
                        "id_etapa_final",
                        e.target.value,
                      )
                    }
                    disabled={detalle.personalizarFlujo}
                    title={
                      detalle.personalizarFlujo
                        ? "El flujo se define en la configuración personalizada"
                        : ""
                    }
                  >
                    <option value="">Seleccionar etapa final</option>
                    {etapasProduccion.map((etapa) => (
                      <option key={etapa.id_etapa} value={etapa.id_etapa}>
                        {etapa.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    value={detalle.descripcion}
                    onChange={(e) =>
                      handleDetalleChange(index, "descripcion", e.target.value)
                    }
                    placeholder="Opcional"
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                {/* Configuración de flujo de etapas */}
                <div className="col-span-6 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`personalizar-flujo-${index}`}
                      checked={detalle.personalizarFlujo || false}
                      onChange={() => togglePersonalizarFlujo(index)}
                      className="w-4 h-4 text-slate-600 rounded border-gray-300 focus:ring-slate-500"
                    />
                    <label
                      htmlFor={`personalizar-flujo-${index}`}
                      className="text-sm font-medium text-gray-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Settings size={16} className="text-slate-500" />
                      Personalizar flujo de etapas
                    </label>
                    {detalle.personalizarFlujo && (
                      <button
                        type="button"
                        onClick={() => {
                          const nuevosDetalles = [...detalles];
                          nuevosDetalles[index].mostrarConfigEtapas =
                            !nuevosDetalles[index].mostrarConfigEtapas;
                          setDetalles(nuevosDetalles);
                        }}
                        className="ml-2 text-slate-500 hover:text-slate-700"
                      >
                        {detalle.mostrarConfigEtapas ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Panel de configuración expandible */}
                  {detalle.personalizarFlujo && detalle.mostrarConfigEtapas && (
                    <div className="mt-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-gray-600 mb-3">
                        Selecciona las etapas que aplican para este artículo y
                        asigna el orden:
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {etapasProduccion.map((etapa) => {
                          const etapaConfig =
                            detalle.etapasPersonalizadas?.[etapa.id_etapa];
                          const isActiva = etapaConfig?.activa || false;
                          return (
                            <div
                              key={etapa.id_etapa}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                isActiva
                                  ? "border-slate-500 bg-white shadow-sm"
                                  : "border-gray-200 bg-gray-50"
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
                                  className="w-4 h-4 text-slate-600 rounded"
                                />
                                <span
                                  className={`text-sm font-medium ${isActiva ? "text-slate-700" : "text-gray-400"}`}
                                >
                                  {etapa.nombre}
                                </span>
                              </div>
                              {isActiva && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">
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
                                    className="w-14 text-center border border-gray-300 rounded px-2 py-1 text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Previsualización del flujo */}
                  {detalle.personalizarFlujo &&
                    obtenerFlujoEtapas(index).length > 0 && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-slate-100 to-slate-50 rounded-lg border border-slate-200">
                        <p className="text-xs text-gray-500 mb-2 font-medium">
                          Flujo de producción:
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {obtenerFlujoEtapas(index).map((etapa, idx, arr) => (
                            <div
                              key={etapa.id_etapa}
                              className="flex items-center gap-2"
                            >
                              <span className="px-3 py-1.5 bg-white border border-slate-300 rounded-full text-sm font-medium text-slate-700 shadow-sm">
                                {idx + 1}. {etapa.nombre}
                              </span>
                              {idx < arr.length - 1 && (
                                <span className="text-slate-400 font-bold">
                                  →
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                {detalle.mensajeError && (
                  <div
                    className="col-span-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
                    role="alert"
                  >
                    <span className="block sm:inline">
                      {detalle.mensajeError}
                    </span>
                  </div>
                )}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDetalle(index)}
                    className="absolute top-0 right-0 mt-0 mr-0 text-red-500 hover:text-red-900 cursor-pointer"
                  >
                    <X size={25} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Botón submit */}
          <div className="pt-4 border-t flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate("/ordenes_fabricacion")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={hayArticuloCompuesto}
              className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Crear orden de fabricación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearOrdenFabricacion;
