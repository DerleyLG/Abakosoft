import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FiEye, FiArrowLeft, FiTrash2, FiPlus } from "react-icons/fi";
import React from "react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import toast from "react-hot-toast";


const OrdenesCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        const res = await api.get("/ordenes-compra");
        setOrdenes(res.data);
      } catch (error) {
        console.error("Error al cargar las órdenes de compra:", error);
        toast.error("Error al cargar las órdenes");
      }
    };

    fetchOrdenes();
  }, []);

  const handleCrear = () => navigate("/ordenes_compra/nuevo");

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar esta orden?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/ordenes-compra/${id}`);
              toast.success("Orden eliminada");
              setOrdenes((prev) =>
                prev.filter((o) => o.id_orden_compra !== id)
              );
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

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    const orden = ordenes.find((o) => o.id_orden_compra === id);
    if (!orden.detalles) {
      try {
        const res = await api.get(`/detalles-orden-compra/orden/${id}`);
        setOrdenes((prev) =>
          prev.map((o) =>
            o.id_orden_compra === id ? { ...o, detalles: res.data } : o
          )
        );
      } catch (error) {
        console.error("Error al cargar detalles:", error);
        toast.error("No se pudieron cargar los detalles");
        return;
      }
    }

    setExpandedId(id);
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    const term = searchTerm.toLowerCase();
    const proveedor = orden.proveedor?.toLowerCase() || "";
    const fechaStr = new Date(orden.fecha).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return proveedor.includes(term) || fechaStr.includes(term);
  });

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">
          Órdenes de Compra
        </h2>

        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por proveedor o fecha"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />

          <button
            onClick={handleCrear}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Nueva orden
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
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdenes.length > 0 ? (
              filteredOrdenes.map((orden) => (
                <React.Fragment key={orden.id_orden_compra}>
                  <tr
                    onClick={() => toggleExpand(orden.id_orden_compra)}
                    className="hover:bg-slate-300 transition cursor-pointer"
                  >
                    <td className="px-4 py-3">{orden.proveedor}</td>
                    <td className="px-4 py-3">
                      {new Date(orden.fecha).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      ${Number(orden.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">{orden.estado}</td>
                    <td className="pl-3 py-3 text-center flex gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(orden.id_orden_compra);
                        }}
                        className="text-blue-600 hover:text-blue-400 cursor-pointer"
                        title="Ver detalle"
                      >
                        <FiEye size={18} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(orden.id_orden_compra);
                        }}
                        className="text-red-600 hover:text-red-400 cursor-pointer"
                        title="Eliminar"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>

                  {expandedId === orden.id_orden_compra && (
                    <tr>
                      <td colSpan="5" className="bg-gray-100 px-6 py-4 border-b">
                        <div className="mt-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-300 text-gray-700">
                                <th className="px-2 py-1">Descripción</th>
                                <th className="px-2 py-1">Cantidad</th>
                                <th className="px-2 py-1">Precio Unitario</th>
                                <th className="px-2 py-1">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="hover:bg-slate-200">
                              {orden.detalles && orden.detalles.length > 0 ? (
                                orden.detalles.map((d, i) => (
                                  <tr key={i}>
                                    <td className="px-2 py-1">{d.descripcion_articulo}</td>
                                    <td className="px-2 py-1">{d.cantidad}</td>
                                    <td className="px-2 py-1">
                                      ${Number(d.precio_unitario).toLocaleString()}
                                    </td>
                                    <td className="px-2 py-1">
                                      ${Number(d.subtotal || d.cantidad * d.precio_unitario).toLocaleString()}
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No se encontraron órdenes que coincidan con la búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdenesCompra;
