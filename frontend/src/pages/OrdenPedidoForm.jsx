import React, { useEffect, useState, useCallback, useRef } from "react";
import { Listbox } from "@headlessui/react";
import { FiArrowLeft } from "react-icons/fi";
import { X, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import AsyncSelect from "react-select/async";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const formatCOP = (number) => {
  if (!number) return "0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const cleanCOPFormat = (formattedValue) => {
  return parseInt(formattedValue.replace(/[^0-9]/g, ""), 10) || 0;
};

const OrdenPedidoForm = () => {
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const idempotencyKeyInicializar = useIdempotencyKey();
  const idempotencyKeyArticulo = useIdempotencyKey();
  const [clientes, setClientes] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [mostrarFormularioArticulo, setMostrarFormularioArticulo] =
    useState(false);
  const [nuevoArticulo, setNuevoArticulo] = useState({
    referencia: "",
    descripcion: "",
    precio_venta: 0,
    id_categoria: "",
  });
  const [loading, setLoading] = useState(false);
  const [editandoPrecio, setEditandoPrecio] = useState({});

  // Estado para almacenar el mapa de categorías por tipo
  const [categoriasMap, setCategoriasMap] = useState({});
  const [articulosOptions, setArticulosOptions] = useState([]);

  // Caché para almacenar resultados de búsqueda
  const cacheRef = useRef({});
  const timerRef = useRef(null);

  // Cargar las primeras 20 sugerencias de artículos fabricables al inicio
  useEffect(() => {
    const cargarArticulos = async () => {
      try {
        const response = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            tipo_categoria: "articulo_fabricable",
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const articulosData = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        const opciones = articulosData.map((art) => ({
          value: art.id_articulo,
          label: `${art.descripcion} (Ref: ${art.referencia})`,
          referencia: art.referencia,
          descripcion: art.descripcion,
          ...art,
        }));

        setArticulosOptions(opciones);
        cacheRef.current[""] = opciones;
      } catch (error) {
        console.error("Error al cargar artículos:", error);
        toast.error("Error al cargar lista de artículos");
      }
    };
    cargarArticulos();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resClientes, resCategorias] = await Promise.all([
          api.get("/clientes"),
          api.get("/categorias"),
        ]);
        setClientes(resClientes.data || []);
        const categoriasData = resCategorias.data || [];
        setCategorias(categoriasData);

        // Crear mapa de categorías por tipo
        const map = {};
        categoriasData.forEach((cat) => {
          map[cat.id_categoria] = cat.tipo;
        });
        setCategoriasMap(map);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        toast.error("Error al cargar datos iniciales (clientes, categorías)");
      } finally {
        setLoading(false); // Desactivar carga al finalizar
      }
    };
    fetchData();
  }, []);

  // Función para cargar artículos dinámicamente con debounce y caché
  // Búsqueda REMOTA: consulta al backend por cada término (solo fabricables)
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

      // Debounce: esperar 300ms después de que el usuario deje de escribir
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
            label: `${art.descripcion} (Ref: ${art.referencia})`,
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

  const agregarArticulo = async (articulo) => {
    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.id_articulo,
    );
    if (yaExiste) {
      toast.error("Este artículo ya ha sido añadido al pedido.");
      return;
    }

    const puedeAgregar = await verificarYAgregarAlInventario(
      articulo.id_articulo,
      articulo.descripcion,
    );

    if (!puedeAgregar) {
      // Si el usuario canceló la inicialización o hubo un error
      setArticuloSeleccionado(null); // Limpiar la selección en el Select
      return;
    }

    setArticulosSeleccionados((prev) => [
      ...prev,
      {
        ...articulo,
        cantidad: 1,
        precio_unitario: articulo.precio_venta || 0,
      },
    ]);
    setArticuloSeleccionado(null); // Limpiar la selección después de agregar
  };

  const eliminarArticulo = (id_articulo) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id_articulo !== id_articulo),
    );
  };

  const cambiarCantidad = (id_articulo, cantidad) => {
    const numCantidad = parseInt(cantidad, 10);
    if (isNaN(numCantidad) || numCantidad < 1) {
      toast.error("La cantidad debe ser un número positivo.");
      return;
    }
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, cantidad: numCantidad } : a,
      ),
    );
  };

  const validarFormulario = () => {
    if (!cliente) {
      toast.error("Selecciona un cliente");
      return false;
    }
    if (articulosSeleccionados.length === 0) {
      toast.error("Agrega al menos un artículo");
      return false;
    }
    if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
      toast.error("Las cantidades deben ser mayores a cero");
      return false;
    }
    return true;
  };

  const verificarYAgregarAlInventario = async (
    idArticulo,
    descripcionArticulo,
  ) => {
    setLoading(true); // Activar carga al verificar inventario
    try {
      await api.get(`/inventario/${idArticulo}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        let seAceptoAgregar = false;
        await new Promise((resolve) => {
          confirmAlert({
            title: "Artículo no encontrado en Inventario",
            message: `El artículo "${descripcionArticulo}" (ID: ${idArticulo}) no está inicializado en el inventario. ¿Desea agregarlo con stock 0 para continuar?`,
            buttons: [
              {
                label: "Sí",
                onClick: async () => {
                  try {
                    await api.post("/inventario/inicializar", {
                      id_articulo: Number(idArticulo),
                    }, { headers: { "X-Idempotency-Key": idempotencyKeyInicializar } });
                    toast.success(
                      "Artículo agregado al inventario con stock 0",
                    );
                    seAceptoAgregar = true;
                  } catch (err) {
                    toast.error(
                      "Error al agregar al inventario: " +
                        (err.response?.data?.message || err.message),
                    );
                  }
                  resolve();
                },
              },
              {
                label: "No",
                onClick: () => {
                  toast.error(
                    "Operación cancelada. El artículo no fue inicializado.",
                  );
                  resolve();
                },
              },
            ],
            closeOnEscape: false, // Evitar que se cierre sin una elección
            closeOnClickOutside: false,
          });
        });
        return seAceptoAgregar;
      } else {
        toast.error(
          "Error al verificar el inventario: " +
            (error.response?.data?.message || error.message),
        );
        return false;
      }
    } finally {
      setLoading(false); // Desactivar carga después de la verificación/inicialización
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    // Asegurar que si hay un precio en edición, se tome ese valor
    const detallesConPrecios = articulosSeleccionados.map((a) => {
      const valorEditado = editandoPrecio?.[a.id_articulo];
      const precio_unitario =
        valorEditado !== undefined
          ? typeof valorEditado === "string" && valorEditado.includes("$")
            ? cleanCOPFormat(valorEditado)
            : parseInt(valorEditado, 10) || 0
          : a.precio_unitario;
      return {
        id_articulo: a.id_articulo,
        cantidad: a.cantidad,
        precio_unitario,
      };
    });

    const payload = {
      id_cliente: cliente.id_cliente,
      estado,
      observaciones,
      detalles: detallesConPrecios,
    };

    try {
      await api.post("/pedidos", payload, { headers: { "X-Idempotency-Key": idempotencyKey } });
      toast.success("Orden de pedido creada");
      navigate("/ordenes_pedido");
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    } finally {
      setLoading(false); // Desactivar carga al finalizar el envío
    }
  };

  const handleCrearArticulo = async (e) => {
    e.preventDefault();
    setLoading(true); // Activar carga al crear artículo
    try {
      const res = await api.post("/articulos", nuevoArticulo, { headers: { "X-Idempotency-Key": idempotencyKeyArticulo } });
      toast.success("Artículo creado");
      const articuloCreado = res.data.articulo;

      // Actualizar la lista de artículos disponibles para el Select
      setArticulosOptions((prev) => [
        ...prev,
        {
          value: articuloCreado.id_articulo,
          label: `${articuloCreado.descripcion} (Ref: ${articuloCreado.referencia})`,
          ...articuloCreado,
        },
      ]);

      // Seleccionar y agregar el artículo recién creado al pedido
      if (articuloCreado?.id_articulo) {
        // Mapear el articuloCreado al formato que `react-select` espera
        const newOption = {
          value: articuloCreado.id_articulo,
          label: articuloCreado.descripcion,
          ...articuloCreado,
        };
        setArticuloSeleccionado(newOption); // Establecerlo como seleccionado en el Select
        await agregarArticulo(newOption); // Agregarlo al pedido, lo que disparará la verificación de inventario
      }

      setMostrarFormularioArticulo(false);
      setNuevoArticulo({
        referencia: "",
        descripcion: "",
        precio_venta: 0,
        id_categoria: "",
      }); // Limpiar formulario
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    } finally {
      setLoading(false); // Desactivar carga al finalizar la creación
    }
  };

  const cambiarPrecioUnitario = (id_articulo, valor) => {
    // Actualizar el estado de edición
    setEditandoPrecio((prev) => ({
      ...prev,
      [id_articulo]: valor,
    }));
  };

  const handleFocusPrecio = (id_articulo, precioActual) => {
    // Al hacer focus, mostrar el valor numérico sin formato
    setEditandoPrecio((prev) => ({
      ...prev,
      [id_articulo]: precioActual.toString(),
    }));
  };

  const handleBlurPrecio = (id_articulo, valor) => {
    // Al perder focus, procesar y guardar el valor
    const numPrecio = valor.includes("$")
      ? cleanCOPFormat(valor)
      : parseInt(valor, 10) || 0;

    if (isNaN(numPrecio) || numPrecio < 0) {
      toast.error("El precio unitario debe ser un número positivo o cero.");
      // Restaurar el valor original
      setEditandoPrecio((prev) => {
        const newState = { ...prev };
        delete newState[id_articulo];
        return newState;
      });
      return;
    }

    // Actualizar el precio en los artículos seleccionados
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numPrecio }
          : a,
      ),
    );

    // Limpiar el estado de edición
    setEditandoPrecio((prev) => {
      const newState = { ...prev };
      delete newState[id_articulo];
      return newState;
    });
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/ordenes_pedido")}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft size={16} />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nuevo pedido</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Datos principales */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Información del pedido
          </h2>

          {loading && (
            <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 text-sm">
              <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Procesando…
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Cliente */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Cliente <span className="text-red-500">*</span>
              </label>
              <Listbox value={cliente} onChange={setCliente} disabled={loading}>
                <div className="relative">
                  <Listbox.Button className="w-full flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition">
                    <span className={cliente ? "text-slate-800" : "text-slate-400"}>
                      {cliente ? cliente.nombre : "Selecciona un cliente"}
                    </span>
                    <PlusCircle size={14} className="text-slate-400 shrink-0" />
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto text-sm">
                    {clientes.map((c) => (
                      <Listbox.Option
                        key={c.id_cliente}
                        value={c}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2.5 ${active ? "bg-slate-50 text-slate-900" : "text-slate-700"}`
                        }
                      >
                        {c.nombre}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Observaciones */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Observaciones
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Observaciones del pedido (opcional)"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Artículos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Artículos
          </h2>

          {/* Buscador de artículo */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <AsyncSelect
                cacheOptions
                loadOptions={loadArticulosOptions}
                defaultOptions={articulosOptions}
                value={articuloSeleccionado}
                onChange={(option) => {
                  setArticuloSeleccionado(option);
                  if (option) agregarArticulo(option);
                }}
                placeholder="Buscar artículo por nombre o referencia…"
                isClearable
                className="text-sm"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#e2e8f0",
                    boxShadow: "none",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    "&:hover": { borderColor: "#94a3b8" },
                  }),
                  menuList: (base) => ({ ...base, maxHeight: "280px" }),
                }}
                isDisabled={loading}
                noOptionsMessage={() => "No se encontraron artículos"}
                loadingMessage={() => "Cargando artículos…"}
              />
            </div>
            <button
              type="button"
              onClick={() => setMostrarFormularioArticulo(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <PlusCircle size={15} />
              Crear artículo
            </button>
          </div>

          {/* Form crear artículo inline */}
          {mostrarFormularioArticulo && (
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">Nuevo artículo</p>
                <button
                  type="button"
                  onClick={() => setMostrarFormularioArticulo(false)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Referencia</label>
                  <input
                    type="text"
                    value={nuevoArticulo.referencia}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, referencia: e.target.value })}
                    placeholder="Ej: REF-001"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Descripción</label>
                  <input
                    type="text"
                    value={nuevoArticulo.descripcion}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, descripcion: e.target.value })}
                    placeholder="Ej: Silla de madera"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white disabled:opacity-50"
                    disabled={loading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Precio de venta</label>
                  <input
                    type="text"
                    value={
                      nuevoArticulo.precio_venta
                        ? parseInt(nuevoArticulo.precio_venta.replace(/\D/g, "")).toLocaleString("es-CO")
                        : ""
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setNuevoArticulo({ ...nuevoArticulo, precio_venta: raw });
                    }}
                    placeholder="Ej: 120000"
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white disabled:opacity-50"
                    disabled={loading}
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </div>
                <div className="md:col-span-3 flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Categoría</label>
                  <select
                    value={nuevoArticulo.id_categoria}
                    onChange={(e) => setNuevoArticulo({ ...nuevoArticulo, id_categoria: parseInt(e.target.value, 10) })}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                    disabled={loading}
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map((cat) => (
                      <option key={cat.id_categoria} value={cat.id_categoria}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMostrarFormularioArticulo(false)}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCrearArticulo}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Guardar artículo
                </button>
              </div>
            </div>
          )}

          {/* Tabla de artículos seleccionados */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Artículo
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Cantidad
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-40">
                    Precio unit.
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Subtotal
                  </th>
                  <th className="px-4 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <PlusCircle size={28} className="opacity-30" />
                        <p className="text-sm">Aún no has agregado artículos</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  articulosSeleccionados.map((art) => (
                    <tr
                      key={art.id_articulo}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {art.descripcion}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="1"
                          value={art.cantidad === 0 ? "" : art.cantidad}
                          onChange={(e) => cambiarCantidad(art.id_articulo, e.target.value)}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <input
                          type="text"
                          value={
                            editandoPrecio[art.id_articulo] !== undefined
                              ? editandoPrecio[art.id_articulo]
                              : formatCOP(art.precio_unitario)
                          }
                          onChange={(e) => cambiarPrecioUnitario(art.id_articulo, e.target.value)}
                          onFocus={() => handleFocusPrecio(art.id_articulo, art.precio_unitario)}
                          onBlur={(e) => handleBlurPrecio(art.id_articulo, e.target.value)}
                          className="w-32 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          disabled={loading}
                          placeholder="$0"
                        />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                        {formatCOP(art.precio_unitario * art.cantidad)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          disabled={loading}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          {articulosSeleccionados.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Total del pedido
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {articulosSeleccionados.length} artículo
                  {articulosSeleccionados.length !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {formatCOP(
                  articulosSeleccionados.reduce(
                    (total, art) => total + art.precio_unitario * art.cantidad,
                    0,
                  ),
                )}
              </p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/ordenes_pedido")}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
          >
            Guardar pedido
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrdenPedidoForm;
