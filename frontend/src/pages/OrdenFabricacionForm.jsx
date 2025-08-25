import { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
import { format } from "date-fns";
import { Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import { useLocation } from "react-router-dom";

const CrearOrdenFabricacion = () => {
  const location = useLocation();
  const idPedidoSeleccionado = location.state?.idPedidoSeleccionado || null;
  const navigate = useNavigate();
  const [ordenesPedido, setOrdenesPedido] = useState([]);
  const [ordenPedido, setOrdenPedido] = useState(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFinEstimada, setFechaFinEstimada] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [articulos, setArticulos] = useState([]);
  const [etapasProduccion, setEtapasProduccion] = useState([]);
  const [idEtapaDefault, setIdEtapaDefault] = useState(null);
const [hayArticuloCompuesto, setHayArticuloCompuesto] = useState(false);
  const [detalles, setDetalles] = useState([]);

  useEffect(() => {
    if (etapasProduccion.length > 0) {
      const tapizado = etapasProduccion.find(
        (e) => e.nombre.toLowerCase() === "tapizado"
      );
      if (tapizado) {
        setIdEtapaDefault(tapizado.id_etapa);

        setDetalles([
          {
            id: Date.now(),
            articulo: null,
            cantidad: 1,
            descripcion: "",
            id_etapa_final: tapizado.id_etapa,
          },
        ]);
      }
    }
  }, [etapasProduccion]);

 useEffect(() => {
    const fetchOrdenesPedido = async () => {
      try {
        const res = await api.get("/pedidos");

        setOrdenesPedido(res.data);

        if (idPedidoSeleccionado) {
          const seleccionada = res.data.find(
            (p) => p.id_pedido === idPedidoSeleccionado
          );
          if (seleccionada) {
            setOrdenPedido(seleccionada);
          }
        }
      } catch (error) {
        toast.error("Error al cargar órdenes de venta");
      }
    };

    const fetchArticulos = async () => {
      try {
        const res = await api.get("/articulos");
        setArticulos(res.data);
      } catch (error) {
        toast.error("Error al cargar artículos");
      }
    };

    const fetchEtapas = async () => {
      try {
        const res = await api.get("/etapas-produccion");
        setEtapasProduccion(res.data);
      } catch (error) {
        toast.error("Error al cargar etapas de producción");
      }
    };

    fetchOrdenesPedido();
    fetchArticulos();
    fetchEtapas();
  }, []);

  useEffect(() => {
    const cargarArticulosDelPedido = async () => {
      try {
        const res = await api.get(
          `/detalle-orden-pedido/${idPedidoSeleccionado}`
        );
        const detallesPedido = res.data || [];

        // manejar artículos compuestos y no compuestos
        const nuevosDetallesPromises = detallesPedido.map(async (item) => {
          const articuloOriginal = articulos.find(
            (a) => a.id_articulo === item.id_articulo
          );

          // Si el artículo es compuesto, hace una llamada para obtener sus componentes
          if (articuloOriginal?.es_compuesto) {
            const componentesRes = await api.get(
              `/articulos/componentes/${articuloOriginal.id_articulo}?cantidad_padre=${item.cantidad}`
            );
            return componentesRes.data.map((comp) => ({
              id: Date.now() + Math.random(),
              articulo: comp,
              cantidad: comp.cantidad, 
              descripcion: `Componente para: ${articuloOriginal.descripcion}`,
              id_etapa_final: idEtapaDefault || "",
            }));
          } else {
            // Si no es compuesto, devolvemos el artículo original
            return [{
              id: Date.now() + Math.random(),
              articulo: articuloOriginal || {
                id_articulo: item.id_articulo,
                descripcion: item.descripcion,
              },
              cantidad: item.cantidad,
              descripcion: "",
              id_etapa_final: idEtapaDefault || "",
            }];
          }
        });

        const nuevosDetallesArray = await Promise.all(nuevosDetallesPromises);
        setDetalles(nuevosDetallesArray.flat());
      } catch (error) {
        toast.error("Error al cargar los artículos del pedido");
        console.error(error);
      }
    };

    if (idPedidoSeleccionado && articulos.length > 0) {
      cargarArticulosDelPedido();
    }
  }, [idPedidoSeleccionado, articulos, idEtapaDefault]);
 

  const handleDetalleChange = (index, campo, valor) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index][campo] = campo === "cantidad" ? Number(valor) : valor;

   if (campo === "articulo") {
    const esCompuesto = valor?.es_compuesto === 1;
    nuevosDetalles[index].mensajeError = esCompuesto
      ? 'Este artículo es compuesto. No se puede fabricar manualmente.'
      : null;
  }

  setDetalles(nuevosDetalles);
  const tieneCompuesto = nuevosDetalles.some(d => d.articulo?.es_compuesto === 1);
  setHayArticuloCompuesto(tieneCompuesto);
  };


  const handleRemoveDetalle = (index) => {
    setDetalles((prevDetalles) => prevDetalles.filter((_, i) => i !== index));
  };

  const agregarDetalle = () => {
    setDetalles([
      ...detalles,
      {
        id: Date.now(),
        articulo: null,
        cantidad: 1,
        descripcion: "",
        id_etapa_final: idEtapaDefault || "",
      },
    ]);
  };

  const validarFormulario = () => {
    if (!ordenesPedido) {
      toast.error("Selecciona una orden de pedido");
      return false;
    }
    if (!fechaInicio) {
      toast.error("Selecciona la fecha de inicio");
      return false;
    }
    if (detalles.some((d) => !d.articulo || d.cantidad <= 0)) {
      toast.error("Completa correctamente todos los detalles");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    try {
      const payload = {
        orden: {
          id_pedido: ordenPedido?.id_pedido,
          fecha_inicio: fechaInicio,
          fecha_fin_estimada: fechaFinEstimada || null,
          estado,
        },
        detalles: detalles.map((d) => ({
          id_articulo: d.articulo.id_articulo,
          cantidad: d.cantidad,
          descripcion: d.descripcion || "Sin descripción",
          id_etapa_final: parseInt(d.id_etapa_final),
        })),
      };
      
      await api.post("/ordenes-fabricacion", payload);

      toast.success("Orden de fabricación creada");
      navigate("/ordenes_fabricacion");
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
          Nueva orden de fabricación
        </h2>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Orden de pedido <span className="text-red-500">*</span>
            </label>
            <Listbox value={ordenPedido} onChange={setOrdenPedido}>
              <div className="relative">
                <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                  {ordenPedido
                    ? `#${ordenPedido.id_pedido} - ${
                        ordenPedido.cliente_nombre || "Sin cliente"
                      } - ${format(
                        new Date(ordenPedido.fecha_pedido),
                        "dd/MM/yyyy"
                      )}`
                    : "Selecciona una orden"}
                </Listbox.Button>

                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {ordenesPedido.map((op) => (
                    <Listbox.Option
                      key={op.id_pedido}
                      value={op}
                      className={({ active }) =>
                        `cursor-pointer select-none px-4 py-2 ${
                          active ? "bg-slate-100" : ""
                        }`
                      }
                    >
                      {`#${op.id_pedido} - ${
                        op.cliente_nombre || "Sin cliente"
                      } - ${format(new Date(op.fecha_pedido), "dd/MM/yyyy")}`}
                    </Listbox.Option>
                  ))}
                </Listbox.Options>
              </div>
            </Listbox>
          </div>

          {/* Fechas y estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha de Inicio <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha Fin Estimada
              </label>
              <input
                type="date"
                value={fechaFinEstimada}
                onChange={(e) => setFechaFinEstimada(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              >
                <option value="pendiente">Pendiente</option>
                <option value="completada">Completada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Detalles */}
        
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Detalles de la orden</h3>
              <button
                type="button"
                onClick={agregarDetalle}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 cursor-pointer"
              >
                <Plus size={18} />
                Agregar detalle
              </button>
            </div>

            {detalles.map((detalle, index) => (
              <div
                key={detalle.id}
                className="grid grid-cols-5 md:grid-cols-5 gap-6 mb-4 items-end relative"
              >
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Artículo <span className="text-red-500">*</span>
                  </label>
                  <Listbox
                    value={detalle.articulo}
                    onChange={(value) =>
                      handleDetalleChange(index, "articulo", value)
                    }
                  >
                    <div className="relative">
                      <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600">
                        {detalle.articulo
                          ? detalle.articulo.descripcion
                          : "Selecciona un artículo"}
                      </Listbox.Button>
                      <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-52 overflow-auto">
                        {articulos.map((art) => (
                          <Listbox.Option
                            key={art.id_articulo}
                            value={art}
                            className={({ active }) =>
                              `cursor-pointer select-none px-4 py-2 ${
                                active ? "bg-slate-100" : ""
                              }`
                            }
                          >
                            {art.descripcion}
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </div>
                  </Listbox>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Cantidad <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={detalle.cantidad}
                    onChange={(e) =>
                      handleDetalleChange(index, "cantidad", e.target.value)
                    }
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Etapa final
                  </label>
                  <select
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                    value={detalle.id_etapa_final || ""}
                    onChange={(e) =>
                      handleDetalleChange(
                        index,
                        "id_etapa_final",
                        e.target.value
                      )
                    }
                  >
                    <option value="">Seleccionar etapa final</option>
                    {etapasProduccion.map((etapa) => (
                      <option key={etapa.id_etapa} value={etapa.id_etapa}>
                        {etapa.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <input
                    type="text"
                    value={detalle.descripcion}
                    onChange={(e) =>
                      handleDetalleChange(index, "descripcion", e.target.value)
                    }
                    placeholder="Opcional"
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>
{detalle.mensajeError && (
      <div className="md:col-span-5 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{detalle.mensajeError}</span>
      </div>
    )}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDetalle(index)}
                    className="absolute top-0 right-0 mt-0 mr-0 text-red-500 hover:text-red-900 cursor-pointer"
                  >
                    <X size={25} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
           
          {/* Botón submit */}
          <div className="pt-4 border-t flex justify-end">
            <button
              disabled={hayArticuloCompuesto}
              type="submit"
              className={`${hayArticuloCompuesto ? 'opacity-50 cursor-not-allowed': 'bg-slate-700 hover:bg-slate-900 text-white font-semibold px-8 py-3 rounded-md transition cursor-pointer'}`}
            >
              Crear orden de fabricación
            </button>

            <button
              onClick={() => navigate("/ordenes_fabricacion")}
              className=" bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-7 py-2 rounded-md font-semibold transition cursor-pointer ml-6"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearOrdenFabricacion;
