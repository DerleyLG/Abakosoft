import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import {
  FiTrash2,
  FiPlus,
  FiArrowLeft,
  FiArrowUp,
  FiArrowRight,
} from "react-icons/fi";

const ListaOrdenesFabricacion = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrden, setExpandedOrden] = useState(null);
  const [mostrarFormularioAvance, setMostrarFormularioAvance] = useState(null);
  const navigate = useNavigate();
  const [formularios, setFormularios] = useState({});
  const [etapas, setEtapas] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [mostrarCanceladas, setMostrarCanceladas] = useState(false);
  const [articulosPendientesPorOrden, setArticulosPendientesPorOrden] =
    useState({});
  const [etapasDisponibles, setEtapasDisponibles] = useState({});
  const [trabajadoresDisponibles, setTrabajadoresDisponibles] = useState({});

  const yaConsultadoCosto = useRef({});
  const historialCostos = useRef({});
  const costoManualEditado = useRef({});

  // Carga los datos estáticos al montar el componente
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resTrabajadores, resEtapas] = await Promise.all([
          api.get("/trabajadores"),
          api.get("/etapas-produccion"),
        ]);
        setTrabajadores(
          resTrabajadores.data.map((trab) => ({
            value: trab.id_trabajador,
            label: trab.nombre,
            cargo: trab.cargo,
          }))
        );
        setEtapas(
          resEtapas.data.map((etp) => ({
            value: etp.id_etapa,
            label: etp.nombre,
            orden: etp.orden,
            cargo: etp.cargo,
          }))
        );
      } catch (error) {
        console.error("Error al cargar datos iniciales", error);
        toast.error("Error al cargar datos iniciales");
      }
    };
    fetchInitialData();
  }, []);

  // Carga las órdenes de fabricación al cambiar el estado de `mostrarCanceladas`
  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        const endpoint = mostrarCanceladas
          ? "/ordenes-fabricacion?estados=cancelada"
          : "/ordenes-fabricacion?estados=pendiente,en proceso,completada";
        const res = await api.get(endpoint);

        // Establece las órdenes en el estado
        setOrdenes(res.data);

        //  Calcula y establece los artículos pendientes para la carga inicial
        const nuevosArticulosPendientes = {};
        res.data.forEach((orden) => {
          // Parsea los arrays JSON de forma segura
          const detallesEnOrden = Array.isArray(orden.detalles)
            ? orden.detalles
            : JSON.parse(orden.detalles || "[]");
          const avancesDeLaOrden = Array.isArray(orden.avances)
            ? orden.avances
            : JSON.parse(orden.avances || "[]");

          const articulosFiltrados = detallesEnOrden.filter((articulo) => {
            const cantidadAvanzadaEnEtapaFinal = avancesDeLaOrden
              .filter(
                (avance) =>
                  avance.id_articulo === articulo.id_articulo &&
                  avance.id_etapa_produccion === articulo.id_etapa_final
              )
              .reduce((sum, avance) => sum + avance.cantidad, 0);
            return cantidadAvanzadaEnEtapaFinal < articulo.cantidad;
          });

          nuevosArticulosPendientes[orden.id_orden_fabricacion] =
            articulosFiltrados.map((art) => ({
              value: art.id_articulo,
              label: art.descripcion,
              cantidadRequerida: art.cantidad,
              idEtapaFinal: art.id_etapa_final,
            }));
        });
        setArticulosPendientesPorOrden(nuevosArticulosPendientes);
      } catch (error) {
        console.error("Error al cargar órdenes:", error);
        toast.error("Error al cargar órdenes");
      }
    };
    fetchOrdenes();
  }, [mostrarCanceladas]);

  // Carga el costo de fabricación anterior cuando cambian los formularios
  useEffect(() => {
    const cargarCostoAnterior = async () => {
      for (const [idOrden, formulario] of Object.entries(formularios)) {
        const {
          articulo,
          etapa,
          costo_fabricacion: costoActual,
        } = formulario || {};
        if (!articulo || !etapa) continue;

        const clave = `${idOrden}-${articulo}-${etapa}`;

        if (yaConsultadoCosto.current[clave]) {
          const costoGuardado = historialCostos.current[clave];
          if (
            costoGuardado !== undefined &&
            !costoManualEditado.current[clave]
          ) {
            if (costoActual !== costoGuardado) {
              setFormularios((prev) => ({
                ...prev,
                [idOrden]: {
                  ...prev[idOrden],
                  costo_fabricacion: costoGuardado,
                },
              }));
            }
          }
          continue;
        }

        try {
          const res = await api.get(
            `/avances-etapa/costo-anterior/${articulo}/${etapa}`
          );
          const costo = res.data?.costo_fabricacion ?? null;
          yaConsultadoCosto.current[clave] = true;
          historialCostos.current[clave] = costo;

          if (costo !== null && !costoManualEditado.current[clave]) {
            if (costoActual !== costo) {
              setFormularios((prev) => ({
                ...prev,
                [idOrden]: {
                  ...prev[idOrden],
                  costo_fabricacion: costo,
                },
              }));
            }
          }
        } catch (error) {
          console.error("Error al cargar costo anterior:", error);
        }
      }
    };
    cargarCostoAnterior();
  }, [formularios]);

  const actualizarFormulario = (idOrden, campo, valor) => {
    setFormularios((prev) => ({
      ...prev,
      [idOrden]: {
        ...prev[idOrden],
        [campo]: valor,
      },
    }));

    if (campo === "articulo") {
      const ordenSeleccionada = ordenes.find(
        (o) => o.id_orden_fabricacion === idOrden
      );
      if (!ordenSeleccionada) return;

      const articuloSeleccionado = ordenSeleccionada.detalles.find(
        (art) => art.id_articulo === Number(valor)
      );
      if (!articuloSeleccionado) return;

      const cantidadTotalRequerida = articuloSeleccionado.cantidad;
      const idEtapaFinal = articuloSeleccionado.id_etapa_final;
      const avancesPorEtapa = (ordenSeleccionada.avances || [])
        .filter((avance) => avance.id_articulo === Number(valor))
        .reduce((acc, avance) => {
          acc[avance.id_etapa_produccion] =
            (acc[avance.id_etapa_produccion] || 0) + avance.cantidad;
          return acc;
        }, {});

      const etapasDisponiblesParaArticulo = [];
      const etapasOrdenadas = etapas.sort((a, b) => a.orden - b.orden);

      for (const etapa of etapasOrdenadas) {
        // Verifica si la etapa está en el proceso de producción del artículo
        if (
          etapa.orden <= etapas.find((e) => e.value === idEtapaFinal)?.orden
        ) {
          const cantidadAvanzadaEnEstaEtapa = avancesPorEtapa[etapa.value] || 0;
          // Si la cantidad avanzada en esta etapa es MENOR que la cantidad total
          // requerida, la etapa está disponible.
          if (cantidadAvanzadaEnEstaEtapa < cantidadTotalRequerida) {
            etapasDisponiblesParaArticulo.push(etapa);
          }
        }
      }
      setEtapasDisponibles((prev) => ({
        ...prev,
        [idOrden]: etapasDisponiblesParaArticulo,
      }));
      // Restablecer la etapa y el trabajador
      setFormularios((prev) => ({
        ...prev,
        [idOrden]: {
          ...prev[idOrden],
          etapa: null,
          trabajador: null,
        },
      }));
    } else if (campo === "etapa") {
      const etapaSeleccionada = etapas.find((et) => et.value === Number(valor));
      const nombreCargoEtapa = etapaSeleccionada?.cargo;

      const trabajadoresFiltrados = trabajadores.filter(
        (trab) =>
          trab.cargo &&
          nombreCargoEtapa &&
          trab.cargo.toLowerCase().trim() ===
            nombreCargoEtapa.toLowerCase().trim()
      );

      setTrabajadoresDisponibles((prev) => ({
        ...prev,
        [idOrden]: trabajadoresFiltrados,
      }));

      setFormularios((prev) => ({
        ...prev,
        [idOrden]: {
          ...prev[idOrden],
          trabajador: null,
        },
      }));
    } else if (campo === "cantidad") {
      const cantidadIngresada = Number(valor);
      const { articulo, etapa } = formularios[idOrden] || {};
      const ordenSeleccionada = ordenes.find(
        (o) => o.id_orden_fabricacion === idOrden
      );

      if (ordenSeleccionada && articulo && etapa) {
        const cantidadTotalRequerida = ordenSeleccionada.detalles.find(
          (art) => art.id_articulo === Number(articulo)
        )?.cantidad;

        const avancesExistentes = ordenSeleccionada.avances
          .filter(
            (avance) =>
              avance.id_articulo === Number(articulo) &&
              avance.id_etapa_produccion === Number(etapa)
          )
          .reduce((sum, avance) => sum + avance.cantidad, 0);

        if (avancesExistentes + cantidadIngresada > cantidadTotalRequerida) {
          toast.error(
            `La cantidad total de esta etapa no puede exceder las ${cantidadTotalRequerida} unidades.`
          );
          setFormularios((prev) => ({
            ...prev,
            [idOrden]: {
              ...prev[idOrden],
              cantidad: cantidadTotalRequerida - avancesExistentes,
            },
          }));
        }
      }
    }
  };

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

  const expandirOrden = (id) => {
    setExpandedOrden((prevId) => (prevId === id ? null : id));
  };

  const ordenesFiltradas = ordenes.filter((o) =>
    o.estado?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderDetalles = (orden) => {
    if (!orden.detalles || orden.detalles.length === 0) {
      return <div>No hay detalles para mostrar.</div>;
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden mt-2">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="px-2 py-2 border-b border-gray-300">Artículo</th>
              <th className="px-2 py-2 border-b border-gray-300">Cantidad</th>
              <th className="px-2 py-2 border-b border-gray-300">
                Etapa final
              </th>
            </tr>
          </thead>
          <tbody>
            {orden.detalles.map((detalle, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-2 py-2 border-b border-gray-300">
                  {detalle.descripcion || "N/A"}
                </td>
                <td className="px-2 py-2 border-b border-gray-300">
                  {detalle.cantidad}
                </td>
                <td className="px-2 py-2 border-b border-gray-300">
                  {detalle.nombre_etapa_final}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAvancesPorArticulo = (orden) => {
    if (!orden.avances || orden.avances.length === 0) {
      return <div className="mt-4">No hay avances registrados.</div>;
    }

    const avancesPorArticulo = {};
    orden.avances.forEach((avance) => {
      // Intenta encontrar la descripción del artículo desde los detalles de la orden
      const articuloAsociado = orden.detalles.find(
        (det) => det.id_articulo === avance.id_articulo
      );
      const nombreEtapa = etapas.find(
        (etp) => etp.value === avance.id_etapa_produccion
      )?.label;
      const nombreTrabajador = trabajadores.find(
        (trab) => trab.value === avance.id_trabajador
      )?.label;

      if (!avancesPorArticulo[avance.id_articulo]) {
        avancesPorArticulo[avance.id_articulo] = {
          descripcion: articuloAsociado?.descripcion || "Artículo desconocido",
          avances: [],
        };
      }

      avancesPorArticulo[avance.id_articulo].avances.push({
        ...avance,
        nombre_etapa: nombreEtapa,
        nombre_trabajador: nombreTrabajador,
      });
    });

    return (
      <>
        {Object.entries(avancesPorArticulo).map(([idArticulo, data], idx) => (
          <div key={idx} className="mt-6">
            <h3 className="font-bold text-gray-800 mb-2">
              Artículo: {data.descripcion}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden">
                <thead className="bg-gray-200 text-gray-700">
                  <tr>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Etapa
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Responsable
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Cantidad
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Costo de fabricación
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Estado
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Observaciones
                    </th>
                    <th className="px-2 py-2 border-b border-gray-300">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.avances.map((avance, idx2) => (
                    <tr key={idx2} className="hover:bg-gray-50">
                      <td className="px-2 py-2 border-b border-gray-300">
                        {avance.nombre_etapa || "N/A"}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        {avance.nombre_trabajador || "N/A"}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        {avance.cantidad}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        ${avance.costo_fabricacion}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        {avance.estado || "-"}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        {avance.observaciones || "-"}
                      </td>
                      <td className="px-2 py-2 border-b border-gray-300">
                        {new Date(avance.fecha_registro).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <button
          onClick={() => setExpandedOrden(null)}
          className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 flex items-center gap-2 cursor-pointer"
        >
          <FiArrowUp /> Cerrar Avances
        </button>
      </>
    );
  };

  const manejarRegistroAvance = async (idOrden, formulario) => {
    if (!formulario) {
      toast.error("Formulario vacío");
      return;
    }
    try {
      const {
        articulo,
        etapa,
        trabajador,
        cantidad,
        observaciones,
        costo_fabricacion,
      } = formulario;

      const datos = {
        id_orden_fabricacion: parseInt(idOrden),
        id_articulo: articulo ? parseInt(articulo) : null,
        id_etapa_produccion: etapa ? parseInt(etapa) : null,
        id_trabajador: trabajador ? parseInt(trabajador) : null,
        cantidad: cantidad ? parseInt(cantidad) : null,
        observaciones: observaciones || "",
        costo_fabricacion: costo_fabricacion
          ? parseFloat(costo_fabricacion)
          : null,
      };

      if (
        !articulo ||
        !etapa ||
        !trabajador ||
        !cantidad ||
        !costo_fabricacion
      ) {
        toast.error("Por favor completa todos los campos obligatorios.");
        return;
      }

      // Envía el avance.
      await api.post("/avances-etapa", datos);

      // Obtiene los datos de la orden actualizada.
      const res = await api.get(`/ordenes-fabricacion/${idOrden}`);
      const updatedOrden = res.data;

      // Procesa los datos de forma segura.
      updatedOrden.detalles =
        typeof updatedOrden.detalles === "string"
          ? JSON.parse(updatedOrden.detalles)
          : updatedOrden.detalles || [];

      updatedOrden.avances =
        typeof updatedOrden.avances === "string"
          ? JSON.parse(updatedOrden.avances)
          : updatedOrden.avances || [];

      // Calcula la nueva lista de artículos pendientes para la orden actualizada.
      const articulosPendientes = updatedOrden.detalles
        .filter((articulo) => {
          const cantidadAvanzadaEnEtapaFinal = updatedOrden.avances
            .filter(
              (avance) =>
                avance.id_articulo === articulo.id_articulo &&
                avance.id_etapa_produccion === articulo.id_etapa_final
            )
            .reduce((sum, avance) => sum + avance.cantidad, 0);
          return cantidadAvanzadaEnEtapaFinal < articulo.cantidad;
        })
        .map((art) => ({
          value: art.id_articulo,
          label: art.descripcion,
          cantidadRequerida: art.cantidad,
          idEtapaFinal: art.id_etapa_final,
        }));

      // Actualiza el estado de las órdenes y los artículos pendientes.
      setOrdenes((prevOrdenes) =>
        prevOrdenes.map((o) =>
          o.id_orden_fabricacion === idOrden ? updatedOrden : o
        )
      );

      setArticulosPendientesPorOrden((prev) => ({
        ...prev,
        [idOrden]: articulosPendientes,
      }));

      toast.success("Avance registrado");

      setExpandedOrden(idOrden);
      setMostrarFormularioAvance(null);
      setFormularios((prev) => ({
        ...prev,
        [idOrden]: {},
      }));
    } catch (error) {
      const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Error al registrar avance.";
      toast.error(mensajeBackend);
      console.error("Error al manejar el avance:", error);
    }
  };
  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <h2 className="text-4xl font-bold text-gray-800 p-4">
        Órdenes de fabricación
      </h2>
      <div className="flex flex-col md:flex-row justify-end items-center mb-6 gap-4 m-5">
        <div className="flex flex-wrap gap-4 w-full items-center">
          <input
            type="text"
            placeholder="Buscar por estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-500 rounded-md px-4 py-2 focus:ring-slate-600 h-[42px] flex-grow"
          />
          <button
            onClick={() => navigate("/ordenes_fabricacion/nuevo")}
            className="bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiPlus size={20} /> Crear orden
          </button>
          <button
            onClick={() => navigate("/etapas_produccion")}
            className="bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiPlus size={20} /> Nueva etapa
          </button>
          <button
            onClick={() => navigate("/lotes_fabricados")}
            className="bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiArrowRight /> Lotes fabricados
          </button>
          <button
            onClick={() => navigate("/avances_fabricacion")}
            className="bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiArrowRight /> Avances de fabricacion
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
            className="bg-gray-300 hover:bg-gray-400 text-slate-800 px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            <FiArrowLeft /> Volver
          </button>
        </div>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
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
                        ? "bg-gray-200"
                        : "hover:bg-gray-200"
                    }`}
                    onClick={() => expandirOrden(orden.id_orden_fabricacion)}
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
                        className="text-red-600 hover:text-red-400 transition cursor-pointer"
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
                            setMostrarFormularioAvance((prev) =>
                              prev === orden.id_orden_fabricacion
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
                          <div className="mt-4 p-4 rounded-md bg-white shadow border border-slate-200">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                manejarRegistroAvance(
                                  orden.id_orden_fabricacion,
                                  formularios[orden.id_orden_fabricacion]
                                );
                              }}
                              className="mt-4 space-y-3 bg-white rounded-xl p-4 border border-slate-200"
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
                                  className="border rounded px-2 py-1 border-slate-300 p-5"
                                >
                                  <option value="">
                                    Selecciona el artículo
                                  </option>
                                  {(
                                    articulosPendientesPorOrden[
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
                                  className="border rounded px-2 py-1 border-slate-300 p-5"
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
                                      Number(e.target.value)
                                    )
                                  }
                                  className="border rounded px-2 py-1 border-slate-300 p-5"
                                >
                                  <option value="">
                                    Selecciona trabajador
                                  </option>
                                  {(
                                    trabajadoresDisponibles[
                                      orden.id_orden_fabricacion
                                    ] || []
                                  ).map((trab) => (
                                    <option key={trab.value} value={trab.value}>
                                      {trab.label}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  placeholder="Cantidad"
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.cantidad || ""
                                  }
                                  onChange={(e) =>
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "cantidad",
                                      e.target.value
                                    )
                                  }
                                   className="border rounded px-2 py-1 border-slate-300 p-5 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                                />
                                <input
                                  type="number"
                                  placeholder="Costo de fabricación unitario"
                                  value={
                                    formularios[orden.id_orden_fabricacion]
                                      ?.costo_fabricacion || ""
                                  }
                                  onChange={(e) => {
                                    const valor = e.target.value;
                                    const clave = `${
                                      orden.id_orden_fabricacion
                                    }-${
                                      formularios[orden.id_orden_fabricacion]
                                        ?.articulo
                                    }-${
                                      formularios[orden.id_orden_fabricacion]
                                        ?.etapa
                                    }`;
                                    costoManualEditado.current[clave] = true;
                                    actualizarFormulario(
                                      orden.id_orden_fabricacion,
                                      "costo_fabricacion",
                                      valor
                                    );
                                  }}
                                  className="border rounded px-2 py-1 border-slate-300 p-5 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
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
                                  className="border rounded px-2 py-1 border-slate-300 p-5"
                                />
                              </div>
                              <div className="flex justify-end gap-2 mt-4">
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 cursor-pointer"
                                >
                                  Registrar avance
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setMostrarFormularioAvance(null)
                                  }
                                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 cursor-pointer"
                                >
                                  Cerrar
                                </button>
                              </div>
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
