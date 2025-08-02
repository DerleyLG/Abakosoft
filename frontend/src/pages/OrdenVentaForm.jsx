import React, { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";

const OrdenVentaForm = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [fecha, setFecha] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);

  const estados = [
    { id: "pendiente", nombre: "Pendiente" },
    { id: "completada", nombre: "Completada" },
    { id: "anulada", nombre: "Anulada" },
  ];

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await api.get("/clientes");
        setClientes(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Error al cargar clientes");
      }
    };

    const fetchArticulos = async () => {
      try {
        const res = await api.get("ordenes-venta/articulos-con-stock");
        setArticulos(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Error al cargar artículos");
      }
    };

    fetchClientes();
    fetchArticulos();
  }, []);

  const agregarArticulo = (articulo) => {
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
      prev.map((a) =>
        a.id_articulo === id_articulo ? { ...a, cantidad } : a
      )
    );
  };

  const validarFormulario = () => {
    if (!cliente) {
      toast.error("Selecciona un cliente");
      return false;
    }
    if (!fecha) {
      toast.error("Selecciona una fecha");
      return false;
    }
    if (!estado) {
      toast.error("Selecciona un estado");
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const payload = {
      id_cliente: cliente.id_cliente,
      fecha,
      estado,
      detalles: articulosSeleccionados.map((a) => ({
        id_articulo: a.id_articulo,
        cantidad: a.cantidad,
        precio_unitario: a.precio_unitario,
      })),
    };

    try {
      await api.post("/ordenes-venta", payload);
      toast.success("Orden de venta creada");
      navigate("/ordenes_venta");
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
          Nueva orden de venta
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cliente, Fecha y Estado */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cliente <span className="text-red-500">*</span>
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
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Estado <span className="text-red-500">*</span>
              </label>
              <Listbox value={estado} onChange={setEstado}>
                <div className="relative">
                  <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                    {estados.find((e) => e.id === estado)?.nombre ||
                      "Selecciona un estado"}
                  </Listbox.Button>
                  <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {estados.map((e) => (
                      <Listbox.Option
                        key={e.id}
                        value={e.id}
                        className={({ active }) =>
                          `cursor-pointer select-none px-4 py-2 ${
                            active ? "bg-slate-100" : ""
                          }`
                        }
                      >
                        {e.nombre}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </div>
              </Listbox>
            </div>
          </div>

          {/* Selector de Artículos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Artículo
            </label>
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
              onChange={(option) => {
                if (option) agregarArticulo(option);
              }}
              placeholder="Selecciona un artículo"
              isClearable
              className="text-sm"
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
          </div>

          {/* Lista de artículos seleccionados */}
        
            <div>
              <h3 className="text-2xl font-bold mb-8 text-gray-800  ">Artículos seleccionados</h3>
              <table className="w-full table-auto border-collapse border border-gray-300  ">
                <thead>
                  <tr className="bg-slate-200">
                    <th className=" px-4 py-2 text-left">Descripción</th>
                    <th className=" px-4 py-2 text-right">Cantidad</th>
                    <th className=" px-4 py-2 text-right">Precio Unitario</th>
                    <th className=" px-4 py-2 text-center">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  {articulosSeleccionados.map((art) => (
                    <tr key={art.id_articulo}>
                      <td className=" px-4 py-2">{art.descripcion}</td>
                      <td className=" px-4 py-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={art.cantidad}
                          onChange={(e) =>
                            cambiarCantidad(art.id_articulo, parseInt(e.target.value, 10))
                          }
                          className="w-20 border border-gray-300 rounded-md px-2 py-1 text-right"
                        />
                      </td>
                      <td className=" px-4 py-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={art.precio_unitario}
                          readOnly
                          className="w-28 border border-gray-300 rounded-md px-2 py-1 text-right"
                        />
                      </td>
                      <td className=" px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => eliminarArticulo(art.id_articulo)}
                          className="text-red-600 hover:text-red-800 cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          

          <div className="flex justify-end gap-4">
  <button
    type="button"
    onClick={() => navigate("/ordenes_venta")}
    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-300 transition cursor-pointer" 
  >
    Cancelar
  </button>
  <button
    type="submit"
    className="px-4 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition cursor-pointer"
  >
    Guardar
  </button>
</div>
          
        </form>
        
      </div>
    </div>
  );
};

export default OrdenVentaForm;
