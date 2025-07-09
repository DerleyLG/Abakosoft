import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";
import { FiArrowRight, FiArrowLeft } from "react-icons/fi";

const FormularioPagoAvances = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [avances, setAvances] = useState([]);
  const [total, setTotal] = useState(0);
  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [esAnticipo, setEsAnticipo] = useState(false);
  const [montoAnticipo, setMontoAnticipo] = useState(0);
  const [ordenes, setOrdenes] = useState([]);
  const [ordenSeleccionada, setOrdenSeleccionada] = useState("");
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState("");
  const [trabajadores, setTrabajadores] = useState([]);

  // Cargar avances si vienen de navegación
  useEffect(() => {
    if (state?.avances?.length > 0) {
      setAvances(state.avances);
      const totalCalculado = state.avances.reduce(
        (acc, a) => acc + a.cantidad * a.costo_fabricacion,
        0
      );
      setTotal(totalCalculado);
    }
  }, [state]);

  // Cargar trabajadores si es anticipo
  useEffect(() => {
    if (esAnticipo) {
      api
        .get("/trabajadores")
        .then((res) => setTrabajadores(res.data))
        .catch(() => toast.error("Error al cargar trabajadores"));
    }
  }, [esAnticipo]);

  // Cargar órdenes si es anticipo
  useEffect(() => {
    if (esAnticipo) {
      api
        .get("/ordenes-fabricacion")
        .then((res) => setOrdenes(res.data))
        .catch(() => toast.error("Error al cargar órdenes de fabricación"));
    }
  }, [esAnticipo]);

  const handleRegistrarPago = async () => {
    if (
      esAnticipo &&
      (!ordenSeleccionada || !trabajadorSeleccionado || montoAnticipo <= 0)
    ) {
      toast.error(
        "Debes seleccionar orden, trabajador y un monto válido para el anticipo."
      );
      return;
    }

    try {
      setGuardando(true);

      const payload = {
        id_trabajador:
          avances?.[0]?.id_trabajador || trabajadorSeleccionado || "",
        id_orden_fabricacion: esAnticipo ? ordenSeleccionada : undefined,
        fecha_pago: fechaPago,
        observaciones,
        es_anticipo: esAnticipo ? 1 : 0,
        detalles: esAnticipo
          ? []
          : avances.map((a) => ({
              id_avance_etapa: a.id_avance_etapa,
              cantidad: a.cantidad,
              pago_unitario: a.costo_fabricacion,
            })),
        monto_manual: esAnticipo ? montoAnticipo : undefined,
      };

      await api.post("/pagos", payload);
      toast.success("Pago registrado correctamente");
      navigate("/trabajadores/pagos");
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al registrar avance.";

      toast.error(mensajeBackend);
    } finally {
      setGuardando(false);
    }
  };

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
      className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-md  font-medium shadow cursor-pointer"
    >
      <span>Avances de fabricacion</span>
      <FiArrowRight className="w-4 h-4" />
    </button>

   
  </div>
</div>


      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fecha de pago
          </label>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Registrar como anticipo
          </label>
          <label className="inline-flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={esAnticipo}
              onChange={(e) => setEsAnticipo(e.target.checked)}
              className="accent-slate-700 w-4 h-4"
            />
            Marcar este pago como anticipo
          </label>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Observaciones
        </label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
      </div>

      {esAnticipo ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Orden de fabricación
            </label>
            <select
              value={ordenSeleccionada}
              onChange={(e) => {
                setOrdenSeleccionada(e.target.value);
                const orden = ordenes.find(
                  (o) => o.id_orden_fabricacion === Number(e.target.value)
                );
                if (orden) setTrabajadorSeleccionado(orden.id_trabajador);
              }}
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Seleccione una orden</option>
              {ordenes.map((o) => (
                <option
                  key={o.id_orden_fabricacion}
                  value={o.id_orden_fabricacion}
                >
                  #{o.id_orden_fabricacion} -{" "}
                  {o.nombre_cliente || "Sin descripción"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Trabajador
            </label>
            <select
              value={trabajadorSeleccionado}
              onChange={(e) => setTrabajadorSeleccionado(e.target.value)}
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">Seleccione un trabajador</option>
              {trabajadores.map((t) => (
                <option key={t.id_trabajador} value={t.id_trabajador}>
                  {t.nombre} - {t.cargo}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monto del anticipo
            </label>
            <input
              type="number"
              min="0"
              value={montoAnticipo}
              onChange={(e) => setMontoAnticipo(parseFloat(e.target.value))}
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <h4 className="text-lg font-bold text-slate-700 mb-2">
            Detalles del Pago
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full table-auto text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-2 text-left">Artículo</th>
                  <th className="px-4 py-2 text-left">Etapa</th>
                  <th className="px-4 py-2 text-left">Cantidad</th>
                  <th className="px-4 py-2 text-left">Pago unitario</th>
                  <th className="px-4 py-2 text-left">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {avances.map((a) => (
                  <tr
                    key={a.id_avance_etapa}
                    className="border-t border-slate-300"
                  >
                    <td className="px-4 py-2">{a.descripcion}</td>
                    <td className="px-4 py-2">{a.nombre_etapa}</td>
                    <td className="px-4 py-2">{a.cantidad}</td>
                    <td className="px-4 py-2">
                      ${a.costo_fabricacion.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      ${(a.cantidad * a.costo_fabricacion).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right text-lg text-slate-700 font-bold mt-4">
            Total a pagar: ${total.toLocaleString()}
          </p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleRegistrarPago}
          disabled={
            guardando ||
            (esAnticipo &&
              (!ordenSeleccionada ||
                !trabajadorSeleccionado ||
                montoAnticipo <= 0))
          }
          className={`px-6 py-2 rounded-xl font-semibold transition ${
            guardando ||
            (esAnticipo &&
              (!ordenSeleccionada ||
                !trabajadorSeleccionado ||
                montoAnticipo <= 0))
              ? "bg-slate-300 cursor-not-allowed text-slate-500"
              : "bg-slate-700 hover:bg-slate-600 text-white cursor-pointer rounded-md font-medium shadow"
          }`}
        >
          {guardando ? "Guardando..." : "Registrar Pago"}
        </button>
      </div>
    </div>
  );
};

export default FormularioPagoAvances;
