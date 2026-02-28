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

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-bold text-gray-800">
          Avances de Producción
        </h2>
        <div className="flex items-center gap-3">
           <button
            onClick={() => navigate("/trabajadores/pagos")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            Pagos
          </button> 
          <button
            onClick={() => navigate("/pagos_anticipados")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            Anticipos
          </button>
          <button
            onClick={() => {
              setMostrarPagados(!mostrarPagados);
              setPage(1);
              setSeleccionados([]); // limpiar selección al cambiar vista pagados/no pagados
            }}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              mostrarPagados
                ? "bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800 cursor-pointer"
            }`}
          >
            {mostrarPagados ? "Ver no pagados" : "Ver pagados"}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
          >
            <FiArrowLeft /> Volver
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-col gap-3">
        <label
          htmlFor="trabajador"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Selecciona un trabajador:
        </label>
        <select
          id="trabajador"
          value={idTrabajadorSeleccionado}
          onChange={(e) => {
            setIdTrabajadorSeleccionado(e.target.value);
            setPage(1);
            setSeleccionados([]); // limpiar selección al cambiar de trabajador
          }}
          className="px-3 py-2 border border-gray-300 rounded-md w-full max-w-xs"
        >
          <option value="">-- Todos --</option>
          {trabajadores.map((t) => (
            <option key={t.id_trabajador} value={t.id_trabajador}>
              {t.nombre}
            </option>
          ))}
        </select>
        {anticipoPendienteInfo && anticipoPendienteInfo.hasPendiente && (
          <div className="mt-2 text-sm text-sky-700 font-medium">
            Trabajador:{" "}
            {trabajadores.find(
              (t) =>
                String(t.id_trabajador) === String(idTrabajadorSeleccionado),
            )?.nombre || ""}{" "}
            — Anticipo pendiente detectado (${" "}
            {Number(
              anticipoPendienteInfo.totalDisponible || 0,
            ).toLocaleString()}
            )
            {Array.isArray(
              anticiposDetallePorTrabajador[idTrabajadorSeleccionado],
            ) &&
              anticiposDetallePorTrabajador[idTrabajadorSeleccionado].length >
                0 && (
                <span className="block text-sm text-slate-500 mt-1">
                  Orden(es):{" "}
                  {anticiposDetallePorTrabajador[idTrabajadorSeleccionado]
                    .map((a) => a.id_orden_fabricacion)
                    .filter(Boolean)
                    .map((o) => `#${o}`)
                    .join(", ") || "—"}
                </span>
              )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto shadow rounded-lg mt-4">
        <table className="min-w-full table-auto border border-slate-300 bg-white">
          <thead className="bg-slate-200 text-slate-700">
            <tr>
              {!mostrarPagados && (
                <th className="px-4 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      title="Seleccionar todos los avances de esta página"
                      className="cursor-pointer"
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
                        } // Si marca: intentar seleccionar todos los visibles respetando la regla de mismo trabajador
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
                        } // Si ya filtraste por trabajador, permite seleccionar todos sin validar el trabajador
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
                        } // Si no hay filtro, validar que todos los avances sean del mismo trabajador
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
                    <span>Seleccionar</span>
                  </div>
                </th>
              )}
              <th className="px-4 py-2 text-left">Orden</th>
              <th className="px-4 py-2 text-left">Artículo</th>
              <th className="px-4 py-2 text-left">Etapa</th>
              <th className="px-4 py-2 text-left">Trabajador</th>
              <th className="px-4 py-2 text-left">Cantidad</th>
              <th className="px-4 py-2 text-left">Costo unitario</th>
              <th className="px-4 py-2 text-left">Subtotal</th>
              <th className="px-4 py-2 text-left">Anticipo (saldo)</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Estado de pago</th>
            </tr>
          </thead>

          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={mostrarPagados ? 11 : 12}
                  className="px-4 py-4 text-center text-slate-500"
                >
                  Cargando..
                </td>
              </tr>
            )}

            {!loading &&
              avances.map((avance, index) => (
                <tr
                  key={avance.id_avance_etapa}
                  className="border-t border-slate-300 hover:bg-slate-50"
                >
                  {!mostrarPagados && (
                    <td className="px-4 py-2 ">
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={seleccionados.includes(avance.id_avance_etapa)}
                        onChange={() => handleToggle(avance)}
                      />
                    </td>
                  )}

                  <td className="px-4 py-2">
                    #{avance.id_orden_fabricacion} -{avance.nombre_cliente}
                  </td>

                  <td className="px-4 py-2">
                    {avance.descripcion || avance.id_articulo}
                  </td>

                  <td className="px-4 py-2">
                    {avance.nombre_etapa || avance.id_etapa_produccion}
                  </td>

                  <td className="px-4 py-2">
                    {avance.nombre_trabajador || avance.id_trabajador}
                  </td>

                  <td className="px-4 py-2">{avance.cantidad}</td>

                  <td className="px-4 py-2">{`$${(
                    avance.costo_fabricacion ?? 0
                  ).toLocaleString()}`}</td>

                  <td className="px-4 py-2 font-semibold text-slate-700">
                    {`$${(
                      (avance.costo_fabricacion ?? 0) * (avance.cantidad ?? 0)
                    ).toLocaleString()}`}
                  </td>
                  <td className="px-4 py-2">
                    {(() => {
                      const saldo = Number(avance.monto_anticipo || 0);
                      const estado = avance.estado_anticipo || null;
                      // Considerar tanto el anticipo ligado a la orden (monto_anticipo) como el pendiente a nivel trabajador
                      const pendingInfo =
                        pendientesPorTrabajador[avance.id_trabajador];
                      const workerSaldo = pendingInfo?.totalDisponible || 0;
                      const tieneAnticipo = saldo > 0 || workerSaldo > 0;
                      const yaMostrado = avances.slice(0, index).some((a) => {
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
                        const displaySaldo = saldo > 0 ? saldo : workerSaldo;
                        const displayEstado =
                          estado ||
                          (pendingInfo?.hasPendiente ? "pendiente" : null);
                        return (
                          <div className="flex items-center gap-3">
                            <button
                              title={`Aplicar anticipo: $${displaySaldo.toLocaleString()}`}
                              onClick={() =>
                                navigate("/pagos/nuevo", {
                                  state: { avances: [avance] },
                                })
                              }
                              className="text-sky-700 font-semibold hover:underline cursor-pointer"
                            >
                              ${displaySaldo.toLocaleString()}
                            </button>
                            {displayEstado && displayEstado !== "saldado" && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
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
                        const displaySaldo = saldo > 0 ? saldo : workerSaldo;
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-700 font-semibold">
                              ${displaySaldo.toLocaleString()}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              Saldado
                            </span>
                          </div>
                        );
                      }

                      return (
                        <span className="text-slate-400 italic text-sm">
                          Sin anticipo
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-4 py-2">
                    {new Date(avance.fecha_registro).toLocaleDateString(
                      "es-CO",
                    )}
                  </td>

                  <td className="px-4 py-2 capitalize">{avance.estado}</td>
                  <td className="px-4 py-2">
                    {mostrarPagados ? (
                      <span className="text-green-700 font-semibold">
                        Pagado
                      </span>
                    ) : (
                      <span className="text-green-700 font-semibold">
                        Pendiente
                      </span>
                    )}
                  </td>
                </tr>
              ))}

            {!loading && avances.length === 0 && (
              <tr>
                <td
                  colSpan={mostrarPagados ? 11 : 12}
                  className="px-4 py-4 text-center text-slate-500"
                >
                  No hay avances registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!mostrarPagados && seleccionados.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4">
            <div className="text-base text-slate-700">
              Subtotal seleccionado:
              <span className="text-green-700 font-extrabold">
                ${subtotalSeleccionados.toLocaleString()}
              </span>
            </div>
            <button
              onClick={manejarPagoMultiple}
              className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded font-semibold mb-4  cursor-pointer"
            >
              Registrar Pago ({seleccionados.length})
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 ">
        <div className="text-sm text-gray-600">
          Página {page} de {totalPages} — {total} avance
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!hasPrev}
          >
            Anterior
          </button>
          <button
            className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasNext}
          >
            Siguiente
          </button>
          <select
            className="ml-2 border border-gray-400 rounded-md px-2 py-2"
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ListaAvances;
