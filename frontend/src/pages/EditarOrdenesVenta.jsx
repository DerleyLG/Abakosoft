import React, { useEffect, useState, useMemo } from "react";
import { Listbox } from "@headlessui/react";
import { X } from "lucide-react";
import {
  FiArrowLeft,
  FiDollarSign,
  FiTrash2,
  FiPlus,
  FiSave,
} from "react-icons/fi";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";

const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value) || value === "") {
    return "";
  }
  return Number(value).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const OrdenVentaEdit = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [vieneDeUndefined, setVieneDeUndefined] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [metodoPago, setMetodoPago] = useState(null);
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [focusedPrice, setFocusedPrice] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // --- LÓGICA DE MANEJO DE PRECIO ---
  const handlePriceChange = (id_articulo, value) => {
    setFocusedPrice((prev) => ({ ...prev, [id_articulo]: value }));
    const sanitizedValue = value.replace(/[^0-9]/g, "");
    const numericValue = Number(sanitizedValue);
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numericValue }
          : a,
      ),
    );
  };
  const handlePriceFocus = (id_articulo, value) => {
    setFocusedPrice((prev) => ({ ...prev, [id_articulo]: String(value) }));
  };
  const handlePriceBlur = (id_articulo) => {
    setFocusedPrice((prev) => {
      const newFocused = { ...prev };
      delete newFocused[id_articulo];
      return newFocused;
    });
  };
  // ...existing code...

  // Carga el método de pago desde movimiento o desde la orden si no hay movimiento
  const fetchMetodoPago = async (ordenId, metodosPagoAPI, ordenData) => {
    try {
      const resMovimiento = await api.get(
        `/tesoreria/documento/${ordenId}?tipo=orden_venta`,
      );
      const movimiento = resMovimiento.data;
      if (movimiento) {
        const metodoPagoExistente = metodosPagoAPI.find(
          (m) => m.id_metodo_pago == movimiento.id_metodo_pago,
        );
        if (metodoPagoExistente) setMetodoPago(metodoPagoExistente);
        setReferencia(movimiento.referencia || "");
        setObservaciones(movimiento.observaciones || "");
      } else if (ordenData && ordenData.id_metodo_pago) {
        const metodoPagoOrden = metodosPagoAPI.find(
          (m) => m.id_metodo_pago == ordenData.id_metodo_pago,
        );
        if (metodoPagoOrden) setMetodoPago(metodoPagoOrden);
        setReferencia(ordenData.referencia_pago || "");
        setObservaciones(ordenData.observaciones_pago || "");
      } else {
        setMetodoPago(null);
        setReferencia("");
        setObservaciones("");
      }
    } catch (error) {
      // Si hay error, intentar cargar desde la orden
      if (ordenData && ordenData.id_metodo_pago) {
        const metodoPagoOrden = metodosPagoAPI.find(
          (m) => m.id_metodo_pago == ordenData.id_metodo_pago,
        );
        if (metodoPagoOrden) setMetodoPago(metodoPagoOrden);
        setReferencia(ordenData.referencia_pago || "");
        setObservaciones(ordenData.observaciones_pago || "");
      } else {
        setMetodoPago(null);
        setReferencia("");
        setObservaciones("");
      }
    }
  };

  const agregarArticulo = (articulo) => {
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

  const cambiarCantidad = (id_articulo, cantidad) => {
    const cant = Number(cantidad);
    if (cant < 1 || isNaN(cant)) return;
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, cantidad: cant } : a,
      ),
    );
  };

  const calcularSubtotal = (cantidad, precio) => {
    const cant = Number(cantidad) || 0;
    const prec = Number(precio) || 0;
    return cant * prec;
  };

  const calcularTotalGeneral = () => {
    return articulosSeleccionados.reduce(
      (sum, detalle) =>
        sum + calcularSubtotal(detalle.cantidad, detalle.precio_unitario),
      0,
    );
  };

  const totalGeneral = useMemo(calcularTotalGeneral, [articulosSeleccionados]);

  useEffect(() => {
    const cargarDatosYFormulario = async () => {
      try {
        setLoading(true);

        const [clientesRes, articulosRes, metodosPagoRes, ordenRes] =
          await Promise.all([
            api.get("/clientes"),
            api.get("/ordenes-venta/articulos-con-stock"),
            api.get("/tesoreria/metodos-pago"),
            api.get(`/ordenes-venta/${id}`),
          ]);

        const clientesAPI = clientesRes.data;
        const articulosAPI = articulosRes.data; // Ya viene filtrado desde el backend
        const metodosPagoAPI = metodosPagoRes.data;
        const ordenData = ordenRes.data;

        setClientes(clientesAPI);
        setArticulos(articulosAPI); // Ya viene filtrado
        setMetodosPago(metodosPagoAPI);

        // Verificar si la orden viene de un pedido
        const vieneDeUndefinedOrden =
          ordenData.id_pedido == null || ordenData.id_pedido === undefined;
        setVieneDeUndefined(vieneDeUndefinedOrden);

        // Si viene de un pedido, mostrar mensaje y no permitir edición
        if (!vieneDeUndefinedOrden) {
          toast.error(
            "Esta orden proviene de un pedido y no puede ser editada directamente.",
          );
        }

        setEstado(ordenData.estado);

        const clienteExistente = clientesAPI.find(
          (c) => c.id_cliente === ordenData.id_cliente,
        );
        if (clienteExistente) {
          setCliente(clienteExistente);
          setSaldoFavorDisponible(Number(clienteExistente.saldo_favor) || 0);
          // Si la orden ya tenía saldo a favor aplicado
          const totalOrd = Number(ordenData.total || 0);
          const montoOrd = Number(ordenData.monto || 0);
          if (montoOrd < totalOrd) {
            const saldoUsado = totalOrd - montoOrd;
            setUsarSaldoFavor(true);
            setSaldoAplicado(true);
            setMontoSaldoFavor(String(saldoUsado));
          }
        }

        await fetchMetodoPago(id, metodosPagoAPI, ordenData);

        let detalles = ordenData.detalles;

        if (!detalles) {
          const detallesRes = await api.get(`/detalle-orden-venta/${id}`);
          detalles = detallesRes.data;
        }

        const articulosDeLaOrden = Array.isArray(detalles)
          ? detalles.map((item) => ({
              id_articulo: item.id_articulo,
              descripcion:
                item.descripcion ||
                articulosAPI.find((a) => a.id_articulo === item.id_articulo)
                  ?.descripcion ||
                `Artículo ${item.id_articulo}`,
              cantidad: item.cantidad,
              precio_unitario: Number(item.precio_unitario) || 0,
            }))
          : [];
        setArticulosSeleccionados(articulosDeLaOrden);
      } catch (error) {
        console.error("Error al cargar datos de la orden:", error);
        toast.error("Error al cargar los datos de la orden para editar.");
        navigate("/ordenes_venta");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      cargarDatosYFormulario();
    }
  }, [id, navigate]);

  // Al cambiar cliente, actualizar saldo disponible
  useEffect(() => {
    if (cliente?.id_cliente) {
      setSaldoFavorDisponible(Number(cliente.saldo_favor) || 0);
    }
  }, [cliente]);

  const validarFormulario = () => {
    if (!cliente) {
      toast.error("Selecciona un cliente");
      return false;
    }
    // Fecha no es editable ni requerida desde el cliente
    if (!metodoPago) {
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

    const detallesFormateados = articulosSeleccionados.map((a) => ({
      id_articulo: a.id_articulo,
      cantidad: a.cantidad,
      precio_unitario: a.precio_unitario,
    }));

    const montoSF = usarSaldoFavor && saldoAplicado ? Math.min(Number(montoSaldoFavor) || 0, saldoFavorDisponible, totalGeneral) : 0;

    const payload = {
      id_orden_venta: id,
      id_cliente: cliente.id_cliente,
      estado,
      detalles: detallesFormateados,
      id_metodo_pago: metodoPago.id_metodo_pago,
      referencia,
      observaciones_pago: observaciones,
      monto_saldo_favor: montoSF,
    };

    try {
      await api.put(`/ordenes-venta/${id}`, payload);
      toast.success("Orden de venta actualizada ");
      navigate("/ordenes_venta");
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al actualizar la orden de venta.";
      console.error("Error de actualización:", error);
      toast.error(mensajeBackend);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Cargando orden de venta...</div>
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
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={17} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Órdenes de Venta
              </p>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                  Editar orden{" "}
                  <span className="text-slate-500 font-normal">#{id}</span>
                </h1>
                {!vieneDeUndefined && (
                  <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg uppercase tracking-wide">
                    Solo lectura
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="orden-venta-form"
              disabled={!vieneDeUndefined || isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
            >
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        <form
          id="orden-venta-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Detalles de la orden */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Detalles de la orden
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Cliente
                </label>
                <Listbox
                  value={cliente}
                  onChange={setCliente}
                  disabled={!vieneDeUndefined}
                >
                  <div className="relative">
                    <Listbox.Button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition">
                      {cliente ? cliente.nombre : "Selecciona un cliente"}
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {clientes.map((c) => (
                        <Listbox.Option
                          key={c.id_cliente}
                          value={c}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2.5 text-sm ${active ? "bg-slate-50" : ""}`
                          }
                        >
                          {c.nombre}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Estado
                </label>
                <Listbox
                  value={estado}
                  onChange={setEstado}
                  disabled={!vieneDeUndefined}
                >
                  <div className="relative">
                    <Listbox.Button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition">
                      {estados.find((e) => e.id === estado)?.nombre ||
                        "Selecciona un estado"}
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {estados.map((e) => (
                        <Listbox.Option
                          key={e.id}
                          value={e.id}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2.5 text-sm ${active ? "bg-slate-50" : ""}`
                          }
                        >
                          {e.nombre}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Método de Pago
                </label>
                <Listbox
                  value={metodoPago}
                  onChange={setMetodoPago}
                  disabled={!vieneDeUndefined}
                >
                  <div className="relative">
                    <Listbox.Button className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition">
                      {metodoPago ? metodoPago.nombre : "Selecciona un método"}
                    </Listbox.Button>
                    <Listbox.Options className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                      {metodosPago.map((m) => (
                        <Listbox.Option
                          key={m.id_metodo_pago}
                          value={m}
                          className={({ active }) =>
                            `cursor-pointer select-none px-4 py-2.5 text-sm ${active ? "bg-slate-50" : ""}`
                          }
                        >
                          {m.nombre}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </div>
                </Listbox>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Referencia / No. Transacción
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  disabled={!vieneDeUndefined}
                  placeholder="Ej: N° de comprobante, tarjeta"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Observaciones (Pago)
                </label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  disabled={!vieneDeUndefined}
                  placeholder="Notas adicionales sobre el pago"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 transition"
                />
              </div>
            </div>
          </div>

          {/* ── Saldo a favor ── */}
          {cliente && saldoFavorDisponible > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Saldo a favor</p>
                    <p className="text-xs text-slate-400">{cliente.nombre} — {formatCurrency(saldoFavorDisponible)}</p>
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
                      else setMontoSaldoFavor(String(Math.min(saldoFavorDisponible, totalGeneral)));
                    }}
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full peer-checked:bg-slate-800 transition-colors" />
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${usarSaldoFavor ? "translate-x-4" : ""}`} />
                </label>
              </div>

              {usarSaldoFavor && (
                <div className="mt-4 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">¿Cuánto deseas usar?</p>
                    <div className="flex items-center gap-2">
                      {[25, 50, 75, 100].map((pct) => {
                        const montoPct = Math.min(Math.round((saldoFavorDisponible * pct) / 100), totalGeneral);
                        return (
                          <button key={pct} type="button" onClick={() => { setMontoSaldoFavor(String(montoPct)); setSaldoAplicado(true); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all cursor-pointer ${Number(montoSaldoFavor) === montoPct ? "bg-slate-800 text-white border-slate-800 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
                            {pct}%
                          </button>
                        );
                      })}
                      <div className="relative flex-[2]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">$</span>
                        <input type="text" inputMode="numeric" value={Number(montoSaldoFavor) > 0 ? Number(montoSaldoFavor).toLocaleString("es-CO") : ""}
                          onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ""); const num = Number(raw) || 0; setMontoSaldoFavor(String(Math.min(num, saldoFavorDisponible, totalGeneral))); setSaldoAplicado(true); }}
                          className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-300" placeholder="Otro valor" />
                      </div>
                      {Number(montoSaldoFavor) > 0 && (
                        <button type="button" onClick={() => { setMontoSaldoFavor(""); setSaldoAplicado(false); }}
                          className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Limpiar">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3 grid grid-cols-4 gap-4 bg-slate-50">
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</p><p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(totalGeneral)}</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Saldo</p><p className="text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(saldoFavorDisponible)}</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Descuento</p><p className={`text-sm font-bold mt-0.5 ${Number(montoSaldoFavor) > 0 ? "text-amber-600" : "text-slate-300"}`}>{Number(montoSaldoFavor) > 0 ? `-${formatCurrency(Number(montoSaldoFavor))}` : "—"}</p></div>
                    <div className="text-center"><p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Neto</p><p className="text-sm font-bold text-slate-800 mt-0.5">{formatCurrency(Math.max(0, totalGeneral - (Number(montoSaldoFavor) || 0)))}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Artículos */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detalles de venta
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Total general
                </span>
                <span className="text-xl font-bold text-emerald-700">
                  {formatCurrency(totalGeneral)}
                </span>
              </div>
            </div>

            {vieneDeUndefined && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Agregar Artículo
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
                  onChange={agregarArticulo}
                  placeholder="Buscar por referencia o descripción..."
                  isClearable
                  className="text-sm"
                />
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Artículo
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-28">
                      Cantidad
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-40">
                      Precio Unit.
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-36">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articulosSeleccionados.map((art) => (
                    <tr
                      key={art.id_articulo}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-800">
                        {art.descripcion}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={art.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(art.id_articulo, e.target.value)
                          }
                          min="1"
                          required
                          disabled={!vieneDeUndefined}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
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
                            onFocus={() =>
                              handlePriceFocus(
                                art.id_articulo,
                                art.precio_unitario,
                              )
                            }
                            onBlur={() => handlePriceBlur(art.id_articulo)}
                            required
                            disabled={!vieneDeUndefined}
                            className="w-full rounded-lg border border-slate-200 bg-white pl-7 pr-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                          />
                          <FiDollarSign
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                            size={14}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatCurrency(
                          calcularSubtotal(art.cantidad, art.precio_unitario),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          disabled={
                            articulosSeleccionados.length === 1 ||
                            !vieneDeUndefined
                          }
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Eliminar artículo"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdenVentaEdit;
