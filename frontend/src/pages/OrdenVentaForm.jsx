import React, { useEffect, useState, useMemo } from "react";
import { Listbox } from "@headlessui/react";
import { X, DollarSign } from "lucide-react";
import {
  FiArrowLeft,
  FiPlus,
  FiShoppingCart,
  FiChevronDown,
} from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const formatCurrency = (value) => {
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
  const idempotencyKey = useIdempotencyKey();
  const idempotencyKeyInicializar = useIdempotencyKey();

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

  // Estado para manejar el foco y el valor sin formato del precio
  const [focusedPrice, setFocusedPrice] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pedidoData } = location.state || {};

  // Saldo a favor
  const [usarSaldoFavor, setUsarSaldoFavor] = useState(false);
  const [montoSaldoFavor, setMontoSaldoFavor] = useState("");
  const [saldoAplicado, setSaldoAplicado] = useState(false);
  const [saldoFavorDisponible, setSaldoFavorDisponible] = useState(0);

  const estados = [
    { id: "pendiente", nombre: "Pendiente" },
    { id: "completada", nombre: "Completada" },
    { id: "anulada", nombre: "Anulada" },
  ];

  // Al seleccionar cliente, obtener su saldo a favor
  useEffect(() => {
    if (cliente?.id_cliente) {
      setSaldoFavorDisponible(Number(cliente.saldo_favor) || 0);
      setUsarSaldoFavor(false);
      setMontoSaldoFavor("");
      setSaldoAplicado(false);
    }
  }, [cliente]);

  // Formateo en vivo tipo máscara para precio unitario
  const handlePriceChange = (id_articulo, value) => {
    // Extraer solo dígitos
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    // Mostrar siempre formateado en el input
    setFocusedPrice((prev) => ({
      ...prev,
      [id_articulo]: sanitizedValue
        ? Number(sanitizedValue).toLocaleString("es-CO")
        : "",
    }));
    // Guardar valor numérico en el estado de artículos
    const numericValue = Number(sanitizedValue);
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numericValue }
          : a,
      ),
    );
  };

  // Siempre se muestra formateado
  const handlePriceFocus = () => {};
  const handlePriceBlur = () => {};

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
            (c) => c.id_cliente === pedidoData.id_cliente,
          );
          if (clienteExistente) {
            setCliente(clienteExistente);
          }

          // Fecha de la venta: AUTOMÁTICA
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
            "Datos del pedido cargados. Por favor, revisa y completa los campos.",
          );
        } else {
          // Fecha automática siempre: hoy
          setFecha(new Date().toISOString().split("T")[0]);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
        toast.error("Error al cargar los datos iniciales.");
      }
    };

    cargarDatosYPrecargarFormulario();
  }, [location.state]); // Dependencia location.state está correcta

  const verificarYAgregarAlInventario = async (
    idArticulo,
    descripcionArticulo,
  ) => {
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
    }
  };

  const agregarArticulo = async (articulo) => {
    if (!articulo) {
      setArticuloSeleccionado(null);
      return;
    }

    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.value,
    );
    if (yaExiste) {
      toast.error("El artículo ya está en la lista.");
      setArticuloSeleccionado(null);
      return;
    }

    const puedeAgregar = await verificarYAgregarAlInventario(
      articulo.value,
      articulo.descripcion,
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
      prev.filter((a) => a.id_articulo !== id_articulo),
    );
  };

  const cambiarCantidad = (id_articulo, cantidadString) => {
    const cantidad = parseInt(cantidadString, 10);
    // Permite dejar el campo vacío temporalmente, pero no guardar un valor inválido
    if (cantidadString === "" || (isNaN(cantidad) && cantidadString !== "")) {
      setArticulosSeleccionados((prev) =>
        prev.map((a) =>
          a.id_articulo === id_articulo ? { ...a, cantidad: 0 } : a,
        ),
      );
      return;
    }

    if (cantidad < 1) return; // Si intenta poner 0 o negativo, ignora

    setArticulosSeleccionados((prev) =>
      prev.map((a) => (a.id_articulo === id_articulo ? { ...a, cantidad } : a)),
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
        isNaN(d.precio_unitario),
    );
    if (detallesInvalidos) {
      toast.error(
        "Asegúrate de que todos los artículos tengan cantidad y precio válidos (> 0).",
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

    const montoSF =
      usarSaldoFavor && saldoAplicado
        ? Math.min(
            Number(montoSaldoFavor) || 0,
            saldoFavorDisponible,
            totalGeneral,
          )
        : 0;

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
      monto_saldo_favor: montoSF,
    };

    try {
      // 1. Crear orden
      const ordenRes = await api.post("/ordenes-venta", payload, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
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
        0,
      ),
    [articulosSeleccionados],
  );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/ordenes_venta")}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-colors cursor-pointer"
        >
          <FiArrowLeft size={16} />
        </button>
        <div>
          <p className="text-xs text-slate-400 font-medium">Órdenes de Venta</p>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Nueva Orden de Venta
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Card: Detalles Generales */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
            Información General
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Cliente <span className="text-red-500">*</span>
              </label>
              <Listbox value={cliente} onChange={setCliente}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent flex items-center justify-between cursor-pointer">
                    <span
                      className={cliente ? "text-slate-800" : "text-slate-400"}
                    >
                      {cliente ? cliente.nombre : "Selecciona un cliente"}
                    </span>
                    <FiChevronDown
                      size={14}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto text-sm">
                    {Array.isArray(clientes) && clientes.length > 0 ? (
                      clientes.map((c) => (
                        <Listbox.Option
                          key={c.id_cliente}
                          value={c}
                          className={({ active }) =>
                            `cursor-pointer select-none px-3 py-2 ${active ? "bg-slate-50 text-slate-900" : "text-slate-700"}`
                          }
                        >
                          {c.nombre}
                        </Listbox.Option>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-slate-400">
                        No hay clientes disponibles
                      </div>
                    )}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Estado
              </label>
              <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 select-none cursor-not-allowed">
                {estados.find((e) => e.id === estado)?.nombre || estado}
              </div>
            </div>
          </div>
        </div>

        {/* Card: Información de Pago */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
            Información de Pago
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Método de Pago */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Método de Pago <span className="text-red-500">*</span>
              </label>
              <Listbox value={metodoPago} onChange={setMetodoPago}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-left bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent flex items-center justify-between cursor-pointer">
                    <span
                      className={
                        metodoPago ? "text-slate-800" : "text-slate-400"
                      }
                    >
                      {metodoPago
                        ? metodoPago.nombre
                        : "Selecciona un método de pago"}
                    </span>
                    <FiChevronDown
                      size={14}
                      className="text-slate-400 flex-shrink-0"
                    />
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto text-sm">
                    {Array.isArray(metodosPago) && metodosPago.length > 0 ? (
                      metodosPago.map((m) => (
                        <Listbox.Option
                          key={m.id_metodo_pago}
                          value={m}
                          className={({ active }) =>
                            `cursor-pointer select-none px-3 py-2 ${active ? "bg-slate-50 text-slate-900" : "text-slate-700"}`
                          }
                        >
                          {m.nombre}
                        </Listbox.Option>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-slate-400">
                        No hay métodos de pago disponibles
                      </div>
                    )}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            {/* Referencia */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Referencia
              </label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                placeholder="Ej: N° de comprobante, tarjeta"
              />
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                placeholder="Notas adicionales sobre el pago"
              />
            </div>
          </div>

          {/* ── Saldo a favor ── */}
          {cliente && saldoFavorDisponible > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Saldo a favor
                    </p>
                    <p className="text-xs text-slate-400">
                      {cliente.nombre} — {formatCurrency(saldoFavorDisponible)}
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={usarSaldoFavor}
                    onChange={(e) => {
                      setUsarSaldoFavor(e.target.checked);
                      setSaldoAplicado(false);
                      if (!e.target.checked) setMontoSaldoFavor("");
                      else
                        setMontoSaldoFavor(
                          String(Math.min(saldoFavorDisponible, totalGeneral)),
                        );
                    }}
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-slate-800 transition-colors" />
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${usarSaldoFavor ? "translate-x-4" : ""}`}
                  />
                </label>
              </div>

              {usarSaldoFavor && (
                <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  {/* Selector */}
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      ¿Cuánto deseas usar?
                    </p>
                    <div className="flex items-center gap-2">
                      {[25, 50, 75, 100].map((pct) => {
                        const montoPct = Math.min(
                          Math.round((saldoFavorDisponible * pct) / 100),
                          totalGeneral,
                        );
                        return (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              setMontoSaldoFavor(String(montoPct));
                              setSaldoAplicado(true);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all cursor-pointer ${
                              Number(montoSaldoFavor) === montoPct
                                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }`}
                          >
                            {pct}%
                          </button>
                        );
                      })}
                      <div className="relative flex-[2]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                          $
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={
                            Number(montoSaldoFavor) > 0
                              ? Number(montoSaldoFavor).toLocaleString("es-CO")
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            const num = Number(raw) || 0;
                            setMontoSaldoFavor(
                              String(
                                Math.min(
                                  num,
                                  saldoFavorDisponible,
                                  totalGeneral,
                                ),
                              ),
                            );
                            setSaldoAplicado(true);
                          }}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-300"
                          placeholder="Otro valor"
                        />
                      </div>
                      {Number(montoSaldoFavor) > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setMontoSaldoFavor("");
                            setSaldoAplicado(false);
                          }}
                          className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Limpiar"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resumen */}
                  <div className="px-4 py-3 grid grid-cols-4 gap-4 bg-slate-50">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Total
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {formatCurrency(totalGeneral)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Saldo
                      </p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5">
                        {formatCurrency(saldoFavorDisponible)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Descuento
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${Number(montoSaldoFavor) > 0 ? "text-amber-600" : "text-slate-300"}`}
                      >
                        {Number(montoSaldoFavor) > 0
                          ? `-${formatCurrency(Number(montoSaldoFavor))}`
                          : "—"}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Neto
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {formatCurrency(
                          Math.max(
                            0,
                            totalGeneral - (Number(montoSaldoFavor) || 0),
                          ),
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
                    {!saldoAplicado ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!montoSaldoFavor || Number(montoSaldoFavor) <= 0)
                            return toast.error(
                              "Selecciona un monto a descontar",
                            );
                          setSaldoAplicado(true);
                        }}
                        disabled={
                          !montoSaldoFavor || Number(montoSaldoFavor) <= 0
                        }
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer disabled:cursor-not-allowed"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Aplicar descuento
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSaldoAplicado(false)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Quitar descuento
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card: Artículos */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
            Artículos de Venta
          </h2>

          {/* Selector */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Agregar artículo
            </label>
            <Select
              options={articulos.map((a) => {
                const stockText =
                  a.stock !== undefined ? ` (Stock: ${a.stock})` : "";
                return {
                  value: a.id_articulo,
                  label: a.referencia
                    ? `${a.referencia} - ${a.descripcion}${stockText}`
                    : `${a.descripcion}${stockText}`,
                  precio_venta: a.precio_venta,
                  ...a,
                };
              })}
              value={articuloSeleccionado}
              onChange={(option) => {
                if (option) agregarArticulo(option);
              }}
              placeholder="Buscar por referencia o descripción…"
              isClearable
              className="text-sm"
              menuPortalTarget={document.body}
              menuShouldScrollIntoView={false}
              openMenuOnFocus={true}
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: state.isFocused ? "transparent" : "#e2e8f0",
                  boxShadow: state.isFocused
                    ? "0 0 0 2px #94a3b8"
                    : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                  borderRadius: "0.5rem",
                  "&:hover": { borderColor: "#cbd5e1" },
                }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isSelected
                    ? "#1e293b"
                    : state.isFocused
                      ? "#f8fafc"
                      : "white",
                  color: state.isSelected ? "white" : "#334155",
                  fontSize: "0.875rem",
                }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                menu: (base) => ({ ...base, zIndex: 9999 }),
              }}
            />
          </div>

          {/* Tabla artículos */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-32">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-44">
                    Precio Unit. (COP)
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-40">
                    Subtotal
                  </th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <FiShoppingCart size={28} className="opacity-40" />
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

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={art.cantidad === 0 ? "" : art.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(art.id_articulo, e.target.value)
                          }
                          className="w-20 border border-slate-200 rounded-lg px-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="relative inline-flex items-center">
                          <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5 pointer-events-none" />
                          <input
                            type="text"
                            value={
                              focusedPrice[art.id_articulo] !== undefined
                                ? focusedPrice[art.id_articulo]
                                : art.precio_unitario
                                  ? Number(art.precio_unitario).toLocaleString(
                                      "es-CO",
                                    )
                                  : ""
                            }
                            onChange={(e) =>
                              handlePriceChange(art.id_articulo, e.target.value)
                            }
                            className="w-36 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                        {formatCurrency(art.cantidad * art.precio_unitario)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                          title="Eliminar artículo"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {articulosSeleccionados.length > 0 && (
                <tfoot>
                  {saldoAplicado && Number(montoSaldoFavor) > 0 && (
                    <tr className="border-t border-slate-100 bg-slate-50/70">
                      <td
                        colSpan="3"
                        className="px-4 py-2 text-right text-xs text-slate-500"
                      >
                        Saldo a favor aplicado
                      </td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-emerald-600 tabular-nums">
                        -{formatCurrency(Number(montoSaldoFavor))}
                      </td>
                      <td></td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td
                      colSpan="3"
                      className="px-4 py-3 text-right text-sm font-bold text-slate-700"
                    >
                      {saldoAplicado ? "Neto a pagar" : "Total General"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold text-lg tabular-nums ${saldoAplicado ? "text-slate-800" : "text-emerald-700"}`}
                    >
                      {saldoAplicado
                        ? formatCurrency(
                            Math.max(
                              0,
                              totalGeneral - (Number(montoSaldoFavor) || 0),
                            ),
                          )
                        : formatCurrency(totalGeneral)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate("/ordenes_venta")}
            className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 shadow-sm transition-colors ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {isSubmitting ? "Guardando…" : "Guardar Orden"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrdenVentaForm;
