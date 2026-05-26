import React, { useEffect, useState, useMemo } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";

const ListaAvances = () => {
  const [avances, setAvances] = useState([]);
  const [mostrarPagados, setMostrarPagados] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);
  const [idTrabajadorSeleccionado, setIdTrabajadorSeleccionado] = useState("");
  const [anticipoPendienteInfo, setAnticipoPendienteInfo] = useState(null);
  const [anticiposDetallePorTrabajador, setAnticiposDetallePorTrabajador] =
    useState({});
  const [pendientesPorTrabajador, setPendientesPorTrabajador] = useState({});
  const [seleccionados, setSeleccionados] = useState([]);
  const [buscar, setBuscar] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleToggle = (avance) => {
    const isSelected = seleccionados.includes(avance.id_avance_etapa);

    if (isSelected) {
      setSeleccionados(
        seleccionados.filter((id) => id !== avance.id_avance_etapa),
      );
      return;
    }

    if (seleccionados.length > 0) {
      const primeraId = seleccionados[0];
      const primera = avances.find((a) => a.id_avance_etapa === primeraId);
      if (primera && primera.id_trabajador !== avance.id_trabajador) {
        toast.error("Solo puedes seleccionar avances del mismo trabajador.");
        return;
      }
    }

    setSeleccionados([...seleccionados, avance.id_avance_etapa]);
  }; // Para el subtotal, se necesitan todos los avances seleccionados, no solo los de la página actual

  const [avancesGlobal, setAvancesGlobal] = useState([]);

  useEffect(() => {
    // Acumula todos los avances seleccionados globalmente
    setAvancesGlobal((prev) => {
      // Si la página trae avances nuevos, los fusionamos sin duplicados
      const nuevos = avances.filter(
        (a) => !prev.some((p) => p.id_avance_etapa === a.id_avance_etapa),
      );
      return [...prev, ...nuevos];
    });
  }, [avances]);

  const avancesSeleccionados = useMemo(() => {
    // Buscar los ids seleccionados en el array global
    return avancesGlobal.filter((av) =>
      seleccionados.includes(av.id_avance_etapa),
    );
  }, [avancesGlobal, seleccionados]); // Subtotal de costo de fabricación (costo unitario x cantidad) de los seleccionados

  const subtotalSeleccionados = useMemo(() => {
    return avancesSeleccionados.reduce((acc, av) => {
      const costo = Number(av.costo_fabricacion) || 0;
      const cant = Number(av.cantidad) || 0;
      return acc + costo * cant;
    }, 0);
  }, [avancesSeleccionados]); // Verifica si al menos uno de los avances seleccionados tiene un anticipo

  // Detecta si el trabajador seleccionado tiene anticipo pendiente/parcial
  const trabajadorConAnticipo = useMemo(() => {
    if (avancesSeleccionados.length === 0) return null;
    const trabajadorId = avancesSeleccionados[0].id_trabajador;
    // Buscar en todos los avances globales si hay anticipo para ese trabajador
    const anticipo = avancesGlobal.find(
      (av) =>
        av.id_trabajador === trabajadorId &&
        av.monto_anticipo > 0 &&
        av.estado_anticipo !== "saldado",
    );
    return anticipo || null;
  }, [avancesSeleccionados, avancesGlobal]);

  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        const res = await api.get("/trabajadores");
        setTrabajadores(res.data);
      } catch (error) {
        console.error("Error al cargar trabajadores:", error);
        toast.error("Error al cargar trabajadores.");
      }
    };
    fetchTrabajadores();
  }, []);

  useEffect(() => {
    const fetchAvances = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          pageSize,
          sortBy: "fecha",
          sortDir: "desc",
        };
        if (idTrabajadorSeleccionado)
          params.id_trabajador = idTrabajadorSeleccionado;
        if (buscar && buscar.trim()) params.buscar = buscar.trim();

        const endpoint = mostrarPagados
          ? "/avance-etapas/pagados"
          : "/avance-etapas";
        const res = await api.get(endpoint, { params });
        const payload = res.data || {};
        setAvances(payload.data || []);
        // Después de cargar avances en la página, consultar resumen de anticipos por trabajador (para mostrar indicación incluso si el anticipo no está ligado a la orden)
        try {
          const workerIds = Array.from(
            new Set(
              (payload.data || []).map((a) => a.id_trabajador).filter(Boolean),
            ),
          );
          const map = {};
          await Promise.all(
            workerIds.map(async (wid) => {
              try {
                const r = await api.get("/anticipos/pendientes", {
                  params: { trabajadorId: wid },
                });
                map[wid] = r.data || {
                  hasPendiente: false,
                  totalDisponible: 0,
                  count: 0,
                };
              } catch (e) {
                map[wid] = {
                  hasPendiente: false,
                  totalDisponible: 0,
                  count: 0,
                };
              }
            }),
          );
          setPendientesPorTrabajador(map);
        } catch (e) {
          console.warn("No se pudieron cargar pendientes por trabajador", e);
          setPendientesPorTrabajador({});
        }
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setHasNext(!!payload.hasNext);
        setHasPrev(!!payload.hasPrev);
      } catch (error) {
        console.error("Error al obtener avances:", error);
        setAvances([]);
        setTotal(0);
        setTotalPages(1);
        setHasNext(false);
        setHasPrev(false);
        toast.error("Error al cargar avances.");
      } finally {
        setLoading(false);
      }
    };
    fetchAvances();
  }, [idTrabajadorSeleccionado, mostrarPagados, page, pageSize, buscar]);

  // Consultar anticipos pendientes por trabajador cuando cambie el filtro
  useEffect(() => {
    const fetchPendiente = async () => {
      if (!idTrabajadorSeleccionado) {
        setAnticipoPendienteInfo(null);
        return;
      }
      try {
        const res = await api.get("/anticipos/pendientes", {
          params: { trabajadorId: idTrabajadorSeleccionado },
        });
        const summary = res.data || null;
        setAnticipoPendienteInfo(summary);
        // also fetch detailed list so we can show associated orders
        if (summary?.hasPendiente) {
          try {
            const det = await api.get("/anticipos/por-trabajador", {
              params: { trabajadorId: idTrabajadorSeleccionado },
            });
            setAnticiposDetallePorTrabajador((prev) => ({
              ...prev,
              [idTrabajadorSeleccionado]: Array.isArray(det.data)
                ? det.data
                : [],
            }));
          } catch (e) {
            console.warn(
              "No se pudo cargar detalle de anticipos por trabajador",
              e,
            );
            setAnticiposDetallePorTrabajador((prev) => ({
              ...prev,
              [idTrabajadorSeleccionado]: [],
            }));
          }
        } else {
          setAnticiposDetallePorTrabajador((prev) => ({
            ...prev,
            [idTrabajadorSeleccionado]: [],
          }));
        }
      } catch (err) {
        console.error("Error verificando anticipos pendientes:", err);
        setAnticipoPendienteInfo(null);
      }
    };
    fetchPendiente();
  }, [idTrabajadorSeleccionado]);
  const manejarPagoMultiple = () => {
    navigate("/pagos/nuevo", {
      state: { avances: avancesSeleccionados },
    });
  };

  const ESTADO_AVZ_CLS = {
    completado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    completada: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "en proceso": "bg-indigo-50 text-indigo-700 border border-indigo-200",
    pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
    parcial: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Avances de producción
          </h1>
          {total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{total} registros</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/trabajadores/pagos")}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Pagos
          </button>
          <button
            onClick={() => navigate("/pagos_anticipados")}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Anticipos
          </button>
          <button
            onClick={() => {
              setMostrarPagados(!mostrarPagados);
              setPage(1);
              setSeleccionados([]);
            }}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer ${
              mostrarPagados
                ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {mostrarPagados ? "Ver no pagados" : "Ver pagados"}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <FiArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-xs">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Trabajador
            </label>
            <select
              value={idTrabajadorSeleccionado}
              onChange={(e) => {
                setIdTrabajadorSeleccionado(e.target.value);
                setPage(1);
                setSeleccionados([]);
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition"
            >
              <option value="">Todos</option>
              {trabajadores.map((t) => (
                <option key={t.id_trabajador} value={t.id_trabajador}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[180px] max-w-xs">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Orden, artículo…"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
                setPage(1);
              }}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 transition placeholder:text-slate-400"
            />
          </div>
        </div>
        {anticipoPendienteInfo?.hasPendiente && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
              Anticipo detectado
            </span>
            <div className="text-xs text-slate-600">
              <span className="font-semibold">
                {trabajadores.find(
                  (t) =>
                    String(t.id_trabajador) ===
                    String(idTrabajadorSeleccionado),
                )?.nombre || ""}
              </span>
              {" — "}anticipo pendiente:{" "}
              <span className="font-semibold text-sky-700">
                {fmtCOP(anticipoPendienteInfo.totalDisponible)}
              </span>
              {Array.isArray(
                anticiposDetallePorTrabajador[idTrabajadorSeleccionado],
              ) &&
                anticiposDetallePorTrabajador[idTrabajadorSeleccionado].length >
                  0 && (
                  <span className="ml-1 text-slate-400">
                    — Orden(es):{" "}
                    {anticiposDetallePorTrabajador[idTrabajadorSeleccionado]
                      .map((a) => a.id_orden_fabricacion)
                      .filter(Boolean)
                      .map((o) => `#${o}`)
                      .join(", ") || "—"}
                  </span>
                )}
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {!mostrarPagados && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      title="Seleccionar todos"
                      className="cursor-pointer rounded border-slate-300"
                      checked={
                        avances.length > 0 &&
                        avances.every((a) =>
                          seleccionados.includes(a.id_avance_etapa),
                        )
                      }
                      onChange={(e) => {
                        if (!e.target.checked) {
                          const idsPagina = new Set(
                            avances.map((a) => a.id_avance_etapa),
                          );
                          setSeleccionados((prev) =>
                            prev.filter((id) => !idsPagina.has(id)),
                          );
                          return;
                        }
                        if (avances.length === 0) return;
                        const trabajadoresEnPagina = Array.from(
                          new Set(avances.map((a) => a.id_trabajador)),
                        );
                        if (
                          !idTrabajadorSeleccionado &&
                          trabajadoresEnPagina.length > 1
                        ) {
                          toast.error(
                            "Para seleccionar todos, filtra por un trabajador primero.",
                          );
                          return;
                        }
                        if (idTrabajadorSeleccionado) {
                          setSeleccionados(
                            Array.from(
                              new Set([
                                ...seleccionados,
                                ...avances.map((a) => a.id_avance_etapa),
                              ]),
                            ),
                          );
                          return;
                        }
                        if (seleccionados.length > 0) {
                          const primeraSel = avances.find(
                            (a) => a.id_avance_etapa === seleccionados[0],
                          );
                          const trabajadorSel = primeraSel?.id_trabajador;
                          const todosMismo = avances.every(
                            (a) => a.id_trabajador === trabajadorSel,
                          );
                          if (!todosMismo) {
                            toast.error(
                              "Solo puedes seleccionar avances del mismo trabajador.",
                            );
                            return;
                          }
                        }
                        setSeleccionados(
                          Array.from(
                            new Set([
                              ...seleccionados,
                              ...avances.map((a) => a.id_avance_etapa),
                            ]),
                          ),
                        );
                      }}
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Orden
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Artículo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Etapa
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Trabajador
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Cant.
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Costo unit.
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Subtotal
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Anticipo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pago
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: mostrarPagados ? 11 : 12 }).map(
                      (__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="animate-pulse h-3.5 bg-slate-100 rounded w-full" />
                        </td>
                      ),
                    )}
                  </tr>
                ))
              ) : avances.length === 0 ? (
                <tr>
                  <td
                    colSpan={mostrarPagados ? 11 : 12}
                    className="text-center py-16"
                  >
                    <p className="text-sm font-semibold text-slate-500">
                      Sin avances
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      No hay avances registrados para los filtros seleccionados
                    </p>
                  </td>
                </tr>
              ) : (
                avances.map((avance, index) => {
                  const estAvz = (avance.estado || "").toLowerCase();
                  const badgeCls =
                    ESTADO_AVZ_CLS[estAvz] ||
                    "bg-slate-50 text-slate-600 border border-slate-200";
                  return (
                    <tr
                      key={avance.id_avance_etapa}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      {!mostrarPagados && (
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            className="cursor-pointer rounded border-slate-300"
                            checked={seleccionados.includes(
                              avance.id_avance_etapa,
                            )}
                            onChange={() => handleToggle(avance)}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        #{avance.id_orden_fabricacion}
                        {avance.nombre_cliente && (
                          <span className="ml-1 text-slate-400 font-sans">
                            — {avance.nombre_cliente}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {avance.descripcion || avance.id_articulo}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {avance.nombre_etapa || avance.id_etapa_produccion}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 font-medium">
                        {avance.nombre_trabajador || avance.id_trabajador}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-700">
                        {avance.cantidad}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums text-slate-600">
                        {fmtCOP(avance.costo_fabricacion ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums font-semibold text-slate-800">
                        {fmtCOP(
                          (avance.costo_fabricacion ?? 0) *
                            (avance.cantidad ?? 0),
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const saldo = Number(avance.monto_anticipo || 0);
                          const estado = avance.estado_anticipo || null;
                          const pendingInfo =
                            pendientesPorTrabajador[avance.id_trabajador];
                          const workerSaldo = pendingInfo?.totalDisponible || 0;
                          const tieneAnticipo = saldo > 0 || workerSaldo > 0;
                          const yaMostrado = avances
                            .slice(0, index)
                            .some((a) => {
                              const prevPending =
                                pendientesPorTrabajador[a.id_trabajador];
                              const prevSaldo =
                                Number(a.monto_anticipo || 0) +
                                (prevPending?.totalDisponible || 0);
                              return (
                                a.id_trabajador === avance.id_trabajador &&
                                prevSaldo > 0
                              );
                            });

                          if (tieneAnticipo && !yaMostrado) {
                            const displaySaldo =
                              saldo > 0 ? saldo : workerSaldo;
                            const displayEstado =
                              estado ||
                              (pendingInfo?.hasPendiente ? "pendiente" : null);
                            return (
                              <div className="flex items-center gap-1.5">
                                <button
                                  title={`Aplicar anticipo: ${fmtCOP(displaySaldo)}`}
                                  onClick={() =>
                                    navigate("/pagos/nuevo", {
                                      state: { avances: [avance] },
                                    })
                                  }
                                  className="text-sky-700 font-semibold hover:underline cursor-pointer text-xs"
                                >
                                  {fmtCOP(displaySaldo)}
                                </button>
                                {displayEstado &&
                                  displayEstado !== "saldado" && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                      {displayEstado}
                                    </span>
                                  )}
                              </div>
                            );
                          }
                          if (
                            (saldo > 0 || workerSaldo > 0) &&
                            estado === "saldado"
                          ) {
                            const displaySaldo =
                              saldo > 0 ? saldo : workerSaldo;
                            return (
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-700 font-semibold text-xs">
                                  {fmtCOP(displaySaldo)}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  SALDADO
                                </span>
                              </div>
                            );
                          }
                          return (
                            <span className="text-slate-300 text-xs italic">
                              —
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(avance.fecha_registro).toLocaleDateString(
                          "es-CO",
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {estAvz ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeCls}`}
                          >
                            {avance.estado.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {mostrarPagados ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            PAGADO
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            PENDIENTE
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de selección */}
        {!mostrarPagados && seleccionados.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-3 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">{seleccionados.length}</span>{" "}
              avance(s) seleccionado(s) — subtotal:{" "}
              <span className="font-bold text-emerald-700">
                {fmtCOP(subtotalSeleccionados)}
              </span>
            </div>
            <button
              onClick={manejarPagoMultiple}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-colors cursor-pointer"
            >
              Registrar pago ({seleccionados.length})
            </button>
          </div>
        )}
      </div>

      {/* Paginación */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Página <span className="font-semibold text-slate-700">{page}</span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700">{totalPages}</span> —{" "}
            {total} registros
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer"
            >
              <option value="10">10 / página</option>
              <option value="25">25 / página</option>
              <option value="50">50 / página</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaAvances;
