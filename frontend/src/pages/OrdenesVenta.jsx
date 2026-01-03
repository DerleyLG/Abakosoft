import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiEye,
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiArrowRight,
  FiEdit,
  FiCreditCard,
} from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.SALES_CREATE);
  const canEdit = can(role, ACTIONS.SALES_EDIT);
  const canDelete = can(role, ACTIONS.SALES_DELETE);

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
        console.error("Error al cargar las órdenes de venta:", error);
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

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar este registro?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/ordenes-venta/${id}`);
              toast.success("Registro eliminado");
              setOrdenes((prev) =>
                prev.filter((item) => item.id_orden_venta !== id)
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
            o.id_orden_venta === id ? { ...o, detalles: res.data } : o
          )
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
    // Filtrado por estado de crédito derivado (client-side) sobre la página actual
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
  return (
    <div className="w-full px-4 md:px-10 lg:px-20 py-10 select-none">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">
          Órdenes de Venta
        </h2>

        <div className="flex w-full md:w-280 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por cliente"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <div>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="h-[42px] border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              title="Filtrar por estado de crédito"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="parcial">Parciales</option>
              <option value="pagado">Pagados</option>
            </select>
          </div>

          {canCreate && (
            <button
              onClick={handleCrear}
              className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 hover:text-slate-400 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              <FiPlus size={20} />
              Nueva venta
            </button>
          )}
          <button
            onClick={() => navigate("/tesoreria")}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 hover:text-slate-400 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiArrowRight size={20} />
            Ir a tesorería
          </button>
          <button
            onClick={toggleMostrarAnuladas}
            className={`h-[42px] flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition cursor-pointer ${
              mostrarAnuladas
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
            }`}
          >
            {mostrarAnuladas ? "Ver activas" : "Ver anuladas"}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto Total</th>
              <th className="px-4 py-3">Método de pago</th>
              <th className="px-4 py-3">Saldo Pendiente</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && filteredOrdenes.length > 0
              ? filteredOrdenes.map((orden) => {
                  const tieneVentaCredito =
                    orden.estado_credito !== null &&
                    orden.estado_credito !== undefined;

                  const isCredito =
                    orden.metodo_pago === "credito" || tieneVentaCredito;

                  return (
                    <React.Fragment key={orden.id_orden_venta}>
                      <tr
                        onClick={() => toggleExpand(orden.id_orden_venta)}
                        className={`cursor-pointer transition ${
                          expandedId === orden.id_orden_venta
                            ? "bg-gray-200"
                            : "hover:bg-gray-200"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-gray-700">
                          {orden.id_orden_venta}
                        </td>

                        <td className="px-4 py-3">{orden.cliente_nombre}</td>

                        <td className="px-4 py-3">
                          {orden.fecha
                            ? orden.fecha
                                .substring(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : ""}
                        </td>

                        <td className="px-4 py-3">
                          ${Number(orden.monto_total || 0).toLocaleString()}
                        </td>

                        <td className="px-4 py-3">
                          {isCredito ? (
                            (() => {
                              const montoTotal = Number(orden.monto_total || 0);
                              const saldo = Number(orden.saldo_pendiente || 0);
                              let estadoDerivado = "pendiente";
                              if (saldo === 0) estadoDerivado = "pagado";
                              else if (saldo < montoTotal)
                                estadoDerivado = "parcial";

                              const textClass =
                                estadoDerivado === "pendiente"
                                  ? "text-red-800"
                                  : estadoDerivado === "parcial"
                                  ? "text-slate-800"
                                  : "text-green-800";

                              return (
                                <span
                                  className={`px-2 py-1 rounded-md font-semibold bg-transparent ${textClass}`}
                                >
                                  CREDITO{" "}
                                  {estadoDerivado === "pendiente"
                                    ? "(PENDIENTE)"
                                    : estadoDerivado === "parcial"
                                    ? "(PARCIAL)"
                                    : "(PAGADO)"}
                                </span>
                              );
                            })()
                          ) : (
                            <span className="px-2 py-1 rounded-md">
                              {orden.metodo_pago || "-"}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {isCredito ? (
                            <span
                              className={`font-semibold ${
                                Number(orden.saldo_pendiente || 0) === 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              $
                              {Number(
                                orden.saldo_pendiente || 0
                              ).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>

                        <td className="pl-3 py-3 text-center flex gap-4">
                          {canEdit && !mostrarAnuladas && !orden.id_pedido && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(orden.id_orden_venta);
                              }}
                              className="text-yellow-600 hover:text-yellow-400 cursor-pointer"
                              title="Editar"
                            >
                              <FiEdit size={18} />
                            </button>
                          )}

                          {canDelete && !mostrarAnuladas && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(orden.id_orden_venta);
                              }}
                              className="text-red-600 hover:text-red-400 cursor-pointer"
                              title="Eliminar"
                            >
                              <FiTrash2 size={18} />
                            </button>
                          )}
                          {!canEdit && !canDelete && (
                            <span className="text-gray-400 italic select-none">
                              Sin permisos
                            </span>
                          )}

                          {isCredito &&
                            orden.id_venta_credito &&
                            orden.saldo_pendiente > 0 && (
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
                                className="text-indigo-600 hover:text-indigo-900 cursor-pointer"
                                title="Ir a crédito / Registrar abono"
                              >
                                <FiCreditCard size={18} />
                              </button>
                            )}
                        </td>
                      </tr>

                      {expandedId === orden.id_orden_venta && (
                        <tr>
                          <td
                            colSpan="8"
                            className="bg-gray-100 px-6 py-4 border-b"
                          >
                            <div className="mt-3">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-200 text-gray-700">
                                  <tr>
                                    <th className="px-2 py-2 border-b border-gray-300">
                                      Artículo
                                    </th>
                                    <th className="px-2 py-2 border-b border-gray-300">
                                      Cantidad
                                    </th>
                                    <th className="px-2 py-2 border-b border-gray-300">
                                      Precio Unitario
                                    </th>
                                    <th className="px-2 py-2 border-b border-gray-300">
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {orden.detalles?.length > 0 ? (
                                    orden.detalles.map((d, i) => (
                                      <tr key={i}>
                                        <td className="px-2 py-2 border-b border-gray-300">
                                          {d.descripcion}
                                        </td>
                                        <td className="px-2 py-2 border-b border-gray-300">
                                          {d.cantidad}
                                        </td>
                                        <td className="px-2 py-2 border-b border-gray-300">
                                          $
                                          {Number(
                                            d.precio_unitario
                                          ).toLocaleString()}
                                        </td>
                                        <td className="px-2 py-2 border-b border-gray-300">
                                          ${Number(d.subtotal).toLocaleString()}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td
                                        colSpan="4"
                                        className="text-center py-2 text-gray-500"
                                      >
                                        No hay detalles disponibles.
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
              : !loading && (
                  <tr>
                    <td colSpan="8" className="text-center py-6 text-gray-500">
                      No se encontraron órdenes que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span>{" "}
              de{" "}
              <span className="font-semibold text-gray-800">{totalPages}</span>{" "}
              {total ? `— ` : ""}
              <span className="font-semibold text-gray-800">{total || ""}</span>
              {total ? ` órdenes` : ""}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => hasNext && setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value={10}>10 / página</option>
                <option value={20}>20 / página</option>
                <option value={50}>50 / página</option>
                <option value={100}>100 / página</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdenesVenta;
