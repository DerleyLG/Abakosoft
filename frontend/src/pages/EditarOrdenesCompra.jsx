import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import AsyncSelect from "react-select/async";
import {
  FiSave,
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiDollarSign,
  FiFileText,
  FiX,
  FiUpload,
} from "react-icons/fi";
import { format } from "date-fns";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  return Number(value).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const parseCurrency = (value) => {
  if (typeof value !== "string" || !value) return 0;

  const cleanValue = value.replace(/[^0-9]/g, "");

  return Number(cleanValue);
};

const EditarOrdenCompra = () => {
  const cacheRef = useRef({});
  const timerRef = useRef(null);
  const [allProveedores, setAllProveedores] = useState([]);
  const [allArticulos, setAllArticulos] = useState([]);
  const [articulosOptions, setArticulosOptions] = useState([]);
  const [allMetodosPago, setAllMetodosPago] = useState([]);
  const [isEditable, setIsEditable] = useState(true);
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Función para cargar artículos con búsqueda (usada en AsyncSelect)
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
            art.referencia?.toLowerCase().includes(inputValue.toLowerCase()),
        );
        // Guardar en caché
        cacheRef.current[cacheKey] = filtered;
        callback(filtered);
      }, 300);
    },
    [articulosOptions],
  );
  const { id } = useParams();
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();

  const [ordenData, setOrdenData] = useState({
    id_proveedor: "",
    estado: "",
    observaciones: "",
    categoria_costo: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
  });

  // Estados para comprobante
  const [comprobanteActual, setComprobanteActual] = useState(null); // {path, nombre_original, fecha_subida}
  const [adjuntarComprobante, setAdjuntarComprobante] = useState(false);
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [eliminarComprobanteActual, setEliminarComprobanteActual] =
    useState(false);

  const [pagoData, setPagoData] = useState({
    id_metodo_pago: "",
    referencia: "",
    observaciones_pago: "",
  });

  const fetchMovimientoPago = async (ordenId) => {
    try {
      const resMovimiento = await api.get(
        `/tesoreria/documento/${ordenId}?tipo=orden_compra`,
      );
      const movimiento = resMovimiento.data;

      if (movimiento) {
        setPagoData({
          id_metodo_pago: movimiento.id_metodo_pago
            ? String(movimiento.id_metodo_pago)
            : "",
          referencia: movimiento.referencia || "",

          observaciones_pago: movimiento.observaciones || "",
        });
      } else {
        setPagoData({
          id_metodo_pago: "",
          referencia: "",
          observaciones_pago: "",
        });
      }
    } catch (error) {
      setPagoData({
        id_metodo_pago: "",
        referencia: "",
        observaciones_pago: "",
      });
    }
  };

  const fetchDependencies = async () => {
    try {
      const [resProveedores, resArticulos, resMetodos] = await Promise.all([
        api.get("/proveedores"),
        api.get("/articulos", {
          params: {
            page: 1,
            pageSize: 10000,
            sortBy: "descripcion",
            sortDir: "asc",
          },
        }),

        api.get("/metodos-pago"),
      ]);

      const articulosArray = Array.isArray(resArticulos.data)
        ? resArticulos.data
        : resArticulos.data?.data || [];

      setAllProveedores(
        Array.isArray(resProveedores.data) ? resProveedores.data : [],
      );
      setAllArticulos(articulosArray);

      // Crear opciones para AsyncSelect
      const opciones = articulosArray.map((art) => ({
        value: art.id_articulo,
        label: `${art.descripcion} (Ref: ${art.referencia || "N/A"})`,
        referencia: art.referencia,
        descripcion: art.descripcion,
        ...art,
      }));
      setArticulosOptions(opciones);
      cacheRef.current[""] = opciones;
      setAllMetodosPago(Array.isArray(resMetodos.data) ? resMetodos.data : []);
    } catch (error) {
      toast.error(
        "Error al cargar dependencias (Proveedores/Artículos/Pagos).",
      );
      console.error("Error cargando dependencias:", error);
    }
  };

  const fetchOrdenData = async () => {
    try {
      const resOrden = await api.get(`/ordenes-compra/${id}`);
      const orden = resOrden.data;
      const editable = orden.estado.toLowerCase() === "pendiente";
      setIsEditable(editable);
      let formattedDate = format(new Date(), "yyyy-MM-dd");
      if (orden.fecha) {
        const date = new Date(orden.fecha);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        formattedDate = `${year}-${month}-${day}`;
      }
      setOrdenData({
        id_proveedor: orden.id_proveedor || "",
        estado: orden.estado || "pendiente",
        observaciones: orden.observaciones || "",
        categoria_costo: orden.categoria_costo || "",
        fecha: formattedDate,
      });
      if (orden.comprobante_path) {
        setComprobanteActual({
          path: orden.comprobante_path,
          nombre_original: orden.comprobante_nombre_original,
          fecha_subida: orden.comprobante_fecha_subida,
        });
      }
      const detallesFormateados = Array.isArray(orden.detalles)
        ? orden.detalles.map((d) => ({
            id_articulo: d.id_articulo,
            cantidad: d.cantidad,
            precio_unitario: Number(d.precio_unitario) || 0,
            precio_costo_original:
              Number(d.precio_costo_articulo) || Number(d.precio_unitario) || 0, // Precio costo actual del artículo
          }))
        : [];
      setDetalles(detallesFormateados);
      // Usar directamente el método de pago y movimiento de tesorería
      if (orden.movimiento_tesoreria) {
        setPagoData({
          id_metodo_pago: orden.movimiento_tesoreria.id_metodo_pago
            ? String(orden.movimiento_tesoreria.id_metodo_pago)
            : "",
          referencia: orden.movimiento_tesoreria.referencia || "",
          observaciones_pago: orden.movimiento_tesoreria.observaciones || "",
        });
      } else {
        setPagoData({
          id_metodo_pago: "",
          referencia: "",
          observaciones_pago: "",
        });
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al cargar datos de la orden de compra.";
      toast.error(errorMessage);
      console.error("Error cargando orden:", error);
      navigate("/ordenes_compra");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchOrdenData();
  }, [id]);

  // Refrescar datos tras cambio de estado a pendiente antes de permitir edición
  useEffect(() => {
    if (ordenData.estado === "pendiente" && !loading) {
      fetchOrdenData();
    }
    // eslint-disable-next-line
  }, [ordenData.estado]);

  const handleOrdenChange = (e) => {
    const { name, value } = e.target;
    setOrdenData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePagoChange = (e) => {
    const { name, value } = e.target;
    setPagoData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejar checkbox para adjuntar comprobante
  const handleCheckAdjuntar = (e) => {
    setAdjuntarComprobante(e.target.checked);
    if (!e.target.checked) {
      setArchivoComprobante(null);
      setPreviewUrl(null);
    }
  };

  // Manejar selección de archivo
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
      toast.error("Solo se permiten archivos JPG, PNG o PDF.");
      e.target.value = "";
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no debe superar 5MB.");
      e.target.value = "";
      return;
    }

    setArchivoComprobante(file);

    // Preview solo para imágenes
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

  // Eliminar archivo seleccionado (nuevo)
  const eliminarArchivo = () => {
    setArchivoComprobante(null);
    setPreviewUrl(null);
    setAdjuntarComprobante(false);
  };

  // Eliminar comprobante actual
  const handleEliminarComprobanteActual = () => {
    setEliminarComprobanteActual(true);
    setComprobanteActual(null);
    toast.success("El comprobante será eliminado al guardar.");
  };

  const handleDetalleChange = (index, e) => {
    const { name, value } = e.target;
    const list = [...detalles];
    let processedValue = value;

    if (name === "precio_unitario") {
      processedValue = parseCurrency(value);
    } else if (name === "cantidad") {
      processedValue = Number(value);
    }

    list[index][name] = processedValue;

    if (name === "id_articulo" && allArticulos.length > 0) {
      const selectedArticle = allArticulos.find((a) => a.id_articulo == value);
      if (selectedArticle) {
        const precioCosto = Number(selectedArticle.precio_costo) || 0;
        list[index].precio_unitario = precioCosto;
        list[index].precio_costo_original = precioCosto; // Guardar precio original para comparar
      } else {
        list[index].precio_unitario = 0;
        list[index].precio_costo_original = 0;
      }
    }

    setDetalles(list);
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      {
        id_articulo: "",
        cantidad: 1,
        precio_unitario: 0,
        precio_costo_original: 0,
      },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    if (detalles.length > 1) {
      setDetalles((prev) => prev.filter((_, i) => i !== index));
    } else {
      toast.error("La orden debe tener al menos un artículo.");
    }
  };

  const calcularSubtotal = (cantidad, precio) => {
    const cant = Number(cantidad) || 0;
    const prec = Number(precio) || 0;
    return cant * prec;
  };

  const calcularTotalGeneral = () => {
    return detalles.reduce(
      (sum, detalle) =>
        sum + calcularSubtotal(detalle.cantidad, detalle.precio_unitario),
      0,
    );
  };

  const totalGeneral = useMemo(calcularTotalGeneral, [detalles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isEditable) {
      toast.error(
        "No se puede editar una orden que no está en estado 'pendiente'.",
      );
      return;
    }

    if (!ordenData.id_proveedor) {
      toast.error("Debe seleccionar un proveedor.");
      return;
    }

    const detallesInvalidos = detalles.some(
      (d) =>
        !d.id_articulo ||
        d.cantidad <= 0 ||
        d.precio_unitario <= 0 ||
        isNaN(d.cantidad) ||
        isNaN(d.precio_unitario),
    );

    if (detalles.length === 0 || detallesInvalidos) {
      toast.error(
        "Asegúrate de que todos los detalles estén completos y sean válidos (Artículos seleccionados, Cantidad y Precio > 0).",
      );
      return;
    }

    // Mostrar indicador de carga
    const loadingToast = toast.loading("Actualizando orden de compra...");

    // Forzar el estado a 'pendiente' en el payload
    const estadoPendiente = "pendiente";

    try {
      // Si se va a adjuntar un archivo nuevo o eliminar el actual, usar FormData
      let response;
      if (adjuntarComprobante && archivoComprobante) {
        const formData = new FormData();
        formData.append("id_proveedor", ordenData.id_proveedor);
        formData.append("estado", estadoPendiente);
        formData.append("observaciones", ordenData.observaciones || "");
        formData.append("categoria_costo", ordenData.categoria_costo || "");
        formData.append("fecha", ordenData.fecha);
        formData.append("detalles", JSON.stringify(detalles));
        if (pagoData.id_metodo_pago)
          formData.append("id_metodo_pago", pagoData.id_metodo_pago);
        if (pagoData.referencia)
          formData.append("referencia", pagoData.referencia);
        if (pagoData.observaciones_pago)
          formData.append("observaciones_pago", pagoData.observaciones_pago);
        formData.append("comprobante", archivoComprobante);
        response = await api.put(`/ordenes-compra/${id}`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            "X-Idempotency-Key": idempotencyKey,
          },
        });
      } else if (eliminarComprobanteActual) {
        // Enviar con flag para eliminar comprobante
        const dataToSend = {
          ...ordenData,
          ...pagoData,
          detalles: detalles,
          eliminar_comprobante: true,
          estado: estadoPendiente,
        };
        response = await api.put(`/ordenes-compra/${id}`, dataToSend, {
          headers: { "X-Idempotency-Key": idempotencyKey },
        });
      } else {
        // Envío normal sin cambios en comprobante
        const dataToSend = {
          ...ordenData,
          ...pagoData,
          detalles: detalles,
          estado: estadoPendiente,
        };
        response = await api.put(`/ordenes-compra/${id}`, dataToSend, {
          headers: { "X-Idempotency-Key": idempotencyKey },
        });
      }
      // Sincronizar datos tras la acción
      await fetchOrdenData();
      toast.dismiss(loadingToast);
      toast.success("Orden de compra actualizada correctamente");
      navigate("/ordenes_compra");
    } catch (error) {
      toast.dismiss(loadingToast);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al actualizar la orden de compra.";
      if (
        error.response?.status === 409 &&
        error.response.data?.needsInitialization
      ) {
        const articulo = error.response.data.articulo;
        toast.error(
          `${error.response.data.message} Por favor, inicializa el artículo: ${articulo.descripcion}.`,
        );
        return;
      }
      if (errorMessage.includes("Stock insuficiente")) {
        toast.error(
          errorMessage +
            " Revisa los movimientos de inventario antes de continuar.",
        );
      } else {
        toast.error(errorMessage);
      }
      console.error("Error de actualización:", error);
    }
  };

  const inputCls = (editable = true) =>
    `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition ${!editable ? "bg-slate-50 text-slate-400 cursor-not-allowed" : "bg-white"}`;
  const labelCls =
    "text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block";

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500 animate-pulse">
          Cargando orden de compra…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight flex items-center gap-2">
            Editar orden de compra
            <span className="text-slate-400 font-normal text-lg">#{id}</span>
            {!isEditable && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200 normal-case">
                Solo lectura
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isEditable
              ? "Modifica los datos de la orden"
              : "Esta orden no puede editarse en su estado actual"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft size={14} /> Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Card: Información general */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
            Información general
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="id_proveedor" className={labelCls}>
                Proveedor
              </label>
              <select
                id="id_proveedor"
                name="id_proveedor"
                value={ordenData.id_proveedor}
                onChange={handleOrdenChange}
                required
                disabled={!isEditable}
                className={inputCls(isEditable)}
              >
                <option value="">Selecciona un proveedor</option>
                {allProveedores.map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="fecha" className={labelCls}>
                Fecha de la orden
              </label>
              <input
                type="date"
                id="fecha"
                name="fecha"
                value={ordenData.fecha}
                onChange={handleOrdenChange}
                disabled={!isEditable}
                className={inputCls(isEditable) + " cursor-pointer"}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="estado" className={labelCls}>
                Estado
              </label>
              <select
                id="estado"
                name="estado"
                value={ordenData.estado}
                disabled
                className={inputCls(false)}
              >
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="flex flex-col lg:col-span-3">
              <label htmlFor="categoria_costo" className={labelCls}>
                Categoría de costo
              </label>
              <input
                id="categoria_costo"
                name="categoria_costo"
                type="text"
                value={ordenData.categoria_costo}
                onChange={handleOrdenChange}
                disabled={!isEditable}
                placeholder="Ej: Materia prima, Suministros de oficina…"
                className={inputCls(isEditable)}
              />
            </div>
          </div>
        </div>

        {/* Card: Pago */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Datos de pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col">
              <label htmlFor="id_metodo_pago" className={labelCls}>
                Método de pago
              </label>
              <select
                id="id_metodo_pago"
                name="id_metodo_pago"
                value={pagoData.id_metodo_pago}
                onChange={handlePagoChange}
                disabled={!isEditable}
                className={inputCls(isEditable)}
              >
                <option value="">Sin especificar</option>
                {allMetodosPago.map((m) => (
                  <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label htmlFor="referencia" className={labelCls}>
                Referencia / Nº transacción
              </label>
              <input
                type="text"
                id="referencia"
                name="referencia"
                value={pagoData.referencia}
                onChange={handlePagoChange}
                disabled={!isEditable}
                placeholder="Ej: Cheque #123, Transferencia 5894"
                className={inputCls(isEditable)}
              />
            </div>
            <div className="flex flex-col">
              <label htmlFor="observaciones_pago" className={labelCls}>
                Observaciones del pago
              </label>
              <input
                type="text"
                id="observaciones_pago"
                name="observaciones_pago"
                value={pagoData.observaciones_pago}
                onChange={handlePagoChange}
                disabled={!isEditable}
                placeholder="Notas sobre la transacción"
                className={inputCls(isEditable)}
              />
            </div>
          </div>
        </div>

        {/* Card: Comprobante */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
            Comprobante / factura
          </h2>

          {comprobanteActual && !eliminarComprobanteActual ? (
            <div className="flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <FiFileText size={14} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">
                    Comprobante adjunto
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {comprobanteActual.nombre_original}
                  </p>
                  {comprobanteActual.fecha_subida && (
                    <p className="text-[10px] text-slate-400">
                      Subido:{" "}
                      {new Date(
                        comprobanteActual.fecha_subida,
                      ).toLocaleDateString("es-CO")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`http://localhost:3002/uploads/${comprobanteActual.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                >
                  <FiFileText size={11} /> Ver archivo
                </a>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleEliminarComprobanteActual}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition cursor-pointer"
                  >
                    <FiX size={11} /> Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : isEditable ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={adjuntarComprobante}
                  onChange={handleCheckAdjuntar}
                  className="w-4 h-4 rounded border-slate-300 text-slate-700 cursor-pointer"
                />
                <span className="text-sm text-slate-600 cursor-pointer">
                  {eliminarComprobanteActual
                    ? "Adjuntar nuevo comprobante"
                    : "Adjuntar comprobante / factura"}
                </span>
              </div>
              {adjuntarComprobante && (
                <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg w-fit hover:bg-slate-700 transition cursor-pointer">
                    <FiUpload size={12} /> Seleccionar archivo
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleArchivoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-400">
                    JPG, PNG o PDF · máx 5 MB
                  </p>
                  {archivoComprobante && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-slate-700 truncate">
                        {archivoComprobante.name}
                      </span>
                      <button
                        type="button"
                        onClick={eliminarArchivo}
                        className="text-red-500 hover:text-red-700 cursor-pointer flex-shrink-0"
                      >
                        <FiX size={14} />
                      </button>
                    </div>
                  )}
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="mt-3 max-h-40 rounded-lg border border-slate-200"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Sin comprobante adjunto
            </p>
          )}
        </div>

        {/* Card: Artículos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
              Artículos a comprar
            </h2>
            {isEditable && (
              <button
                type="button"
                onClick={handleAddDetalle}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white transition cursor-pointer"
              >
                <FiPlus size={12} /> Añadir artículo
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Artículo
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider w-24">
                    Cantidad
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Precio unit. (COP)
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                  {isEditable && <th className="px-3 py-2 w-10" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {detalles.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isEditable ? 5 : 4}
                      className="text-center py-10 text-slate-400 text-xs"
                    >
                      Agrega artículos con el botón de arriba
                    </td>
                  </tr>
                ) : (
                  detalles.map((detalle, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-3 py-2 min-w-[220px]">
                        <div className="flex items-center gap-2">
                          <AsyncSelect
                            cacheOptions
                            loadOptions={loadArticulosOptions}
                            defaultOptions={articulosOptions}
                            value={
                              articulosOptions.find(
                                (opt) => opt.value === detalle.id_articulo,
                              ) || null
                            }
                            onChange={(option) => {
                              handleDetalleChange(index, {
                                target: {
                                  name: "id_articulo",
                                  value: option ? option.value : "",
                                },
                              });
                            }}
                            placeholder="Busca un artículo…"
                            isClearable
                            isDisabled={!isEditable}
                            styles={{
                              control: (base) => ({
                                ...base,
                                borderColor: "#e2e8f0",
                                boxShadow: "none",
                                "&:hover": { borderColor: "#94a3b8" },
                                borderRadius: "0.5rem",
                                minHeight: "34px",
                                fontSize: "12px",
                              }),
                              menuList: (base) => ({
                                ...base,
                                maxHeight: "220px",
                              }),
                            }}
                            noOptionsMessage={() =>
                              "No se encontraron artículos"
                            }
                            loadingMessage={() => "Cargando…"}
                          />
                          {detalle.precio_unitario !==
                            detalle.precio_costo_original &&
                            detalle.precio_costo_original !== undefined && (
                              <span
                                className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap"
                                title={`Precio costo actual: ${formatCurrency(detalle.precio_costo_original)}`}
                              >
                                actualizará costo
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          name="cantidad"
                          value={detalle.cantidad}
                          onChange={(e) => handleDetalleChange(index, e)}
                          min="1"
                          required
                          disabled={!isEditable}
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="relative inline-flex items-center">
                          <span className="absolute left-2 text-slate-400 text-xs">
                            <FiDollarSign size={11} />
                          </span>
                          <input
                            type="text"
                            name="precio_unitario"
                            value={formatCurrency(detalle.precio_unitario)}
                            onChange={(e) => handleDetalleChange(index, e)}
                            disabled={!isEditable}
                            className="w-32 border border-slate-200 rounded-lg pl-6 pr-2 py-1 text-right text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-semibold text-slate-800">
                        {formatCurrency(
                          calcularSubtotal(
                            detalle.cantidad,
                            detalle.precio_unitario,
                          ),
                        )}
                      </td>
                      {isEditable && (
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDetalle(index)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition cursor-pointer"
                          >
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
              {detalles.length > 0 && (
                <tfoot>
                  <tr className="border-t border-slate-100 bg-slate-50">
                    <td
                      colSpan={isEditable ? 3 : 3}
                      className="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-bold text-slate-900">
                      {formatCurrency(totalGeneral)}
                    </td>
                    {isEditable && <td />}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Acciones */}
        {isEditable && (
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-900 hover:bg-slate-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiSave size={13} /> Guardar cambios
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EditarOrdenCompra;
