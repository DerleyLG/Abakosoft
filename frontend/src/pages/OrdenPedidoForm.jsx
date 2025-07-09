import React, { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";
import { PlusCircle } from "lucide-react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

const OrdenPedidoForm = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [categorias, setcategorias] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [estado, setEstado] = useState("pendiente");
  const [observaciones, setObservaciones] = useState("");
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [mostrarFormularioArticulo, setMostrarFormularioArticulo] =
    useState(false);
  const [nuevoArticulo, setNuevoArticulo] = useState({
    referencia: "",
    descripcion: "",
    precio_venta: 0,
    id_categoria: "",
  });

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get("/clientes");
        setClientes(res.data || []);
      } catch {
        toast.error("Error al cargar clientes");
      }
    };

    const fetchArticulos = async () => {
      try {
        const res = await api.get("/articulos");
        setArticulos(res.data || []);
      } catch {
        toast.error("Error al cargar artículos");
      }
    };
    const fetchCategorias = async () => {
      try {
        const res = await api.get("/categorias");
        console.log(categorias);
        setcategorias(res.data || []);
      } catch {
        toast.error("Error al cargar artículos");
      }
    };

    fetchClientes();
    fetchArticulos();
    fetchCategorias();
  }, []);

  const agregarArticulo = async (articulo) => {
    const puedeAgregar = await verificarYAgregarAlInventario(
      articulo.id_articulo,
      articulo.descripcion
    );
    if (!puedeAgregar) return;

    const yaExiste = articulosSeleccionados.some(
      (a) => a.id_articulo === articulo.id_articulo
    );
    if (yaExiste) return;

    setArticulosSeleccionados((prev) => [
      ...prev,
      {
        ...articulo,
        cantidad: 1,
        precio_unitario: articulo.precio_venta || 0,
      },
    ]);
    setArticuloSeleccionado(null);
  };

  const eliminarArticulo = (id_articulo) => {
    setArticulosSeleccionados((prev) =>
      prev.filter((a) => a.id_articulo !== id_articulo)
    );
  };

  const cambiarCantidad = (id_articulo, cantidad) => {
    if (cantidad < 1) return;
    setArticulosSeleccionados((prev) =>
      prev.map((a) => (a.id_articulo === id_articulo ? { ...a, cantidad } : a))
    );
  };

  const validarFormulario = () => {
    if (!cliente) {
      toast.error("Selecciona un cliente");
      return false;
    }
    if (articulosSeleccionados.length === 0) {
      toast.error("Agrega al menos un artículo");
      return false;
    }
    if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
      toast.error("Las cantidades deben ser mayores a cero");
      return false;
    }
    return true;
  };

  const verificarYAgregarAlInventario = async (idArticulo) => {
    try {
      await api.get(`/inventario/${idArticulo}`);
      return true;
    } catch (error) {
      if (error.response?.status === 404) {
        let seAceptoAgregar = false;

        await new Promise((resolve) => {
          confirmAlert({
            title: "Artículo no encontrado",
            message:
              "El artículo no está en inventario, ¿quieres agregarlo con stock 0?",
            buttons: [
              {
                label: "Sí",
                onClick: async () => {
                  try {
                    await api.post("/inventario/movimientos", {
                      id_articulo: Number(idArticulo),
                      cantidad: 0,
                      tipo_movimiento: "entrada",
                      descripcion: "Ingreso inicial",
                      origen: "Stock inicial",
                      stock_minimo: 1,
                    });
                    toast.success(
                      "Artículo agregado al inventario con stock 0"
                    );
                    seAceptoAgregar = true;
                  } catch (err) {
                    toast.error("Error al agregar al inventario");
                  }
                  resolve();
                },
              },
              {
                label: "No",
                onClick: () => {
                  resolve();
                },
              },
            ],
            closeOnEscape: true,
            closeOnClickOutside: false,
          });
        });

        return seAceptoAgregar;
      } else {
        toast.error("No se pudo verificar el inventario");
        return false;
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const payload = {
      id_cliente: cliente.id_cliente,
      estado,
      observaciones,
      detalles: articulosSeleccionados.map((a) => ({
        id_articulo: a.id_articulo,
        cantidad: a.cantidad,
        precio_unitario: a.precio_unitario,
      })),
    };

    try {
      await api.post("/pedidos", payload);
      toast.success("Orden de pedido creada");
      navigate("/ordenes_pedido");
    } catch (error) {
      toast.error(error.response?.data?.error || error.message);
    }
  };

  const handleCrearArticulo = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/articulos", nuevoArticulo);
      toast.success("Artículo creado");
      const articuloCreado = res.data.articulo;

      setArticulos((prev) => [...prev, articuloCreado]);

      if (articuloCreado?.id_articulo) {
        setArticuloSeleccionado({
          id_articulo: articuloCreado.id_articulo,
          descripcion: articuloCreado.descripcion,
          precio_venta: articuloCreado.precio_venta,
        });

        // Esto dispara agregarArticulo desde Select automáticamente
        await agregarArticulo(articuloCreado);
      }

      setMostrarFormularioArticulo(false);
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    }
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nuevo pedido
        </h2>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cliente *
              </label>
              <Listbox value={cliente} onChange={setCliente}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                    {cliente ? cliente.nombre : "Selecciona un cliente"}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {clientes.map((c) => (
                      <Listbox.Option
                        key={c.id_cliente}
                        value={c}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active ? "bg-slate-100" : ""
                          }`
                        }
                      >
                        {c.nombre}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none"
                placeholder="Observaciones del pedido (opcional)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Agregar artículo
            </label>
            <div className="flex items-center gap-2">
              <Select
                options={articulos.map((a) => ({
                  value: a.id_articulo,
                  label: a.descripcion,
                  ...a,
                }))}
                value={
                  articuloSeleccionado
                    ? {
                        value: articuloSeleccionado.id_articulo,
                        label: articuloSeleccionado.descripcion,
                      }
                    : null
                }
                onChange={(option) => option && agregarArticulo(option)}
                placeholder="Selecciona un artículo"
                isClearable
                className="text-sm w-full"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: "#d1d5db",
                    boxShadow: "none",
                    "&:hover": { borderColor: "#64748b" },
                    borderRadius: "0.375rem",
                  }),
                }}
              />
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-white bg-slate-600 hover:bg-slate-700 px-6 rounded-lg transition cursor-pointer"
                onClick={() => setMostrarFormularioArticulo(true)}
              >
                Crear nuevo
              </button>
            </div>

            {mostrarFormularioArticulo && (
              <div className="mt-6 border border-gray-300 rounded-2xl p-6 shadow-sm bg-white space-y-6">
                <h2 className="text-xl font-semibold text-slate-700 cursor-pointer">
                  Nuevo Artículo
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4  ">
                  <div>
                    <label className="text-sm text-slate-600">Referencia</label>
                    <input
                      type="text"
                      value={nuevoArticulo.referencia}
                      onChange={(e) =>
                        setNuevoArticulo({
                          ...nuevoArticulo,
                          referencia: e.target.value,
                        })
                      }
                      placeholder="Ej: REF-001"
                      className="w-full border border-gray-300  rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={nuevoArticulo.descripcion}
                      onChange={(e) =>
                        setNuevoArticulo({
                          ...nuevoArticulo,
                          descripcion: e.target.value,
                        })
                      }
                      placeholder="Ej: Silla de madera"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600">
                      Precio de venta
                    </label>
                    <input
                      type="number"
                      value={nuevoArticulo.precio_venta}
                      onChange={(e) =>
                        setNuevoArticulo({
                          ...nuevoArticulo,
                          precio_venta: parseFloat(e.target.value),
                        })
                      }
                      placeholder="Ej: 120.00"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-sm text-slate-600">Categoría</label>
                    <select
                      value={nuevoArticulo.id_categoria}
                      onChange={(e) =>
                        setNuevoArticulo({
                          ...nuevoArticulo,
                          id_categoria: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id_categoria} value={cat.id_categoria}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={handleCrearArticulo}
                    className="bg-slate-700 text-white px-4 py-3 rounded-xl text-sm hover:bg-slate-800 transition cursor-pointer"
                  >
                    Guardar artículo
                  </button>
                  <button
                    onClick={() => setMostrarFormularioArticulo(false)}
                    type="button"
                    className="bg-gray-300 text-slate-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-400 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-2xl font-bold mb-8 text-gray-800">
              Artículos seleccionados
            </h3>
            <table className="w-full table-auto border-collapse border border-gray-300">
              <thead>
                <tr className="bg-slate-200">
                  <th className="px-4 py-2 text-left" >Descripción</th>
                  <th className="px-4 py-2 text-right">Cantidad</th>
                  <th className="px-4 py-2 text-right">Precio Unitario</th>
                  <th className="px-4 py-2 text-center">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {articulosSeleccionados.map((art) => (
                  <tr key={art.id_articulo}>
                    <td className="px-4 py-2">{art.descripcion}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={art.cantidad}
                        onChange={(e) =>
                          cambiarCantidad(
                            art.id_articulo,
                            parseInt(e.target.value, 10)
                          )
                        }
                        className="w-20 border border-gray-300 rounded-md px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={art.precio_unitario}
                        readOnly
                        className="w-28 border border-gray-300 rounded-md px-2 py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => eliminarArticulo(art.id_articulo)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-slate-700 text-white px-6 py-3 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Guardar pedido
            </button>
            <button className="bg-gray-300  px-6 py-3 rounded-xl hover:bg-gray-400 cursor-pointer ml-4"
            type="button"
    onClick={() => navigate("/ordenes_pedido")}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrdenPedidoForm;
