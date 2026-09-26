import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import {
  FiEye,
  FiArrowLeft,
  FiPlusCircle,
  FiSearch,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import toast from "react-hot-toast";
import AbonoDrawer from "../components/AbonoDrawer";
import CrearCreditoManualModal from "../components/CrearCreditoManualModal";
import CreditoHistorialDrawer from "../components/CreditoHistorialDrawer";
import { useAuth } from "../context/AuthContext";
import { ACTIONS, can } from "../utils/permissions";

const ESTADO_STYLE = {
  pendiente: "bg-red-50 text-red-700 border border-red-200",
  parcial: "bg-amber-50 text-amber-700 border border-amber-200",
  pagado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
};

const fmt = (amount) => `$${Number(amount || 0).toLocaleString()}`;

const VentasCredito = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");

  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [selectedCredito, setSelectedCredito] = useState(null);
  const [historialCreditoId, setHistorialCreditoId] = useState(null);
  const [openCrearManual, setOpenCrearManual] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const canManage = can(user, ACTIONS.CREDITS_MANAGE);
  const canCreate = can(user, ACTIONS.CREDITS_CREATE);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const fetchCreditos = async () => {
      setLoading(true);
      try {
        const params = {
          buscar: debouncedSearch || undefined,
          estado: estadoFiltro !== "todos" ? estadoFiltro : undefined,
          page,
          pageSize,
        };
        const res = await api.get("/creditos", { params });
        const payload = res.data || {};
        const data = Array.isArray(payload.data) ? payload.data : [];
        setCreditos(data);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setHasNext(!!payload.hasNext);
        setHasPrev(!!payload.hasPrev);

        const openId = location.state?.openCreditId;
        const openOrderId = location.state?.openOrderId;
        const openHistorialId = location.state?.openHistorialId;
        if (openHistorialId) {
          setHistorialCreditoId(openHistorialId);
          try {
            navigate(location.pathname, { replace: true, state: {} });
          } catch (_) {}
        } else if (openId || openOrderId) {
          const credito =
            data.find((c) => c.id_venta_credito === openId) ||
            data.find((c) => c.id_orden_venta === openOrderId);
          if (credito) {
            setSelectedCredito(credito);
            setShowAbonoModal(true);
          }
          try {
            navigate(location.pathname, { replace: true, state: {} });
          } catch (_) {}
        }
      } catch {
        toast.error("Error al cargar la lista de cuentas por cobrar.");
      } finally {
        setLoading(false);
      }
    };
    fetchCreditos();
  }, [debouncedSearch, estadoFiltro, page, pageSize, refreshKey]);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleAbonar = (credito) => {
    setSelectedCredito(credito);
    setShowAbonoModal(true);
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Ventas a Crédito
          </h1>
          {total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">
              {total} cuentas por cobrar
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreate && (
            <button
              onClick={() => setOpenCrearManual(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FiPlusCircle size={14} /> Registrar factura
            </button>
          )}
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
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Buscar
            </label>
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Cliente, ID de venta…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Estado
            </label>
            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value);
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition min-w-[150px] cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="parcial">Parciales</option>
              <option value="pagado">Pagados</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Abonado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-3 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : creditos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <FiCreditCard
                      size={32}
                      className="mx-auto text-slate-300 mb-2"
                    />
                    <p className="text-sm font-semibold text-slate-500">
                      Sin cuentas por cobrar
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchTerm || estadoFiltro !== "todos"
                        ? "No hay resultados para esa búsqueda"
                        : "No hay ventas a crédito registradas"}
                    </p>
                  </td>
                </tr>
              ) : (
                creditos.map((credito) => {
                  const montoTotal = Number(credito.monto_total || 0);
                  const saldo = Number(credito.saldo_pendiente || 0);
                  const abonado = montoTotal - saldo;
                  const isPendiente = saldo > 0;

                  let estadoDerivado = "pagado";
                  if (saldo > 0 && saldo < montoTotal)
                    estadoDerivado = "parcial";
                  else if (saldo >= montoTotal) estadoDerivado = "pendiente";

                  return (
                    <tr
                      key={credito.id_venta_credito}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        {credito.id_orden_venta
                          ? `OV #${credito.id_orden_venta}`
                          : `CR #${credito.id_venta_credito}`}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {credito.cliente_nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {credito.fecha
                          ? new Date(credito.fecha).toLocaleDateString("es-CO")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {fmt(montoTotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {fmt(abonado)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold ${
                          isPendiente ? "text-red-600" : "text-slate-400"
                        }`}
                      >
                        {fmt(saldo)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${ESTADO_STYLE[estadoDerivado]}`}
                        >
                          {estadoDerivado.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {isPendiente && canManage && (
                            <button
                              onClick={() => handleAbonar(credito)}
                              title="Registrar Abono"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer"
                            >
                              <FiDollarSign size={12} />
                              Abonar
                            </button>
                          )}
                          <button
                            onClick={() =>
                              setHistorialCreditoId(credito.id_venta_credito)
                            }
                            title="Ver Historial"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <FiEye size={14} />
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
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              Página{" "}
              <span className="font-semibold text-slate-700">{page}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>{" "}
              — <span className="font-semibold text-slate-700">{total}</span>{" "}
              créditos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value={10}>10 / pág.</option>
                <option value={25}>25 / pág.</option>
                <option value={50}>50 / pág.</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {showAbonoModal && selectedCredito && (
        <AbonoDrawer
          credito={selectedCredito}
          onClose={() => setShowAbonoModal(false)}
          onSaved={() => {
            triggerRefresh();
            toast.success("Lista actualizada");
          }}
        />
      )}
      {historialCreditoId && (
        <CreditoHistorialDrawer
          creditoId={historialCreditoId}
          onClose={() => setHistorialCreditoId(null)}
        />
      )}
      {openCrearManual && (
        <CrearCreditoManualModal
          open={openCrearManual}
          onClose={() => setOpenCrearManual(false)}
          onCreated={() => {
            setPage(1);
            triggerRefresh();
            toast.success("Lista actualizada");
          }}
        />
      )}
    </div>
  );
};

export default VentasCredito;
