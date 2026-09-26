import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { FiArrowLeft, FiCheck } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

const iniciales = (nombre) =>
  String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const AnticiposForm = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Si viene id, es modo edición
  const esEdicion = Boolean(id);
  const idempotencyKey = useIdempotencyKey();

  // Fecha actual en formato local YYYY-MM-DD
  const obtenerFechaActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const [trabajadores, setTrabajadores] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);

  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");
  const [ordenSeleccionada, setOrdenSeleccionada] = useState("");
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(obtenerFechaActual());
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [saldoPendiente, setSaldoPendiente] = useState(0);

  // En modo edición, cargar el anticipo existente
  useEffect(() => {
    if (!esEdicion) return;
    const cargarAnticipo = async () => {
      try {
        const res = await api.get(`/anticipos/${id}`);
        const a = res.data;
        setTrabajadorSeleccionado(String(a.id_trabajador));
        setOrdenSeleccionada(
          a.id_orden_fabricacion ? String(a.id_orden_fabricacion) : "",
        );
        setMonto(Number(a.monto) || 0);
        setFecha(String(a.fecha).split("T")[0].split(" ")[0]);
        setObservaciones(a.observaciones || "");
        // Método de pago y referencia vienen del movimiento de tesorería
        setIdMetodoPago(a.id_metodo_pago ? String(a.id_metodo_pago) : "");
        setReferencia(a.referencia || "");
      } catch (error) {
        console.error("Error cargando anticipo:", error);
        toast.error("Error al cargar el anticipo");
        navigate("/pagos_anticipados");
      }
    };
    cargarAnticipo();
  }, [id, esEdicion, navigate]);

  useEffect(() => {
    api
      .get("/trabajadores")
      .then((res) =>
        setTrabajadores(
          Array.isArray(res.data) ? res.data : res.data?.data || [],
        ),
      )
      .catch(() => toast.error("Error al cargar trabajadores"));

    api
      .get("/metodos-pago")
      .then((res) => setMetodosPago(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Error al cargar métodos de pago"));

    api
      .get("/ordenes-fabricacion?estados=pendiente,en proceso")
      .then((res) =>
        setOrdenes(Array.isArray(res.data) ? res.data : res.data?.data || []),
      )
      .catch(() => setOrdenes([]));
  }, []);

  // Al elegir trabajador, consultar cuánto tiene ya pendiente por descontar
  useEffect(() => {
    if (!trabajadorSeleccionado) {
      setSaldoPendiente(0);
      return;
    }
    api
      .get("/anticipos/pendientes", {
        params: { trabajadorId: trabajadorSeleccionado },
      })
      .then((res) => setSaldoPendiente(Number(res.data?.totalDisponible || 0)))
      .catch(() => setSaldoPendiente(0));
  }, [trabajadorSeleccionado]);

  const handleRegistrar = async () => {
    if (!trabajadorSeleccionado) {
      toast.error("Debes seleccionar un trabajador.");
      return;
    }
    if (!monto || monto <= 0) {
      toast.error("El monto del anticipo debe ser mayor a cero.");
      return;
    }
    if (!fecha) {
      toast.error("La fecha es obligatoria.");
      return;
    }
    if (!idMetodoPago) {
      toast.error("El método de pago es obligatorio.");
      return;
    }

    try {
      setGuardando(true);
      const payload = {
        id_trabajador: trabajadorSeleccionado,
        id_orden_fabricacion: ordenSeleccionada || null,
        monto,
        fecha,
        observaciones,
        id_metodo_pago: idMetodoPago,
        referencia: referencia.trim() || null,
        observaciones_pago: null,
      };
      if (esEdicion) {
        await api.put(`/anticipos/${id}`, payload, {
          headers: { "X-Idempotency-Key": idempotencyKey },
        });
        toast.success("Anticipo actualizado correctamente");
      } else {
        await api.post("/anticipos", payload, {
          headers: { "X-Idempotency-Key": idempotencyKey },
        });
        toast.success("Anticipo registrado correctamente");
      }
      navigate("/pagos_anticipados");
    } catch (error) {
      console.error("Error registrando anticipo:", error);
      toast.error(
        error?.response?.data?.error || "Error al registrar el anticipo",
      );
    } finally {
      setGuardando(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls = "block text-sm font-semibold text-slate-600 mb-2";

  const trabajadorActual = trabajadores.find(
    (t) => String(t.id_trabajador) === String(trabajadorSeleccionado),
  );
  const nuevoSaldo = saldoPendiente + Number(monto || 0);
  const puedeGuardar =
    trabajadorSeleccionado && monto > 0 && fecha && idMetodoPago;

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
            aria-label="Volver"
          >
            <FiArrowLeft size={17} />
          </button>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              Anticipos
            </p>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {esEdicion ? "Editar anticipo" : "Registrar anticipo"}
            </h1>
          </div>
        </div>
        <button
          onClick={handleRegistrar}
          disabled={guardando || !puedeGuardar}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {!guardando && <FiCheck size={16} />}
          {guardando
            ? esEdicion
              ? "Guardando…"
              : "Registrando…"
            : esEdicion
              ? "Guardar cambios"
              : "Registrar anticipo"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Formulario */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-6 md:p-8 flex flex-col gap-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Datos del anticipo
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Este dinero se descontará automáticamente del próximo pago por
              avances del trabajador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Trabajador</label>
              <select
                value={trabajadorSeleccionado}
                onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
                disabled={esEdicion}
                className={`${inputCls} ${esEdicion ? "bg-slate-50 text-slate-400 cursor-not-allowed" : ""}`}
              >
                <option value="">Seleccione un trabajador</option>
                {trabajadores.map((t) => (
                  <option key={t.id_trabajador} value={t.id_trabajador}>
                    {t.nombre}
                    {t.cargo ? ` — ${t.cargo}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Monto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={monto === 0 ? "" : monto.toLocaleString("es-CO")}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setMonto(raw ? parseFloat(raw) : 0);
                  }}
                  className={`${inputCls} pl-8 font-semibold tabular-nums`}
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>Método de pago</label>
              <select
                value={idMetodoPago}
                onChange={(e) => setIdMetodoPago(e.target.value)}
                className={inputCls}
              >
                <option value="">Seleccione un método</option>
                {metodosPago.map((m) => (
                  <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-100 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Detalles adicionales
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Opcionales. Vincula el anticipo a una orden si corresponde a un
                trabajo específico.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelCls}>
                  Orden de fabricación{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <select
                  value={ordenSeleccionada}
                  onChange={(e) => setOrdenSeleccionada(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Sin orden específica</option>
                  {ordenes.map((o) => (
                    <option
                      key={o.id_orden_fabricacion}
                      value={o.id_orden_fabricacion}
                    >
                      #{o.id_orden_fabricacion} —{" "}
                      {o.nombre_cliente || "Cliente"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>
                  Referencia{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="No. comprobante, transacción…"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>
                Observaciones{" "}
                <span className="font-normal text-slate-400">(opcional)</span>
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Motivo del anticipo, acuerdos…"
              />
            </div>
          </div>
        </div>

        {/* Resumen en vivo */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:sticky lg:top-6">
          <h2 className="text-sm font-bold text-slate-900">Resumen</h2>

          {!trabajadorSeleccionado ? (
            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              Selecciona un trabajador para ver su saldo actual de anticipos.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mt-4 pb-5 border-b border-slate-100">
                <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                  {iniciales(trabajadorActual?.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">
                    {trabajadorActual?.nombre || "—"}
                  </p>
                  {trabajadorActual?.cargo && (
                    <p className="text-xs text-slate-500 truncate">
                      {trabajadorActual.cargo}
                    </p>
                  )}
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-slate-500">Saldo actual</dt>
                  <dd className="font-semibold text-slate-700 tabular-nums">
                    {fmtMoney(saldoPendiente)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-slate-500">Este anticipo</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    + {fmtMoney(monto)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 pt-3 border-t border-slate-100">
                  <dt className="font-semibold text-slate-700">
                    Nuevo saldo pendiente
                  </dt>
                  <dd className="text-lg font-bold text-indigo-700 tabular-nums">
                    {fmtMoney(nuevoSaldo)}
                  </dd>
                </div>
              </dl>

              {saldoPendiente > 0 && (
                <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Este trabajador ya tiene{" "}
                    <span className="font-semibold text-slate-800">
                      {fmtMoney(saldoPendiente)}
                    </span>{" "}
                    sin descontar. El nuevo anticipo se suma a ese saldo.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnticiposForm;
