import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { FiArrowRight, FiArrowLeft, FiX } from "react-icons/fi";
import AnticipoAlert from "../components/AnticipoAlert";
import { confirmAlert } from 'react-confirm-alert';
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const FormularioPagoAvances = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const [avances, setAvances] = useState([]);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [esAnticipo, setEsAnticipo] = useState(false);
  const [montoAnticipo, setMontoAnticipo] = useState(0);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState("");
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");
  const [trabajadores, setTrabajadores] = useState([]);
 
  const [mostrarAlertaAnticipo, setMostrarAlertaAnticipo] = useState(false);


  useEffect(() => {
    // Solo si estamos en modo "pago normal" y tenemos avances cargados
    if (!esAnticipo && state?.avances && state.avances.length > 0) {
      // Buscar el primer avance válido que tenga trabajador y orden y que no sea un descuento
      const avanceInicial = state.avances.find(a => a && a.id_trabajador && a.id_orden_fabricacion && !a.es_descuento);
      if (!avanceInicial) {
        setMostrarAlertaAnticipo(false);
        return;
      }

      const idTrabajador = avanceInicial.id_trabajador;
      const idOrdenFabricacion = avanceInicial.id_orden_fabricacion;

      // Si no tenemos la info necesaria, no hacemos la llamada
      if (!idTrabajador || !idOrdenFabricacion) {
        setMostrarAlertaAnticipo(false);
        return;
      }

      api
        .get(`/anticipos/${idTrabajador}/${idOrdenFabricacion}`)
        .then((res) => {
          if (res.data) {
            // Mostramos la alerta de confirmación
            confirmAlert({
              title: 'Anticipo disponible',
              message: `El trabajador ${avanceInicial.nombre_trabajador || ''} tiene un anticipo activo de $${res.data.monto.toLocaleString()}. ¿Deseas aplicar el descuento en este pago?`,
              buttons: [
                {
                  label: 'Sí, aplicar',
                  onClick: () => {
                    setMostrarAlertaAnticipo(true);
                    toast.success("Puedes aplicar el descuento para este pago");
                  },
                },
                {
                  label: 'No, dejarlo para después',
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
        })
        .catch((err) => {
          console.error("Error verificando anticipo:", err);
          setMostrarAlertaAnticipo(false);
          toast.error("Error al verificar anticipos disponibles.");
        });
    } else if (esAnticipo) {
      // Si el modo es "registrar anticipo", no hay necesidad de mostrar la alerta de anticipo para pagos normales
      setMostrarAlertaAnticipo(false);
    }
  }, [state?.avances, esAnticipo]); 

  useEffect(() => {
    if (state?.avances?.length > 0) {
      setAvances(state.avances);
    }
  }, [state]);

  useEffect(() => {
    // Cargar trabajadores solo si estamos en modo "pago normal"
    if (!esAnticipo && state?.avances?.length > 0) {
      api.get("/trabajadores")
        .then((res) => setTrabajadores(res.data))
        .catch(() => toast.error("Error al cargar trabajadores"));
    }
  }, [esAnticipo, state]);

  const totalFinal = avances.reduce(
    (acc, a) => acc + a.cantidad * a.costo_fabricacion,
    0
  );

  useEffect(() => {
    if (esAnticipo) {
      // Cargar órdenes de fabricación disponibles para anticipo (solo pendientes o en proceso)
      api.get("/ordenes-fabricacion?estados=pendiente,en proceso")
        .then((res) => {
          // La respuesta es paginada, extraer el array 'data'
          const ordenesArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setOrdenes(ordenesArray);
        })
        .catch(() => {
          toast.error("Error al cargar órdenes de fabricación");
          setOrdenes([]); // Asegurar que siempre sea un array
        });

      // Cargar trabajadores (siempre que sea anticipo)
      api.get("/trabajadores")
        .then((res) => {
          const trabajadoresArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          setTrabajadores(trabajadoresArray);
        })
        .catch(() => {
          toast.error("Error al cargar trabajadores");
          setTrabajadores([]); // Asegurar que siempre sea un array
        });
    }
  }, [esAnticipo]);

  const handleRegistrarPago = async () => {
    if (!esAnticipo && totalFinal < 0) {
      toast.error("El total a pagar no puede ser menor a cero.");
      return;
    }
    if (esAnticipo) {
      if (!ordenSeleccionada || !trabajadorSeleccionado || montoAnticipo <= 0) {
        toast.error("Debes completar todos los campos del anticipo.");
        return;
      }
    }

    try {
      setGuardando(true);

      if (esAnticipo) {
        await api.post("/anticipos", {
          id_trabajador: trabajadorSeleccionado,
          id_orden_fabricacion: ordenSeleccionada,
          monto: montoAnticipo,
          observaciones,
          fecha: fechaPago,
        });
        toast.success("Anticipo registrado correctamente");
        navigate("/pagos_anticipados");
      } else {
        const payload = {
          id_trabajador: avances?.[0]?.id_trabajador || "",
          id_orden_fabricacion: avances?.[0]?.id_orden_fabricacion || "",
          fecha_pago: fechaPago,
          observaciones,
          detalles: avances.map((a) => ({
            id_avance_etapa: a.es_descuento ? null : a.id_avance_etapa,
            cantidad: a.cantidad,
            pago_unitario: a.costo_fabricacion,
            es_descuento: a.es_descuento === true,
          })),
        };

        await api.post("/pagos", payload);
        toast.success("Pago registrado correctamente");
        navigate("/trabajadores/pagos");
      }
    } catch (error) {
      const mensaje = error.response?.data?.error || error.response?.data?.message || "Error al registrar pago.";
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const aplicarDescuentoDeAnticipo = (anticipo, valor) => {
    const yaExiste = avances.some((a) => a.es_descuento);
    if (yaExiste) {
      toast.error("Ya se aplicó un descuento de anticipo.");
      return;
    }

    if (valor > anticipo.monto - (anticipo.monto_usado || 0)) {
      toast.error("El descuento supera el saldo disponible.");
      return;
    }

    if (valor > totalFinal) {
      toast.error("El descuento no puede superar el total a pagar.");
      return;
    }

    const descuento = {
      id_avance_etapa: null,
      descripcion: "Descuento por anticipo",
      nombre_etapa: "",
      cantidad: 1,
      costo_fabricacion: -valor,
      es_descuento: true,
    };

    setAvances([...avances, descuento]);
    setMostrarAlertaAnticipo(false); 
  };

  const quitarDescuentoDeAnticipo = () => {
    setAvances(avances.filter((a) => !a.es_descuento));
    setMostrarAlertaAnticipo(true); 
  };

  const trabajadorActual = trabajadores.find(
    (t) => t.id_trabajador === avances[0]?.id_trabajador
  );
  const nombreTrabajador = trabajadorActual?.nombre || "";

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-2xl shadow">
      <div className="flex justify-between items-center mb-8 border-b border-slate-300 p-5">
        <h2 className="text-3xl font-bold text-slate-700">Registrar Pago</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
          >
            <FiArrowLeft />
            <span>Volver</span>
          </button>
          <button
            onClick={() => navigate("/avances_fabricacion")}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-medium shadow cursor-pointer"
          >
            <span>Avances de fabricación</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de pago</label>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 ">Registrar como anticipo</label>
          <label className="inline-flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={esAnticipo}
              onChange={(e) => setEsAnticipo(e.target.checked)}
              className="accent-slate-700 w-4 h-4 cursor-pointer"
            />
            Marcar este pago como anticipo
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-xl px-4 py-2"
        />
      </div>

      {esAnticipo ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Orden de fabricación</label>
            <select
              value={ordenSeleccionada}
              onChange={(e) => {
                setOrdenSeleccionada(e.target.value);
                const orden = Array.isArray(ordenes) ? ordenes.find(o => o.id_orden_fabricacion === Number(e.target.value)) : null;
                if (orden) setTrabajadorSeleccionado(orden.id_trabajador);
              }}
              className="w-full border border-slate-300 bg-white text-slate-700 rounded-xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
              disabled={!Array.isArray(ordenes) || ordenes.length === 0}
            >
              {!Array.isArray(ordenes) || ordenes.length === 0 ? (
                <option value="" disabled>No hay órdenes pendientes o en proceso</option>
              ) : (
                <>
                  <option value="">Seleccione una orden</option>
                  {ordenes.map((o) => (
                    <option key={o.id_orden_fabricacion} value={o.id_orden_fabricacion}>
                      #{o.id_orden_fabricacion} - {o.nombre_cliente || "Cliente"}
                    </option>
                  ))}
                </>
              )}
            </select>

          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trabajador</label>
            <select
              value={trabajadorSeleccionado}
              onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
              className="w-full border border-slate-300 bg-white text-slate-700 rounded-xl px-4 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
            >
              <option value="">Seleccione un trabajador</option>
              {Array.isArray(trabajadores) && trabajadores.map((t) => (
                <option key={t.id_trabajador} value={t.id_trabajador}>
                  {t.nombre} - {t.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto del anticipo</label>
            <input
              type="number"
              min="0"
              value={montoAnticipo}
              onChange={(e) => setMontoAnticipo(parseFloat(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-4 py-2"
            />
          </div>
        </div>
      ) : (
        <>
          {avances.length > 0 && avances[0]?.id_trabajador && avances[0]?.id_orden_fabricacion && (
            <>
              {/* Solo se muestra AnticipoAlert si mostrarAlertaAnticipo es true */}
              {mostrarAlertaAnticipo && (
                <AnticipoAlert
                  idTrabajador={avances[0].id_trabajador}
                  idOrdenFabricacion={avances[0].id_orden_fabricacion}
                  nombreTrabajador={nombreTrabajador}
                  totalAvance={totalFinal}
                  onAplicarDescuento={aplicarDescuentoDeAnticipo}
                  onQuitarDescuento={() => setMostrarAlertaAnticipo(true)} // Esto hace que la alerta reaparezca si se quita el descuento
                />
              )}

              {/* Este botón se muestra si NO hay alerta activa Y ya se aplicó un descuento */}
              {!mostrarAlertaAnticipo && avances.some(a => a.es_descuento) && (
                <div className="my-4">
                  <button
                    onClick={quitarDescuentoDeAnticipo}
                    className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800 border border-red-600 px-3 py-1 rounded-md"
                  >
                    <FiX className="w-4 h-4" />
                    Quitar descuento por anticipo
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mb-6">
            <h4 className="text-lg font-bold text-slate-700 mb-2">Detalles del Pago</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-300">
              <table className="w-full table-auto text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left">Orden fabricacion</th>
                    <th className="px-4 py-2 text-left">Artículo</th>
                    <th className="px-4 py-2 text-left">Etapa</th>
                    <th className="px-4 py-2 text-left">Cantidad</th>
                    <th className="px-4 py-2 text-left">Pago unitario</th>
                    <th className="px-4 py-2 text-left">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {avances.map((a, index) => (
                    <tr key={index} className="border-t border-slate-300">
                      <td className="px-4 py-2">
                        {a.es_descuento
                          ? "—"
                          : `#${a.id_orden_fabricacion}${a.nombre_cliente ? ' - ' + a.nombre_cliente : ''}`}
                      </td>
                      <td className="px-4 py-2">{a.descripcion || "—"}</td>
                      <td className="px-4 py-2">{a.es_descuento ? "—" : a.nombre_etapa}</td>
                      <td className="px-4 py-2">{a.cantidad}</td>
                      <td className="px-4 py-2">${a.costo_fabricacion.toLocaleString()}</td>
                      <td className="px-4 py-2">
                        ${(a.cantidad * a.costo_fabricacion).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-right text-lg text-slate-700 font-bold mt-4">
              Total a pagar: ${totalFinal.toLocaleString()}
            </p>
          </div>
        </>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleRegistrarPago}
          disabled={
            guardando ||
            (esAnticipo && (!ordenSeleccionada || !trabajadorSeleccionado || montoAnticipo <= 0)) ||
            // --- Esta es la condición que valida el anticipo para pagos normales ---
            (!esAnticipo && mostrarAlertaAnticipo)
          }
          className={`px-6 py-2 rounded-md font-semibold transition ${
            guardando ||
            (esAnticipo && (!ordenSeleccionada || !trabajadorSeleccionado || montoAnticipo <= 0)) ||
            (!esAnticipo && mostrarAlertaAnticipo)
              ? "bg-slate-300 cursor-not-allowed text-slate-500"
              : "bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
          }`}
        >
          {guardando ? "Guardando..." : "Registrar Pago"}
        </button>
      </div>

    </div>
  );
};

export default FormularioPagoAvances;
