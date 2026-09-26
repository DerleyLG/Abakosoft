import { useState, useEffect } from "react";
import {
  FiX,
  FiPackage,
  FiUser,
  FiPhone,
  FiClock,
  FiCheckCircle,
} from "react-icons/fi";
import api from "../services/api";
import toast from "react-hot-toast";
import useModalTransition from "../hooks/useModalTransition";

const DrawerOrdenesEntregadas = ({
  isOpen,
  onClose,
  mesInicial,
  anioInicial,
}) => {
  const { mostrar, cerrando, cerrar } = useModalTransition(
    isOpen,
    onClose,
    300,
  );
  const [entered, setEntered] = useState(false);
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(mesInicial || new Date().getMonth() + 1);
  const [anio, setAnio] = useState(anioInicial || new Date().getFullYear());

  // Activar la animación de entrada tras el montaje (el drawer parte de
  // translate-x-full y se desliza a translate-x-0 con la transición CSS).
  useEffect(() => {
    if (mostrar) {
      const t = setTimeout(() => setEntered(true), 10);
      return () => clearTimeout(t);
    }
    setEntered(false);
  }, [mostrar]);

  useEffect(() => {
    if (isOpen) {
      // Actualizar filtros si se pasan nuevos valores
      if (mesInicial) setMes(mesInicial);
      if (anioInicial) setAnio(anioInicial);
      fetchOrdenesEntregadas();
    }
  }, [isOpen, mesInicial, anioInicial]);

  useEffect(() => {
    if (isOpen) {
      fetchOrdenesEntregadas();
    }
  }, [mes, anio]);

  const fetchOrdenesEntregadas = async () => {
    try {
      setLoading(true);
      const res = await api.get("/kanban/ordenes-entregadas", {
        params: { mes, anio },
      });
      setOrdenes(res.data.ordenes || []);
    } catch (error) {
      console.error("Error cargando órdenes entregadas:", error);
      toast.error("Error al cargar órdenes entregadas");
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const meses = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const anios = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  if (!mostrar) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        onClick={cerrar}
        className={`absolute inset-0 bg-black/30 ${
          cerrando ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        }`}
      />

      {/* Drawer derecho */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-full md:w-2/3 lg:w-1/2 xl:w-2/5 bg-white shadow-2xl flex flex-col transform-gpu will-change-transform transition-transform duration-300 ease-out ${
          entered && !cerrando ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-700 rounded-lg">
              <FiPackage size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">
                Órdenes Entregadas
              </h2>
              <p className="text-slate-300 text-xs">Historial de entregas</p>
            </div>
          </div>
          <button
            onClick={cerrar}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex gap-3 shrink-0">
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Mes
            </label>
            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer"
            >
              {meses.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Año
            </label>
            <select
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer"
            >
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Lista de órdenes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400 text-sm">Cargando órdenes...</div>
            </div>
          ) : ordenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <FiPackage size={48} className="mb-3 opacity-40" />
              <p className="text-sm font-semibold text-slate-500">
                No hay órdenes entregadas
              </p>
              <p className="text-xs text-slate-400">
                en {meses[mes - 1].label} {anio}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordenes.map((orden) => (
                <div
                  key={orden.id_orden_fabricacion}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          OF #{orden.id_orden_fabricacion}
                        </span>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                          <FiCheckCircle size={11} />
                          Entregada
                        </span>
                      </div>
                      {orden.id_pedido && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Pedido #{orden.id_pedido}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                      <FiClock size={13} />
                      {formatFecha(orden.fecha_entrega)}
                    </div>
                  </div>

                  {/* Cliente */}
                  {orden.nombre_cliente && (
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5 mb-3">
                      <div className="flex items-center gap-2">
                        <FiUser size={13} className="text-slate-400" />
                        <span className="font-medium text-slate-700 text-sm">
                          {orden.nombre_cliente}
                        </span>
                      </div>
                      {orden.telefono_cliente && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <FiPhone size={13} className="text-slate-400" />
                          <span className="text-xs text-slate-500">
                            {orden.telefono_cliente}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Productos */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <FiPackage size={13} className="text-slate-400" />
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                        Productos
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {orden.productos}
                    </p>
                  </div>

                  {/* Fechas adicionales */}
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[11px] text-slate-400">Inicio</p>
                      <p className="text-sm font-medium text-slate-700">
                        {formatFecha(orden.fecha_inicio)}
                      </p>
                    </div>
                    {orden.fecha_fin_estimada && (
                      <div>
                        <p className="text-[11px] text-slate-400">Estimada</p>
                        <p className="text-sm font-medium text-slate-700">
                          {formatFecha(orden.fecha_fin_estimada)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">
            Total: <strong className="text-slate-700">{ordenes.length}</strong>{" "}
            orden{ordenes.length !== 1 ? "es" : ""}
          </span>
          <button
            onClick={cerrar}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawerOrdenesEntregadas;
