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
  }, [state?.avances]);

  useEffect(() => {
    if (state?.avances?.length > 0) {
      setAvances(state.avances);
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
    if (state?.avances?.length > 0) {
      api
        .get("/trabajadores", { params: { incluir_inactivos: true } })
        .then((res) => setTrabajadores(res.data))
        .catch(() => toast.error("Error al cargar trabajadores"));
    }
  }, [state]);

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
    if (totalFinal < 0) {
      toast.error("El total a pagar no puede ser menor a cero.");
      return;
    }
    if (!idMetodoPago) {
      toast.error("El método de pago es obligatorio.");
      return;
    }

    try {
      setGuardando(true);

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
              disabled={guardando || mostrarAlertaAnticipo}
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

          {/* Observaciones generales */}
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
            />
          </div>

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
        </div>
      </div>
    </div>
  );
};

export default FormularioPagoAvances;
