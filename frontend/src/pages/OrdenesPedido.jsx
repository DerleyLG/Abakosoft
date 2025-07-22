import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {  FiPackage, FiArrowLeft, FiTrash2, FiPlus } from "react-icons/fi";

import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";

const Pedidos = () => {
  const [pedidos, setPedidos] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPedidos = async () => {
      try {
        const endpoint = mostrarCancelados ? "/pedidos?estado=cancelado" : "/pedidos";
        console.log("Llamando a API en:", endpoint);
        const res = await api.get(endpoint);
          console.log("Datos recibidos:", res.data);
        setPedidos(res.data);
      } catch (error) {
        console.error("Error al cargar pedidos:", error);
      }
    };

    fetchPedidos();
  }, [mostrarCancelados]);

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
              console.log("Error al eliminar", error.response?.data || error.message);
              toast.error(
                error.response?.data?.error || error.response?.data?.message || error.message
              );
            }
          },
        },
        { label: "No" },
      ],
    });
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
          prev.map((p) => (p.id_pedido === id ? { ...p, detalles: res.data } : p))
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
  };

  const filteredPedidos = pedidos.filter((pedido) => {
    const term = searchTerm.toLowerCase();
    const cliente = pedido.cliente_nombre?.toLowerCase() || "";
  

    const fecha = new Date(pedido.fecha);
    const fechaStr = fecha.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return cliente.includes(term) || fechaStr.includes(term);
  });


  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">Pedidos</h2>

        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por cliente o fecha (dd/mm/aa)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />

          <button
            onClick={handleCrear}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 hover:text-slate-400 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Nuevo pedido
          </button>

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
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPedidos.length > 0 ? (
              filteredPedidos.map((pedido) => (
                <React.Fragment key={pedido.id_pedido}>
                  <tr
                    onClick={() => toggleExpand(pedido.id_pedido)}
                    className="hover:bg-slate-300 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">{pedido.cliente_nombre}</td>
                    <td className="px-4 py-3">
                        
                      {new Date(pedido.fecha_pedido).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      ${Number(pedido.monto_total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{pedido.estado}</td>
                    <td className="pl-3 py-3 text-center flex gap-4">
           {!mostrarCancelados && ( // <-- ¡Condición re-añadida aquí!
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmAlert({
                              title: 'Orden de fabricación',
                              message: '¿Está seguro que desea crear una orden de fabricación?',
                              buttons: [
                                {
                                  label: 'Sí',
                                  onClick: () => navigate('/ordenes_fabricacion/nuevo', { state: { idPedidoSeleccionado: pedido.id_pedido }}),

                                },
                                {
                                  label: 'No',
                                },
                              ],
                            });
                          }}
                          className="text-green-600 hover:text-green-400 cursor-pointer"
                          title="Crear orden de fabricación"
                        >
                          <FiPackage size={18} />
                        </button>
                      )}


                      {!mostrarCancelados && (
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
                    </td>
                  </tr>

                  {expandedId === pedido.id_pedido && (
                    <tr>
                      <td colSpan="5" className="bg-gray-100 px-6 py-4 border-b">
                        <div className="mt-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-300 text-gray-700">
                                <th className="px-2 py-1">Artículo</th>
                                <th className="px-2 py-1">Cantidad</th>
                                <th className="px-2 py-1">Precio Unitario</th>
                                <th className="px-2 py-1">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="hover:bg-slate-200">
                              {pedido.detalles?.length > 0 ? (
                                pedido.detalles.map((d, i) => (
                                  <tr key={i}>
                                    <td className="px-2 py-1 ">{d.descripcion}</td>
                                    <td className="px-2 py-1">{d.cantidad}</td>
                                    <td className="px-2 py-1">${Number(d.precio_unitario).toLocaleString()}</td>
                                    <td className="px-2 py-1">${Number(d.subtotal).toLocaleString()}</td>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No se encontraron pedidos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
      </div>
    </div>
  );
};

export default Pedidos;
