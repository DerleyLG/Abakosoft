import { useState, useEffect, useRef, useCallback } from "react";
import AsyncSelect from "react-select/async";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiDollarSign, FiX, FiUser } from "react-icons/fi";

const formatCurrency = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v || 0));

const selectStyles = {
  control: (base, state) => ({
    ...base,
    borderColor: state.isFocused ? "transparent" : "#e2e8f0",
    boxShadow: state.isFocused
      ? "0 0 0 2px #94a3b8"
      : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    borderRadius: "0.5rem",
    minHeight: "40px",
    fontSize: "0.875rem",
    cursor: "text",
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
    fontSize: "0.8125rem",
    cursor: "pointer",
  }),
  menuList: (base) => ({ ...base, maxHeight: "240px" }),
  placeholder: (base) => ({ ...base, color: "#94a3b8", fontSize: "0.8125rem" }),
  input: (base) => ({ ...base, fontSize: "0.8125rem" }),
};

const SaldoFavorDrawer = ({
  isOpen,
  onClose,
  clienteInicial = null,
  onSuccess,
}) => {
  const [clientesCache, setClientesCache] = useState([]);
  const cacheRef = useRef({});
  const timerRef = useRef(null);
  const [cliente, setCliente] = useState(clienteInicial);
  const [monto, setMonto] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [metodosPago, setMetodosPago] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Monta el contenido pesado (AsyncSelect) solo cuando el drawer está o estuvo
  // abierto. Al cerrar, se mantiene montado durante la transición de salida
  // (300ms) y luego se desmonta, evitando render innecesario del AsyncSelect.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCliente(clienteInicial);
      setMonto("");
      setMetodoPago("");
      return;
    }
    setCliente(clienteInicial);
    // Cargar clientes al abrir
    api
      .get("/clientes")
      .then((r) => {
        const lista = (Array.isArray(r.data) ? r.data : []).map((c) => ({
          value: c.id_cliente,
          label: `${c.nombre}${c.identificacion ? ` (${c.identificacion})` : ""}`,
          ...c,
        }));
        setClientesCache(lista);
        cacheRef.current[""] = lista;
      })
      .catch(() => {});
    api
      .get("/metodos-pago")
      .then((r) => setMetodosPago(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [isOpen]);

  const loadClientesOptions = useCallback(
    (inputValue, callback) => {
      const key = (inputValue || "").toLowerCase();
      if (!key) return callback(clientesCache);
      if (cacheRef.current[key]) return callback(cacheRef.current[key]);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const filtrados = clientesCache.filter(
          (c) =>
            c.label.toLowerCase().includes(key) ||
            (c.identificacion || "").includes(key),
        );
        cacheRef.current[key] = filtrados;
        callback(filtrados);
      }, 200);
    },
    [clientesCache],
  );

  const handleSubmit = async () => {
    if (!cliente) return toast.error("Seleccione un cliente");
    if (!monto || Number(monto) <= 0)
      return toast.error("Ingrese un monto válido");
    if (!metodoPago) return toast.error("Seleccione un método de pago");

    setSubmitting(true);
    try {
      const res = await api.post(
        `/clientes/saldo-favor/${cliente.value}/abonar`,
        {
          monto: Number(monto),
          id_metodo_pago: Number(metodoPago),
        },
      );
      toast.success(
        `Saldo a favor registrado — Nuevo saldo: ${formatCurrency(res.data?.saldo_favor)}`,
      );
      if (onSuccess) onSuccess(res.data?.saldo_favor);
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Error al registrar saldo a favor",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay: sin backdrop-blur (muy costoso en animación), con fade real */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer: transform-gpu + will-change para animar en capa propia (GPU) */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transform-gpu will-change-transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        {visible && (
          <>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FiDollarSign className="text-emerald-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Saldo a favor
              </h2>
              <p className="text-xs text-slate-500">
                Registra un abono como saldo disponible del cliente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div
          className="p-6 space-y-5 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {/* Cliente */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadClientesOptions}
              defaultOptions={clientesCache}
              value={cliente}
              onChange={(opt) => setCliente(opt)}
              placeholder="Buscar cliente por nombre o ID…"
              isClearable
              styles={selectStyles}
              noOptionsMessage={() => "No se encontraron clientes"}
            />
          </div>

          {/* Saldo actual si tiene */}
          {cliente?.saldo_favor > 0 && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                Saldo actual de {cliente.label?.split("(")[0]?.trim()}
              </span>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">
                {formatCurrency(cliente.saldo_favor)}
              </p>
            </div>
          )}

          {/* Monto */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Monto a abonar <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={
                  Number(monto) > 0 ? Number(monto).toLocaleString("es-CO") : ""
                }
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setMonto(raw);
                }}
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
                placeholder="0"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition cursor-pointer appearance-none"
              >
                <option value="">Seleccionar método…</option>
                {metodosPago.map((mp) => (
                  <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>
                    {mp.nombre}
                  </option>
                ))}
              </select>
              <FiDollarSign
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Info tesorería */}
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <p className="text-xs text-emerald-700 leading-relaxed">
              <strong> Movimiento en tesorería:</strong> Se registrará un
              ingreso por <strong>{formatCurrency(Number(monto) || 0)}</strong>{" "}
              en el libro de tesorería. El cliente podrá usar este saldo para
              pagar futuras compras.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              {submitting
                ? "Registrando…"
                : `Registrar ${formatCurrency(Number(monto) || 0)}`}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </>
  );
};

export default SaldoFavorDrawer;
