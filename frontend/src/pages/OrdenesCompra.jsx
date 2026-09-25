import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiEdit,
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiCheckCircle,
  FiArrowRight,
  FiFileText,
  FiExternalLink,
  FiRefreshCw,
  FiSearch,
  FiChevronDown,
  FiShoppingCart,
} from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import { usePlan } from "../hooks/usePlanApi";

function formateaCantidad(valor) {
  if (valor === null || valor === undefined) return 0;
  const num = Number(valor);
  if (Number.isNaN(num)) return 0;
  if (Number.isInteger(num)) return num;
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

// Función para formatear fecha sin problemas de zona horaria
const formatDateLocal = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

const OrdenesCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { features } = usePlan();
  const canCreate = can(user, ACTIONS.PURCHASES_CREATE);
  const canEdit = can(user, ACTIONS.PURCHASES_EDIT);
  const canDelete = can(user, ACTIONS.PURCHASES_DELETE);

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        const params = {
          buscar: searchTerm || undefined,
          page,
          pageSize,
          sortBy: "fecha",
          sortDir: "desc",
        };
        if (mostrarCanceladas) {
          params.estado = "cancelada";
        } else if (filtroEstado !== "todos") {
          params.estado = filtroEstado;
        }
        const res = await api.get("/ordenes-compra", { params });
        const payload = res.data || {};
        setOrdenes(Array.isArray(payload.data) ? payload.data : []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setHasNext(!!payload.hasNext);
        setHasPrev(!!payload.hasPrev);
      } catch (error) {
        console.error("Error al cargar las órdenes de compra:", error);
        toast.error("Error al cargar las órdenes");
      } finally {
        setLoading(false);
      }
    };

    fetchOrdenes();
  }, [mostrarCanceladas, filtroEstado, page, pageSize, searchTerm]);

  const handleCrear = () => navigate("/ordenes_compra/nuevo");

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar cancelación",
      message:
        "¿Seguro que quieres cancelar esta orden? Si ya fue recibida, se revertirá el stock de los artículos.",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/ordenes-compra/${id}`);
              toast.success("Orden cancelada y stock ajustado correctamente");

              // Re-cargar lista usando el mismo esquema paginado
              const params = {
                buscar: searchTerm || undefined,
                page,
                pageSize,
                sortBy: "fecha",
                sortDir: "desc",
              };
              if (mostrarCanceladas) {
                params.estado = "cancelada";
              } else if (filtroEstado !== "todos") {
                params.estado = filtroEstado;
              }
              const res = await api.get("/ordenes-compra", { params });
              const payload = res.data || {};
              setOrdenes(Array.isArray(payload.data) ? payload.data : []);
              setTotal(payload.total || 0);
              setTotalPages(payload.totalPages || 1);
              setHasNext(!!payload.hasNext);
              setHasPrev(!!payload.hasPrev);
            } catch (error) {
              const mensaje =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;
              toast.error(mensaje);
            }
          },
        },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  const handleConfirmarRecepcion = (id) => {
    confirmAlert({
      title: "Confirmar Recepción de Mercancía",
      message:
        "¿Estás seguro de que deseas confirmar la recepción de esta orden? Esto aumentará el stock en inventario.",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.post(`/ordenes-compra/${id}/recibir`);
              toast.success("Recepción confirmada y stock actualizado.");

              // Re-cargar lista usando el mismo esquema paginado
              const params = {
                buscar: searchTerm || undefined,
                page,
                pageSize,
                sortBy: "fecha",
                sortDir: "desc",
              };
              if (mostrarCanceladas) {
                params.estado = "cancelada";
              } else if (filtroEstado !== "todos") {
                params.estado = filtroEstado;
              }
              const res = await api.get("/ordenes-compra", { params });
              const payload = res.data || {};
              setOrdenes(Array.isArray(payload.data) ? payload.data : []);
              setTotal(payload.total || 0);
              setTotalPages(payload.totalPages || 1);
              setHasNext(!!payload.hasNext);
              setHasPrev(!!payload.hasPrev);
            } catch (error) {
              const mensaje =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;
              toast.error(mensaje);
            }
          },
        },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  const toggleMostrarCanceladas = () => {
    setMostrarCanceladas((prev) => !prev);
    setExpandedId(null);
    setPage(1);
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const orden = ordenes.find((o) => o.id_orden_compra === id);
    if (!orden.detalles) {
      try {
        const res = await api.get(`/ordenes-compra/${id}`);
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id_orden_compra === id
              ? { ...o, detalles: res.data.detalles }
              : o,
          ),
        );
      } catch (error) {
        console.error("Error al cargar detalles:", error);
        toast.error("No se pudieron cargar los detalles de la orden.");
        return;
      }
    }

    setExpandedId(id);
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    const term = searchTerm.toLowerCase();
    const proveedor = orden.proveedor_nombre?.toLowerCase() || "";
    const fechaStr = formatDateLocal(orden.fecha);

    // el backend ya filtra por proveedor (buscar), complementamos por fecha
    const textMatch = proveedor.includes(term) || fechaStr.includes(term);
    if (!textMatch) return false;

    // filtro por estado (cliente-side)
    if (filtroEstado && filtroEstado !== "todos") {
      return orden.estado === filtroEstado;
    }

    return true;
  });

  // ─── badges ───────────────────────────────────────────────────────
  const ESTADO_MAP = {
    pendiente: "bg-amber-50 text-amber-700 border border-amber-200",
    completada: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    cancelada: "bg-red-50 text-red-600 border border-red-200",
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Abastecimiento y
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Órdenes de compra
            </h1>
          </div>
          {total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{total} órdenes</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canCreate && (
            <button
              onClick={handleCrear}
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={14} /> Nueva orden
            </button>
          )}
          {features && features.includes("tesoreria") && (
            <button
              onClick={() => navigate("/tesoreria")}
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FiArrowRight size={14} /> Tesorería
            </button>
          )}
          <button
            onClick={toggleMostrarCanceladas}
            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg border shadow-sm transition-colors cursor-pointer ${
              mostrarCanceladas
                ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {mostrarCanceladas ? "Ver activas" : "Ver canceladas"}
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
                placeholder="Proveedor, fecha o # orden…"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setExpandedId(null);
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition min-w-[150px]"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="completada">Completadas</option>
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
                  ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Proveedor
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Método de pago
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Doc.
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-3 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredOrdenes.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-16">
                    <FiShoppingCart
                      size={32}
                      className="mx-auto text-slate-300 mb-2"
                    />
                    <p className="text-sm font-semibold text-slate-500">
                      Sin órdenes
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchTerm
                        ? "No hay resultados para esa búsqueda"
                        : "No hay órdenes registradas"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrdenes.map((orden) => (
                  <React.Fragment key={orden.id_orden_compra}>
                    <tr
                      onClick={() => toggleExpand(orden.id_orden_compra)}
                      className={`group cursor-pointer transition-colors ${
                        expandedId === orden.id_orden_compra
                          ? "bg-indigo-50 border-l-2 border-l-indigo-400"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">
                        #{orden.id_orden_compra}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {orden.proveedor_nombre}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDateLocal(orden.fecha)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        ${Number(orden.monto_total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {orden.metodo_pago ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                              orden.tipo_pago === "contado"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {orden.metodo_pago}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${ESTADO_MAP[orden.estado] || "bg-slate-50 text-slate-500 border border-slate-200"}`}
                        >
                          {(orden.estado || "—").toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {orden.comprobante_path ? (
                          <a
                            href={`http://localhost:3002/uploads/${orden.comprobante_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title={
                              orden.comprobante_nombre_original || "Comprobante"
                            }
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                          >
                            <FiFileText size={13} />
                          </a>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canEdit &&
                            orden.estado === "pendiente" &&
                            !mostrarCanceladas && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(
                                    `/ordenes_compra/editar/${orden.id_orden_compra}`,
                                  );
                                }}
                                title="Editar"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                              >
                                <FiEdit size={14} />
                              </button>
                            )}
                          {user?.rol === "admin" &&
                            orden.estado === "completada" &&
                            !mostrarCanceladas && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAlert({
                                    title: "¿Actualizar estado?",
                                    message: `¿Cambiar orden #${orden.id_orden_compra} de COMPLETADA a PENDIENTE?`,
                                    buttons: [
                                      {
                                        label: "Sí, actualizar",
                                        onClick: async () => {
                                          try {
                                            await api.put(
                                              `/ordenes-compra/${orden.id_orden_compra}/estado`,
                                              { estado: "pendiente" },
                                            );
                                            toast.success(
                                              "Estado actualizado a pendiente",
                                            );
                                            setOrdenes((prev) =>
                                              prev.map((o) =>
                                                o.id_orden_compra ===
                                                orden.id_orden_compra
                                                  ? {
                                                      ...o,
                                                      estado: "pendiente",
                                                    }
                                                  : o,
                                              ),
                                            );
                                          } catch {
                                            toast.error(
                                              "No se pudo actualizar el estado",
                                            );
                                          }
                                        },
                                      },
                                      { label: "Cancelar", onClick: () => {} },
                                    ],
                                  });
                                }}
                                title="Revertir a pendiente"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              >
                                <FiRefreshCw size={14} />
                              </button>
                            )}
                          {orden.estado === "pendiente" &&
                            !mostrarCanceladas && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleConfirmarRecepcion(
                                    orden.id_orden_compra,
                                  );
                                }}
                                title="Confirmar recepción"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                              >
                                <FiCheckCircle size={14} />
                              </button>
                            )}
                          {canDelete &&
                            orden.estado !== "cancelada" &&
                            !mostrarCanceladas && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(orden.id_orden_compra);
                                }}
                                title="Cancelar orden"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          <FiChevronDown
                            size={13}
                            className={`text-slate-300 ml-1 transition-transform duration-150 ${expandedId === orden.id_orden_compra ? "rotate-180" : ""}`}
                          />
                        </div>
                      </td>
                    </tr>

                    {expandedId === orden.id_orden_compra && (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-0 bg-indigo-50/60 border-b border-indigo-100"
                        >
                          <div className="px-6 py-4">
                            {orden.comprobante_path && (
                              <div className="mb-4 flex items-center justify-between gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                    <FiFileText
                                      size={14}
                                      className="text-indigo-600"
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-slate-700">
                                      Comprobante adjunto
                                    </p>
                                    <p className="text-[11px] text-slate-400">
                                      {orden.comprobante_nombre_original}
                                    </p>
                                  </div>
                                </div>
                                <a
                                  href={`http://localhost:3002/uploads/${orden.comprobante_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
                                >
                                  <FiExternalLink size={12} /> Ver archivo
                                </a>
                              </div>
                            )}
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                      Artículo
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                      Cantidad
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                      Precio unit.
                                    </th>
                                    <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {orden.detalles &&
                                  orden.detalles.length > 0 ? (
                                    orden.detalles.map((d, i) => (
                                      <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-slate-700">
                                          <div className="flex items-center gap-2">
                                            {d.descripcion_articulo}
                                            {Number(d.es_bruto) === 1 && (
                                              <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
                                                va a fábrica
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-slate-600">
                                          {formateaCantidad(d.cantidad)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-slate-600">
                                          $
                                          {Number(
                                            d.precio_unitario,
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-800">
                                          $
                                          {Number(
                                            d.cantidad * d.precio_unitario,
                                          ).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="text-center py-6 text-slate-400 text-xs"
                                      >
                                        Sin detalles disponibles
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!hasNext}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdenesCompra;
