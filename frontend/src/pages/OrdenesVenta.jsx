import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiTrash2,
  FiPlus,
  FiEdit,
  FiCreditCard,
  FiSearch,
  FiShoppingCart,
  FiChevronDown,
  FiPackage,
  FiDollarSign,
} from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import { usePlan } from "../hooks/usePlanApi";
import SaldoFavorDrawer from "../components/SaldoFavorDrawer";

const OrdenesVenta = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [drawerSaldoAbierto, setDrawerSaldoAbierto] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { features } = usePlan();
  const canCreate = can(user, ACTIONS.SALES_CREATE);
  const canEdit = can(user, ACTIONS.SALES_EDIT);
  const canDelete = can(user, ACTIONS.SALES_DELETE);
  const canCreateReturn = can(user, ACTIONS.RETURNS_CREATE);

  useEffect(() => {
    const fetchOrdenes = async () => {
      setLoading(true);
      try {
        const res = await api.get("/ordenes-venta", {
          params: {
            estado: mostrarAnuladas ? "anulada" : undefined,
            buscar: searchTerm || undefined,
            page,
            pageSize,
            sortBy: "fecha",
            sortDir: "desc",
          },
        });
        const payload = res.data || {};
        setOrdenes(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
      } catch (error) {
        console.error("Error al cargar las ordenes de venta:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, [mostrarAnuladas, searchTerm, page, pageSize]);

  const handleCrear = () => {
    navigate("/ordenes_venta/nuevo");
  };

  const handleEdit = (id) => {
    navigate(`/ordenes_venta/editar/${id}`);
  };

  const handleCreateReturn = (orden) => {
    navigate("/devoluciones/nueva", {
      state: {
        id_orden_venta: orden.id_orden_venta,
        ventaPrevia: orden,
      },
    });
  };

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar este registro?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              const { data } = await api.delete(`/ordenes-venta/${id}`);
              toast.success("Registro eliminado");
              if (data.tesoreriaEliminada) {
                toast.success("Movimiento de tesorería asociado eliminado");
              }
              setOrdenes((prev) =>
                prev.filter((item) => item.id_orden_venta !== id),
              );
            } catch (error) {
              const mensajeBackend =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;

              toast.error(mensajeBackend);
            }
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const orden = ordenes.find((o) => o.id_orden_venta === id);
    if (!orden.detalles) {
      try {
        const res = await api.get(`/detalle-orden-venta/${id}`);
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id_orden_venta === id ? { ...o, detalles: res.data } : o,
          ),
        );
      } catch (error) {
        console.error("Error al cargar detalles:", error);
        return;
      }
    }
    setExpandedId(id);
  };

  const toggleMostrarAnuladas = () => {
    setMostrarAnuladas((prev) => !prev);
    setExpandedId(null);
    setPage(1);
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    if (estadoFiltro === "todos") return true;
    const montoTotal = Number(orden.monto_total || 0);
    const saldo = Number(orden.saldo_pendiente || 0);
    if (orden.estado_credito === null || orden.estado_credito === undefined)
      return false;
    let estadoDerivado = "pendiente";
    if (saldo === 0) estadoDerivado = "pagado";
    else if (saldo < montoTotal) estadoDerivado = "parcial";
    return estadoDerivado === estadoFiltro;
  });

  const ESTADO_BADGE = {
    pendiente: "bg-red-50 text-red-700 border border-red-200",
    parcial: "bg-amber-50 text-amber-700 border border-amber-200",
    pagado: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  };
  const ESTADO_LABEL = {
    pendiente: "PENDIENTE",
    parcial: "PARCIAL",
    pagado: "PAGADO",
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Comercial y
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Órdenes de Venta
            </h1>
          </div>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {features && features.includes("tesoreria") && (
            <button
              onClick={() => navigate("/tesoreria")}
              className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              Tesorería
            </button>
          )}
          <button
            onClick={toggleMostrarAnuladas}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer ${
              mostrarAnuladas
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {mostrarAnuladas ? "Ver activas" : "Ver anuladas"}
          </button>
          {canCreate && (
            <button
              onClick={handleCrear}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={16} />
              Nueva venta
            </button>
          )}
          {can(user, ACTIONS.TREASURY_VIEW) && (
            <button
              onClick={() => setDrawerSaldoAbierto(true)}
              className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiDollarSign size={16} />
              Saldo a favor
            </button>
          )}
          <div className="relative flex-1">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              type="text"
              placeholder="Buscar por cliente o #ID…"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
            />
          </div>
          <select
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="parcial">Parciales</option>
            <option value="pagado">Pagados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 w-8"></th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Pago
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Saldo
                </th>
                <th className="px-4 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-slate-100 rounded w-full " />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredOrdenes.length > 0 ? (
                filteredOrdenes.map((orden) => {
                  const tieneVentaCredito =
                    orden.estado_credito !== null &&
                    orden.estado_credito !== undefined;
                  const isCredito =
                    orden.metodo_pago === "credito" || tieneVentaCredito;
                  const montoTotal =
                    orden.monto_neto &&
                    Number(orden.monto_neto) !== Number(orden.monto_total || 0)
                      ? Number(orden.monto_neto)
                      : Number(orden.monto_total || 0);
                  const saldo = Number(orden.saldo_pendiente || 0);
                  let estadoDerivado = "pendiente";
                  if (saldo === 0) estadoDerivado = "pagado";
                  else if (saldo < montoTotal) estadoDerivado = "parcial";
                  const isExpanded = expandedId === orden.id_orden_venta;

                  return (
                    <React.Fragment key={orden.id_orden_venta}>
                      <tr
                        onClick={() => toggleExpand(orden.id_orden_venta)}
                        className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors select-none group ${isExpanded ? "bg-indigo-50 border-l-2 border-l-indigo-400 hover:bg-indigo-50" : "hover:bg-slate-50"}`}
                      >
                        <td className="px-4 py-3">
                          <FiChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          #{orden.id_orden_venta}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {orden.cliente_nombre}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {orden.fecha
                            ? orden.fecha
                                .substring(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                          $
                          {(orden.monto_neto &&
                          Number(orden.monto_neto) !== montoTotal
                            ? Number(orden.monto_neto)
                            : montoTotal
                          ).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {isCredito ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${ESTADO_BADGE[estadoDerivado]}`}
                            >
                              CRÉDITO · {ESTADO_LABEL[estadoDerivado]}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs uppercase">
                              {orden.metodo_pago || "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {isCredito ? (
                            <span
                              className={`font-semibold text-sm ${saldo === 0 ? "text-emerald-600" : "text-red-600"}`}
                            >
                              ${saldo.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {isCredito &&
                              orden.id_venta_credito &&
                              saldo > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/ventas_credito", {
                                      state: {
                                        openCreditId: orden.id_venta_credito,
                                        openOrderId: orden.id_orden_venta,
                                      },
                                    });
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                  title="Registrar abono"
                                >
                                  <FiCreditCard size={14} />
                                </button>
                              )}
                            {canEdit &&
                              !mostrarAnuladas &&
                              !orden.id_pedido && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(orden.id_orden_venta);
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                  title="Editar"
                                >
                                  <FiEdit size={14} />
                                </button>
                              )}
                            {canDelete && !mostrarAnuladas && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(orden.id_orden_venta);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                title="Eliminar"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-slate-100">
                          <td
                            colSpan="8"
                            className="px-6 pb-4 pt-2 bg-slate-50"
                          >
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                      Artículo
                                    </th>
                                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                      Cantidad
                                    </th>
                                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                      Precio unit.
                                    </th>
                                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orden.detalles?.length > 0 ? (
                                    orden.detalles.map((d, i) => (
                                      <tr
                                        key={i}
                                        className="border-b border-slate-100"
                                      >
                                        <td className="px-4 py-2 text-slate-700">
                                          {d.descripcion}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                                          {d.cantidad}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums text-slate-600">
                                          $
                                          {Number(
                                            d.precio_unitario,
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-slate-800">
                                          ${Number(d.subtotal).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="text-center py-4 text-slate-400 text-xs"
                                      >
                                        Sin detalles
                                      </td>
                                    </tr>
                                  )}
                                  {orden.monto_neto &&
                                    Number(orden.monto_neto) !==
                                      Number(orden.monto_total || 0) && (
                                      <tr className="border-t border-slate-100 bg-emerald-50/40">
                                        <td className="px-4 py-2 text-slate-600">
                                          <span className="text-[11px] font-semibold text-red-700 uppercase tracking-wider">
                                            Descuento de saldo a favor
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums text-slate-600 text-xs">
                                          1
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums text-slate-600 text-xs font-semibold">
                                          -$
                                          {(
                                            Number(orden.monto_total || 0) -
                                            Number(orden.monto_neto)
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums font-semibold text-red-700 text-xs">
                                          -$
                                          {(
                                            Number(orden.monto_total || 0) -
                                            Number(orden.monto_neto)
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    )}
                                </tbody>
                                {orden.detalles?.length > 0 && (
                                  <tfoot>
                                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                                      <td
                                        colSpan="3"
                                        className="px-4 py-2 text-right text-xs font-bold text-slate-700"
                                      >
                                        Total
                                      </td>
                                      <td className="px-4 py-2 text-right font-bold text-sm tabular-nums text-slate-800">
                                        ${montoTotal.toLocaleString()}
                                      </td>
                                    </tr>
                                  </tfoot>
                                )}
                              </table>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/devoluciones/nueva`, {
                                    state: {
                                      id_orden_venta: orden.id_orden_venta,
                                    },
                                  });
                                }}
                                className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                              >
                                <FiPackage size={13} />
                                Crear devolución
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiShoppingCart size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron órdenes de venta
                      </p>
                    </div>
                  </td>
                </tr>
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
                  órdenes
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => hasNext && setPage((p) => p + 1)}
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
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
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

      <SaldoFavorDrawer
        isOpen={drawerSaldoAbierto}
        onClose={() => setDrawerSaldoAbierto(false)}
        onSuccess={() => setDrawerSaldoAbierto(false)}
      />
    </div>
  );
};

export default OrdenesVenta;
