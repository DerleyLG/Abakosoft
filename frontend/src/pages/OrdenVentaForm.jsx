import React, { useEffect, useState, useMemo } from "react";
import { Listbox } from "@headlessui/react";
import { X, DollarSign } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

// --- FUNCIÓN DE UTILIDAD: Formato de Moneda ---
const formatCurrency = (value) => {
  // Si el valor es nulo, indefinido, o no es un número válido después de la limpieza
  if (value === null || value === undefined || isNaN(value) || value === "") {
    return "";
  }
  const numericValue = Number(value);

  return numericValue.toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const OrdenVentaForm = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Datos Maestros
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  // Estados del Formulario
  const [cliente, setCliente] = useState(null); // Objeto cliente
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("completada");
  const [metodoPago, setMetodoPago] = useState(null); // Debe ser Objeto metodoPago
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);

  // Estado para manejar el foco y el valor sin formato del precio (¡NUEVO!)
  const [focusedPrice, setFocusedPrice] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pedidoData } = location.state || {};

  const estados = [
    { id: "pendiente", nombre: "Pendiente" },
    { id: "completada", nombre: "Completada" },
    { id: "anulada", nombre: "Anulada" },
  ];

  // --- LÓGICA DE MANEJO DE PRECIO CORREGIDA ---

  const handlePriceChange = (id_articulo, value) => {
    // 1. Actualizar el valor enfocado (el que se muestra sin formato)
    // Se guarda tal cual lo ingresa el usuario (permite puntos y comas temporalmente)
    setFocusedPrice((prev) => ({
      ...prev,
      [id_articulo]: value,
    }));

    // 2. Sanitizar el valor para el estado numérico (el que se usará en los cálculos y al guardar):
    // Como 'formatCurrency' usa minimumFractionDigits: 0, solo nos interesan los dígitos.
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    const numericValue = Number(sanitizedValue);

    // 3. Actualizar el estado con el valor numérico (para los cálculos)
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numericValue }
          : a
      )
    );
  };

  const handlePriceFocus = (id_articulo, value) => {
    // 4. Al hacer foco, se guarda el valor numérico como string sin formato
    // Para obtener el valor sin formato, usamos el precio_unitario del estado
    setFocusedPrice((prev) => ({
      ...prev,
      // Convertimos el valor numérico (art.precio_unitario) a string para edición
      [id_articulo]: String(value),
    }));
  };

  const handlePriceBlur = (id_articulo) => {
    // 5. Al perder foco, se elimina el valor del estado focusedPrice para que se aplique el formato
    setFocusedPrice((prev) => {
      const newFocused = { ...prev };
      delete newFocused[id_articulo];
      return newFocused;
    });
  };

  // --- Fin Lógica de Precio ---

  useEffect(() => {
    const cargarDatosYPrecargarFormulario = async () => {
      try {
        const [clientesRes, articulosRes, metodosPagoRes] = await Promise.all([
          api.get("/clientes"),
          api.get("/ordenes-venta/articulos-con-stock"),
          api.get("/tesoreria/metodos-pago"),
        ]);

        const clientesAPI = clientesRes.data;
        const articulosAPI = articulosRes.data;
        const metodosPagoAPI = metodosPagoRes.data;

        setClientes(clientesAPI);
        setArticulos(articulosAPI); // Ya viene filtrado desde el backend
        setMetodosPago(metodosPagoAPI);

        // Precarga desde Pedido
        const { pedidoData } = location.state || {};
        if (pedidoData) {
          const clienteExistente = clientesAPI.find(
            (c) => c.id_cliente === pedidoData.id_cliente
          );
          if (clienteExistente) {
            setCliente(clienteExistente);
          }

          // Fecha de la venta: AUTOMÁTICA (hoy). No se toma la del pedido.
          setFecha(new Date().toISOString().split("T")[0]);

          const articulosDelPedido = pedidoData.detalles.map((item) => ({
            id_articulo: item.id_articulo,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            // Asegurar que el precio es un número válido
            precio_unitario: Number(item.precio_unitario) || 0,
          }));
          setArticulosSeleccionados(articulosDelPedido);
          toast.success(
            "Datos del pedido cargados. Por favor, revisa y completa los campos."
          );
        } else {
          // Fecha automática siempre: hoy (solo display interno, no se envía)
          setFecha(new Date().toISOString().split("T")[0]);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("Error al cargar los datos iniciales.");
      }
    };

    cargarDatosYPrecargarFormulario();
  }, [location.state]); // Dependencia location.state está correcta

  const verificarYAgregarAlInventario = async (idArticulo, descripcionArticulo) => {
    try {
      await api.get(`/inventario/${idArticulo}`);
      return true; // Artículo encontrado en inventario
    } catch (error) {
      if (error.response?.status === 404) {
        let seAceptoAgregar = false;
        await new Promise((resolve) => {
          confirmAlert({
            title: "Artículo no encontrado en Inventario",
            message: `El artículo "${descripcionArticulo}" no está inicializado en el inventario. ¿Desea agregarlo con stock 0 para continuar?`,
            buttons: [
              {
                label: "Sí",
                onClick: async () => {
                  try {
                    await api.post("/inventario/inicializar", {
                      id_articulo: Number(idArticulo),
                    });
                    toast.success("Artículo agregado al inventario con stock 0");
                    seAceptoAgregar = true;
                  } catch (err) {
                    toast.error(
                      "Error al agregar al inventario: " +
                        (err.response?.data?.message || err.message)
                    );
                  }
                  resolve();
                },
              },
              {
                label: "No",
                onClick: () => {
                  toast.error("Operación cancelada. El artículo no fue inicializado.");
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
            (error.response?.data?.message || error.message)
        );
        return false;
      }
    }
  };

  const agregarArticulo = async (articulo) => {
    if (!articulo) {
      setArticuloSeleccionado(null);
      return;
    }

    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.value
    );
    if (yaExiste) {
      toast.error("El artículo ya está en la lista.");
      setArticuloSeleccionado(null);
      return;
    }

    const puedeAgregar = await verificarYAgregarAlInventario(
      articulo.value,
      articulo.descripcion
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
        precio_unitario: Number(articulo.precio_venta) || 0,
      },
    ]);
    setArticuloSeleccionado(null);
  };

  const eliminarArticulo = (id_articulo) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id_articulo !== id_articulo)
    );
  };

  const cambiarCantidad = (id_articulo, cantidadString) => {
    const cantidad = parseInt(cantidadString, 10);
    // Permite dejar el campo vacío temporalmente, pero no guardar un valor inválido
    if (cantidadString === "" || (isNaN(cantidad) && cantidadString !== "")) {
      setArticulosSeleccionados((prev) =>
        prev.map((a) =>
          a.id_articulo === id_articulo ? { ...a, cantidad: 0 } : a
        )
      );
      return;
    }

    if (cantidad < 1) return; // Si intenta poner 0 o negativo, ignora

    setArticulosSeleccionados((prev) =>
      prev.map((a) => (a.id_articulo === id_articulo ? { ...a, cantidad } : a))
    );
  };

  const validarFormulario = () => {
    if (!cliente) {
      toast.error("Selecciona un cliente");
      return false;
    }
    // Fecha ya no es editable ni requerida desde el cliente
    if (!metodoPago || !metodoPago.id_metodo_pago) {
      toast.error("Selecciona un método de pago");
      return false;
    }
    if (!estado) {
      toast.error("Selecciona un estado");
      return false;
    }
    if (articulosSeleccionados.length === 0) {
      toast.error("Agrega al menos un artículo");
      return false;
    }

    // Validación de Cantidad y Precio > 0
    const detallesInvalidos = articulosSeleccionados.some(
      (d) =>
        !d.id_articulo ||
        d.cantidad <= 0 ||
        d.precio_unitario <= 0 ||
        isNaN(d.cantidad) ||
        isNaN(d.precio_unitario)
    );
    if (detallesInvalidos) {
      toast.error(
        "Asegúrate de que todos los artículos tengan cantidad y precio válidos (> 0)."
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;
    if (isSubmitting) return; // Prevenir múltiples envíos

    setIsSubmitting(true);

    const payload = {
      id_cliente: cliente.id_cliente,
      // fecha se determina en el backend (ignora inputs del cliente)
      estado,
      detalles: articulosSeleccionados.map((a) => ({
        id_articulo: a.id_articulo,
        cantidad: a.cantidad,
        precio_unitario: a.precio_unitario,
      })),

      id_metodo_pago: metodoPago.id_metodo_pago,
      referencia,
      observaciones_pago: observaciones,
      id_pedido: pedidoData?.id_pedido || null,
    };

    try {
      // 1. Crear orden
      const ordenRes = await api.post("/ordenes-venta", payload);
      // Algunos entornos pueden devolver diferentes nombres de campo; robustecemos la lectura
      const id_orden_venta =
        ordenRes?.data?.id_orden_venta ??
        ordenRes?.data?.id ??
        ordenRes?.data?.insertId ??
        null;

      // Nota: el backend ya crea el movimiento en tesorería cuando el método
      // de pago no es 'credito' (ver lógica en ordenesVentaController).
      // Por eso evitamos hacer aquí un POST duplicado a /tesoreria/movimientos.
      if (metodoPago.tipo === "credito") {
        toast("Orden registrada como crédito. Pendiente de pago.");
      }

      toast.success("Orden de venta creada correctamente");
      navigate("/ordenes_venta");
    } catch (error) {
      setIsSubmitting(false);
      // Mejor extracción del mensaje del backend y logging detallado
      const respData = error?.response?.data;
      let mensajeBackend = "Error al crear la orden de venta.";
      try {
        if (respData?.error) mensajeBackend = respData.error;
        else if (respData?.message) mensajeBackend = respData.message;
        else if (typeof respData === "string") mensajeBackend = respData;
      } catch (e) {}
      console.error("Error al enviar formulario:", {
        message: error?.message,
        status: error?.response?.status,
        responseData: respData,
        stack: error?.stack,
      });
      toast.error(mensajeBackend);
    }
  };

  const totalGeneral = useMemo(
    () =>
      articulosSeleccionados.reduce(
        (sum, detalle) =>
          sum +
          (Number(detalle.cantidad) || 0) *
            (Number(detalle.precio_unitario) || 0),
        0
      ),
    [articulosSeleccionados]
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nueva Orden de Venta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sección: Información General y Tesorería */}
          <h3 className="text-2xl font-semibold mb-4 text-slate-700">
            Detalles Generales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
              </label>
              <Listbox value={cliente} onChange={setCliente}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                    {cliente ? cliente.nombre : "Selecciona un cliente"}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {Array.isArray(clientes) && clientes.length > 0 ? (
                      clientes.map((c) => (
                        <Listbox.Option
                          key={c.id_cliente}
                          value={c}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2 ${
                              active ? "bg-slate-100" : ""
                            }`
                          }
                        >
                          {c.nombre}
                        </Listbox.Option>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        No hay clientes disponibles
                      </div>
                    )}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Campo de fecha removido: la fecha la define el backend (no visible en UI) */}

            {/* Estado */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <Listbox value={estado} onChange={setEstado}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                    {estados.find((e) => e.id === estado)?.nombre ||
                      "Selecciona un estado"}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {estados.map((e) => (
                      <Listbox.Option
                        key={e.id}
                        value={e.id}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active ? "bg-slate-100" : ""
                          }`
                        }
                      >
                        {e.nombre}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Método de Pago */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <Listbox value={metodoPago} onChange={setMetodoPago}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                    {metodoPago
                      ? metodoPago.nombre
                      : "Selecciona un método de pago"}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {Array.isArray(metodosPago) && metodosPago.length > 0 ? (
                      metodosPago.map((m) => (
                        <Listbox.Option
                          key={m.id_metodo_pago}
                          value={m}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2 ${
                              active ? "bg-slate-100" : ""
                            }`
                          }
                        >
                          {m.nombre}
                        </Listbox.Option>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">
                        No hay métodos de pago disponibles
                      </div>
                    )}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Referencia
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                placeholder="Ej: N° de comprobante, tarjeta"
              />
            </div>

            {/* Observaciones (Pago) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Observaciones (Pago)
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                placeholder="Notas adicionales sobre el pago"
              />
            </div>
          </div>

          {/* Sección: Artículos */}
          <h3 className="text-2xl font-semibold mb-4 border-t pt-6 text-slate-700">
            Artículos de Venta
          </h3>

          {/* Selector de Artículos */}
          <div className="w-full">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Artículo
            </label>
            <Select
              options={articulos.map((a) => {
                const stockText = a.stock !== undefined ? ` (Stock: ${a.stock})` : '';
                return {
                  value: a.id_articulo,
                  label: a.referencia ? `${a.referencia} - ${a.descripcion}${stockText}` : `${a.descripcion}${stockText}`,
                  precio_venta: a.precio_venta,
                  ...a,
                };
              })}
              value={articuloSeleccionado}
              onChange={(option) => {
                if (option) {
                  agregarArticulo(option);
                }
              }}
              placeholder="Buscar por referencia o descripción..."
              isClearable
              className="text-sm"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#d1d5db",
                  boxShadow: "none",
                  "&:hover": { borderColor: "#64748b" },
                  borderRadius: "0.375rem",
                }),
              }}
            />
          </div>

          {/* Lista de artículos seleccionados */}
          <div>
            <h3 className="text-xl font-semibold mb-3 text-gray-800">
              Detalle de la Orden
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full table-auto border-collapse border border-gray-300 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="px-4 py-2 text-left w-1/2 border-r">
                      Descripción
                    </th>
                    <th className="px-4 py-2 text-center w-1/6 border-r">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-right w-1/6 border-r">
                      Precio Unitario (COP)
                    </th>
                    <th className="px-4 py-2 text-right w-1/6">Subtotal</th>
                    <th className="px-4 py-2 text-center w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {articulosSeleccionados.map((art) => (
                    <tr
                      key={art.id_articulo}
                      className="even:bg-gray-50 border-t"
                    >
                      <td className="px-4 py-2 border-r">{art.descripcion}</td>

                      {/* Campo Cantidad */}
                      <td className="px-4 py-2 text-center border-r">
                        <input
                          type="number"
                          min="1"
                          value={art.cantidad === 0 ? "" : art.cantidad} // Mostrar vacío si es 0 (para mejor edición)
                          onChange={(e) =>
                            cambiarCantidad(art.id_articulo, e.target.value)
                          }
                          className="w-20 border border-gray-300 rounded-md px-2 py-1 text-right focus:ring-slate-600 focus:border-slate-600"
                        />
                      </td>

                      {/* Campo Precio Unitario CORREGIDO */}
                      <td className="px-4 py-2 text-right border-r">
                        <div className="relative">
                          <input
                            type="text"
                            // Mostrar valor sin formato al enfocar, sino formateado
                            value={
                              focusedPrice[art.id_articulo] !== undefined
                                ? focusedPrice[art.id_articulo]
                                : formatCurrency(art.precio_unitario)
                            }
                            onChange={(e) =>
                              handlePriceChange(art.id_articulo, e.target.value)
                            }
                            onFocus={() =>
                              handlePriceFocus(
                                art.id_articulo,
                                art.precio_unitario
                              )
                            }
                            onBlur={() => handlePriceBlur(art.id_articulo)}
                            className="w-full border border-gray-300 rounded-md pl-8 pr-2 py-1 text-right focus:ring-slate-600 focus:border-slate-600 
                                                                    appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" // Quita los spinners
                          />
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                      </td>

                      {/* Subtotal */}
                      <td className="px-4 py-2 text-right font-semibold text-slate-700">
                        {formatCurrency(art.cantidad * art.precio_unitario)}
                      </td>

                      {/* Eliminar */}
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          className="text-red-600 hover:text-red-800 cursor-pointer p-1 rounded hover:bg-red-100 transition"
                          title="Eliminar artículo"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {articulosSeleccionados.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-4 text-gray-500"
                      >
                        Aún no has agregado artículos.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-200 font-bold border-t-2 border-slate-700">
                    <td colSpan="3" className="px-4 py-3 text-right text-xl">
                      Total General:
                    </td>
                    <td className="px-4 py-3 text-right text-green-700 text-xl">
                      {formatCurrency(totalGeneral)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t pt-6">
            <button
              type="button"
              onClick={() => navigate("/ordenes_venta")}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Orden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdenVentaForm;
