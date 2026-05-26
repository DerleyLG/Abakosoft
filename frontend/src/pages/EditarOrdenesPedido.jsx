import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiSave, FiArrowLeft, FiPlus, FiTrash2 } from "react-icons/fi";
import { format } from "date-fns";

const EditarPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedidoData, setPedidoData] = useState({
    id_cliente: "",
    estado: "",
    observaciones: "",
    fecha_pedido: format(new Date(), "yyyy-MM-dd"),
  });
  const [detalles, setDetalles] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [allArticulos, setAllArticulos] = useState([]);
  const [allClientes, setAllClientes] = useState([]);

  const fetchDependencies = async () => {
    try {
      const resClientes = await api.get("/clientes");
      setAllClientes(resClientes.data);
      setClientes(resClientes.data);

      const [resArticulos, resCategorias] = await Promise.all([
        api.get("/articulos"),
        api.get("/categorias"),
      ]);

      const articulosAPI = Array.isArray(resArticulos.data)
        ? resArticulos.data
        : resArticulos.data?.data || [];

      const categoriasAPI = Array.isArray(resCategorias.data)
        ? resCategorias.data
        : [];

      // Crear mapa de categorías por tipo
      const categoriasMap = {};
      categoriasAPI.forEach((cat) => {
        categoriasMap[cat.id_categoria] = cat.tipo;
      });

      // Filtrar solo artículos fabricables
      const articulosFabricables = articulosAPI.filter(
        (art) => categoriasMap[art.id_categoria] === "articulo_fabricable",
      );

      setAllArticulos(articulosFabricables);
      setArticulos(articulosFabricables);
    } catch (error) {
      toast.error("Error al cargar dependencias (Clientes/Artículos).");
      console.error("Error cargando dependencias:", error);
    }
  };

  const fetchPedidoData = async () => {
    try {
      const resPedido = await api.get(`/pedidos/${id}`);
      const pedido = resPedido.data;

      const resDetalles = await api.get(`/detalle-orden-pedido/${id}`);

      const formattedDate = pedido.fecha_pedido
        ? format(new Date(pedido.fecha_pedido), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd");

      setPedidoData({
        id_cliente: pedido.id_cliente,
        estado: pedido.estado,
        observaciones: pedido.observaciones || "",
        fecha_pedido: formattedDate,
      });

      setDetalles(
        resDetalles.data.map((d) => ({
          id_articulo: d.id_articulo,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
        })),
      );
    } catch (error) {
      toast.error("Error al cargar datos del pedido.");
      console.error("Error cargando pedido:", error);
      navigate("/ordenes_pedido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchPedidoData();
  }, [id]);

  const handlePedidoChange = (e) => {
    const { name, value } = e.target;
    setPedidoData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDetalleChange = (index, e) => {
    const { name, value } = e.target;
    const list = [...detalles];
    list[index][name] =
      name === "cantidad" || name === "precio_unitario" ? Number(value) : value;

    let processedValue;

    if (name === "precio_unitario") {
      processedValue = parseCurrency(value);
    } else if (name === "cantidad") {
      processedValue = Number(value);
    } else {
      processedValue = value;
    }

    list[index][name] = processedValue;

    if (name === "id_articulo" && allArticulos.length > 0) {
      const selectedArticle = allArticulos.find((a) => a.id_articulo == value);
      if (selectedArticle) {
        list[index].precio_unitario = selectedArticle.precio_venta || 0;
      }
    }

    setDetalles(list);
  };

  const handleAddDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      { id_articulo: "", cantidad: 1, precio_unitario: 0 },
    ]);
  };

  const handleRemoveDetalle = (index) => {
    if (detalles.length > 1) {
      setDetalles((prev) => prev.filter((_, i) => i !== index));
    } else {
      toast.error("El pedido debe tener al menos un detalle.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      detalles.length === 0 ||
      detalles.some(
        (d) => !d.id_articulo || d.cantidad <= 0 || d.precio_unitario <= 0,
      )
    ) {
      toast.error(
        "Asegúrate de que todos los detalles estén completos y sean válidos (Artículos seleccionados, Cantidad y Precio > 0).",
      );
      return;
    }

    try {
      const dataToSend = {
        ...pedidoData,
        detalles: detalles,
      };
      await api.put(`/pedidos/${id}`, dataToSend);
      toast.success("Pedido y detalles actualizados correctamente.");
      navigate("/ordenes_pedido");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Error al actualizar el pedido.";
      console.error("Error de actualización:", error);
      toast.error(errorMessage);
    }
  };
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return "";
    }

    return Number(value).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",

      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };
  const parseCurrency = (value) => {
    if (typeof value !== "string" || !value) return 0;

    const cleanValue = value.replace(/[^0-9]/g, "");

    return Number(cleanValue);
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Cargando pedido...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={17} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Órdenes de Pedido
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Editar pedido{" "}
                <span className="text-slate-500 font-normal">#{id}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="pedido-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        <form
          id="pedido-form"
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Información principal */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Información principal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label
                  htmlFor="id_cliente"
                  className="block text-sm font-semibold text-slate-600 mb-2"
                >
                  Cliente <span className="text-red-400">*</span>
                </label>
                <select
                  id="id_cliente"
                  name="id_cliente"
                  value={pedidoData.id_cliente}
                  onChange={handlePedidoChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                >
                  <option value="">Selecciona un cliente</option>
                  {allClientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="estado"
                  className="block text-sm font-semibold text-slate-600 mb-2"
                >
                  Estado <span className="text-red-400">*</span>
                </label>
                <select
                  id="estado"
                  name="estado"
                  value={pedidoData.estado}
                  onChange={handlePedidoChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en fabricacion">En Fabricación</option>
                  <option value="listo para entrega">Listo para Entrega</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="fecha_pedido"
                  className="block text-sm font-semibold text-slate-600 mb-2"
                >
                  Fecha del Pedido
                </label>
                <input
                  type="date"
                  id="fecha_pedido"
                  name="fecha_pedido"
                  value={pedidoData.fecha_pedido}
                  onChange={handlePedidoChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="observaciones"
                className="block text-sm font-semibold text-slate-600 mb-2"
              >
                Observaciones
              </label>
              <textarea
                id="observaciones"
                name="observaciones"
                rows={3}
                value={pedidoData.observaciones}
                onChange={handlePedidoChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 resize-none transition"
                placeholder="Notas adicionales del pedido"
              />
            </div>
          </div>

          {/* Artículos */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">
              Artículos del pedido
            </h2>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Artículo
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-28">
                      Cantidad
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-44">
                      Precio Unitario
                    </th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detalles.map((detalle, index) => (
                    <tr
                      key={index}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <select
                          name="id_articulo"
                          value={detalle.id_articulo}
                          onChange={(e) => handleDetalleChange(index, e)}
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                          <option value="">Seleccione artículo</option>
                          {allArticulos.map((a) => (
                            <option key={a.id_articulo} value={a.id_articulo}>
                              {a.descripcion}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          name="cantidad"
                          value={detalle.cantidad}
                          onChange={(e) => handleDetalleChange(index, e)}
                          min="1"
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          name="precio_unitario"
                          value={formatCurrency(detalle.precio_unitario)}
                          onChange={(e) => handleDetalleChange(index, e)}
                          required
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveDetalle(index)}
                          disabled={detalles.length === 1}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          title="Eliminar artículo"
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={handleAddDetalle}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              <FiPlus size={15} />
              Agregar artículo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPedido;
