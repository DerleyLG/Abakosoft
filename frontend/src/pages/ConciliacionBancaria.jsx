import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

// Utilidad para parsear fechas sin conversión de zona horaria.
// MySQL guarda DATETIME en hora local (America/Bogota), pero mysql2 lo
// serializa como UTC (ISO con Z). Si se usa new Date(value) directo, el
// navegador resta el offset (-5h) y la fecha se muestra un día antes.
// Aquí se extraen los componentes YYYY-MM-DD y se construye la fecha local.
const parseFecha = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "string") {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return new Date(y, (mo || 1) - 1, d || 1);
    }
  }
  try {
    const dt = new Date(value);
    if (!isNaN(dt)) return dt;
  } catch (_) {}
  return null;
};

const ConciliacionBancaria = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const puedeConciliar = can(user, ACTIONS.TREASURY_RECONCILE);

  // Filtros: si vienen desde la URL (drill-down desde el cierre de caja),
  // usar ese rango; si no, el mes actual por defecto.
  const hoy = new Date();
  const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const desdeUrl = searchParams.get("desde");
  const hastaUrl = searchParams.get("hasta");
  const [desde, setDesde] = useState(desdeUrl || primerDiaMes);
  const [hasta, setHasta] = useState(
    hastaUrl || hoy.toISOString().slice(0, 10),
  );
  const [estado, setEstado] = useState("todos");

  const [movimientos, setMovimientos] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [marcandoId, setMarcandoId] = useState(null);

  // Paginación (server-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const formatDate = (value) => {
    const dt = parseFecha(value);
    if (!dt) return "-";
    return dt.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const formatDateTime = (value) => {
    const dt = parseFecha(value);
    if (!dt) return "-";
    return dt.toLocaleString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTipoLabel = (tipo) => {
    const t = String(tipo || "")
      .trim()
      .toLowerCase();
    if (t === "orden_venta") return "Venta";
    if (t === "abono_credito") return "Abono a crédito";
    if (t === "pago_trabajador") return "Pago trabajador";
    if (t === "transferencia_fondos") return "Transferencia";
    return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, " ");
  };

  const getTipoBadgeClass = (tipo) => {
    const t = String(tipo || "")
      .trim()
      .toLowerCase();
    if (t.includes("venta") || t === "abono_credito" || t === "saldo_favor")
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (t.includes("compra") || t === "saldo_favor_usado")
      return "bg-rose-50 text-rose-700 border border-rose-200";
    if (
      t === "reparacion" ||
      t.includes("reversion") ||
      t.includes("cancelacion")
    )
      return "bg-amber-50 text-amber-700 border border-amber-200";
    if (t === "costo_indirecto")
      return "bg-orange-50 text-orange-700 border border-orange-200";
    if (t === "pago_trabajador")
      return "bg-violet-50 text-violet-700 border border-violet-200";
    if (t === "anticipo") return "bg-sky-50 text-sky-700 border border-sky-200";
    if (t.includes("transferencia"))
      return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    return "bg-slate-50 text-slate-600 border border-slate-200";
  };

  const getReferencia = (mov) => {
    if (!mov.id_documento) return "-";
    const t = String(mov.tipo_documento || "").toLowerCase();
    if (t === "orden_venta") return `OV-${mov.id_documento}`;
    if (t === "abono_credito") return `OV-${mov.id_documento} (Abono)`;
    if (t === "orden_compra") return `OC-${mov.id_documento}`;
    if (t === "reparacion") return `RP-${mov.id_documento}`;
    if (t === "pago_trabajador") return `PT-${mov.id_documento}`;
    if (t === "anticipo") return `ANT-${mov.id_documento}`;
    if (t === "costo_indirecto") return `CI-${mov.id_documento}`;
    if (t === "transferencia_fondos") return `TR-${mov.id_documento}`;
    if (t === "saldo_favor" || t === "saldo_favor_usado")
      return `SF-${mov.id_documento}`;
    return `#${mov.id_documento}`;
  };

  const fetchConciliacion = useCallback(
    async (opciones = {}) => {
      const { silencioso = false, enSegundoPlano = false } =
        typeof opciones === "object" ? opciones : { silencioso: opciones };
      // El refresco en segundo plano (polling) NO debe activar el spinner:
      // eso hace que la tabla parpadee cada 30s.
      if (!enSegundoPlano) setLoading(true);
      try {
        const params = {};
        if (desde) params.desde = desde;
        if (hasta) params.hasta = hasta;
        if (estado && estado !== "todos") params.estado = estado;
        params.page = page;
        params.pageSize = pageSize;

        const res = await api.get("/tesoreria/conciliacion", { params });
        setMovimientos(res.data?.data || []);
        setTotal(Number(res.data?.total || 0));
        setTotalPages(Number(res.data?.totalPages || 1));
      } catch (error) {
        console.error("Error al obtener conciliación:", error);
        // El polling (30s) no debe spamear toasts: solo se notifica en la
        // carga inicial o cuando el usuario fuerza la recarga.
        if (!silencioso) {
          toast.error(
            error.response?.data?.error || "Error al obtener los movimientos.",
          );
        }
      } finally {
        if (!enSegundoPlano) setLoading(false);
      }
    },
    [desde, hasta, estado, page, pageSize],
  );

  useEffect(() => {
    fetchConciliacion();
  }, [fetchConciliacion]);

  // Al cambiar filtros, volver a la primera página
  useEffect(() => {
    setPage(1);
  }, [desde, hasta, estado]);

  // Refresco automático en segundo plano (cada 30s) para reflejar movimientos
  // nuevos SIN activar el spinner ni re-renderizar la tabla visiblemente.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConciliacion({ silencioso: true, enSegundoPlano: true });
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchConciliacion]);

  const handleMarcar = async (mov, conciliado) => {
    if (!puedeConciliar) return;
    setMarcandoId(mov.id_movimiento);
    try {
      await api.put(`/tesoreria/conciliacion/${mov.id_movimiento}`, {
        conciliado,
      });
      toast.success(
        conciliado
          ? "Movimiento validado correctamente"
          : "Validación revertida",
      );
      fetchConciliacion();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Error al actualizar la conciliación.",
      );
    } finally {
      setMarcandoId(null);
    }
  };

  // Paginación server-side: los datos ya vienen paginados del backend
  const totalFiltrados = total;
  const movimientosPaginados = movimientos;
  const startIndex = (page - 1) * pageSize;

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Verificación de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Conciliación Bancaria
            </h1>
          </div>
          <span className="mt-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg shadow-sm">
            {totalFiltrados} movimientos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <FiArrowLeft size={14} />
            Volver
          </button>
        </div>
      </div>

      {/* ─── Filtros ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500">
              Desde
            </label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500">
              Hasta
            </label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-slate-500">
              Estado
            </label>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
              {[
                { valor: "todos", label: "Todos" },
                { valor: "pendiente", label: "Pendiente" },
                { valor: "validado", label: "Validado" },
              ].map((op) => {
                const activo = estado === op.valor;
                return (
                  <button
                    key={op.valor}
                    onClick={() => setEstado(op.valor)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                      activo
                        ? op.valor === "pendiente"
                          ? "bg-amber-500 text-white shadow-sm"
                          : op.valor === "validado"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-slate-900 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabla ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Referencia
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Detalle
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Validado por
                </th>
                {puedeConciliar && (
                  <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                    Acción
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={puedeConciliar ? 10 : 9}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Cargando movimientos...
                  </td>
                </tr>
              ) : movimientosPaginados.length > 0 ? (
                movimientosPaginados.map((mov) => {
                  const montoNum = Number(mov.monto ?? 0);
                  const esEgreso = montoNum < 0;
                  const esValidado = Number(mov.conciliado) === 1;
                  return (
                    <tr
                      key={mov.id_movimiento}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        esValidado ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {formatDate(mov.fecha_movimiento)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap ${getTipoBadgeClass(mov.tipo_documento)}`}
                        >
                          {getTipoLabel(mov.tipo_documento)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {getReferencia(mov)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {mov.nombre_cliente || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[220px]">
                        {mov.referencia || mov.observaciones ? (
                          <span
                            className="block truncate"
                            title={
                              [mov.referencia, mov.observaciones]
                                .filter(Boolean)
                                .join(" — ") || undefined
                            }
                          >
                            {mov.referencia || mov.observaciones}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {mov.nombre_metodo || "No aplica"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${esEgreso ? "text-rose-600" : "text-emerald-600"}`}
                        >
                          {esEgreso ? "" : "+"}
                          {formatCurrency(montoNum)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {esValidado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <FiCheckCircle size={12} /> Validado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap bg-amber-50 text-amber-700 border border-amber-200">
                            <FiXCircle size={12} /> Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {esValidado ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-600">
                              {mov.usuario_conciliacion || "—"}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatDateTime(mov.fecha_conciliacion)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {puedeConciliar && (
                        <td className="px-4 py-3 text-center">
                          {marcandoId === mov.id_movimiento ? (
                            <span className="text-xs text-slate-400">
                              Guardando...
                            </span>
                          ) : esValidado ? (
                            <button
                              onClick={() => handleMarcar(mov, false)}
                              title="Revertir validación"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 text-[11px] font-semibold bg-white hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <FiXCircle size={12} /> Desmarcar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleMarcar(mov, true)}
                              title="Marcar como validado (la transferencia llegó)"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <FiCheckCircle size={12} /> Validar
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={puedeConciliar ? 8 : 7}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No hay movimientos para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Paginación ─── */}
        {totalFiltrados > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Mostrando {startIndex + 1}–
              {Math.min(startIndex + pageSize, totalFiltrados)} de{" "}
              {totalFiltrados}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-600">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {!puedeConciliar && (
        <p className="text-xs text-slate-400">
          No tienes permiso para validar movimientos. Contacta a un
          administrador para obtener el permiso de conciliación.
        </p>
      )}
    </div>
  );
};

export default ConciliacionBancaria;
