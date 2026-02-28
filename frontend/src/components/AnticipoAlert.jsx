import React, { useEffect, useState, useRef } from "react";
import api from "../services/api";
import { FiX } from "react-icons/fi";
import toast from "react-hot-toast";

const AnticipoAlert = ({
  idTrabajador,
  idOrdenFabricacion,
  nombreTrabajador,
  totalAvance,
  onAplicarDescuento,
  onQuitarDescuento,
}) => {
  const [anticiposList, setAnticiposList] = useState([]);
  const [anticipoSeleccionado, setAnticipoSeleccionado] = useState(null);
  const [valorDescuento, setValorDescuento] = useState("");
  const [aplicado, setAplicado] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    const fetchAnticipos = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/anticipos/por-trabajador`, {
          params: { trabajadorId: idTrabajador },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setAnticiposList(list);
        if (idOrdenFabricacion) {
          const byOrder = list.find(
            (a) =>
              Number(a.id_orden_fabricacion) === Number(idOrdenFabricacion),
          );
          setAnticipoSeleccionado(byOrder || list[0] || null);
        } else {
          setAnticipoSeleccionado(list[0] || null);
        }
      } catch (error) {
        console.error("Error al cargar anticipos por trabajador:", error);
        setAnticiposList([]);
        setAnticipoSeleccionado(null);
      } finally {
        setLoading(false);
      }
    };

    if (idTrabajador) fetchAnticipos();
    else {
      setAnticiposList([]);
      setAnticipoSeleccionado(null);
      setLoading(false);
    }
  }, [idTrabajador, idOrdenFabricacion]);

  // autofocus input when alert opens
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);

  const totalDisponible = anticiposList.reduce(
    (s, a) => s + (Number(a.monto) - Number(a.monto_usado || 0)),
    0,
  );
  const totalFinal = valorDescuento
    ? totalAvance - Number(valorDescuento)
    : totalAvance;

  const aplicarPorcentaje = (porcentaje) => {
    const valor = Math.round((totalDisponible * porcentaje) / 100);
    setValorDescuento(valor);
  };

  const calcularAsignacionesPreview = (valor) => {
    let restante = Number(valor || 0);
    const asign = [];
    for (const a of anticiposList) {
      const saldo = Number(a.monto) - Number(a.monto_usado || 0);
      if (saldo <= 0) continue;
      const aplicar = Math.min(saldo, restante);
      if (aplicar > 0) {
        asign.push({
          id_anticipo: a.id_anticipo,
          id_orden_fabricacion: a.id_orden_fabricacion || null,
          saldo,
          aplicar,
        });
        restante -= aplicar;
        if (restante <= 0) break;
      }
    }
    return asign;
  };

  const confirmarAplicacion = () => {
    const valor = Number(valorDescuento);
    if (!valor || valor <= 0) {
      toast.error("Ingresa un valor válido para el descuento.");
      return;
    }
    if (valor > totalDisponible) {
      toast.error(
        "El descuento supera el saldo total disponible en anticipos.",
      );
      return;
    }
    if (valor > totalAvance) {
      toast.error("El descuento no puede superar el total del avance.");
      return;
    }

    const asignaciones = calcularAsignacionesPreview(valor);
    onAplicarDescuento({ asignaciones, totalDisponible }, valor);
    setAplicado(true);
  };

  const limpiarDescuento = () => setValorDescuento("");

  if (loading) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-5 mb-6 text-sm text-slate-700 shadow-sm">
        Cargando anticipos...
      </div>
    );
  }

  if (!anticiposList || anticiposList.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-5 mb-6 text-sm text-slate-700 shadow-sm">
        No se encontró anticipo disponible para este trabajador.
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 mb-6 shadow-sm text-slate-700">
      <h3 className="text-lg font-bold text-slate-800 mb-2">
        ANTICIPOS DETECTADOS
      </h3>

      <p className="text-sm mb-4">
        El trabajador{" "}
        <span className="font-semibold text-slate-800">{nombreTrabajador}</span>{" "}
        tiene anticipos pendientes por un total de{" "}
        <strong>${totalDisponible.toLocaleString()}</strong>.
      </p>

      <div className="mb-4">
        <h4 className="text-sm font-semibold mb-2">Anticipos pendientes</h4>
        <div className="text-sm text-slate-700">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th>Id</th>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {anticiposList.map((a) => {
                const saldo = Number(a.monto) - Number(a.monto_usado || 0);
                return (
                  <tr key={a.id_anticipo} className="border-t border-slate-200">
                    <td className="py-1">{a.id_anticipo}</td>
                    <td className="py-1">
                      {a.id_orden_fabricacion
                        ? `#${a.id_orden_fabricacion}`
                        : "—"}
                    </td>
                    <td className="py-1">
                      {a.fecha
                        ? new Date(a.fecha).toLocaleDateString("es-CO")
                        : "—"}
                    </td>
                    <td className="py-1">${saldo.toLocaleString()}</td>
                    <td className="py-1 text-sky-700 font-medium">
                      {a.estado}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-4">
        <div>
          <p className="text-xs text-slate-500">Total del avance</p>
          <p className="font-semibold text-slate-800">
            ${totalAvance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">
            Valor disponible para descontar
          </p>
          <p className="font-semibold text-green-700">
            ${totalDisponible.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Descuento aplicado</p>
          <p className="font-semibold text-amber-700">
            {valorDescuento
              ? `$${Number(valorDescuento).toLocaleString()}`
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Total a pagar</p>
          <p className="font-bold text-slate-800">
            ${Math.max(totalFinal, 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <p className="text-sm font-medium mb-2">
          Selecciona un porcentaje del anticipo{" "}
        </p>
        <div className="flex flex-wrap items-center gap-3 ">
          {[10, 25, 50, 100].map((porc) => (
            <button
              key={porc}
              onClick={() => aplicarPorcentaje(porc)}
              className={`px-4 py-1 rounded-full text-sm border transition ${
                Number(valorDescuento) ===
                Math.round((totalDisponible * porc) / 100)
                  ? "bg-slate-700 text-white "
                  : "bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
              }`}
            >
              {porc}%
            </button>
          ))}

          <div className="flex items-center gap-2 ">
            <input
              type="number"
              className="w-50 border border-slate-300 rounded-xl px-4 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="Valor manual"
              ref={inputRef}
              value={valorDescuento}
              onChange={(e) => setValorDescuento(Number(e.target.value))}
            />
            {valorDescuento && (
              <button
                onClick={limpiarDescuento}
                title="Limpiar descuento"
                className="text-slate-500 hover:text-red-600"
              >
                <FiX className="w-4 h-4 cursor-pointer" />
              </button>
            )}
          </div>
        </div>
      </div>

      {Number(valorDescuento) > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold mb-2">
            Asignación prevista entre anticipos
          </h4>
          <div className="text-sm text-slate-700">
            {(() => {
              const asign = calcularAsignacionesPreview(Number(valorDescuento));
              if (asign.length === 0)
                return (
                  <div className="text-gray-500 italic">
                    No hay asignaciones disponibles.
                  </div>
                );
              return (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th>Id Anticipo</th>
                      <th>Orden</th>
                      <th>Saldo</th>
                      <th>Aplicar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asign.map((s) => (
                      <tr
                        key={s.id_anticipo}
                        className="border-t border-slate-200"
                      >
                        <td className="py-1">{s.id_anticipo}</td>
                        <td className="py-1">
                          {s.id_orden_fabricacion
                            ? `#${s.id_orden_fabricacion}`
                            : "—"}
                        </td>
                        <td className="py-1">${s.saldo.toLocaleString()}</td>
                        <td className="py-1 text-amber-700">
                          -${s.aplicar.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={confirmarAplicacion}
          className="bg-slate-700 hover:bg-slate-600 text-white px-5 py-2 rounded-md font-semibold text-sm cursor-pointer"
        >
          Aplicar descuento
        </button>
      </div>
    </div>
  );
};

export default AnticipoAlert;
