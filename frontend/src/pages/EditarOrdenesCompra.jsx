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
        response = await api.put(`/ordenes-compra/${id}`, dataToSend);
      } else {
        // Envío normal sin cambios en comprobante
        const dataToSend = {
          ...ordenData,
          ...pagoData,
          detalles: detalles,
          estado: estadoPendiente,
        };
        response = await api.put(`/ordenes-compra/${id}`, dataToSend);
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

  if (loading) {
    return (
      <div className="text-center py-10 text-xl font-medium text-slate-700">
        Cargando orden de compra...
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          Editar Orden de Compra{" "}
          <span className="text-slate-500 font-normal">#{id}</span>
          {!isEditable && (
            <span className="text-base text-red-500 ml-4 p-1 border border-red-500 rounded font-semibold">
              (Solo Lectura)
            </span>
          )}
        </h2>
        <button
          onClick={() => navigate(-1)}
          className="cursor-pointer flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-slate-800 px-4 py-2 rounded-lg font-semibold transition"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-2xl"
      >
        {/* INFORMACIÓN GENERAL */}
        <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700">
          Información General
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col">
            <label
              htmlFor="id_proveedor"
              className="mb-2 font-medium text-slate-600"
            >
              Proveedor
            </label>
            <select
              id="id_proveedor"
              name="id_proveedor"
              value={ordenData.id_proveedor}
              onChange={handleOrdenChange}
              required
              disabled={!isEditable}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
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
            <label htmlFor="estado" className="mb-2 font-medium text-slate-600">
              Estado
            </label>
            <select
              id="estado"
              name="estado"
              value={ordenData.estado}
              disabled={true}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-100 text-gray-500 focus:outline-none"
            >
              <option value="pendiente">Pendiente</option>
              <option value="recibida">Recibida</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="flex flex-col">
            <label htmlFor="fecha" className="mb-2 font-medium text-slate-600">
              Fecha de la Orden
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={ordenData.fecha}
              onChange={handleOrdenChange}
              disabled={!isEditable}
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="flex flex-col">
            <label
              htmlFor="id_metodo_pago"
              className="mb-2 font-medium text-slate-600"
            >
              Método de Pago
            </label>
            <select
              id="id_metodo_pago"
              name="id_metodo_pago"
              value={pagoData.id_metodo_pago}
              onChange={handlePagoChange}
              disabled={!isEditable}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="">Selecciona método (Opcional)</option>
              {allMetodosPago.map((m) => (
                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="referencia"
              className="mb-2 font-medium text-slate-600"
            >
              Referencia / No. Transacción
            </label>
            <input
              type="text"
              id="referencia"
              name="referencia"
              value={pagoData.referencia}
              onChange={handlePagoChange}
              disabled={!isEditable}
              placeholder="Ej: Cheque #123, Transf. 5894, N/A"
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="observaciones_pago"
              className="mb-2 font-medium text-slate-600"
            >
              Observaciones del Pago
            </label>
            <input
              type="text"
              id="observaciones_pago"
              name="observaciones_pago"
              value={pagoData.observaciones_pago}
              onChange={handlePagoChange}
              disabled={!isEditable}
              placeholder="Notas sobre la transacción"
              className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
        </div>

        <div className="flex flex-col mb-8">
          <label
            htmlFor="categoria_costo"
            className="mb-2 font-medium text-slate-600"
          >
            Categoría de Costo
          </label>
          <input
            id="categoria_costo"
            name="categoria_costo"
            type="text"
            value={ordenData.categoria_costo}
            onChange={handleOrdenChange}
            disabled={!isEditable}
            placeholder="Ej: Materia prima, Compra de artículos ya fabricados, Suministros de oficina"
            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>

        {/* SECCIÓN DE COMPROBANTE */}
        <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700">
          Comprobante / Factura
        </h3>

        {/* Mostrar comprobante actual si existe */}
        {comprobanteActual && !eliminarComprobanteActual && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FiFileText size={24} className="text-blue-600" />
                <div>
                  <p className="font-semibold text-slate-700">
                    Comprobante adjunto
                  </p>
                  <p className="text-sm text-gray-600">
                    {comprobanteActual.nombre_original}
                  </p>
                  {comprobanteActual.fecha_subida && (
                    <p className="text-xs text-gray-500">
                      Subido:{" "}
                      {new Date(
                        comprobanteActual.fecha_subida,
                      ).toLocaleDateString("es-CO")}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`http://localhost:3002/uploads/${comprobanteActual.path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition cursor-pointer"
                >
                  Ver archivo
                </a>
                {isEditable && (
                  <button
                    type="button"
                    onClick={handleEliminarComprobanteActual}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition cursor-pointer"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Opción para adjuntar nuevo comprobante */}
        {isEditable && (!comprobanteActual || eliminarComprobanteActual) && (
          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={adjuntarComprobante}
                onChange={handleCheckAdjuntar}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700">
                {eliminarComprobanteActual
                  ? "Adjuntar nuevo comprobante"
                  : "Adjuntar comprobante / factura"}
              </span>
            </label>

            {adjuntarComprobante && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition cursor-pointer">
                    <FiUpload size={18} />
                    Seleccionar archivo
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={handleArchivoChange}
                      className="hidden"
                    />
                  </label>
                  {archivoComprobante && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">
                        {archivoComprobante.name}
                      </span>
                      <button
                        type="button"
                        onClick={eliminarArchivo}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FiX size={20} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Preview para imágenes */}
                {previewUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">
                      Vista previa:
                    </p>
                    <img
                      src={previewUrl}
                      alt="Preview comprobante"
                      className="max-w-xs border border-gray-300 rounded-lg shadow-sm"
                    />
                  </div>
                )}

                <p className="text-sm text-gray-500">
                  Formatos permitidos: JPG, PNG, PDF. Tamaño máximo: 5MB.
                </p>
              </div>
            )}
          </div>
        )}

        <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700 mt-10">
          Detalles (Artículos a Comprar)
        </h3>
        <div className="space-y-6 mb-8">
          {detalles.map((detalle, index) => (
            <div
              key={index}
              className="w-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-end p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm"
            >
              {/* Artículo */}
              <div className="col-span-1 md:col-span-5 flex flex-col">
                <label className="mb-1 font-medium text-sm text-slate-700">
                  Artículo
                </label>
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
                      const syntheticEvent = {
                        target: {
                          name: "id_articulo",
                          value: option ? option.value : "",
                        },
                      };
                      handleDetalleChange(index, syntheticEvent);
                    }}
                    placeholder="Busca o selecciona un artículo..."
                    isClearable
                    isDisabled={!isEditable}
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: "#d1d5db",
                        boxShadow: "none",
                        "&:hover": { borderColor: "#64748b" },
                        borderRadius: "0.5rem",
                      }),
                      menuList: (base) => ({
                        ...base,
                        maxHeight: "250px",
                      }),
                    }}
                    noOptionsMessage={() => "No se encontraron artículos"}
                    loadingMessage={() => "Cargando artículos..."}
                  />
                  {detalle.precio_unitario !== detalle.precio_costo_original &&
                    detalle.precio_costo_original !== undefined && (
                      <span
                        className="text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 pointer-events-none shadow-sm"
                        title={`Precio costo actual: ${formatCurrency(detalle.precio_costo_original)}`}
                      >
                        se actualizará costo
                      </span>
                    )}
                </div>
              </div>

              {/* Cantidad */}
              <div className="col-span-1 md:col-span-1 flex flex-col">
                <label className="mb-1 font-medium text-sm text-slate-700">
                  Cantidad
                </label>
                <input
                  type="number"
                  name="cantidad"
                  value={detalle.cantidad}
                  onChange={(e) => handleDetalleChange(index, e)}
                  min="1"
                  required
                  disabled={!isEditable}
                  className="border border-gray-300 rounded-lg px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right w-[70px]"
                />
              </div>

              {/* Precio Unitario y Subtotal en fila con espacio */}
              <div className="col-span-2 md:col-span-4 flex flex-row gap-6 items-end">
                <div className="flex flex-col flex-1 justify-end">
                  <label className="mb-1 font-medium text-sm text-slate-700">
                    Precio Unitario (COP)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-gray-400 flex items-center h-full">
                      <FiDollarSign size={18} />
                    </span>
                    <input
                      type="text"
                      name="precio_unitario"
                      value={formatCurrency(detalle.precio_unitario)}
                      onChange={(e) => handleDetalleChange(index, e)}
                      required
                      disabled={!isEditable}
                      style={{ paddingLeft: 36 }}
                      className="border border-gray-300 rounded-lg pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right w-full h-[44px] min-w-[250px]"
                    />
                  </div>
                </div>
                <div className="flex flex-col flex-1 justify-end">
                  <label className="mb-1 font-medium text-sm text-slate-700">
                    Subtotal
                  </label>
                  <p className="border border-gray-300 rounded-lg pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right h-[44px] overflow-x-auto overflow-y-hidden whitespace-nowrap select-none min-w-[300px] max-w-[450px]">
                    {formatCurrency(
                      calcularSubtotal(
                        detalle.cantidad,
                        detalle.precio_unitario,
                      ),
                    )}
                  </p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex items-stretch justify-end ">
                <button
                  type="button"
                  onClick={() => handleRemoveDetalle(index)}
                  disabled={detalles.length === 1 || !isEditable}
                  className="cursor-pointer bg-red-500 text-white w-[44px] h-[44px] rounded-lg hover:bg-red-600 disabled:bg-red-300 transition shadow-md flex items-center justify-center ml-auto"
                  title="Eliminar artículo"
                >
                  <FiTrash2 size={20} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddDetalle}
            disabled={!isEditable}
            className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold transition mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FiPlus size={20} />
            Agregar Artículo
          </button>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-10">
          <div className="text-xl font-bold text-slate-700">
            Total General:{" "}
            <span className="text-3xl text-green-700 ml-2">
              {formatCurrency(totalGeneral)}
            </span>
          </div>

          <button
            type="submit"
            disabled={!isEditable}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg cursor-pointer"
          >
            <FiSave size={20} />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarOrdenCompra;
