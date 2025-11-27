import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api"; // ajusta según tu estructura
import { FiEdit, FiArrowLeft, FiTrash2, FiPlus, FiCheckCircle, FiArrowRight, FiFileText, FiDownload, FiExternalLink } from "react-icons/fi"; 
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

// Función para formatear fecha sin problemas de zona horaria
const formatDateLocal = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${day}/${month}/${year}`;
};


const OrdenesCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false); 
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.PURCHASES_CREATE);
  const canEdit = can(role, ACTIONS.PURCHASES_EDIT);
  const canDelete = can(role, ACTIONS.PURCHASES_DELETE);

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        const params = {
          buscar: searchTerm || undefined,
          page,
          pageSize,
          sortBy: 'fecha',
          sortDir: 'desc',
        };
        if (mostrarCanceladas) {
          params.estado = 'cancelada';
        } else if (filtroEstado !== 'todos') {
          params.estado = filtroEstado;
        }
        const res = await api.get('/ordenes-compra', { params });
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
      message: "¿Seguro que quieres cancelar esta orden? Si ya fue recibida, se revertirá el stock de los artículos.",
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
                sortBy: 'fecha',
                sortDir: 'desc',
              };
              if (mostrarCanceladas) {
                params.estado = 'cancelada';
              } else if (filtroEstado !== 'todos') {
                params.estado = filtroEstado;
              }
              const res = await api.get('/ordenes-compra', { params });
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
      message: "¿Estás seguro de que deseas confirmar la recepción de esta orden? Esto aumentará el stock en inventario.",
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
                sortBy: 'fecha',
                sortDir: 'desc',
              };
              if (mostrarCanceladas) {
                params.estado = 'cancelada';
              } else if (filtroEstado !== 'todos') {
                params.estado = filtroEstado;
              }
              const res = await api.get('/ordenes-compra', { params });
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
            o.id_orden_compra === id ? { ...o, detalles: res.data.detalles } : o
          )
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
    if (filtroEstado && filtroEstado !== 'todos') {
      return orden.estado === filtroEstado;
    }

    return true;
  });

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">
          Órdenes de Compra
        </h2>

        <div className="flex w-full md:w-250 items-center gap-4">
          <input
            type="text"
            placeholder="proveedor o fecha"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />

          {/* Select para filtrar por estado (cliente-side) */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => { setFiltroEstado(e.target.value); setExpandedId(null); setPage(1); }}
              className="h-[42px] border border-gray-300 rounded-md px-3"
              title="Filtrar por estado"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendientes</option>
              <option value="completada">Completadas</option>
            </select>
          </div>

          {canCreate && (
            <button
              onClick={handleCrear}
              className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              <FiPlus size={20} />
              Nueva orden
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
            onClick={toggleMostrarCanceladas}
            className={`h-[42px] flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition cursor-pointer ${
              mostrarCanceladas
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-gray-300 hover:bg-gray-400 text-gray-800"
            }`}
          >
            {mostrarCanceladas ? "Ver activas" : "Ver canceladas"}
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
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Método de Pago</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Comprobante</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">Cargando…</td>
              </tr>
            ) : filteredOrdenes.length > 0 ? (
              filteredOrdenes.map((orden) => (
                <React.Fragment key={orden.id_orden_compra}>
                  <tr
                    onClick={() => toggleExpand(orden.id_orden_compra)}
                    className={`cursor-pointer ${expandedId === orden.id_orden_compra ? 'bg-gray-200 hover:bg-gray-200' : 'hover:bg-gray-200'} transition`}
                  >
                    <td className="px-4 py-3">{orden.id_orden_compra}</td>
                    <td className="px-4 py-3">{orden.proveedor_nombre}</td>
                    <td className="px-4 py-3">
                      {formatDateLocal(orden.fecha)}
                    </td>
                    <td className="px-4 py-3">
                      ${Number(orden.monto_total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {orden.metodo_pago ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          orden.tipo_pago === 'contado' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {orden.metodo_pago}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">No registrado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{orden.estado}</td>
                    <td className="px-4 py-3 text-center">
                      {orden.comprobante_path ? (
                        <a
                          href={`http://localhost:3002/uploads/${orden.comprobante_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          title={`Ver ${orden.comprobante_nombre_original || 'comprobante'}`}
                        >
                          <FiFileText size={18} />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs italic">—</span>
                      )}
                    </td>
                    <td className="pl-3 py-3 text-center flex gap-4">
                   
{canEdit && orden.estado === 'pendiente' && !mostrarCanceladas && (

    <button
        onClick={(e) => {
            e.stopPropagation();
            
            navigate(`/ordenes_compra/editar/${orden.id_orden_compra}`); 
        }}
        className="text-blue-600 hover:text-blue-400 cursor-pointer"
        title="Editar Orden"
    >
        <FiEdit size={18} /> 
    </button>
)}
                
                      {orden.estado === 'pendiente' && !mostrarCanceladas && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConfirmarRecepcion(orden.id_orden_compra);
                          }}
                          className="text-green-600 hover:text-green-400 cursor-pointer"
                          title="Confirmar Recepción"
                        >
                          <FiCheckCircle size={18} />
                        </button>
                      )}
                      {!canEdit && !canDelete && (
                        <span className="text-gray-400 italic select-none">Sin permisos</span>
                      )}

                    
                      {canDelete && orden.estado !== 'cancelada' && !mostrarCanceladas && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(orden.id_orden_compra);
                          }}
                          className="text-red-600 hover:text-red-400 cursor-pointer"
                          title="Cancelar Orden"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>

                  {expandedId === orden.id_orden_compra && (
                    <tr>
                      <td colSpan="8" className="bg-gray-100 p-0 border-b">
                        <div className="px-4 py-4">
                          {orden.comprobante_path && (
                            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FiFileText className="text-blue-600" size={20} />
                                  <div>
                                    <p className="text-sm font-semibold text-gray-700">Comprobante adjunto</p>
                                    <p className="text-xs text-gray-500">{orden.comprobante_nombre_original}</p>
                                  </div>
                                </div>
                                <a
                                  href={`http://localhost:3002/uploads/${orden.comprobante_path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                                >
                                  <FiExternalLink size={14} />
                                  Ver archivo
                                </a>
                              </div>
                            </div>
                          )}
                          <div className="max-h-96 overflow-y-auto">
                            <table className="w-full text-sm">
                              <thead className="sticky top-0 bg-gray-200">
                                <tr className="text-gray-700">
                                  <th className="px-2 py-2 border-b border-gray-300 text-left">Artículo</th>
                                  <th className="px-2 py-2 border-b border-gray-300 text-left">Cantidad</th>
                                  <th className="px-2 py-2 border-b border-gray-300 text-left">Precio Unitario</th>
                                  <th className="px-2 py-2 border-b border-gray-300 text-left">Subtotal</th>
                                </tr>
                              </thead>
                            <tbody className="bg-white">
                              {orden.detalles && orden.detalles.length > 0 ? (
                                orden.detalles.map((d, i) => (
                                  <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-2 py-2 border-b border-gray-300">{d.descripcion_articulo}</td>
                                    <td className="px-2 py-2 border-b border-gray-300">{d.cantidad}</td>
                                    <td className="px-2 py-2 border-b border-gray-300">
                                      ${Number(d.precio_unitario).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-2 border-b border-gray-300">
                                      ${Number(d.cantidad * d.precio_unitario).toLocaleString()}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan="4" className="text-center py-2 text-gray-500">
                                    No hay detalles disponibles.
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
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">
                  No se encontraron órdenes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span> de <span className="font-semibold text-gray-800">{totalPages}</span> — <span className="font-semibold text-gray-800">{total}</span> órdenes
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value={10}>10 / página</option>
                <option value={25}>25 / página</option>
                <option value={50}>50 / página</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdenesCompra;
