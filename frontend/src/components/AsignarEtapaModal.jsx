import React, { useEffect, useState } from "react";
import { FiSettings, FiEdit, FiFeather, FiStar } from "react-icons/fi";
import api from "../services/api";

export default function AsignarEtapaModal({
  visible,
  articulo,
  etapaSeleccionada,
  setEtapaSeleccionada,
  guardandoEtapa,
  onGuardar,
  onClose,
}) {
  const [etapas, setEtapas] = useState([]);
  const [loadingEtapas, setLoadingEtapas] = useState(false);

  useEffect(() => {
    if (visible) {
      setLoadingEtapas(true);
      api
        .get("/etapas-produccion")
        .then((res) => {
          if (Array.isArray(res.data)) {
            setEtapas(
              res.data.map((e) => {
                // Asignar color e ícono según nombre de etapa
                let color = "bg-blue-600";
                let icon = <FiSettings />;
                const nombre = (e.nombre || "").toLowerCase();
                if (nombre.includes("pintura")) {
                  color = "bg-yellow-500";
                  icon = <FiEdit />;
                } else if (nombre.includes("mecanizado")) {
                  color = "bg-blue-600";
                  icon = <FiSettings />;
                } else if (nombre.includes("tapizado")) {
                  color = "bg-pink-500";
                  icon = <FiFeather />;
                } else if (nombre.includes("pulido")) {
                  color = "bg-purple-500";
                  icon = <FiStar />;
                }
                return {
                  value: e.id_etapa,
                  label: e.nombre,
                  color,
                  icon,
                };
              }),
            );
          }
        })
        .catch(() => setEtapas([]))
        .finally(() => setLoadingEtapas(false));
    }
  }, [visible]);

  if (!visible || !articulo) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-fade-in flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Asignar etapa de consumo
        </h2>
        <div className="mb-2">
          <div className="font-semibold text-green-700">
            {articulo.descripcion}
          </div>
          <div className="text-xs text-gray-500">
            Ref: {articulo.referencia}
          </div>
        </div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Selecciona la etapa de consumo:
        </label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {loadingEtapas ? (
            <div className="col-span-2 text-center text-gray-400">
              Cargando etapas...
            </div>
          ) : (
            etapas.map((etapa) => (
              <button
                key={etapa.value}
                type="button"
                className={`cursor-pointer flex flex-col items-center justify-center h-24 rounded-xl font-semibold text-white shadow-md focus:outline-none transition-all text-base ${etapa.color} ${etapaSeleccionada?.value === etapa.value ? "ring-4 ring-green-300 scale-105" : "opacity-90 hover:scale-105"}`}
                onClick={() => setEtapaSeleccionada(etapa)}
                disabled={guardandoEtapa}
              >
                {/* Ícono opcional por etapa */}
                <span className="text-2xl mb-1">{etapa.icon}</span>
                <span>{etapa.label}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            className=" cursor-pointer flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold transition disabled:opacity-50"
            onClick={onGuardar}
            disabled={!etapaSeleccionada || guardandoEtapa}
          >
            {guardandoEtapa ? "Guardando..." : "Guardar"}
          </button>
          <button
            className="cursor-pointer flex-1 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold transition"
            onClick={onClose}
            disabled={guardandoEtapa}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
