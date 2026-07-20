import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import {
  FiChevronDown,
  FiChevronRight,
  FiCheckCircle,
  FiXCircle,
  FiDollarSign,
  FiPackage,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTool,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import SaldoFavorDrawer from "../components/SaldoFavorDrawer";

const formatDate = (date) => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const Devoluciones = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const canView = can(user, ACTIONS.RETURNS_VIEW);
  const canCreate = can(user, ACTIONS.RETURNS_CREATE);
  const canCancel = can(user, ACTIONS.RETURNS_CANCEL);

  const [devoluciones, setDevoluciones] = useState([]);
  const [mostrarAnuladas, setMostrarAnuladas] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [drawerSaldoAbierto, setDrawerSaldoAbierto] = useState(false);

  // Tooltip flotante para el motivo
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });
  const showTooltip = (e, text) => {
    if (!text) return;
    setTooltip({ visible: true, text, x: e.clientX, y: e.clientY });
  };
  const moveTooltip = (e) => {
    setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
  };
  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (canView) cargarDevoluciones();
  }, [page, pageSize, searchTerm, mostrarAnuladas]);

  const cargarDevoluciones = async () => {
    setLoading(true);
    try {
      const res = await api.get("/devoluciones", {
        params: {
          estado: mostrarAnuladas ? "anulada" : undefined,
          buscar: searchTerm || undefined,
          page,
          pageSize,
          sortBy: "fecha",
          sortDir: "desc",
        },
      });

      const data = res.data || {};
      setDevoluciones(Array.isArray(data.data) ? data.data : []);
      setTotal(Number(data.total) || 0);
      setTotalPages(Number(data.totalPages) || 1);
      setHasNext(Boolean(data.hasNext));
      setHasPrev(Boolean(data.hasPrev));
    } catch (error) {
      console.error(error);
      toast.error("No fue posible cargar las devoluciones");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = (id) => {
    confirmAlert({
      title: "Cancelar devolución",
      message:
        "¿Seguro que deseas cancelar esta devolución? El inventario y la tesorería serán revertidos.",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.put(`/devoluciones/${id}/anular`);
              toast.success("Devolución cancelada correctamente");
              cargarDevoluciones();
            } catch (error) {
              console.error(error);
              toast.error(
                error.response?.data?.error ||
                  "No fue posible cancelar la devolución",
              );
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const toggleMostrarAnuladas = () => {
    setMostrarAnuladas((prev) => !prev);
    setPage(1);
  };

  if (!canView) {
    return (
      <div className="p-8 text-center text-slate-500">
        No tienes permisos para ver devoluciones.
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Tooltip flotante global */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] pointer-events-none max-w-sm bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl whitespace-pre-wrap break-words leading-relaxed"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y + 14,
          }}
        >
          {tooltip.text}
        </div>
      )}
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Devoluciones
          </h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
            {total}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleMostrarAnuladas}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              mostrarAnuladas
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {mostrarAnuladas ? "Ver aplicadas" : "Ver anuladas"}
          </button>

          {canCreate && (
            <button
              onClick={() => navigate("/devoluciones/nueva")}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={16} />
              Nueva devolución
            </button>
          )}
          {can(user, ACTIONS.REPAIRS_VIEW) && (
            <button
              onClick={() => navigate("/reparaciones")}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiTool size={16} />
              Reparaciones
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
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={15}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por #ID, venta o cliente"
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
            />
          </div>
          <div className="text-sm text-slate-500">
            Mostrando devoluciones registradas.
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-8 px-2 py-3"></th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  ID
                </th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fecha
                </th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Venta
                </th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Cliente
                </th>
                <th className="px-2 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Método
                </th>
                <th className="px-2 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Total
                </th>
                <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Motivo
                </th>
                <th className="px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-slate-100">
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-3">
                        <div className="animate-pulse h-4 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : devoluciones.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No hay devoluciones registradas.
                  </td>
                </tr>
              ) : (
                devoluciones.map((item) => (
                  <Fragment key={item.id_devolucion_venta}>
                    <tr
                      className={`border-b border-slate-100 transition-colors cursor-pointer ${
                        expandedId === item.id_devolucion_venta
                          ? "bg-blue-100/60 hover:bg-blue-100/60"
                          : "hover:bg-slate-100/60"
                      }`}
                      onClick={() => toggleExpand(item.id_devolucion_venta)}
                    >
                      <td className="px-2 py-3 text-center text-slate-400">
                        {expandedId === item.id_devolucion_venta ? (
                          <FiChevronDown size={14} />
                        ) : (
                          <FiChevronRight size={14} />
                        )}
                      </td>
                      <td className="px-2 py-3 font-mono text-xs text-slate-500">
                        #{item.id_devolucion_venta}
                      </td>
                      <td className="px-2 py-3 text-slate-700 whitespace-nowrap">
                        {formatDate(item.fecha)}
                      </td>
                      <td className="px-2 py-3 text-slate-700">
                        #{item.id_orden_venta}
                      </td>
                      <td className="px-2 py-3 text-slate-700 max-w-[140px] truncate">
                        {item.cliente_nombre || "-"}
                      </td>
                      <td className="px-2 py-3 text-slate-700 text-[11px]">
                        {item.metodo_pago || "-"}
                      </td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.monto_total)}
                      </td>
                      <td className="px-2 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            item.estado === "anulada"
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {item.estado?.toUpperCase()}
                        </span>
                      </td>
                      <td
                        className="px-2 py-3 text-center text-xs text-slate-600 max-w-[120px] truncate cursor-default"
                        onMouseEnter={(e) => showTooltip(e, item.motivo)}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {item.motivo || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {can(user, ACTIONS.REPAIRS_CREATE) &&
                            item.estado !== "anulada" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAlert({
                                    title: "Crear reparación",
                                    message: `¿Deseas crear una orden de reparación desde la devolución #${item.id_devolucion_venta}?`,
                                    buttons: [
                                      {
                                        label: "Sí",
                                        onClick: () =>
                                          navigate(
                                            `/reparaciones/nueva?devolucion=${item.id_devolucion_venta}`,
                                          ),
                                      },
                                      { label: "No" },
                                    ],
                                  });
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
                                title="Crear reparación desde esta devolución"
                              >
                                <FiTool size={13} />
                              </button>
                            )}
                          {item.estado !== "anulada" && canCancel && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancelar(item.id_devolucion_venta);
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Anular"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Fila expandida con detalle */}
                    {expandedId === item.id_devolucion_venta && (
                      <tr
                        key={`det-${item.id_devolucion_venta}`}
                        className="bg-slate-50"
                      >
                        <td colSpan="10" className="px-0 py-0">
                          <div className="border-l-4 border-slate-400 mx-2 my-1.5 bg-white rounded-b-xl shadow-sm overflow-hidden">
                            <div className="px-6 py-4">
                              <div className="space-y-3">
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                  <span className="flex items-center gap-1">
                                    <FiPackage size={13} />
                                    Inventario:{" "}
                                    {item.inventario_actualizado ? (
                                      <span className="text-emerald-600 font-semibold">
                                        Actualizado
                                      </span>
                                    ) : (
                                      <span className="text-red-500 font-semibold">
                                        Pendiente
                                      </span>
                                    )}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <FiDollarSign size={13} />
                                    Tesorería:{" "}
                                    {item.tesoreria_movimiento ? (
                                      <span className="text-emerald-600 font-semibold">
                                        Movimiento creado
                                      </span>
                                    ) : (
                                      <span className="text-amber-600 font-semibold">
                                        Sin movimiento
                                      </span>
                                    )}
                                  </span>
                                  {Number(item.monto) > 0 && (
                                    <span className="text-slate-600">
                                      Dinero devuelto:{" "}
                                      {formatCurrency(item.monto)}
                                    </span>
                                  )}
                                </div>
                                {Array.isArray(item.detalles) &&
                                item.detalles.length > 0 ? (
                                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-white border-b border-slate-200">
                                          <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                            Artículo
                                          </th>
                                          <th className="px-3 py-2 text-left font-semibold text-slate-500">
                                            Ref.
                                          </th>
                                          <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                            Cant.
                                          </th>
                                          <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                            Precio
                                          </th>
                                          <th className="px-3 py-2 text-right font-semibold text-slate-500">
                                            Subtotal
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.detalles.map((det) => (
                                          <tr
                                            key={det.id_articulo}
                                            className="border-b border-slate-100 last:border-b-0 bg-white"
                                          >
                                            <td className="px-3 py-2 text-slate-700 font-medium">
                                              {det.descripcion}
                                            </td>
                                            <td className="px-3 py-2 text-slate-400">
                                              {det.referencia || "—"}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                              {det.cantidad}
                                            </td>
                                            <td className="px-3 py-2 text-right text-slate-700">
                                              {formatCurrency(
                                                det.precio_unitario,
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                              {formatCurrency(
                                                det.cantidad *
                                                  det.precio_unitario,
                                              )}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">
                                    Sin detalle de artículos.
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
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
                  <span className="mx-1">—</span>
                  <span className="font-semibold text-slate-700">
                    {total}
                  </span>{" "}
                  devoluciones
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={!hasPrev || loading}
                onClick={() =>
                  hasPrev && setPage((prev) => Math.max(1, prev - 1))
                }
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                disabled={!hasNext || loading}
                onClick={() => hasNext && setPage((prev) => prev + 1)}
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

export default Devoluciones;
