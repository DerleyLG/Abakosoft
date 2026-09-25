import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import AsyncSelect from "react-select/async";
import { X } from "lucide-react";
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

const CrearOrdenCompra = () => {
  const idempotencyKey = useIdempotencyKey();
  const idempotencyKeyInicializar = useIdempotencyKey();
  const obtenerFechaActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const [proveedores, setProveedores] = useState([]);
  const [idProveedor, setIdProveedor] = useState("");
  const [categoriaCosto, setCategoriaCosto] = useState("");
  const [fechaCompra, setFechaCompra] = useState(obtenerFechaActual());
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [observacionesPago, setObservacionesPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);
  const [adjuntarComprobante, setAdjuntarComprobante] = useState(false);
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [resProveedores, resMetodosPago] = await Promise.all([
          api.get("/proveedores"),
          api.get("/tesoreria/metodos-pago"),
        ]);
        setProveedores(resProveedores.data || []);
        setMetodosPago(resMetodosPago.data || []);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
        const msg =
          error.response?.data?.mensaje ||
          error.response?.data?.message ||
          error.message;
        toast.error(
          `Error al cargar datos iniciales (proveedores, métodos de pago): ${msg}`,
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Caché para almacenar resultados de búsqueda
  const cacheRef = useRef({});
  const timerRef = useRef(null);
  const [todosLosArticulos, setTodosLosArticulos] = useState([]);

  // Cargar las primeras opciones (sugerencias iniciales) sin descargar todo el catálogo
  useEffect(() => {
    const cargarSugerenciasIniciales = async () => {
      try {
        const response = await api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 20,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        });
        const lista = Array.isArray(response.data?.data)
          ? response.data.data
          : [];
        const opciones = lista.map((art) => ({
          value: art.id_articulo,
          label: `${art.descripcion} (Ref: ${art.referencia})`,
          ...art,
        }));
        setTodosLosArticulos(opciones);
        // Guardar en caché como opciones por defecto
        cacheRef.current[""] = opciones;
      } catch (error) {
        console.error("Error al cargar artículos:", error);
        toast.error("Error al cargar lista de artículos");
      }
    };
    cargarSugerenciasIniciales();
  }, []);

  // Función para cargar artículos dinámicamente con debounce y caché
  // Búsqueda REMOTA: consulta al backend por cada término, SIN filtro de
  // categoría para que las órdenes de compra abarquen TODOS los artículos.
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

  const verificarYAgregarAlInventario = async (
    idArticulo,
    descripcionArticulo,
  ) => {
    setLoading(true);
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
                    await api.post(
                      "/inventario/inicializar",
                      {
                        id_articulo: Number(idArticulo),
                      },
                      {
                        headers: {
                          "X-Idempotency-Key": idempotencyKeyInicializar,
                        },
                      },
                    );
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
            closeOnEscape: false,
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
      setLoading(false);
    }
  };

  const agregarArticulo = async (articulo) => {
    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.id_articulo,
    );
    if (yaExiste) {
      toast.error("Este artículo ya ha sido añadido a la orden de compra.");
      setArticuloSeleccionado(null);
      return;
    }

    const puedeAgregar = await verificarYAgregarAlInventario(
      articulo.value,
      articulo.label,
    );

    if (!puedeAgregar) {
      setArticuloSeleccionado(null);
      return;
    }

    setArticulosSeleccionados((prev) => [
      ...prev,
      {
        id_articulo: articulo.value,
        descripcion: articulo.label,
        cantidad: 1,
        abreviatura_unidad:
          articulo.abreviatura_unidad || articulo.nombre_unidad || "ud",
        precio_unitario: articulo.precio_costo || 0,
        precio_costo_original: articulo.precio_costo || 0,
        es_bruto: false,
      },
    ]);
    setArticuloSeleccionado(null);
  };

  const cambiarEsBruto = (id_articulo, esBruto) => {
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, es_bruto: esBruto } : a,
      ),
    );
  };

  const eliminarArticulo = (id_articulo) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id_articulo !== id_articulo),
    );
  };

  const cambiarCantidad = (id_articulo, cantidad) => {
    const numCantidad = parseFloat(cantidad);
    if (isNaN(numCantidad) || numCantidad <= 0) {
      toast.error("La cantidad debe ser un número positivo.");
      return;
    }
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, cantidad: numCantidad } : a,
      ),
    );
  };

  const cambiarPrecioUnitario = (id_articulo, precioFormateado) => {
    const numPrecio = cleanCOPFormat(precioFormateado);
    if (isNaN(numPrecio) || numPrecio < 0) {
      toast.error("El precio unitario debe ser un número positivo o cero.");
      return;
    }
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numPrecio }
          : a,
      ),
    );
  };
  const validarFormulario = () => {
    if (!idProveedor) {
      toast.error("Selecciona un proveedor");
      return false;
    }
    if (!fechaCompra) {
      toast.error("Selecciona la fecha de compra");
      return false;
    }
    if (articulosSeleccionados.length === 0) {
      toast.error("Agrega al menos un artículo a la orden de compra");
      return false;
    }
    if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
      toast.error("Las cantidades de los artículos deben ser mayores a cero");
      return false;
    }
    if (!idMetodoPago) {
      toast.error("Selecciona un método de pago");
      return false;
    }
    return true;
  };

  const handleArchivoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    const tiposPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (!tiposPermitidos.includes(file.type)) {
      toast.error("Solo se permiten archivos JPG, PNG o PDF");
      e.target.value = "";
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no puede superar los 5MB");
      e.target.value = "";
      return;
    }

    setArchivoComprobante(file);

    // Crear preview para imágenes
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const eliminarArchivo = () => {
    setArchivoComprobante(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);

    const datos = {
      id_proveedor: parseInt(idProveedor),
      fecha: fechaCompra,
      categoria_costo: categoriaCosto.trim() || null,
      id_orden_fabricacion: null,
      estado: "pendiente",
      items: articulosSeleccionados.map((a) => ({
        id_articulo: Number(a.id_articulo),
        cantidad: Number(a.cantidad),
        precio_unitario: Number(a.precio_unitario),
        es_bruto: Boolean(a.es_bruto),
      })),
      id_metodo_pago: parseInt(idMetodoPago),
      referencia: referenciaPago.trim() || null,
      observaciones_pago: observacionesPago.trim() || null,
    };

    try {
      // Si hay archivo, usar FormData
      if (adjuntarComprobante && archivoComprobante) {
        const formData = new FormData();

        // Agregar campos como strings
        formData.append("id_proveedor", datos.id_proveedor);
        formData.append("fecha", datos.fecha);
        if (datos.categoria_costo)
          formData.append("categoria_costo", datos.categoria_costo);
        formData.append("items", JSON.stringify(datos.items));
        formData.append("id_metodo_pago", datos.id_metodo_pago);
        if (datos.referencia) formData.append("referencia", datos.referencia);
        if (datos.observaciones_pago)
          formData.append("observaciones_pago", datos.observaciones_pago);

        // Agregar archivo
        formData.append("comprobante", archivoComprobante);

        await api.post("/ordenes-compra", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-Idempotency-Key": idempotencyKey,
          },
        });
      } else {
        // Sin archivo, enviar JSON normal
        await api.post("/ordenes-compra", datos, {
          headers: { "X-Idempotency-Key": idempotencyKey },
        });
      }

      toast.success("Orden de compra creada correctamente", {
        duration: 4000,
        style: {
          borderRadius: "8px",
          background: "#1e293b",
          color: "#fff",
          fontWeight: "bold",
          padding: "14px 20px",
          fontSize: "16px",
        },
        iconTheme: {
          primary: "#10b981",
          secondary: "#f0fdf4",
        },
      });
      navigate("/ordenes_compra");
    } catch (error) {
      console.error(
        "Error creando orden de compra",
        error.response?.data || error.message,
      );

      const msg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error interno al crear la orden de compra";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    navigate("/ordenes_compra");
  };

  const inputCls =
    "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition disabled:opacity-50 disabled:cursor-not-allowed";
  const labelCls =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Nueva orden de compra
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Completa los datos para registrar la orden
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancelar}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          ← Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Card: Datos generales */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            Datos generales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="proveedor" className={labelCls}>
                Proveedor <span className="text-red-400 normal-case">*</span>
              </label>
              <select
                id="proveedor"
                value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value)}
                required
                className={inputCls + " bg-white"}
                disabled={loading}
              >
                <option value="">Selecciona un proveedor</option>
                {proveedores.map((prov) => (
                  <option key={prov.id_proveedor} value={prov.id_proveedor}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Card: Datos de pago */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Datos de pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="fechaCompra" className={labelCls}>
                Fecha de compra{" "}
                <span className="text-red-400 normal-case">*</span>
              </label>
              <input
                id="fechaCompra"
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                required
                className={inputCls + " cursor-pointer"}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="metodoPago" className={labelCls}>
                Método de pago{" "}
                <span className="text-red-400 normal-case">*</span>
              </label>
              <select
                id="metodoPago"
                value={idMetodoPago}
                onChange={(e) => setIdMetodoPago(e.target.value)}
                required
                className={inputCls + " bg-white"}
                disabled={loading}
              >
                <option value="">Selecciona un método</option>
                {metodosPago.map((m) => (
                  <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="referenciaPago" className={labelCls}>
                Referencia de pago
              </label>
              <input
                id="referenciaPago"
                type="text"
                value={referenciaPago}
                onChange={(e) => setReferenciaPago(e.target.value)}
                placeholder="Ej: Nº de cuenta, cheque…"
                className={inputCls}
                disabled={loading}
              />
            </div>
            <div className="flex flex-col md:col-span-2 lg:col-span-3">
              <label htmlFor="observacionesPago" className={labelCls}>
                Observaciones
              </label>
              <textarea
                id="observacionesPago"
                rows="2"
                value={observacionesPago}
                onChange={(e) => setObservacionesPago(e.target.value)}
                placeholder="Notas adicionales sobre el pago"
                className={inputCls + " resize-none"}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Card: Comprobante */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Comprobante / factura{" "}
            <span className="font-normal normal-case text-slate-400">
              (opcional)
            </span>
          </h2>
          <div className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              id="adjuntarComprobante"
              checked={adjuntarComprobante}
              onChange={(e) => {
                setAdjuntarComprobante(e.target.checked);
                if (!e.target.checked) {
                  setArchivoComprobante(null);
                  setPreviewUrl(null);
                }
              }}
              className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer"
              disabled={loading}
            />
            <label
              htmlFor="adjuntarComprobante"
              className="text-sm text-slate-600 cursor-pointer"
            >
              Adjuntar comprobante o factura
            </label>
          </div>
          {adjuntarComprobante && (
            <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleArchivoChange}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-700 file:cursor-pointer"
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-400">
                JPG, PNG o PDF · máx 5 MB
              </p>
              {previewUrl && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-40 rounded-lg border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={eliminarArchivo}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              {archivoComprobante && !previewUrl && (
                <div className="mt-3 flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-slate-700 truncate">
                    {archivoComprobante.name}
                  </span>
                  <button
                    type="button"
                    onClick={eliminarArchivo}
                    className="text-red-500 hover:text-red-700 cursor-pointer ml-2 flex-shrink-0"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card: Artículos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
            Artículos a comprar
          </h2>

          {/* Buscador de artículo */}
          <div className="mb-4">
            <label className={labelCls}>Agregar artículo</label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadArticulosOptions}
              defaultOptions={todosLosArticulos}
              value={articuloSeleccionado}
              onChange={(option) => {
                setArticuloSeleccionado(option);
                if (option) agregarArticulo(option);
              }}
              placeholder="Busca por nombre o referencia…"
              isClearable
              className="text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#e2e8f0",
                  boxShadow: "none",
                  "&:hover": { borderColor: "#94a3b8" },
                  borderRadius: "0.5rem",
                  minHeight: "38px",
                }),
                menuList: (base) => ({ ...base, maxHeight: "260px" }),
              }}
              isDisabled={loading}
              noOptionsMessage={() => "No se encontraron artículos"}
              loadingMessage={() => "Cargando artículos…"}
            />
          </div>

          {/* Tabla de artículos seleccionados */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-16">
                    Unidad
                  </th>
                  <th className="px-3 py-2 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-28">
                    ¿Va a fábrica?
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Precio unit.
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {articulosSeleccionados.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center py-10 text-slate-400 text-xs"
                    >
                      Agrega artículos usando el buscador de arriba
                    </td>
                  </tr>
                ) : (
                  articulosSeleccionados.map((art) => (
                    <tr key={art.id_articulo} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-medium text-xs">
                            {art.descripcion}
                          </span>
                          {art.precio_unitario !==
                            art.precio_costo_original && (
                            <span
                              className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0"
                              title={`Precio original: ${formatCOP(art.precio_costo_original)}`}
                            >
                              actualizará costo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          value={art.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(art.id_articulo, e.target.value)
                          }
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {art.abreviatura_unidad || "ud"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={Boolean(art.es_bruto)}
                            onChange={(e) =>
                              cambiarEsBruto(art.id_articulo, e.target.checked)
                            }
                            className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer"
                            disabled={loading}
                          />
                          <span className="text-[9px] text-slate-400 leading-none">
                            no suma stock
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          min="0"
                          value={formatCOP(art.precio_unitario)}
                          onChange={(e) =>
                            cambiarPrecioUnitario(
                              art.id_articulo,
                              e.target.value,
                            )
                          }
                          className="w-32 border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
                          disabled={loading}
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-slate-800">
                        {formatCOP(art.cantidad * art.precio_unitario)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {articulosSeleccionados.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td
                      colSpan="5"
                      className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                      {formatCOP(
                        articulosSeleccionados.reduce(
                          (s, a) => s + a.cantidad * a.precio_unitario,
                          0,
                        ),
                      )}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={handleCancelar}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Guardando…" : "Crear orden"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearOrdenCompra;
