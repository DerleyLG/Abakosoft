import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FiPackage,
  FiArrowLeft,
  FiTrash2,
  FiPlus,
  FiDollarSign,
  FiEdit,
} from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

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
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.SALES_CREATE);
  const canEdit = can(role, ACTIONS.SALES_EDIT);
  const canDelete = can(role, ACTIONS.SALES_DELETE);

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

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">
          Pedidos
        </h2>
        <div className="flex w-full md:w-280 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por cliente o #ID"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          {canCreate && (
            <button
              onClick={handleCrear}
              className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 hover:text-slate-400 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              <FiPlus size={20} />
              Nuevo pedido
            </button>
          )}
          <button
            onClick={toggleMostrarCancelados}
            className={`h-[42px] flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition cursor-pointer ${
              mostrarCancelados
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
            }`}
          >
            {mostrarCancelados ? "Ver activos" : "Ver Cancelados"}
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
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && pedidos.length > 0
              ? pedidos.map((pedido) => (
                  <React.Fragment key={pedido.id_pedido}>
                    <tr
                      onClick={() => toggleExpand(pedido.id_pedido)}
                      className={`cursor-pointer ${
                        expandedId === pedido.id_pedido
                          ? "bg-gray-200 hover:bg-gray-200"
                          : "hover:bg-gray-200"
                      } transition`}
                    >
                      <td className="px-4 py-3">{pedido.id_pedido}</td>
                      <td className="px-4 py-3">{pedido.cliente_nombre}</td>
                      <td className="px-4 py-3">
                        {new Date(pedido.fecha_pedido).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )}
                      </td>
                      <td className="px-4 py-3">
                        ${Number(pedido.monto_total || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">{pedido.estado}</td>
                      <td className="px-4 py-3 text-center flex gap-4">
                        {!mostrarCancelados && pedido.estado == "pendiente" && (
                          <button
                            onClick={(e) =>
                              handleCrearOrdenFabricacion(e, pedido.id_pedido)
                            }
                            className="text-green-600 hover:text-green-400 cursor-pointer"
                            title="Crear orden de fabricación"
                          >
                            <FiPackage size={18} />
                          </button>
                        )}
                        {!mostrarCancelados &&
                          pedido.estado == "listo para entrega" && (
                            <button
                              onClick={(e) =>
                                handleCrearOrdenVenta(e, pedido.id_pedido)
                              }
                              className="text-blue-600 hover:text-blue-400 cursor-pointer"
                              title="Crear orden de venta"
                            >
                              <FiDollarSign size={18} />
                            </button>
                          )}
                        {canEdit &&
                          !mostrarCancelados &&
                          pedido.estado == "pendiente" && (
                            <button
                              onClick={(e) => handleEdit(e, pedido)}
                              className="text-yellow-600 hover:text-yellow-400 cursor-pointer"
                              title="Editar pedido"
                            >
                              <FiEdit size={18} />
                            </button>
                          )}
                        {canDelete && !mostrarCancelados && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(pedido.id_pedido);
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
                      </td>
                    </tr>
                    {expandedId === pedido.id_pedido && (
                      <tr>
                        <td
                          colSpan="6"
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
                              <tbody className="hover:bg-gray-100">
                                {pedido.detalles?.length > 0 ? (
                                  pedido.detalles.map((d, i) => (
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
                                          d.precio_unitario,
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
                ))
              : !loading && (
                  <tr>
                    <td colSpan="6" className="text-center py-6 text-gray-500">
                      No se encontraron pedidos.
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Página {page} de {totalPages} {total ? `(total: ${total})` : ""}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Filas por página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 h-[36px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className={`px-3 py-2 rounded-md border ${hasPrev && !loading ? "bg-white hover:bg-slate-100 cursor-pointer" : "bg-gray-100 cursor-not-allowed"}`}
            >
              Anterior
            </button>
            <button
              onClick={() => hasNext && setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className={`px-3 py-2 rounded-md border ${hasNext && !loading ? "bg-white hover:bg-slate-100 cursor-pointer" : "bg-gray-100 cursor-not-allowed"}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pedidos;
