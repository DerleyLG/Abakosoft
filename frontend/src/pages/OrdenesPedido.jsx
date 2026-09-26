import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiPackage,
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiShoppingCart,
  FiEdit,
  FiSearch,
  FiChevronDown,
  FiClipboard,
} from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import Tooltip from "../components/Tooltip";

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const canCreate = can(user, ACTIONS.SALES_CREATE);
  const canEdit = can(user, ACTIONS.SALES_EDIT);
  const canDelete = can(user, ACTIONS.SALES_DELETE);

  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/pedidos", {
          params: {
            estado: mostrarCancelados ? "cancelado" : undefined,
            buscar: searchTerm || undefined,
            page,
            pageSize,
            sortBy: "fecha",
            sortDir: "desc",
          },
        });
        const payload = res.data || {};
        setPedidos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
        toast.error(
          "Error al cargar pedidos. Revisa la conexión con el servidor.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPedidos();
  }, [mostrarCancelados, searchTerm, page, pageSize]);

  const handleCrear = () => {
    navigate("/ordenes_pedido/nuevo");
  };

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que deseas eliminar este pedido?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/pedidos/${id}`);
              toast.success("Pedido eliminado");
              setPedidos((prev) => prev.filter((p) => p.id_pedido !== id));
            } catch (error) {
              toast.error(
                error.response?.data?.error ||
                  error.response?.data?.message ||
                  error.message,
              );
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const handleEdit = async (e, pedido) => {
    e.stopPropagation();

    try {
      const res = await api.get(
        `/ordenes-fabricacion/estado-pedido/${pedido.id_pedido}`,
      );
      const estadoOF = res.data.estado;
      if (estadoOF && estadoOF !== "pendiente" && estadoOF !== "no existe") {
        toast.error(
          `No se puede editar. La Orden de Fabricación asociada está en estado: ${estadoOF}.`,
        );
        return;
      }

      navigate(`/ordenes_pedido/editar/${pedido.id_pedido}`);
    } catch (error) {
      console.error("Error al verificar estado de OF:", error);
      toast.error(
        "Error al validar el estado de producción. Inténtalo de nuevo.",
      );
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const pedido = pedidos.find((p) => p.id_pedido === id);
    if (!pedido.detalles) {
      try {
        const res = await api.get(`/detalle-orden-pedido/${id}`);
        setPedidos((prev) =>
          prev.map((p) =>
            p.id_pedido === id ? { ...p, detalles: res.data } : p,
          ),
        );
      } catch (error) {
        console.error("Error al cargar detalles:", error);
        return;
      }
    }
    setExpandedId(id);
  };

  const toggleMostrarCancelados = () => {
    setMostrarCancelados((prev) => !prev);
    setExpandedId(null);
    setPage(1);
  };

  const handleCrearOrdenFabricacion = async (e, id_pedido) => {
    e.stopPropagation();
    try {
      const res = await api.get(`/ordenes-fabricacion/existe/${id_pedido}`);
      const existeOrden = res.data.existe;
      const mensaje = existeOrden
        ? "¿Ya existe una orden de fabricación para este pedido. ¿Desea crear otra?"
        : "¿Está seguro que desea crear una orden de fabricación?";

      confirmAlert({
        title: "Confirmar orden de fabricación",
        message: mensaje,
        buttons: [
          {
            label: "Sí",
            onClick: () =>
              navigate("/ordenes_fabricacion/nuevo", {
                state: { idPedidoSeleccionado: id_pedido },
              }),
          },
          {
            label: "No",
          },
        ],
      });
    } catch (error) {
      console.error("Error al validar la orden de fabricación:", error);
      toast.error("Error al validar la orden. Inténtalo de nuevo.");
    }
  };

  const handleCrearOrdenVenta = async (e, id_pedido) => {
    e.stopPropagation();

    try {
      let pedidoCompleto = pedidos.find((p) => p.id_pedido === id_pedido);

      if (!pedidoCompleto || !pedidoCompleto.detalles) {
        const resDetalles = await api.get(`/detalle-orden-pedido/${id_pedido}`);
        pedidoCompleto = { ...pedidoCompleto, detalles: resDetalles.data };
      }

      const hoy = new Date();
      const fechaActual = hoy.toISOString().split("T")[0];

      const pedidoConFechaActual = {
        ...pedidoCompleto,
        fecha_pedido: fechaActual,
      };

      confirmAlert({
        title: "Confirmar orden de venta",
        message:
          "¿Está seguro que desea crear una orden de venta a partir de este pedido?",
        buttons: [
          {
            label: "Sí",
            onClick: () => {
              navigate("/ordenes_venta/nuevo", {
                state: { pedidoData: pedidoConFechaActual },
              });
            },
          },
          { label: "No" },
        ],
      });
    } catch (error) {
      console.error("Error al crear la orden de venta:", error);
      toast.error("Error al crear la orden de venta. Inténtalo de nuevo.");
    }
  };

  const ESTADO_BADGE = {
    pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
    "listo para entrega":
      "bg-indigo-50 text-indigo-700 border border-indigo-200",
    cancelado: "bg-red-50 text-red-700 border border-red-200",
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
              Pedidos
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
            onClick={toggleMostrarCancelados}
            className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer ${
              mostrarCancelados
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {mostrarCancelados ? "Ver activos" : "Ver cancelados"}
          </button>
          {canCreate && (
            <button
              onClick={handleCrear}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={16} />
              Nuevo pedido
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="relative">
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
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 w-8"></th>
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
                  Estado
                </th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pedidos.length > 0 ? (
                pedidos.map((pedido) => {
                  const isExpanded = expandedId === pedido.id_pedido;
                  const badgeClass =
                    ESTADO_BADGE[pedido.estado] ||
                    "bg-slate-50 text-slate-600 border border-slate-200";

                  return (
                    <React.Fragment key={pedido.id_pedido}>
                      <tr
                        onClick={() => toggleExpand(pedido.id_pedido)}
                        className={`border-b border-slate-100 last:border-0 cursor-pointer transition-colors select-none group ${
                          isExpanded
                            ? "bg-indigo-50 border-l-2 border-l-indigo-400 hover:bg-indigo-50"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <FiChevronDown
                            size={14}
                            className={`text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          #{pedido.id_pedido}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {pedido.cliente_nombre}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                          {pedido.fecha_pedido
                            ? String(pedido.fecha_pedido)
                                .substring(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">
                          ${Number(pedido.monto_total || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}
                          >
                            {(pedido.estado || "—").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {!mostrarCancelados &&
                              pedido.estado === "pendiente" && (
                                <Tooltip text="Crear orden de fabricación">
                                  <button
                                    onClick={(e) =>
                                      handleCrearOrdenFabricacion(
                                        e,
                                        pedido.id_pedido,
                                      )
                                    }
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                                  >
                                    <FiPackage size={14} />
                                  </button>
                                </Tooltip>
                              )}
                            {!mostrarCancelados &&
                              pedido.estado === "listo para entrega" && (
                                <Tooltip text="Crear orden de venta">
                                  <button
                                    onClick={(e) =>
                                      handleCrearOrdenVenta(e, pedido.id_pedido)
                                    }
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                                  >
                                    <FiShoppingCart size={14} />
                                  </button>
                                </Tooltip>
                              )}
                            {canEdit &&
                              !mostrarCancelados &&
                              pedido.estado === "pendiente" && (
                                <Tooltip text="Editar pedido">
                                  <button
                                    onClick={(e) => handleEdit(e, pedido)}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                  >
                                    <FiEdit size={14} />
                                  </button>
                                </Tooltip>
                              )}
                            {canDelete && !mostrarCancelados && (
                              <Tooltip text="Eliminar">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(pedido.id_pedido);
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="border-b border-slate-100">
                          <td
                            colSpan="7"
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
                                  {pedido.detalles?.length > 0 ? (
                                    pedido.detalles.map((d, i) => (
                                      <tr
                                        key={i}
                                        className="border-b border-slate-100 last:border-0"
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
                                        Sin detalles disponibles
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiClipboard size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron pedidos
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
                  pedidos
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
    </div>
  );
};

export default Pedidos;
