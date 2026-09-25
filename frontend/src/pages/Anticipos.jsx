import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "parcial", label: "Parcial" },
  { value: "saldado", label: "Saldado" },
];

// Ramp semántico: sin tocar → en curso → completado
const ESTADO_STYLES = {
  pendiente: {
    dot: "bg-slate-400",
    text: "text-slate-600",
    bar: "bg-slate-300",
  },
  parcial: {
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    bar: "bg-indigo-500",
  },
  saldado: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
};

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

const iniciales = (nombre) =>
  String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

// Evitar parseo con Date para no introducir desplazamientos por zona horaria.
const fmtFecha = (fecha) => {
  if (!fecha) return "—";
  const raw = String(fecha).split("T")[0].split(" ")[0];
  const parts = raw.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return raw;
};

const ListaAnticipos = () => {
  const [anticipos, setAnticipos] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumen, setResumen] = useState(null);

  const [buscar, setBuscar] = useState("");
  const [buscarDebounced, setBuscarDebounced] = useState("");
  const [estado, setEstado] = useState("");
  const [aplicaciones, setAplicaciones] = useState([]);
  const [anticipoAplicaciones, setAnticipoAplicaciones] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      setBuscarDebounced(buscar);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [buscar]);

  useEffect(() => {
    const fetchAnticipos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/anticipos", {
          params: {
            page,
            pageSize,
            sortBy: "fecha",
            sortDir: "desc",
            buscar: buscarDebounced || undefined,
            estado: estado || undefined,
          },
        });
        const payload = res.data || {};
        setAnticipos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
        setResumen(payload.resumen || null);
      } catch (error) {
        console.error("Error al cargar anticipos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnticipos();
  }, [page, pageSize, buscarDebounced, estado]);

  const totalAnticipado = Number(resumen?.total_anticipado || 0);
  const saldoPendiente = Number(resumen?.saldo_pendiente || 0);
  const yaDescontado = totalAnticipado - saldoPendiente;
  const pctDescontado =
    totalAnticipado > 0 ? (yaDescontado / totalAnticipado) * 100 : 0;

  const hayFiltros = Boolean(buscarDebounced || estado);

  const verAplicaciones = async (anticipo) => {
    try {
      const res = await api.get(`/anticipos/${anticipo.id_anticipo}/aplicaciones`);
      setAplicaciones(Array.isArray(res.data) ? res.data : []);
      setAnticipoAplicaciones(anticipo);
    } catch (error) {
      console.error("Error cargando aplicaciones:", error);
      toast.error("Error al cargar las aplicaciones del anticipo");
    }
  };

  const handleEliminar = (anticipo) => {
    confirmAlert({
      title: "Eliminar anticipo",
      message: `¿Seguro que quieres eliminar el anticipo de ${anticipo.trabajador} por ${fmtMoney(
        anticipo.monto,
      )}? Se revertirán los descuentos aplicados y el movimiento de tesorería.`,
      buttons: [
        {
          label: "Sí, eliminar",
          onClick: async () => {
            try {
              await api.delete(`/anticipos/${anticipo.id_anticipo}`);
              toast.success("Anticipo eliminado correctamente");
              setAnticipos((prev) =>
                prev.filter((a) => a.id_anticipo !== anticipo.id_anticipo),
              );
            } catch (error) {
              toast.error(
                error?.response?.data?.error || "Error al eliminar el anticipo",
              );
            }
          },
        },
        { label: "Cancelar", onClick: () => {} },
      ],
    });
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Adelantos de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Anticipos
            </h1>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/trabajadores/pagos")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Pagos
          </button>
          <button
            onClick={() => navigate("/anticipos/nuevo")}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FiPlus size={16} />
            Registrar anticipo
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Total anticipado
          </p>
          <p className="text-xl font-bold text-slate-900 mt-1.5 tabular-nums">
            {fmtMoney(totalAnticipado)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Ya descontado
          </p>
          <p className="text-xl font-bold text-emerald-600 mt-1.5 tabular-nums">
            {fmtMoney(yaDescontado)}
          </p>
          <div className="mt-2.5 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, pctDescontado))}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 tabular-nums">
            {pctDescontado.toFixed(0)}% recuperado
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
            Pendiente por descontar
          </p>
          <p className="text-xl font-bold text-indigo-700 mt-1.5 tabular-nums">
            {fmtMoney(saldoPendiente)}
          </p>
          <p className="text-[11px] text-slate-400 mt-2.5">
            Se cruzará con próximos pagos por avances
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <FiSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={15}
          />
          <input
            type="text"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por trabajador, cliente u observaciones…"
            className="w-full text-sm bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400"
          />
        </div>

        {/* Control segmentado de estado */}
        <div className="inline-flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
          {ESTADOS.map((e) => (
            <button
              key={e.value || "todos"}
              onClick={() => {
                setEstado(e.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                estado === e.value
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Trabajador
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Orden
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Monto
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-48">
                  Descontado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Pendiente
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-24">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : anticipos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <p className="text-sm font-medium text-slate-400">
                      {hayFiltros
                        ? "No se encontraron anticipos con ese filtro."
                        : "No se encontraron anticipos."}
                    </p>
                    {!hayFiltros && (
                      <button
                        onClick={() => navigate("/anticipos/nuevo")}
                        className="inline-flex items-center gap-2 mt-4 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        <FiPlus size={16} />
                        Registrar anticipo
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                anticipos.map((a) => {
                  const monto = Number(a.monto || 0);
                  const usado = Number(a.monto_usado || 0);
                  const pendiente = monto - usado;
                  const pct = monto > 0 ? (usado / monto) * 100 : 0;
                  const st = ESTADO_STYLES[a.estado] || ESTADO_STYLES.pendiente;

                  return (
                    <tr
                      key={a.id_anticipo}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"
                    >
                      {/* Trabajador */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold">
                            {iniciales(a.trabajador)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-slate-800 truncate">
                              {a.trabajador}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${st.dot}`}
                              />
                              <span
                                className={`text-[11px] font-medium capitalize ${st.text}`}
                              >
                                {a.estado}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Orden */}
                      <td className="px-4 py-3">
                        {a.id_orden_fabricacion ? (
                          <div>
                            <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              #{a.id_orden_fabricacion}
                            </span>
                            {a.cliente && (
                              <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[12rem]">
                                {a.cliente}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin orden
                          </span>
                        )}
                      </td>

                      {/* Fecha */}
                      <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
                        {fmtFecha(a.fecha)}
                      </td>

                      {/* Monto */}
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 tabular-nums whitespace-nowrap">
                        {fmtMoney(monto)}
                      </td>

                      {/* Progreso descontado */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[4rem]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${st.bar}`}
                              style={{
                                width: `${Math.min(100, Math.max(0, pct))}%`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-slate-500 tabular-nums w-9 text-right shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                          {fmtMoney(usado)} descontado
                        </p>
                      </td>

                      {/* Pendiente */}
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        <span
                          className={`font-bold ${
                            pendiente > 0 ? "text-indigo-700" : "text-slate-300"
                          }`}
                        >
                          {fmtMoney(pendiente)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => verAplicaciones(a)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                            title="Ver pagos que descontaron este anticipo"
                          >
                            <FiEye size={14} />
                          </button>
                          <button
                            onClick={() =>
                              navigate(`/anticipos/editar/${a.id_anticipo}`)
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                            title="Editar anticipo"
                          >
                            <FiEdit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleEliminar(a)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                            title="Eliminar anticipo"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página{" "}
              <span className="font-semibold text-slate-700">{page}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>
              {total > 0 && (
                <>
                  {" "}
                  —{" "}
                  <span className="font-semibold text-slate-700">
                    {total}
                  </span>{" "}
                  {total === 1 ? "anticipo" : "anticipos"} en total
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => hasNext && setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value={10}>10 / pág.</option>
                <option value={20}>20 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de aplicaciones (drill-down) */}
      {anticipoAplicaciones && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setAnticipoAplicaciones(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-modal-card-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Pagos que descontaron este anticipo
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {anticipoAplicaciones.trabajador} —{" "}
                  {fmtMoney(anticipoAplicaciones.monto)}
                </p>
              </div>
              <button
                onClick={() => setAnticipoAplicaciones(null)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {aplicaciones.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  Este anticipo aún no ha sido descontado en ningún pago.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Pago
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {aplicaciones.map((ap) => (
                      <tr key={ap.id_aplicacion}>
                        <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                          Pago #{ap.id_pago}
                        </td>
                        <td className="px-3 py-2 text-slate-600 tabular-nums">
                          {fmtFecha(ap.fecha_pago)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-800 tabular-nums">
                          {fmtMoney(ap.monto_aplicado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListaAnticipos;
