import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { FiTrash2, FiPlus, FiArrowLeft, FiEye } from "react-icons/fi";



const ListaOrdenesFabricacion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrden, setExpandedOrden] = useState(null);
  const [mostrarFormularioAvance, setMostrarFormularioAvance] = useState(null);
  const navigate = useNavigate();
  const [formularios, setFormularios] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [articulosPorOrden, setArticulosPorOrden] = useState({});
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [etapasDisponiblesPorOrden, setEtapasDisponiblesPorOrden] = useState(
    {}
  );
  
  const [etapasDisponibles, setEtapasDisponibles] = useState({});

  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        const res = await api.get("/trabajadores");
        const opciones = res.data.map((trab) => ({
          value: trab.id_trabajador,
          label: trab.nombre,
        }));
        setTrabajadores(opciones);
      } catch (error) {
        console.error("Error al cargar trabajadores", error);
        toast.error("Error al cargar trabajadores");
      }
    };
    fetchTrabajadores();
  }, []);

  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const res = await api.get("/articulos");
        const opciones = res.data.map((art) => ({
          value: art.id_articulo,
          label: art.descripcion,
        }));
        setArticulos(opciones);
      } catch (error) {
        console.error("Error al cargar articulos", error);
        toast.error("Error al cargar articulos");
      }
    };
    fetchArticulos();
  }, []);

  useEffect(() => {
    const cargarArticulosOrden = async () => {
      const nuevosDatos = {};
      for (const orden of ordenes) {
        try {
          const res = await api.get(
            `/detalle-ordenF/${orden.id_orden_fabricacion}`
          );
          nuevosDatos[orden.id_orden_fabricacion] = res.data.map((item) => ({
            value: item.id_articulo,
            label: item.descripcion,
          }));
        } catch (error) {
          console.error("Error al cargar artículos de la orden:", error);
        }
      }
      setArticulosPorOrden(nuevosDatos);
    };

    if (ordenes.length > 0) cargarArticulosOrden();
  }, [ordenes]);

  const actualizarFormulario = (idOrden, campo, valor) => {
    setFormularios((prev) => ({
      ...prev,
      [idOrden]: {
        ...prev[idOrden],
        [campo]: valor,
      },
      
    }));
    
  };

  useEffect(() => {
    const cargarEtapasPorOrdenYArticulo = async () => {
      for (const orden of ordenes) {
        const formulario = formularios[orden.id_orden_fabricacion];
        const idOrden = orden.id_orden_fabricacion;
        const idArticulo = formulario?.articulo;

        if (!idArticulo) continue;

        try {
          const res = await api.get(
            `/avances-etapa/completadas/${idOrden}/${idArticulo}`
          );
          const etapasCompletadas = res.data;

          const disponibles = etapas.filter(
            (et) => !etapasCompletadas.includes(et.value)
          );

          setEtapasDisponiblesPorOrden((prev) => ({
            ...prev,
            [idOrden]: disponibles,
          }));
        } catch (error) {
          console.error("Error al cargar etapas completadas:", error);
          toast.error("Error al filtrar etapas");
        }
      }
    };

    if (ordenes.length > 0 && etapas.length > 0) {
      cargarEtapasPorOrdenYArticulo();
    }
  }, [formularios, etapas, ordenes]);

  useEffect(() => {
    const cargarEtapasDisponibles = async () => {
      for (const orden of ordenes) {
        const idOrden = orden.id_orden_fabricacion;
        const idArticulo = formularios[idOrden]?.articulo;

        if (!idArticulo) continue;

        try {
          const res = await api.get(
            `/avances-etapa/completadas/${idOrden}/${idArticulo}`
          );
          const etapasCompletadas = res.data;
          const disponibles = etapas.filter(
            (et) => !etapasCompletadas.includes(et.value)
          );

          setEtapasDisponibles((prev) => ({
            ...prev,
            [idOrden]: disponibles,
          }));
        } catch (error) {
          console.error("Error al cargar etapas no completadas", error);
        }
      }
    };

    cargarEtapasDisponibles();
  }, [ordenes, formularios, etapas]);

  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        const res = await api.get("/etapas-produccion");

        const opciones = res.data.map((etp) => ({
          value: etp.id_etapa,
          label: etp.nombre,
        }));
        setEtapas(opciones);
      } catch (error) {
        console.error("Error al cargar etapas", error);
        toast.error("Error al cargar etapas");
      }
    };
    fetchEtapas();
  }, []);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const cargarOrdenes = async () => {
    try {
      const res = await api.get("/ordenes-fabricacion");
      console.log("Órdenes desde backend:", res.data);
      setOrdenes(res.data);
    } catch (error) {
      console.error("Error cargando órdenes de fabricación", error);
    }
  };
  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        const endpoint = mostrarCanceladas
          ? "/ordenes-fabricacion?estados=cancelada"
          : "/ordenes-fabricacion?estados=pendiente,en proceso,completada";

        const res = await api.get(endpoint);
        console.log("Órdenes recibidas:", res.data);
        setOrdenes(res.data);
      } catch (error) {
        console.error("Error al cargar órdenes:", error);
        toast.error("Error al cargar órdenes");
      }
    };

    fetchOrdenes();
  }, [mostrarCanceladas]);

  const eliminarOrden = async (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que deseas eliminar esta orden de fabricación?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/ordenes-fabricacion/${id}`);
              toast.success("Orden eliminada");
              setOrdenes((prev) =>
                prev.filter((o) => o.id_orden_fabricacion !== id)
              );
            } catch (error) {
              console.error(
                "Error al eliminar",
                error.response?.data || error.message
              );
              toast.error(
                error.response?.data?.error ||
                  error.response?.data?.message ||
                  error.message
              );
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const toggleMostrarCanceladas = () => {
    setMostrarCanceladas((prev) => !prev);
  };

  const expandirOrden = async (id, forzar = false) => {
    if (expandedOrden === id && !forzar) {
      return setExpandedOrden(null);
    }

    const ordenActualizada = await api.get(`/ordenes-fabricacion/${id}`);
    const orden = ordenActualizada.data;

    try {
      // Siempre recarga detalles y avances
      const resDetalles = await api.get(`/detalle-ordenF/${id}`);
      const resAvances = await api.get(`/avances-etapa/${id}`);

      orden.detalles = resDetalles.data;
      orden.avances = resAvances.data;

      setOrdenes((prev) =>
        prev.map((o) =>
          o.id_orden_fabricacion === id ? { ...o, ...orden } : o
        )
      );

      setExpandedOrden(id);
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;

      toast.error(mensajeBackend);
    }
  };
  const ordenesFiltradas = ordenes.filter((o) =>
    o.estado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDetalles = (orden) => {
    if (!orden.detalles || orden.detalles.length === 0) {
      return <div>No hay detalles para mostrar.</div>;
    }
    console.log("orden detalles", orden.detalles);

    return (
      <table className="w-full text-sm border border-gray-300 mt-2 rounded">
        <thead>
          <tr className="bg-slate-300 text-gray-700">
            <th className="px-2 py-1 border">Artículo</th>
            <th className="px-2 py-1 border">Cantidad</th>
            <th className="px-2 py-1 border">Etapa final</th>
          </tr>
        </thead>
        <tbody>
          {orden.detalles.map((detalle, idx) => (
            <tr key={idx} className="hover:bg-slate-200">
              <td className="px-2 py-1 border">
                {detalle.descripcion || "N/A"}
              </td>
              <td className="px-2 py-1 border">{detalle.cantidad}</td>
              <td className="px-2 py-1 border">{detalle.nombre_etapa_final}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderAvancesPorArticulo = (orden) => {
    if (!orden.avances || orden.avances.length === 0) {
      return <div className="mt-4">No hay avances registrados.</div>;
    }

    const avancesPorArticulo = {};
    orden.avances.forEach((avance) => {
      if (!avancesPorArticulo[avance.id_articulo]) {
        avancesPorArticulo[avance.id_articulo] = [];
      }
      avancesPorArticulo[avance.id_articulo].push(avance);
    });

    return Object.entries(avancesPorArticulo).map(
      ([idArticulo, avances], idx) => (
        <div key={idx} className="mt-6">
          <h3 className="font-bold text-gray-800 mb-2">
            Artículo: {avances[0]?.descripcion || "Artículo desconocido"}
          </h3>

          <table className="w-full text-sm border border-gray-300 rounded">
            <thead>
              <tr className="bg-slate-300 text-gray-700">
                <th className="px-2 py-1 border">Etapa</th>
                <th className="px-2 py-1 border">Responsable</th>
                <th className="px-2 py-1 border">Cantidad</th>
                <th className="px-2 py-1 border">Costo de fabricacion</th>
                <th className="px-2 py-1 border">Estado</th>
                <th className="px-2 py-1 border">Fecha</th>
                <th className="px-2 py-1 border">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {avances.map((avance, idx2) => (
                <tr key={idx2} className="hover:bg-slate-200">
                  <td className="px-2 py-1 border">{avance.nombre || "N/A"}</td>
                  <td className="px-2 py-1 border">
                    {avance.nombre_trabajador || "N/A"}
                  </td>
                  <td className="px-2 py-1 border">{avance.cantidad}</td>
                  <td className="px-2 py-1 border">
                    ${avance.costo_fabricacion}
                  </td>
                  <td className="px-2 py-1 border">{avance.estado}</td>
                  <td className="px-2 py-1 border">
                    {avance.fecha_registro
                      ? new Date(avance.fecha_registro).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td className="px-2 py-1 border">
                    {avance.observaciones || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    );
  };

  const manejarRegistroAvance = async (idOrden, formulario) => {
    if (!formulario) {
      toast.error("Formulario no inicializado.");
      return;
    }

    try {
      const {
        articulo,
        etapa,
        trabajador,
        estado,
        cantidad,
        observaciones,
        costo_fabricacion,
      } = formulario;

      const datos = {
        id_orden_fabricacion: parseInt(idOrden),
        id_articulo: articulo ? parseInt(articulo) : null,
        id_etapa_produccion: etapa ? parseInt(etapa) : null,
        id_trabajador: trabajador ? parseInt(trabajador) : null,
        estado,
        cantidad: cantidad ? parseInt(cantidad) : null,
        observaciones: observaciones || "",
        costo_fabricacion: costo_fabricacion
          ? parseInt(costo_fabricacion)
          : null,
      };

      if (
        !articulo ||
        !etapa ||
        !trabajador ||
        !cantidad ||
        isNaN(parseInt(etapa)) ||
        !costo_fabricacion
      ) {
        toast.error("Por favor completa todos los campos obligatorios.");
        return;
      }
      console.log("Formulario a enviar:", datos);

      await api.post("/avances-etapa", datos);
      await cargarOrdenes();

      toast.success("Avance registrado correctamente");
      await expandirOrden(idOrden);

      await expandirOrden(idOrden, true);
      setMostrarFormularioAvance(null);
    setFormularios((prev) => ({
  ...prev,
  [idOrden]: {
    ...prev[idOrden],
    articulo: "",
    etapa: "",
    trabajador: "",
    estado: "",
    cantidad: "",
    observaciones: "",

  },
}));
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al registrar avance.";

      toast.error(mensajeBackend);
      console.error("Error al registrar avance:", error);
    }
  };

const yaConsultadoCosto = useRef({});
const historialCostos = useRef({});
const costoManualEditado = useRef({}); // saber si ya fue modificado manualmente

useEffect(() => {
  const cargarCostoAnterior = async () => {
    for (const [idOrden, formulario] of Object.entries(formularios)) {
      const { articulo, etapa } = formulario || {};
      if (!articulo || !etapa) continue;

      const clave = `${idOrden}-${articulo}-${etapa}`;

      // Si ya fue consultado antes
      if (yaConsultadoCosto.current[clave]) {
        const costoGuardado = historialCostos.current[clave];
        if (costoGuardado !== undefined && !costoManualEditado.current[clave]) {
          setFormularios((prev) => ({
            ...prev,
            [idOrden]: {
              ...prev[idOrden],
              costo_fabricacion: costoGuardado,
            },
          }));
        }
        continue;
      }

      try {
        const res = await api.get(`/avances-etapa/costo-anterior/${articulo}/${etapa}`);
        const costo = res.data?.costo_fabricacion ?? null;

        console.log(` Backend respondió para artículo ${articulo}, etapa ${etapa}:`, costo);

        yaConsultadoCosto.current[clave] = true;
        historialCostos.current[clave] = costo;

        if (costo !== null && !costoManualEditado.current[clave]) {
          setFormularios((prev) => ({
            ...prev,
            [idOrden]: {
              ...prev[idOrden],
              costo_fabricacion: costo,
            },
          }));
        }
      } catch (error) {
        console.error(" Error al cargar costo anterior:", error);
      }
    }
  };

  cargarCostoAnterior();
}, [formularios]);




  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <h2 className="text-4xl font-bold text-gray-800 p-4">
          Órdenes de fabricación
        </h2>
      <div className="flex flex-col md:flex-row justify-end items-center mb-6 gap-4 m-5">
        

        <div className="flex flex-wrap gap-4  w-full  items-center ">
          <input
            type="text"
            placeholder="Buscar por estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-500 rounded-md px-4 py-2  focus:ring-slate-600 h-[42px] flex-grow"
          />
          <button
            onClick={() => navigate("/ordenes_fabricacion/nuevo")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiPlus size={20} />
            Crear orden
          </button>

          <button
            onClick={() => navigate("/etapas_produccion")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiPlus size={20} />
            Nueva etapa
          </button>
          <button
            onClick={() => navigate("/lotes_fabricados")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
       
            Lotes fabricados
          </button>
            <button
            onClick={() => navigate("/avances_fabricacion")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            
            Avances de fabricacion
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
            onClick={() => navigate("/ordenes")}
            className="bg-gray-300 hover:bg-gray-400 text-slate-800 px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Fecha inicio</th>
              <th className="px-4 py-3">Fecha fin estimada</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Orden de pedido</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ordenesFiltradas.length > 0 ? (
              ordenesFiltradas.map((orden) => (
                <React.Fragment key={orden.id_orden_fabricacion}>
                  <tr
                    className={`cursor-pointer transition select-none ${
                      expandedOrden === orden.id_orden_fabricacion
                        ? "bg-slate-300"
                        : "hover:bg-slate-300"
                    }`}
                    onClick={() => expandirOrden(orden.id_orden_fabricacion)}
                    onDoubleClick={() =>
                      navigate(
                        `/ordenes_fabricacion/editar/${orden.id_orden_fabricacion}`
                      )
                    }
                    title="Click para ver detalles, doble click para editar"
                  >
                    <td className="px-4 py-2">{orden.id_orden_fabricacion}</td>
                    <td className="px-4 py-2">
                      {new Date(orden.fecha_inicio).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      {orden.fecha_fin_estimada
                        ? new Date(
                            orden.fecha_fin_estimada
                          ).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 capitalize">{orden.estado}</td>
                    <td className="px-4 py-2">
                      {orden.nombre_cliente
                        ? `#${orden.id_pedido} - ${orden.nombre_cliente}`
                        : orden.id_pedido
                        ? `#${orden.id_pedido}`
                        : "No asociada"}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          eliminarOrden(orden.id_orden_fabricacion);
                        }}
                        className="text-red-600 hover:text-red-400 transition"
                        title="Eliminar orden"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                  {expandedOrden === orden.id_orden_fabricacion && (
                    <tr>
                      <td
                        colSpan="6"
                        className="bg-gray-100 px-6 py-4 border-b"
                      >
                        <div className="mb-2 font-semibold text-slate-700">
                          Detalles de la orden:
                        </div>
                        {renderDetalles(orden)}
                        {renderAvancesPorArticulo(orden)}
                        <button
                          onClick={() =>
                            setMostrarFormularioAvance(
                              mostrarFormularioAvance ===
                                orden.id_orden_fabricacion
                                ? null
                                : orden.id_orden_fabricacion
                            )
                          }
                          className="mt-4 text-slate-700 flex items-center gap-2 hover:underline cursor-pointer"
                        >
                          <FiPlus /> Registrar nuevo avance
                        </button>

                        {mostrarFormularioAvance ===
                          orden.id_orden_fabricacion && (
                          <div className="mt-4 p-4 border rounded-lg bg-white shadow">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                manejarRegistroAvance(
                                  orden.id_orden_fabricacion,
                                  formularios[orden.id_orden_fabricacion]
                                );
                                console.log(
                                  formularios[orden.id_orden_fabricacion]
                                );
                              }}
                              className="mt-4 space-y-3 bg-white rounded-xl p-4 border border-slate-300"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <select
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.articulo || ""
                                  }
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "articulo",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="border rounded px-2 py-1"
                                >
                                  <option value="">
                                    Selecciona el artículo
                                  </option>
                                  {(
                                    articulosPorOrden[
                                      orden.id_orden_fabricacion
                                    ] || []
                                  ).map((art) => (
                                    <option key={art.value} value={art.value}>
                                      {art.label}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.etapa || ""
                                  }
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "etapa",
                                      Number(e.target.value)
                                    )
                                  }
                                  className="border rounded px-2 py-1"
                                >
                                  <option value="">Selecciona etapa</option>
                                  {(
                                    etapasDisponibles[
                                      orden.id_orden_fabricacion
                                    ] || []
                                  ).map((etapa) => (
                                    <option
                                      key={etapa.value}
                                      value={etapa.value}
                                    >
                                      {etapa.label}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.trabajador || ""
                                  }
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "trabajador",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1"
                                >
                                  <option value="">
                                    Selecciona trabajador
                                  </option>
                                  {trabajadores.map((trab) => (
                                    <option key={trab.value} value={trab.value}>
                                      {trab.label}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  placeholder="Cantidad"
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "cantidad",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1"
                                />
                            <input
  type="number"
  placeholder="Costo de fabricación"
  value={formularios[orden.id_orden_fabricacion]?.costo_fabricacion || ""}
  onChange={(e) => {
    const valor = e.target.value;
    const clave = `${orden.id_orden_fabricacion}-${formularios[orden.id_orden_fabricacion]?.articulo}-${formularios[orden.id_orden_fabricacion]?.etapa}`;
    
    // Marca que el usuario ha editado este campo
    costoManualEditado.current[clave] = true;

    actualizarFormulario(
      orden.id_orden_fabricacion,
      "costo_fabricacion",
      valor
    );
  }}
  className="border rounded px-2 py-1"
/>

                                <input
                                  type="text"
                                  placeholder="Observaciones"
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.observaciones || ""
                                  }
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "observaciones",
                                      e.target.value
                                    )
                                  }
                                  className="border rounded px-2 py-1"
                                />
                              </div>
                              <button
                                type="submit"
                                className="mt-2 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600"
                              >
                                Registrar avance
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  No se encontraron órdenes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaOrdenesFabricacion;
