import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { FiArrowRight, FiArrowLeft, FiX } from "react-icons/fi";
import AnticipoAlert from "../components/AnticipoAlert";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const FormularioPagoAvances = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();

  // Obtener fecha actual en formato local YYYY-MM-DD
  const obtenerFechaActual = () => {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(hoy.getDate()).padStart(2, "0")}`;
  };

  const [avances, setAvances] = useState([]);
  const [fechaPago, setFechaPago] = useState(obtenerFechaActual());
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);

  // Modo anticipo: toggle que convierte el pago en un anticipo al trabajador
  const [esAnticipo, setEsAnticipo] = useState(false);
  const [montoAnticipo, setMontoAnticipo] = useState(0);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState("");
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");

  const [mostrarAlertaAnticipo, setMostrarAlertaAnticipo] = useState(false);
  const [ultimoDescuentoTempId, setUltimoDescuentoTempId] = useState(null);
  const submitBtnRef = React.useRef(null);

  // Estados para datos de pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [idMetodoPago, setIdMetodoPago] = useState("");
  const [referencia, setReferencia] = useState("");
  const [observacionesPago, setObservacionesPago] = useState("");

  // DEBUG: logs temporales para depurar modal de anticipo
  React.useEffect(() => {
    try {
      console.log(
        "DEBUG: mostrarAlertaAnticipo=",
        mostrarAlertaAnticipo,
        "avances[0]=",
        avances[0],
      );
    } catch (e) {
      console.log("DEBUG: error leyendo avances", e);
    }
  }, [mostrarAlertaAnticipo, avances]);

  useEffect(() => {
    // Restauramos el flujo original: si hay anticipos, preguntar con modal y después mostrar el formulario para elegir monto
    const checkYMostrarModal = async () => {
      // En modo anticipo no se pregunta por descuentos: el pago ES un anticipo
      if (esAnticipo) {
        setMostrarAlertaAnticipo(false);
        return;
      }
      const avanceInicial = state.avances?.find(
        (a) => a && a.id_trabajador && !a.es_descuento,
      );
      if (!avanceInicial) {
        setMostrarAlertaAnticipo(false);
        return;
      }
      const idTrabajador = avanceInicial.id_trabajador;
      if (!idTrabajador) return;
      try {
        const res = await api.get("/anticipos/pendientes", {
          params: { trabajadorId: idTrabajador },
        });
        if (res.data?.hasPendiente) {
          confirmAlert({
            title: "Anticipo disponible",
            message: `El trabajador ${avanceInicial.nombre_trabajador || ""} tiene anticipos disponibles por $${Number(res.data.totalDisponible || 0).toLocaleString()}. ¿Deseas aplicar el descuento en este pago?`,
            buttons: [
              {
                label: "Sí, aplicar",
                onClick: () => {
                  setMostrarAlertaAnticipo(true);
                },
              },
              {
                label: "No, dejarlo para después",
                onClick: () => {
                  setMostrarAlertaAnticipo(false);
                  toast("Descuento no aplicado");
                },
              },
            ],
          });
        } else {
          setMostrarAlertaAnticipo(false);
        }
      } catch (err) {
        console.error("Error verificando anticipos pendientes:", err);
        setMostrarAlertaAnticipo(false);
      }
    };
    checkYMostrarModal();
  }, [state?.avances, esAnticipo]);

  useEffect(() => {
    if (state?.avances?.length > 0) {
      setAvances(state.avances);
      // Si el usuario activa modo anticipo, rellenar orden y trabajador automáticamente
      const primerAvance = state.avances[0];
      if (primerAvance?.id_orden_fabricacion)
        setOrdenSeleccionada(primerAvance.id_orden_fabricacion);
      if (primerAvance?.id_trabajador)
        setTrabajadorSeleccionado(primerAvance.id_trabajador);
    }
  }, [state]);

  // Cargar métodos de pago
  useEffect(() => {
    api
      .get("/metodos-pago")
      .then((res) => setMetodosPago(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Error cargando métodos de pago:", err);
        setMetodosPago([]);
      });
  }, []);

  useEffect(() => {
    if (state?.avances?.length > 0 || esAnticipo) {
      api
        .get("/trabajadores", { params: { incluir_inactivos: true } })
        .then((res) => setTrabajadores(res.data))
        .catch(() => toast.error("Error al cargar trabajadores"));
    }
  }, [esAnticipo, state]);

  // En modo anticipo, cargar órdenes de fabricación disponibles (pendientes o en proceso)
  useEffect(() => {
    if (!esAnticipo) return;
    api
      .get("/ordenes-fabricacion?estados=pendiente,en proceso")
      .then((res) => {
        const ordenesArray = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];
        setOrdenes(ordenesArray);
      })
      .catch(() => {
        toast.error("Error al cargar órdenes de fabricación");
        setOrdenes([]);
      });
  }, [esAnticipo]);

  const totalFinal = avances.reduce(
    (acc, a) => acc + a.cantidad * a.costo_fabricacion,
    0,
  );

  // Scroll to and focus the recently added descuento row, then focus submit button
  useEffect(() => {
    if (!ultimoDescuentoTempId) return;
    const el = document.querySelector(
      `[data-temp-id="${ultimoDescuentoTempId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // small delay to allow rendering
    setTimeout(() => {
      submitBtnRef.current?.focus?.();
    }, 300);
    // clear after action
    const t = setTimeout(() => setUltimoDescuentoTempId(null), 1000);
    return () => clearTimeout(t);
  }, [ultimoDescuentoTempId]);

  const handleRegistrarPago = async () => {
    if (!esAnticipo && totalFinal < 0) {
      toast.error("El total a pagar no puede ser menor a cero.");
      return;
    }
    if (!idMetodoPago) {
      toast.error("El método de pago es obligatorio.");
      return;
    }
    if (esAnticipo) {
      if (!trabajadorSeleccionado || montoAnticipo <= 0) {
        toast.error("Debes seleccionar un trabajador e ingresar un monto.");
        return;
      }
    }

    try {
      setGuardando(true);

      if (esAnticipo) {
        // Registrar como anticipo (el backend crea el movimiento de tesorería)
        await api.post(
          "/anticipos",
          {
            id_trabajador: trabajadorSeleccionado,
            id_orden_fabricacion: ordenSeleccionada || null,
            monto: montoAnticipo,
            observaciones,
            fecha: fechaPago,
            id_metodo_pago: idMetodoPago,
            referencia: referencia.trim() || null,
            observaciones_pago: observacionesPago.trim() || null,
          },
          { headers: { "X-Idempotency-Key": idempotencyKey } },
        );
        toast.success("Anticipo registrado correctamente");
        navigate("/pagos_anticipados");
        return;
      }

      const payload = {
        id_trabajador: avances?.[0]?.id_trabajador || "",
        id_orden_fabricacion: avances?.[0]?.id_orden_fabricacion || "",
        fecha_pago: fechaPago,
        observaciones,
        id_metodo_pago: idMetodoPago,
        referencia: referencia.trim() || null,
        observaciones_pago: observacionesPago.trim() || null,
        detalles: avances.map((a) => ({
          id_avance_etapa: a.es_descuento ? null : a.id_avance_etapa,
          cantidad: a.cantidad,
          pago_unitario: a.costo_fabricacion,
          es_descuento: a.es_descuento === true,
        })),
      };

      await api.post("/pagos", payload, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
      toast.success("Pago registrado correctamente");
      navigate("/trabajadores/pagos");
    } catch (error) {
      const mensaje =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al registrar pago.";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const aplicarDescuentoDeAnticipo = (anticipoOrAsign, valor) => {
    const yaExiste = avances.some((a) => a.es_descuento);
    if (yaExiste) {
      toast.error("Ya se aplicó un descuento de anticipo.");
      return;
    }

    // aceptar dos formatos: (anticipo, valor) o ({ asignaciones, totalDisponible }, valor)
    let totalDisponible = 0;
    if (anticipoOrAsign && anticipoOrAsign.asignaciones) {
      totalDisponible = Number(anticipoOrAsign.totalDisponible || 0);
    } else if (anticipoOrAsign) {
      totalDisponible =
        Number(anticipoOrAsign.monto || 0) -
        Number(anticipoOrAsign.monto_usado || 0);
    }

    if (valor > totalDisponible) {
      toast.error("El descuento supera el saldo disponible.");
      return;
    }

    if (valor > totalFinal) {
      toast.error("El descuento no puede superar el total a pagar.");
      return;
    }

    const tempId = `desc-${Date.now()}`;
    const descuento = {
      id_avance_etapa: null,
      descripcion: "Descuento por anticipo",
      nombre_etapa: "",
      cantidad: 1,
      costo_fabricacion: -valor,
      es_descuento: true,
      __temp_id: tempId,
    };

    setAvances([...avances, descuento]);
    setMostrarAlertaAnticipo(false);
    setUltimoDescuentoTempId(tempId);
  };

  const quitarDescuentoDeAnticipo = () => {
    setAvances(avances.filter((a) => !a.es_descuento));
    setMostrarAlertaAnticipo(true);
  };

  const trabajadorActual = trabajadores.find(
    (t) => t.id_trabajador === avances[0]?.id_trabajador,
  );
  const nombreTrabajador = trabajadorActual?.nombre || "";

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls = "block text-sm font-semibold text-slate-600 mb-2";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6">
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
              Pagos
            </p>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              Registrar Pago
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/avances_fabricacion")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Avances de fabricación
            <FiArrowRight size={15} />
          </button>
          <button
            ref={submitBtnRef}
            type="button"
            onClick={handleRegistrarPago}
            disabled={
              guardando ||
              (esAnticipo && (!trabajadorSeleccionado || montoAnticipo <= 0)) ||
              (!esAnticipo && mostrarAlertaAnticipo)
            }
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? "Guardando..." : "Registrar Pago"}
          </button>
        </div>
      </div>

      {/* Card principal */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 flex flex-col gap-6">
        {/* Fecha + Método de pago */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>Fecha de pago</label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              Método de Pago <span className="text-red-400">*</span>
            </label>
            <select
              value={idMetodoPago}
              onChange={(e) => setIdMetodoPago(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Selecciona método de pago</option>
              {metodosPago.map((m) => (
                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggle anticipo */}
        <div
          className={`flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl ${mostrarAlertaAnticipo ? "opacity-50 pointer-events-none" : ""}`}
        >
          <button
            type="button"
            role="switch"
            aria-checked={esAnticipo}
            onClick={() => setEsAnticipo((v) => !v)}
            disabled={mostrarAlertaAnticipo}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${esAnticipo ? "bg-indigo-500" : "bg-slate-300"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${esAnticipo ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-700">
              Marcar como anticipo
            </p>
            <p className="text-xs text-slate-500">
              {esAnticipo
                ? "Este pago se registrará como anticipo al trabajador"
                : mostrarAlertaAnticipo
                  ? "Hay un anticipo detectado para este trabajador"
                  : "Este pago se aplicará a los avances de fabricación seleccionados"}
            </p>
          </div>
        </div>

        {/* Observaciones generales */}
        <div>
          <label className={labelCls}>
            {esAnticipo ? "Observaciones del anticipo" : "Observaciones"}{" "}
            <span className="font-normal text-slate-400">(opcional)</span>
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        {esAnticipo ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className={labelCls}>
                  Orden de fabricación{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <select
                  value={ordenSeleccionada}
                  onChange={(e) => {
                    setOrdenSeleccionada(e.target.value);
                    const orden = Array.isArray(ordenes)
                      ? ordenes.find(
                          (o) =>
                            o.id_orden_fabricacion === Number(e.target.value),
                        )
                      : null;
                    if (orden) setTrabajadorSeleccionado(orden.id_trabajador);
                  }}
                  className={inputCls}
                >
                  <option value="">Sin orden específica</option>
                  {Array.isArray(ordenes) &&
                    ordenes.map((o) => (
                      <option
                        key={o.id_orden_fabricacion}
                        value={o.id_orden_fabricacion}
                      >
                        #{o.id_orden_fabricacion} -{" "}
                        {o.nombre_cliente || "Cliente"}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Trabajador</label>
                <select
                  value={trabajadorSeleccionado}
                  onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Seleccione un trabajador</option>
                  {Array.isArray(trabajadores) &&
                    trabajadores.map((t) => (
                      <option key={t.id_trabajador} value={t.id_trabajador}>
                        {t.nombre} - {t.cargo}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Monto del anticipo</label>
                <input
                  type="text"
                  inputMode="numeric"
                  min="0"
                  value={
                    montoAnticipo === 0 ? "" : montoAnticipo.toLocaleString()
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setMontoAnticipo(raw ? parseFloat(raw) : 0);
                  }}
                  className={inputCls}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Referencia / No. Transacción</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: No. de cuenta, comprobante"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Observaciones del Pago</label>
                <input
                  type="text"
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {avances.length > 0 && avances[0]?.id_trabajador && (
              <>
                {/* Solo se muestra AnticipoAlert si mostrarAlertaAnticipo es true */}
                {mostrarAlertaAnticipo && (
                  <AnticipoAlert
                    idTrabajador={avances[0].id_trabajador}
                    idOrdenFabricacion={avances[0].id_orden_fabricacion}
                    nombreTrabajador={nombreTrabajador}
                    totalAvance={totalFinal}
                    onAplicarDescuento={aplicarDescuentoDeAnticipo}
                    onQuitarDescuento={() => setMostrarAlertaAnticipo(true)}
                  />
                )}
                {/* Este botón se muestra si NO hay alerta activa Y ya se aplicó un descuento */}
                {!mostrarAlertaAnticipo &&
                  avances.some((a) => a.es_descuento) && (
                    <div>
                      <button
                        onClick={quitarDescuentoDeAnticipo}
                        className="inline-flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 bg-red-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <FiX className="w-3.5 h-3.5" />
                        Quitar descuento por anticipo
                      </button>
                    </div>
                  )}
              </>
            )}

            {/* Tabla de avances */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                Detalles del Pago
              </h3>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Orden
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Artículo
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Etapa
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Cant.
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Pago unit.
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {avances.map((a, index) => (
                      <tr
                        key={index}
                        data-temp-id={a.__temp_id || ""}
                        className={`border-b border-slate-100 last:border-0 ${
                          a.es_descuento ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="px-4 py-3 text-slate-700">
                          {a.es_descuento
                            ? "—"
                            : `#${a.id_orden_fabricacion}${
                                a.nombre_cliente ? " · " + a.nombre_cliente : ""
                              }`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {a.es_descuento ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              Descuento anticipo
                            </span>
                          ) : (
                            a.descripcion || "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.es_descuento ? "—" : a.nombre_etapa}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {a.cantidad}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          ${a.costo_fabricacion.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold ${
                            a.es_descuento ? "text-red-600" : "text-slate-800"
                          }`}
                        >
                          ${(a.cantidad * a.costo_fabricacion).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 flex items-center gap-4">
                  <span className="text-xs text-slate-500">Total a pagar</span>
                  <span className="text-xl font-bold text-slate-900">
                    ${totalFinal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelCls}>Referencia / No. Transacción</label>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ej: No. de cuenta, comprobante"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Observaciones del Pago</label>
                <input
                  type="text"
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  placeholder="Opcional"
                  className={inputCls}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FormularioPagoAvances;
