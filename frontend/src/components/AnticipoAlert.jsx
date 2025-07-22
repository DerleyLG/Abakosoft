import React, { useEffect, useState } from "react";
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
  const [anticipo, setAnticipo] = useState(null);
  const [valorDescuento, setValorDescuento] = useState("");
  const [aplicado, setAplicado] = useState(false);

  useEffect(() => {
    const fetchAnticipo = async () => {
      try {
        const res = await api.get(`/anticipos/${idTrabajador}/${idOrdenFabricacion}`);
        if (res.data) setAnticipo(res.data);
      } catch (error) {
        console.error("Error al cargar anticipo:", error);
      }
    };
    fetchAnticipo();
  }, [idTrabajador, idOrdenFabricacion]);

  if (!anticipo) return null;

  const saldoDisponible = anticipo.monto - (anticipo.monto_usado || 0);
  const totalFinal = valorDescuento ? totalAvance - valorDescuento : totalAvance;

  const aplicar = (porcentaje) => {
    const valor = Math.round((saldoDisponible * porcentaje) / 100);
    setValorDescuento(valor);
  };

  const confirmarAplicacion = () => {
    const valor = Number(valorDescuento);
    if (!valor || valor < 0) {
      toast.error("Ingresa un valor válido para el descuento.");
      return;
    }
    if (valor > saldoDisponible) {
      toast.error("El descuento supera el saldo disponible.");
      return;
    }
    if (valor > totalAvance) {
      toast.error("El descuento no puede superar el total del avance.");
      return;
    }

    onAplicarDescuento(anticipo, valor);
    setAplicado(true);
  };

  const limpiarDescuento = () => {
    setValorDescuento("");
  };

  if (aplicado) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-5 mb-6 text-sm text-slate-700 shadow-sm flex items-center justify-between">
        <span>
          Se aplicó un descuento de{" "}
          <strong className="text-amber-700">
            ${Number(valorDescuento).toLocaleString()}
          </strong>{" "}
          al pago.
        </span>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 mb-6 shadow-sm text-slate-700">
      <h3 className="text-lg font-bold text-slate-800 mb-2">
      ANTICIPO DETECTADO
      </h3>

      <p className="text-sm mb-4">
        El trabajador <span className="font-semibold text-slate-800">{nombreTrabajador}</span> tiene un
        anticipo activo asociado a la orden{" "}
        <span className="font-mono text-slate-700 font-semibold">
          #{idOrdenFabricacion}
        </span>
        . Puedes aplicar un descuento porcentual o ingresar un valor manual, este es el resumen del anticipo realizado: 
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600 mb-4">
        <div>
          <p className="text-xs text-slate-500">Total del avance</p>
          <p className="font-semibold text-slate-800">
            ${totalAvance.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Valor disponible para descontar</p>
          <p className="font-semibold text-green-700">
            ${saldoDisponible.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Descuento aplicado</p>
          <p className="font-semibold text-amber-700">
            {valorDescuento ? `$${Number(valorDescuento).toLocaleString()}` : "—"}
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
        <p className="text-sm font-medium mb-2">Selecciona un porcentaje del anticipo </p>
        <div className="flex flex-wrap items-center gap-3 ">
          {[10, 25, 50, 100].map((porc) => (
            <button
              key={porc}
              onClick={() => aplicar(porc)}
              className={`px-4 py-1 rounded-full text-sm border transition ${
                valorDescuento === Math.round((saldoDisponible * porc) / 100)
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
              value={valorDescuento}
              onChange={(e) => setValorDescuento(Number(e.target.value))}
            />
            {valorDescuento && (
              <button
                onClick={limpiarDescuento}
                title="Limpiar descuento"
                className="text-slate-500 hover:text-red-600"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

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
