import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { X, PlusCircle } from "lucide-react";
import AsyncSelect from "react-select/async";
import { format } from "date-fns";

const formatCOP = (number) => {
  if (!number) return "0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

const cleanCOPFormat = (formattedValue) => {
  return parseInt(formattedValue.replace(/[^0-9]/g, ""), 10) || 0;
};

const EditarPedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [pedidoData, setPedidoData] = useState({
    id_cliente: "",
    estado: "",
    observaciones: "",
    fecha_pedido: format(new Date(), "yyyy-MM-dd"),
  });
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [articulosOptions, setArticulosOptions] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [editandoPrecio, setEditandoPrecio] = useState({});
  const [loading, setLoading] = useState(true);

  const [allClientes, setAllClientes] = useState([]);
  const cacheRef = useRef({});
  const timerRef = useRef(null);

  const fetchDependencies = async () => {
    try {
      const resClientes = await api.get("/clientes");
      setAllClientes(resClientes.data);
      setClientes(resClientes.data);

      const [resArticulos, resCategorias] = await Promise.all([
        api.get("/articulos", { params: { page: 1, pageSize: 1 } }),
        api.get("/categorias"),
      ]);

      // Cargar TODOS los artículos (no solo la primera página de 25)
      const totalArticulos = resArticulos.data?.total || 10000;
      const resArticulosAll = await api.get("/articulos", {
        params: {
          page: 1,
          pageSize: totalArticulos,
          sortBy: "descripcion",
          sortDir: "asc",
        },
      });

      const articulosAPI = Array.isArray(resArticulosAll.data)
        ? resArticulosAll.data
        : resArticulosAll.data?.data || [];

      const categoriasAPI = Array.isArray(resCategorias.data)
        ? resCategorias.data
        : [];

      // Crear mapa de categorías por tipo
      const categoriasMap = {};
      categoriasAPI.forEach((cat) => {
        categoriasMap[cat.id_categoria] = cat.tipo;
      });

      // Filtrar solo artículos fabricables y armar opciones para el buscador
      const opciones = articulosAPI
        .filter(
          (art) => categoriasMap[art.id_categoria] === "articulo_fabricable",
        )
        .map((art) => ({
          value: art.id_articulo,
          label: `${art.descripcion} (Ref: ${art.referencia})`,
          referencia: art.referencia,
          descripcion: art.descripcion,
          ...art,
        }));

      setArticulosOptions(opciones);
      cacheRef.current[""] = opciones;
      return opciones;
    } catch (error) {
      toast.error("Error al cargar dependencias (Clientes/Artículos).");
      console.error("Error cargando dependencias:", error);
      return [];
    }
  };

  const fetchPedidoData = async (opciones = []) => {
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

      // Asegurar que los artículos de los detalles existan en las opciones del
      // buscador (pueden ser no fabricables o no estar en la primera página)
      const listaActual = Array.isArray(opciones) ? opciones : [];
      const idsFaltantes = resDetalles.data
        .map((d) => d.id_articulo)
        .filter((idArt) => !listaActual.some((a) => a.id_articulo == idArt));

      if (idsFaltantes.length > 0) {
        try {
          const articulosFaltantes = (
            await Promise.all(
              idsFaltantes.map((idArt) =>
                api
                  .get(`/articulos/${idArt}`)
                  .then((r) => r.data)
                  .catch(() => null),
              ),
            )
          ).filter(Boolean);

          if (articulosFaltantes.length > 0) {
            const opcionesCompletas = [
              ...listaActual,
              ...articulosFaltantes.map((art) => ({
                value: art.id_articulo,
                label: `${art.descripcion} (Ref: ${art.referencia})`,
                referencia: art.referencia,
                descripcion: art.descripcion,
                ...art,
              })),
            ];
            setArticulosOptions(opcionesCompletas);
            cacheRef.current[""] = opcionesCompletas;
          }
        } catch (e) {
          console.error("Error cargando artículos faltantes del pedido:", e);
        }
      }

      // Cargar los artículos registrados en el pedido (descripcion viene del JOIN)
      setArticulosSeleccionados(
        resDetalles.data.map((d) => ({
          id_articulo: d.id_articulo,
          descripcion: d.descripcion || "Artículo",
          referencia: d.referencia || "",
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
    const init = async () => {
      const articulosCargados = await fetchDependencies();
      await fetchPedidoData(articulosCargados);
    };
    init();
  }, [id]);

  const handlePedidoChange = (e) => {
    const { name, value } = e.target;
    setPedidoData((prev) => ({ ...prev, [name]: value }));
  };

  // Búsqueda de artículos con debounce y caché (como en la creación de pedidos)
  const loadArticulosOptions = useCallback(
    (inputValue, callback) => {
      const cacheKey = inputValue?.toLowerCase() || "";

      if (!inputValue || inputValue.trim() === "") {
        callback(articulosOptions);
        return;
      }

      if (cacheRef.current[cacheKey]) {
        callback(cacheRef.current[cacheKey]);
        return;
      }

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        const filtered = articulosOptions.filter(
          (art) =>
            art.label.toLowerCase().includes(inputValue.toLowerCase()) ||
            art.referencia?.toLowerCase().includes(inputValue.toLowerCase()) ||
            art.descripcion?.toLowerCase().includes(inputValue.toLowerCase()),
        );

        cacheRef.current[cacheKey] = filtered;
        callback(filtered);
      }, 300);
    },
    [articulosOptions],
  );

  const agregarArticulo = (articulo) => {
    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.id_articulo,
    );
    if (yaExiste) {
      toast.error("Este artículo ya ha sido añadido al pedido.");
      return;
    }

    setArticulosSeleccionados((prev) => [
      ...prev,
      {
        ...articulo,
        cantidad: 1,
        precio_unitario: articulo.precio_venta || 0,
      },
    ]);
    setArticuloSeleccionado(null); // Limpiar la selección después de agregar
  };

  const eliminarArticulo = (id_articulo) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id_articulo !== id_articulo),
    );
  };

  const cambiarCantidad = (id_articulo, cantidad) => {
    const numCantidad = parseInt(cantidad, 10);
    if (isNaN(numCantidad) || numCantidad < 1) {
      toast.error("La cantidad debe ser un número positivo.");
      return;
    }
    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, cantidad: numCantidad } : a,
      ),
    );
  };

  const cambiarPrecioUnitario = (id_articulo, valor) => {
    setEditandoPrecio((prev) => ({
      ...prev,
      [id_articulo]: valor,
    }));
  };

  const handleFocusPrecio = (id_articulo, precioActual) => {
    setEditandoPrecio((prev) => ({
      ...prev,
      [id_articulo]: precioActual.toString(),
    }));
  };

  const handleBlurPrecio = (id_articulo, valor) => {
    const numPrecio = valor.includes("$")
      ? cleanCOPFormat(valor)
      : parseInt(valor, 10) || 0;

    if (isNaN(numPrecio) || numPrecio < 0) {
      toast.error("El precio unitario debe ser un número positivo o cero.");
      setEditandoPrecio((prev) => {
        const newState = { ...prev };
        delete newState[id_articulo];
        return newState;
      });
      return;
    }

    setArticulosSeleccionados((prev) =>
      prev.map((a) =>
        a.id_articulo === id_articulo
          ? { ...a, precio_unitario: numPrecio }
          : a,
      ),
    );

    setEditandoPrecio((prev) => {
      const newState = { ...prev };
      delete newState[id_articulo];
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (articulosSeleccionados.length === 0) {
      toast.error("Agrega al menos un artículo al pedido.");
      return;
    }
    if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
      toast.error("Las cantidades deben ser mayores a cero.");
      return;
    }
    if (articulosSeleccionados.some((a) => a.precio_unitario < 0)) {
      toast.error("El precio unitario no puede ser negativo.");
      return;
    }

    // Tomar el precio en edición si existe (input sin blur)
    const detalles = articulosSeleccionados.map((a) => {
      const valorEditado = editandoPrecio?.[a.id_articulo];
      const precio_unitario =
        valorEditado !== undefined
          ? typeof valorEditado === "string" && valorEditado.includes("$")
            ? cleanCOPFormat(valorEditado)
            : parseInt(valorEditado, 10) || 0
          : a.precio_unitario;
      return {
        id_articulo: a.id_articulo,
        cantidad: a.cantidad,
        precio_unitario,
      };
    });

    try {
      const dataToSend = {
        ...pedidoData,
        detalles,
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

            {/* Buscador de artículo para adicionar */}
            <div className="flex items-center gap-2 mb-5">
              <div className="flex-1">
                <AsyncSelect
                  cacheOptions
                  loadOptions={loadArticulosOptions}
                  defaultOptions={articulosOptions}
                  value={articuloSeleccionado}
                  onChange={(option) => {
                    setArticuloSeleccionado(option);
                    if (option) agregarArticulo(option);
                  }}
                  placeholder="Buscar artículo por nombre o referencia…"
                  isClearable
                  className="text-sm"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: "#e2e8f0",
                      boxShadow: "none",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem",
                      "&:hover": { borderColor: "#94a3b8" },
                    }),
                    menuList: (base) => ({ ...base, maxHeight: "280px" }),
                  }}
                  isDisabled={loading}
                  noOptionsMessage={() => "No se encontraron artículos"}
                  loadingMessage={() => "Cargando artículos…"}
                />
              </div>
            </div>

            {/* Tabla de artículos (incluye los registrados en el pedido) */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Artículo
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-32">
                      Cantidad
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-40">
                      Precio Unitario
                    </th>
                    <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-36">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articulosSeleccionados.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <PlusCircle size={28} className="opacity-30" />
                          <p className="text-sm">
                            Aún no hay artículos en el pedido
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    articulosSeleccionados.map((art) => (
                      <tr
                        key={art.id_articulo}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {art.descripcion}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="1"
                            value={art.cantidad === 0 ? "" : art.cantidad}
                            onChange={(e) =>
                              cambiarCantidad(art.id_articulo, e.target.value)
                            }
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="text"
                            value={
                              editandoPrecio[art.id_articulo] !== undefined
                                ? editandoPrecio[art.id_articulo]
                                : formatCOP(art.precio_unitario)
                            }
                            onChange={(e) =>
                              cambiarPrecioUnitario(
                                art.id_articulo,
                                e.target.value,
                              )
                            }
                            onFocus={() =>
                              handleFocusPrecio(
                                art.id_articulo,
                                art.precio_unitario,
                              )
                            }
                            onBlur={(e) =>
                              handleBlurPrecio(art.id_articulo, e.target.value)
                            }
                            className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                            placeholder="$0"
                          />
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-800">
                          {formatCOP(art.precio_unitario * art.cantidad)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => eliminarArticulo(art.id_articulo)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Eliminar artículo"
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Total */}
            {articulosSeleccionados.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 mt-5">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Total del pedido
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {articulosSeleccionados.length} artículo
                    {articulosSeleccionados.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <p className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatCOP(
                    articulosSeleccionados.reduce(
                      (total, art) =>
                        total + art.precio_unitario * art.cantidad,
                      0,
                    ),
                  )}
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPedido;
