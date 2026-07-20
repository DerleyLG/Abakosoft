import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import Select from "react-select";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
  FiMinus,
  FiPlus,
  FiSave,
  FiDollarSign,
  FiPackage,
  FiStar,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

/* ── Stepper − / número / + ── */
const QuantityStepper = ({ value, min, max, onChange, disabled }) => (
  <div className="inline-flex items-center gap-0.5">
    <button
      type="button"
      onClick={() => onChange(Math.max(min, (value || 0) - 1))}
      disabled={disabled || value <= min}
      className="w-7 h-7 flex items-center justify-center rounded-l-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      <FiMinus size={13} />
    </button>
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      onChange={(e) => {
        let v = parseInt(e.target.value, 10);
        if (isNaN(v) || v < min) v = min;
        if (v > max) v = max;
        onChange(v);
      }}
      disabled={disabled}
      className="w-14 h-7 border-y border-slate-300 text-center text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
    />
    <button
      type="button"
      onClick={() => onChange(Math.min(max, (value || 0) + 1))}
      disabled={disabled || value >= max}
      className="w-7 h-7 flex items-center justify-center rounded-r-md border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
    >
      <FiPlus size={13} />
    </button>
  </div>
);

const colourStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderColor: state.isFocused ? "#94a3b8" : "#e2e8f0",
    boxShadow: state.isFocused ? "0 0 0 2px #94a3b8" : "none",
    "&:hover": { borderColor: "#94a3b8" },
    fontSize: 14,
    borderRadius: 8,
  }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: 14 }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected
      ? "#1e293b"
      : state.isFocused
        ? "#f1f5f9"
        : "white",
    color: state.isSelected ? "white" : "#1e293b",
    cursor: "pointer",
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const DevolucionForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canCreate = can(user, ACTIONS.RETURNS_CREATE);

  const initialOrderId =
    location.state?.id_orden_venta ||
    location.state?.ventaPrevia?.id_orden_venta ||
    "";

  const [ventas, setVentas] = useState([]);
  const [ventasOptions, setVentasOptions] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState(null);
  const [detallesUI, setDetallesUI] = useState([]);
  const [panelPagoAbierto, setPanelPagoAbierto] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);

  const [formData, setFormData] = useState({
    id_orden_venta: initialOrderId,
    motivo: "",
    devolver_dinero: false,
    como_saldo_favor: true,
    id_metodo_pago: "",
    referencia: "",
  });
  const [observaciones, setObservaciones] = useState("");

  /* ── Cargar catálogos ── */
  useEffect(() => {
    const cargar = async () => {
      setLoadingCatalogs(true);
      try {
        const [ventasRes, metodosRes] = await Promise.all([
          api.get("/ordenes-venta", {
            params: {
              page: 1,
              pageSize: 500,
              sortBy: "fecha",
              sortDir: "desc",
            },
          }),
          api.get("/metodos-pago"),
        ]);
        const data = Array.isArray(ventasRes?.data?.data)
          ? ventasRes.data.data
          : [];
        setVentas(data);
        setVentasOptions(
          data.map((v) => ({
            value: v.id_orden_venta,
            label: `#${v.id_orden_venta} · ${v.cliente_nombre || "Cliente"} · ${v.fecha?.slice(0, 10) || ""}`,
            cliente: v.cliente_nombre || "Cliente",
            fecha: v.fecha?.slice(0, 10) || "",
          })),
        );
        setMetodosPago(Array.isArray(metodosRes?.data) ? metodosRes.data : []);
      } catch (error) {
        console.error(error);
        toast.error("No fue posible cargar los datos iniciales.");
      } finally {
        setLoadingCatalogs(false);
      }
    };
    cargar();
  }, []);

  /* ── Restaurar opción inicial ── */
  useEffect(() => {
    if (!initialOrderId || ventasOptions.length === 0) return;
    const match = ventasOptions.find((o) => o.value === Number(initialOrderId));
    if (match) setSelectedOption(match);
  }, [ventasOptions, initialOrderId]);

  /* ── Precargar preview al seleccionar venta ── */
  useEffect(() => {
    if (!formData.id_orden_venta) {
      setSelectedVenta(null);
      setDetallesUI([]);
      return;
    }

    const cargarPreview = async () => {
      setPreviewLoading(true);
      try {
        const res = await api.get(
          `/devoluciones/ventas/${formData.id_orden_venta}/preview`,
        );
        const venta = res.data?.venta || null;
        const raw = Array.isArray(res.data?.detalles) ? res.data.detalles : [];

        const items = raw.map((d) => ({
          id_articulo: d.id_articulo,
          descripcion: d.descripcion,
          referencia: d.referencia || "",
          precio_unitario: Number(d.precio_unitario || 0),
          disponible: Number(d.disponible || 0),
          cantidad: 0,
          seleccionado: false,
        }));

        setSelectedVenta(venta);

        setDetallesUI(items);
        setFormData((prev) => ({
          ...prev,
          detalles: [],
          devolver_dinero: false,
          como_saldo_favor: true,
          id_metodo_pago: "",
        }));
      } catch (error) {
        console.error(error);
        toast.error(
          error.response?.data?.error ||
            "No fue posible cargar la venta para devolución.",
        );
      } finally {
        setPreviewLoading(false);
      }
    };

    cargarPreview();
  }, [formData.id_orden_venta]);

  /* ── Handlers ── */
  const handleSelectChange = (option) => {
    setSelectedOption(option);
    setFormData((prev) => ({
      ...prev,
      id_orden_venta: option ? option.value : "",
    }));
  };

  const toggleArticulo = (index) => {
    const nuevos = [...detallesUI];
    const item = { ...nuevos[index] };
    if (item.seleccionado) {
      item.seleccionado = false;
      item.cantidad = 0;
    } else if (item.disponible > 0) {
      item.seleccionado = true;
      item.cantidad = 1;
    }
    nuevos[index] = item;
    setDetallesUI(nuevos);
  };

  const changeCantidad = (index, nuevaCantidad) => {
    const nuevos = [...detallesUI];
    const item = { ...nuevos[index] };
    const clamped = Math.max(0, Math.min(nuevaCantidad, item.disponible));
    item.cantidad = clamped;
    item.seleccionado = clamped > 0;
    nuevos[index] = item;
    setDetallesUI(nuevos);
  };

  const totalDevuelto = useMemo(
    () =>
      detallesUI.reduce(
        (s, i) => s + (i.seleccionado ? i.cantidad * i.precio_unitario : 0),
        0,
      ),
    [detallesUI],
  );

  const articulosSeleccionados = useMemo(
    () => detallesUI.filter((i) => i.seleccionado && i.cantidad > 0),
    [detallesUI],
  );

  const ventaAnulada = selectedVenta?.estado === "anulada";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_orden_venta) {
      toast.error("Selecciona una orden de venta");
      return;
    }
    if (!articulosSeleccionados.length) {
      toast.error("Marca al menos un artículo para devolver");
      return;
    }
    if (formData.devolver_dinero && !formData.id_metodo_pago) {
      toast.error("Selecciona un método de pago para devolver dinero");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/devoluciones", {
        id_orden_venta: formData.id_orden_venta,
        motivo: formData.motivo,
        devolver_dinero: formData.devolver_dinero,
        como_saldo_favor: formData.como_saldo_favor,
        id_metodo_pago: formData.devolver_dinero
          ? formData.id_metodo_pago
          : null,
        referencia: formData.referencia || null,
        detalles: articulosSeleccionados.map((i) => ({
          id_articulo: i.id_articulo,
          cantidad: i.cantidad,
          observaciones: observaciones || null,
        })),
      });
      toast.success("Devolución creada correctamente");
      navigate("/devoluciones");
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.error || "No fue posible crear la devolución",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="p-8 text-center text-slate-500">
        No tienes permisos para crear devoluciones.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-6 xl:px-8 py-4 flex flex-col gap-3 select-none">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/devoluciones")}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
          title="Volver"
        >
          <FiArrowLeft size={17} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Nueva devolución
          </h1>
          <p className="text-xs text-slate-500">
            Marca los artículos a devolver y ajusta las cantidades.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* ── 1. SELECTOR DE VENTA ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              Orden de venta
            </p>
            {selectedOption && (
              <span className="text-xs text-slate-400">
                #{selectedOption.value} · {selectedOption.cliente}
              </span>
            )}
          </div>
          <div className="p-4">
            {loadingCatalogs ? (
              <div className="animate-pulse h-10 bg-slate-100 rounded-lg" />
            ) : (
              <Select
                placeholder="Buscar orden de venta…"
                options={ventasOptions}
                value={selectedOption}
                onChange={handleSelectChange}
                isClearable
                noOptionsMessage={() => "Sin resultados"}
                menuPortalTarget={document.body}
                styles={colourStyles}
              />
            )}

            {ventaAnulada && (
              <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <FiAlertTriangle className="shrink-0 mt-0.5" size={14} />
                <span>
                  <strong>Venta anulada.</strong> No es posible registrar una
                  devolución sobre una venta anulada.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── 2. TABLA DE ARTÍCULOS ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Artículos a devolver
              </p>
              <p className="text-xs text-slate-500">
                Marca cada artículo y ajusta la cantidad.
              </p>
            </div>
            {detallesUI.length > 0 && (
              <span className="text-xs font-semibold text-slate-600 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                {articulosSeleccionados.length}/{detallesUI.length}
              </span>
            )}
          </div>

          {previewLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Cargando artículos…
            </div>
          ) : detallesUI.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              {formData.id_orden_venta
                ? "Cargando…"
                : "Selecciona una orden para ver los artículos."}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {detallesUI.map((item, index) => (
                <div
                  key={item.id_articulo}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${item.seleccionado ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleArticulo(index)}
                    disabled={item.disponible === 0}
                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                      item.disponible === 0
                        ? "border-slate-200 bg-slate-100 cursor-not-allowed"
                        : item.seleccionado
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-300 bg-white hover:border-slate-400"
                    }`}
                  >
                    {item.seleccionado && <FiCheckCircle size={14} />}
                  </button>

                  {/* Info artículo */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium truncate ${item.seleccionado ? "text-slate-800" : "text-slate-500"}`}
                    >
                      {item.descripcion}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {item.referencia ? `Ref: ${item.referencia}` : "—"}
                    </div>
                  </div>

                  {/* Precio */}
                  <div className="text-right text-sm text-slate-700 whitespace-nowrap w-20">
                    {formatCurrency(item.precio_unitario)}
                  </div>

                  {/* Disponible */}
                  <div
                    className={`text-right text-sm w-10 whitespace-nowrap font-medium ${item.disponible > 0 ? "text-slate-700" : "text-red-500"}`}
                  >
                    {item.disponible}
                  </div>

                  {/* Stepper */}
                  <div className="w-24 flex justify-end">
                    <QuantityStepper
                      value={item.cantidad}
                      min={0}
                      max={item.disponible}
                      onChange={(v) => changeCantidad(index, v)}
                      disabled={!item.seleccionado || item.disponible === 0}
                    />
                  </div>

                  {/* Subtotal */}
                  <div
                    className={`text-right text-sm font-semibold w-24 whitespace-nowrap ${item.seleccionado && item.cantidad > 0 ? "text-slate-900" : "text-slate-300"}`}
                  >
                    {item.seleccionado && item.cantidad > 0
                      ? formatCurrency(item.cantidad * item.precio_unitario)
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resumen rápido al pie */}
          {detallesUI.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
              <span>
                {articulosSeleccionados.length > 0
                  ? `${articulosSeleccionados.length} artículo${articulosSeleccionados.length !== 1 ? "s" : ""} seleccionado${articulosSeleccionados.length !== 1 ? "s" : ""}`
                  : "Ningún artículo seleccionado"}
              </span>
              <span>
                Subtotal:{" "}
                <strong className="text-slate-900">
                  {formatCurrency(totalDevuelto)}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* ── 3. MOTIVO + PAGO en paralelo ── */}
        <div className="grid md:grid-cols-2 gap-3">
          {/* Motivo */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-900"> Motivo</p>
            </div>
            <div className="p-4">
              <textarea
                rows={3}
                value={formData.motivo}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, motivo: e.target.value }))
                }
                placeholder="Opcional"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
              />
            </div>
          </div>

          {/* Devolución de dinero */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setPanelPagoAbierto((p) => !p)}
              className="w-full px-4 py-3 border-b border-slate-200 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Manejo del dinero
                </p>
                <p className="text-xs text-slate-500">
                  {formData.devolver_dinero
                    ? "Devolución real con movimiento en tesorería"
                    : formData.como_saldo_favor
                      ? "Saldo a favor del cliente"
                      : "Solo inventario, sin dinero"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {panelPagoAbierto ? (
                  <FiChevronUp size={14} className="text-slate-400" />
                ) : (
                  <FiChevronDown size={14} className="text-slate-400" />
                )}
              </div>
            </button>

            {panelPagoAbierto && (
              <div className="p-5 space-y-4">
                {/* Indicador visual de modo actual */}
                <div className="grid grid-cols-3 gap-3">
                  <div
                    className={`rounded-xl border-2 p-4 text-center transition-all cursor-pointer ${
                      !formData.devolver_dinero && !formData.como_saldo_favor
                        ? "border-slate-400 bg-slate-50"
                        : "border-slate-200 bg-white opacity-60 hover:opacity-80"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        devolver_dinero: false,
                        como_saldo_favor: false,
                        id_metodo_pago: "",
                      }))
                    }
                  >
                    <FiPackage
                      size={20}
                      className="mx-auto text-slate-500 mb-1"
                    />
                    <p className="text-xs font-semibold text-slate-700">
                      Solo inventario
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Solo cambio de stock
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border-2 p-4 text-center transition-all cursor-pointer ${
                      formData.devolver_dinero
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white opacity-60 hover:opacity-80"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        devolver_dinero: true,
                        como_saldo_favor: false,
                        id_metodo_pago: selectedVenta?.id_metodo_pago
                          ? String(selectedVenta.id_metodo_pago)
                          : prev.id_metodo_pago,
                      }))
                    }
                  >
                    <FiDollarSign
                      size={20}
                      className="mx-auto text-emerald-500 mb-1"
                    />
                    <p className="text-xs font-semibold text-slate-700">
                      Devolver dinero
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Movimiento tesoreria en negativo
                    </p>
                  </div>
                  <div
                    className={`rounded-xl border-2 p-4 text-center transition-all cursor-pointer ${
                      formData.como_saldo_favor
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 bg-white opacity-60 hover:opacity-80"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        devolver_dinero: false,
                        como_saldo_favor: true,
                        id_metodo_pago: "",
                      }))
                    }
                  >
                    <FiStar size={20} className="mx-auto text-amber-500 mb-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      Saldo a favor
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Sin movimiento
                    </p>
                  </div>
                </div>

                {/* Método de pago — solo cuando se devuelve dinero */}
                {formData.devolver_dinero && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Método de pago <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.id_metodo_pago}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            id_metodo_pago: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                      >
                        <option value="">Seleccione un método</option>
                        {metodosPago.map((m) => (
                          <option
                            key={m.id_metodo_pago}
                            value={m.id_metodo_pago}
                          >
                            {m.nombre}
                          </option>
                        ))}
                      </select>
                      {selectedVenta?.id_metodo_pago && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Método de la venta preseleccionado automáticamente.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Referencia
                      </label>
                      <input
                        type="text"
                        value={formData.referencia}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            referencia: e.target.value,
                          }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="N° de comprobante (opcional)"
                      />
                    </div>
                  </>
                )}

                {formData.como_saldo_favor && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 leading-relaxed">
                    <FiStar
                      size={14}
                      className="shrink-0 mt-0.5 text-amber-500"
                    />
                    <span>
                      <strong>Saldo a favor:</strong> El valor de la devolución
                      quedará registrado como saldo disponible del cliente para
                      futuras compras. No se genera movimiento en tesorería.
                    </span>
                  </div>
                )}

                {!formData.devolver_dinero && !formData.como_saldo_favor && (
                  <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed">
                    <FiPackage
                      size={14}
                      className="shrink-0 mt-0.5 text-slate-400"
                    />
                    <span>
                      <strong>Solo inventario:</strong> Solo se actualizará el
                      stock de los artículos devueltos. No se generará ningún
                      movimiento de dinero ni saldo a favor.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Observaciones ── */}
        {selectedVenta && detallesUI.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Observaciones
            </label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none transition placeholder:text-slate-400"
              placeholder="Motivo adicional o comentarios sobre la devolución (opcional)"
            />
          </div>
        )}

        {/* ── BOTTOM BAR ── */}
        <div className="sticky bottom-0 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                Total devolución
              </p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalDevuelto)}
              </p>
              {articulosSeleccionados.length > 0 && (
                <p className="text-[11px] text-slate-400">
                  {articulosSeleccionados.reduce((s, i) => s + i.cantidad, 0)}{" "}
                  uds.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate("/devoluciones")}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  previewLoading ||
                  loadingCatalogs ||
                  ventaAnulada ||
                  articulosSeleccionados.length === 0
                }
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <FiSave size={14} />
                {submitting ? "Guardando…" : "Guardar devolución"}
              </button>
            </div>
          </div>
          {detallesUI.length > 0 && (
            <div className="h-1 bg-slate-100">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                style={{
                  width: `${detallesUI.reduce((s, i) => s + i.disponible, 0) > 0 ? (articulosSeleccionados.reduce((s, i) => s + i.cantidad, 0) / detallesUI.reduce((s, i) => s + i.disponible, 0)) * 100 : 0}%`,
                }}
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default DevolucionForm;
