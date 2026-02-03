import React, { useState, useEffect, useRef, useMemo } from "react";
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
  FiEdit,
  FiX,
  FiTrendingUp,
  FiBox,
  FiEye,
  FiEyeOff,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import ProrrateoButton from "../components/ProrrateoButton";
import { can, ACTIONS } from "../utils/permissions";
import ConsumoMateriaPrimaDrawer from "../components/ConsumoMateriaPrimaDrawer";

const ListaOrdenesFabricacion = () => {
  const [showModalConsumo, setShowModalConsumo] = useState(false);
  const formatCOP = (number) => {
    const n = Number(number) || 0;
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const cleanCOPFormat = (formattedValue) => {
    if (formattedValue === null || formattedValue === undefined) return 0;
    const s = String(formattedValue);
    const onlyNums = s.replace(/[^0-9]/g, "");
    return parseInt(onlyNums, 10) || 0;
  };
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
  const [filtroEstadoActivas, setFiltroEstadoActivas] = useState("todas");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.FABRICATION_CREATE);
  const canDelete = can(role, ACTIONS.FABRICATION_DELETE);
  const yaConsultadoCosto = useRef({});
  const historialCostos = useRef({});
  const formularioAvanceRef = useRef(null);
  const costoManualEditado = useRef({});
  const [editandoCosto, setEditandoCosto] = useState({});
  const [editandoAvanceCosto, setEditandoAvanceCosto] = useState({});
  const [editandoAvanceResponsable, setEditandoAvanceResponsable] = useState(
    {},
  );
  const [drawerConsumo, setDrawerConsumo] = useState(false);

  const [articulosCatalogo, setArticulosCatalogo] = useState([]);
  const [articuloQuery, setArticuloQuery] = useState("");
  const [articuloSeleccion, setArticuloSeleccion] = useState(null);
  const [showSugArticulos, setShowSugArticulos] = useState(false);
  const articuloFilterRef = useRef(null);
  const sugerenciasArticulos = useMemo(() => {
    const q = (articuloQuery || "").trim().toLowerCase();
    if (!q) return articulosCatalogo.slice(0, 8);
    return articulosCatalogo
      .filter((a) => (a.label || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [articuloQuery, articulosCatalogo]);

  const esOrdenCompletada = (estado) =>
    typeof estado === "string" && estado.toLowerCase().trim() === "completada";

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resTrabajadores, resEtapas, resArticulos] = await Promise.all([
          api.get("/trabajadores"),
          api.get("/etapas-produccion"),
          api.get("/articulos", {
            params: {
              page: 1,
              pageSize: 10000,
              sortBy: "descripcion",
              sortDir: "asc",
            },
          }),
        ]);

        const articulosArr = Array.isArray(resArticulos.data?.data)
          ? resArticulos.data.data
          : [];

        setTrabajadores(
          resTrabajadores.data.map((trab) => ({
            value: trab.id_trabajador,
            label: trab.nombre,
            cargo: trab.cargo,
          })),
        );
        setEtapas(
          resEtapas.data.map((etp) => ({
            value: etp.id_etapa,
            label: etp.nombre,
            orden: etp.orden,
            cargo: etp.cargo,
          })),
        );

        const catalogoMapeado = articulosArr.map((a) => ({
          value: a.id_articulo,
          label: a.descripcion
            ? `${a.referencia || ""} - ${a.descripcion}`.trim()
            : a.referencia || `ID ${a.id_articulo}`,
        }));

        setArticulosCatalogo(catalogoMapeado);
      } catch (error) {
        console.error("Error al cargar datos iniciales", error);
        toast.error("Error al cargar datos iniciales");
      }
    };
    fetchInitialData();
  }, []);

  // Cerrar sugerencias cuando se haga clic fuera del filtro de artículos
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        articuloFilterRef.current &&
        !articuloFilterRef.current.contains(e.target)
      ) {
        setShowSugArticulos(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (mostrarFormularioAvance) {
      const ord = ordenes.find(
        (o) => o.id_orden_fabricacion === mostrarFormularioAvance,
      );
      if (ord && esOrdenCompletada(ord.estado)) {
        setMostrarFormularioAvance(null);
      }
    }
  }, [ordenes, mostrarFormularioAvance]);

  // Scroll y focus al formulario de avance cuando se abre
  useEffect(() => {
    if (mostrarFormularioAvance && formularioAvanceRef.current) {
      setTimeout(() => {
        formularioAvanceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        // Focus en el primer select del formulario
        const primerSelect =
          formularioAvanceRef.current?.querySelector("select");
        if (primerSelect) primerSelect.focus();
      }, 100);
    }
  }, [mostrarFormularioAvance]);

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        const params = { page, pageSize, sortBy: "id", sortDir: "desc" };
        if (mostrarCanceladas) {
          params.estados = "cancelada";
        } else if (filtroEstadoActivas !== "todas") {
          params.estados = filtroEstadoActivas;
        }
        // Si hay búsqueda por ID (empieza con #), enviarla al backend
        if (searchTerm && searchTerm.startsWith("#")) {
          params.buscar = searchTerm;
        }
        const res = await api.get("/ordenes-fabricacion", { params });
        const payload = res.data || {};
        const rows = Array.isArray(payload.data) ? payload.data : [];

        // Parsear detalles y avances de cada orden
        const ordenesProcesadas = rows.map((orden) => ({
          ...orden,
          detalles: Array.isArray(orden.detalles)
            ? orden.detalles
            : typeof orden.detalles === "string"
              ? (() => {
                  try {
                    return JSON.parse(orden.detalles);
                  } catch {
                    return [];
                  }
                })()
              : [],
          avances: Array.isArray(orden.avances)
            ? orden.avances
            : typeof orden.avances === "string"
              ? (() => {
                  try {
                    return JSON.parse(orden.avances);
                  } catch {
                    return [];
                  }
                })()
              : [],
        }));

        setOrdenes(ordenesProcesadas);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setHasNext(!!payload.hasNext);
        setHasPrev(!!payload.hasPrev);

        const nuevosArticulosPendientes = {};
        ordenesProcesadas.forEach((orden) => {
          const detallesEnOrden = orden.detalles;
          const avancesDeLaOrden = orden.avances;

          const articulosFiltrados = detallesEnOrden.filter((articulo) => {
            const cantidadAvanzadaEnEtapaFinal = avancesDeLaOrden
              .filter(
                (avance) =>
                  avance.id_articulo === articulo.id_articulo &&
                  avance.id_etapa_produccion === articulo.id_etapa_final,
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
      } finally {
        setLoading(false);
      }
    };
    fetchOrdenes();
  }, [mostrarCanceladas, filtroEstadoActivas, page, pageSize, searchTerm]);

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
            `/avance-etapas/costo-anterior/${articulo}/${etapa}`,
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
        (o) => o.id_orden_fabricacion === idOrden,
      );
      if (!ordenSeleccionada) return;

      const articuloSeleccionado = ordenSeleccionada.detalles.find(
        (art) => art.id_articulo === Number(valor),
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

      // Verificar si el artículo tiene etapas personalizadas
      const tieneEtapasPersonalizadas =
        articuloSeleccionado.etapas_personalizadas &&
        articuloSeleccionado.etapas_personalizadas.length > 0;

      if (tieneEtapasPersonalizadas) {
        // Usar solo las etapas personalizadas del artículo
        const etapasPersonalizadasOrdenadas = [
          ...articuloSeleccionado.etapas_personalizadas,
        ].sort((a, b) => a.orden - b.orden);

        for (const etapaPersonalizada of etapasPersonalizadasOrdenadas) {
          const etapaInfo = etapas.find(
            (e) => e.value === etapaPersonalizada.id_etapa,
          );
          if (etapaInfo) {
            const cantidadAvanzadaEnEstaEtapa =
              avancesPorEtapa[etapaInfo.value] || 0;
            if (cantidadAvanzadaEnEstaEtapa < cantidadTotalRequerida) {
              etapasDisponiblesParaArticulo.push(etapaInfo);
            }
          }
        }
      } else {
        // Usar el flujo estándar basado en orden de etapas
        const etapasOrdenadas = [...etapas].sort((a, b) => a.orden - b.orden);

        for (const etapa of etapasOrdenadas) {
          if (
            etapa.orden <= etapas.find((e) => e.value === idEtapaFinal)?.orden
          ) {
            const cantidadAvanzadaEnEstaEtapa =
              avancesPorEtapa[etapa.value] || 0;
            if (cantidadAvanzadaEnEstaEtapa < cantidadTotalRequerida) {
              etapasDisponiblesParaArticulo.push(etapa);
            }
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
            nombreCargoEtapa.toLowerCase().trim(),
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
        (o) => o.id_orden_fabricacion === idOrden,
      );

      if (ordenSeleccionada && articulo && etapa) {
        const cantidadTotalRequerida = ordenSeleccionada.detalles.find(
          (art) => art.id_articulo === Number(articulo),
        )?.cantidad;

        const avancesExistentes = ordenSeleccionada.avances
          .filter(
            (avance) =>
              avance.id_articulo === Number(articulo) &&
              avance.id_etapa_produccion === Number(etapa),
          )
          .reduce((sum, avance) => sum + avance.cantidad, 0);

        if (avancesExistentes + cantidadIngresada > cantidadTotalRequerida) {
          toast.error(
            `La cantidad total de esta etapa no puede exceder las ${cantidadTotalRequerida} unidades.`,
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
                prev.filter((o) => o.id_orden_fabricacion !== id),
              );
            } catch (error) {
              console.error(
                "Error al eliminar",
                error.response?.data || error.message,
              );
              toast.error(
                error.response?.data?.error ||
                  error.response?.data?.message ||
                  error.message,
              );
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const toggleMostrarCanceladas = () => {
    if (!mostrarCanceladas) {
      setFiltroEstadoActivas("todas");
    }
    setMostrarCanceladas((prev) => !prev);
    setExpandedOrden(null);
    setPage(1);
  };

  const handleFiltroEstadoChange = (e) => {
    setMostrarCanceladas(false);
    setFiltroEstadoActivas(e.target.value);
    setExpandedOrden(null);
    setPage(1);
  };

  const expandirOrden = (id) => {
    setExpandedOrden((prevId) => (prevId === id ? null : id));
  };

  const ordenesFiltradas = ordenes.filter((o) => {
    const estado = o.estado?.toLowerCase() || "";
    const cliente = o.nombre_cliente?.toLowerCase() || "";
    const fecha = o.fecha_inicio
      ? new Date(o.fecha_inicio).toLocaleDateString("es-CO", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "";

    // Si la búsqueda empieza con #, el filtrado se hace en el backend
    const term = searchTerm.startsWith("#") ? "" : searchTerm.toLowerCase();

    const coincideBusqueda =
      estado.includes(term) || cliente.includes(term) || fecha.includes(term);

    const coincideEstado =
      filtroEstadoActivas === "todas"
        ? true
        : estado === filtroEstadoActivas.toLowerCase();

    const coincideArticulo = articuloSeleccion
      ? o.detalles.some(
          (d) => Number(d.id_articulo) === Number(articuloSeleccion.value),
        )
      : true;

    return coincideBusqueda && coincideEstado && coincideArticulo;
  });

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

    const ordenCompletada = esOrdenCompletada(orden.estado);

    const avancesPorArticulo = {};
    orden.avances.forEach((avance) => {
      // Intenta encontrar la descripción del artículo desde los detalles de la orden
      const articuloAsociado = orden.detalles.find(
        (det) => det.id_articulo === avance.id_articulo,
      );
      const nombreEtapa = etapas.find(
        (etp) => String(etp.value) === String(avance.id_etapa_produccion),
      )?.label;
      const nombreTrabajador = trabajadores.find(
        (trab) => String(trab.value) === String(avance.id_trabajador),
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
                  {data.avances.map((avance, idx2) => {
                    const nombreCargoEtapa = etapas.find(
                      (et) =>
                        String(et.value) === String(avance.id_etapa_produccion),
                    )?.cargo;
                    const trabajadoresFiltrados = nombreCargoEtapa
                      ? trabajadores.filter(
                          (t) =>
                            t.cargo &&
                            String(t.cargo).toLowerCase().trim() ===
                              String(nombreCargoEtapa).toLowerCase().trim(),
                        )
                      : trabajadores;

                    return (
                      <tr key={idx2} className="hover:bg-gray-50">
                        <td className="px-2 py-2 border-b border-gray-300">
                          {avance.nombre_etapa || "N/A"}
                        </td>
                        <td className="px-2 py-2 border-b border-gray-300">
                          {ordenCompletada ? (
                            <div className="flex items-center gap-2">
                              <span>{avance.nombre_trabajador || "N/A"}</span>
                              <button
                                className="text-slate-300 cursor-not-allowed"
                                title="La orden está completada. No se puede editar el responsable."
                                disabled
                              >
                                <FiEdit />
                              </button>
                            </div>
                          ) : editandoAvanceResponsable?.[
                              avance.id_avance_etapa
                            ] !== undefined ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={
                                  editandoAvanceResponsable[
                                    avance.id_avance_etapa
                                  ]
                                }
                                onChange={(e) => {
                                  setEditandoAvanceResponsable((prev) => ({
                                    ...prev,
                                    [avance.id_avance_etapa]: e.target.value,
                                  }));
                                }}
                                className="border rounded px-2 py-1 border-slate-300"
                              >
                                <option value="">Selecciona responsable</option>
                                {trabajadoresFiltrados.map((trab) => (
                                  <option
                                    key={trab.value}
                                    value={String(trab.value)}
                                  >
                                    {trab.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                className="px-2 py-1 text-white bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"
                                onClick={async () => {
                                  const nuevoTrabajadorRaw =
                                    editandoAvanceResponsable[
                                      avance.id_avance_etapa
                                    ];
                                  if (
                                    nuevoTrabajadorRaw === undefined ||
                                    nuevoTrabajadorRaw === ""
                                  ) {
                                    toast.error(
                                      "Selecciona un responsable válido",
                                    );
                                    return;
                                  }
                                  const idTrabajadorNum =
                                    Number(nuevoTrabajadorRaw);
                                  if (
                                    !Number.isFinite(idTrabajadorNum) ||
                                    idTrabajadorNum <= 0
                                  ) {
                                    toast.error(
                                      "Selecciona un responsable válido",
                                    );
                                    return;
                                  }
                                  try {
                                    await api.put(
                                      `/avance-etapas/${avance.id_avance_etapa}/responsable`,
                                      { id_trabajador: idTrabajadorNum },
                                    );
                                    setOrdenes((prev) =>
                                      prev.map((o) => {
                                        if (
                                          o.id_orden_fabricacion !==
                                          orden.id_orden_fabricacion
                                        )
                                          return o;
                                        const avancesActualizados = (
                                          o.avances || []
                                        ).map((av) =>
                                          av.id_avance_etapa ===
                                          avance.id_avance_etapa
                                            ? {
                                                ...av,
                                                id_trabajador: idTrabajadorNum,
                                                nombre_trabajador:
                                                  (
                                                    trabajadores.find(
                                                      (t) =>
                                                        String(t.value) ===
                                                        String(
                                                          nuevoTrabajadorRaw,
                                                        ),
                                                    ) || {}
                                                  ).label ||
                                                  av.nombre_trabajador ||
                                                  "N/A",
                                              }
                                            : av,
                                        );
                                        return {
                                          ...o,
                                          avances: avancesActualizados,
                                        };
                                      }),
                                    );
                                    setEditandoAvanceResponsable((prev) => {
                                      const n = { ...prev };
                                      delete n[avance.id_avance_etapa];
                                      return n;
                                    });
                                    toast.success("Trabajador actualizado");
                                  } catch (error) {
                                    const msg =
                                      error?.response?.data?.error ||
                                      "No se pudo actualizar el responsable";
                                    toast.error(msg);
                                  }
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                className="px-2 py-1 text-slate-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
                                onClick={() =>
                                  setEditandoAvanceResponsable((prev) => {
                                    const n = { ...prev };
                                    delete n[avance.id_avance_etapa];
                                    return n;
                                  })
                                }
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>{avance.nombre_trabajador || "N/A"}</span>
                              {trabajadoresFiltrados.length === 0 ? (
                                <button
                                  className="text-gray-400 cursor-not-allowed"
                                  title="No hay trabajadores con el cargo requerido"
                                  disabled
                                >
                                  <FiEdit />
                                </button>
                              ) : (
                                <button
                                  className="text-slate-700 hover:text-slate-900 cursor-pointer"
                                  title="Editar responsable"
                                  onClick={() =>
                                    setEditandoAvanceResponsable((prev) => ({
                                      ...prev,
                                      [avance.id_avance_etapa]: String(
                                        avance.id_trabajador || "",
                                      ),
                                    }))
                                  }
                                >
                                  <FiEdit />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 border-b border-gray-300">
                          {avance.cantidad}
                        </td>
                        <td className="px-2 py-2 border-b border-gray-300">
                          {ordenCompletada ? (
                            <div className="flex items-center gap-2">
                              <span>
                                {formatCOP(Number(avance.costo_fabricacion))}
                              </span>
                              <button
                                className="text-slate-300 cursor-not-allowed"
                                title="La orden está completada. No se puede editar el costo."
                                disabled
                              >
                                <FiEdit />
                              </button>
                            </div>
                          ) : editandoAvanceCosto[avance.id_avance_etapa] !==
                            undefined ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={
                                  editandoAvanceCosto[avance.id_avance_etapa]
                                }
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (!raw || raw.trim() === "") {
                                    setEditandoAvanceCosto((prev) => ({
                                      ...prev,
                                      [avance.id_avance_etapa]: "",
                                    }));
                                    return;
                                  }
                                  const num = cleanCOPFormat(raw);
                                  setEditandoAvanceCosto((prev) => ({
                                    ...prev,
                                    [avance.id_avance_etapa]: formatCOP(num),
                                  }));
                                }}
                                className="border rounded px-2 py-1 border-slate-300"
                              />
                              <button
                                className="px-2 py-1 text-white bg-slate-700 rounded hover:bg-slate-600 cursor-pointer"
                                onClick={async () => {
                                  const formVal =
                                    editandoAvanceCosto[avance.id_avance_etapa];
                                  const num = cleanCOPFormat(formVal);
                                  if (!num || num <= 0) {
                                    toast.error("Ingresa un costo válido");
                                    return;
                                  }
                                  try {
                                    await api.put(
                                      `/avance-etapas/${avance.id_avance_etapa}/costo`,
                                      { costo_fabricacion: num },
                                    );
                                    // actualizar en memoria
                                    setOrdenes((prev) =>
                                      prev.map((o) => {
                                        if (
                                          o.id_orden_fabricacion !==
                                          orden.id_orden_fabricacion
                                        )
                                          return o;
                                        const avancesActualizados = (
                                          o.avances || []
                                        ).map((av) =>
                                          av.id_avance_etapa ===
                                          avance.id_avance_etapa
                                            ? { ...av, costo_fabricacion: num }
                                            : av,
                                        );
                                        return {
                                          ...o,
                                          avances: avancesActualizados,
                                        };
                                      }),
                                    );
                                    setEditandoAvanceCosto((prev) => {
                                      const n = { ...prev };
                                      delete n[avance.id_avance_etapa];
                                      return n;
                                    });
                                    toast.success("Costo actualizado");
                                  } catch (error) {
                                    const msg =
                                      error?.response?.data?.error ||
                                      "No se pudo actualizar el costo";
                                    toast.error(msg);
                                  }
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                className="px-2 py-1 text-slate-700 bg-gray-200 rounded hover:bg-gray-300 cursor-pointer"
                                onClick={() =>
                                  setEditandoAvanceCosto((prev) => {
                                    const n = { ...prev };
                                    delete n[avance.id_avance_etapa];
                                    return n;
                                  })
                                }
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span>
                                {formatCOP(Number(avance.costo_fabricacion))}
                              </span>
                              <button
                                className="text-slate-700 hover:text-slate-900 cursor-pointer"
                                title="Editar costo"
                                onClick={() =>
                                  setEditandoAvanceCosto((prev) => ({
                                    ...prev,
                                    [avance.id_avance_etapa]: formatCOP(
                                      Number(avance.costo_fabricacion) || 0,
                                    ),
                                  }))
                                }
                              >
                                <FiEdit />
                              </button>
                            </div>
                          )}
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
                    );
                  })}
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

      // Validación de campos obligatorios
      if (!articulo || !etapa || !trabajador || !cantidad) {
        toast.error("Por favor completa todos los campos obligatorios.");
        return;
      }

      // Validar costo_fabricacion: solo permitir 0 si la etapa es 'mecanizado'
      const etapaObj = etapas.find((e) => e.value === parseInt(etapa));
      const esMecanizado =
        etapaObj && etapaObj.label.toLowerCase().includes("mecanizado");
      if (
        typeof costo_fabricacion === "undefined" ||
        (!esMecanizado &&
          (!costo_fabricacion || parseFloat(costo_fabricacion) <= 0))
      ) {
        toast.error(
          esMecanizado
            ? "El costo de fabricación es obligatorio (puede ser 0 solo en mecanizado)."
            : "El costo de fabricación debe ser mayor a 0 en esta etapa.",
        );
        return;
      }

      // Validar si es mecanizado y si hay consumo registrado en la semana
      if (esMecanizado) {
        // Consultar consumos de materia prima en la semana actual
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + diffLunes);
        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        const fechaInicio = lunes.toISOString().split("T")[0];
        const fechaFin = domingo.toISOString().split("T")[0];
        const resConsumos = await api.get(
          "/consumos-materia-prima/resumen-semanal",
          {
            params: { fechaInicio, fechaFin },
          },
        );
        const consumosSemana = resConsumos.data?.data || [];
        if (!consumosSemana.length) {
          setShowModalConsumo(true);
        }
      }

      // Envía el avance.
      await api.post("/avance-etapas", datos);

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
                avance.id_etapa_produccion === articulo.id_etapa_final,
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

      setOrdenes((prevOrdenes) =>
        prevOrdenes.map((o) =>
          o.id_orden_fabricacion === idOrden ? updatedOrden : o,
        ),
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
      {/* Modal para consumo de materia prima */}
      {showModalConsumo && (
        <div className="flex items-center justify-center fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-fade-in">
            <div className="flex flex-col items-center mb-4">
              <div className="bg-amber-100 rounded-full p-3 mb-2">
                <FiTrendingUp className="text-amber-600" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-amber-700 mb-1">
                ¡Acción requerida!
              </h3>
              <p className="text-gray-700 text-base font-medium mb-2">
                Registraste un avance en mecanizado, pero aún no has registrado
                consumos de materia prima.
              </p>
              <p className="text-gray-500 text-sm mb-2">
                ¿Deseas hacerlo ahora?
              </p>
            </div>
            <div className="flex flex-row gap-3 justify-center mt-2">
              <button
                className="cursor-pointer flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-5 py-2 rounded-xl font-semibold shadow-md transition-all duration-150"
                onClick={() => {
                  setShowModalConsumo(false);
                  setDrawerConsumo(true);
                }}
              >
                <FiBox size={20} /> Registrar consumo
              </button>
              <button
                className="cursor-pointer flex items-center gap-2 bg-gray-100 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-xl font-semibold shadow-md transition-all duration-150"
                onClick={() => setShowModalConsumo(false)}
              >
                <FiX size={20} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-4xl font-bold text-gray-800">
            Órdenes de fabricación
          </h2>
          <div className="w-full md:flex-1 md:ml-100px md:justify-end flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            {/* Filtro por ID de orden */}
            <div className="w-full md:w-32">
              <label className="block text-gray-700 font-semibold mb-1">
                ID Orden
              </label>
              <input
                type="text"
                placeholder="#105"
                className="w-full border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                value={searchTerm}
                onChange={(e) => {
                  const val = e.target.value;
                  // Asegurar que siempre tenga el prefijo #
                  if (val && !val.startsWith("#")) {
                    setSearchTerm("#" + val);
                  } else {
                    setSearchTerm(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPage(1);
                    fetchOrdenes();
                  }
                }}
              />
            </div>
            {/* Filtro por artículo */}
            <div
              className="w-full md:w-[28rem] lg:w-[32rem] relative"
              ref={articuloFilterRef}
            >
              <label className="block text-gray-700 font-semibold mb-1">
                Artículo en la orden
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Escribe y selecciona…"
                  className="flex-grow border border-gray-500 rounded-md px-3 py-2 h-[42px]"
                  value={articuloQuery}
                  onChange={(e) => {
                    setArticuloQuery(e.target.value);
                    setArticuloSeleccion(null);
                    setShowSugArticulos(true);
                  }}
                  onFocus={() => setShowSugArticulos(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSugArticulos(false);
                      e.currentTarget.blur();
                    }
                    if (e.key === "Enter") {
                      const s = sugerenciasArticulos;
                      if (s.length > 0) {
                        const opt = s[0];
                        setArticuloSeleccion(opt);
                        setArticuloQuery(opt.label);
                        setShowSugArticulos(false);
                        e.preventDefault();
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="h-[42px] px-3 border border-slate-300 rounded-md cursor-pointer text-slate-600 hover:bg-slate-100 flex items-center justify-center"
                  title="Limpiar"
                  aria-label="Limpiar"
                  onClick={() => {
                    setArticuloQuery("");
                    setArticuloSeleccion(null);
                    setShowSugArticulos(false);
                  }}
                >
                  <FiX size={18} />
                </button>
              </div>
              {showSugArticulos && sugerenciasArticulos.length > 0 && (
                <div className="absolute z-10 mt-1 w-full border border-slate-200 rounded-md bg-white max-h-56 overflow-auto">
                  <ul className="divide-y divide-slate-100">
                    {sugerenciasArticulos.map((opt) => (
                      <li
                        key={opt.value}
                        className="px-3 py-2 text-sm hover:bg-slate-50 cursor-pointer"
                        onMouseDown={() => {
                          setArticuloSeleccion(opt);
                          setArticuloQuery(opt.label);
                          setShowSugArticulos(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {/* Filtro por estado */}
            <div className="w-full md:w-64">
              <label className="block text-gray-700 font-semibold mb-1">
                Filtrar por estado:
              </label>
              <select
                value={filtroEstadoActivas}
                onChange={handleFiltroEstadoChange}
                disabled={mostrarCanceladas}
                className={`w-full h-[42px] border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 ${
                  mostrarCanceladas
                    ? "bg-gray-200 cursor-not-allowed text-gray-600"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <option value="todas">Todas</option>
                <option value="pendiente">Pendientes</option>
                <option value="en proceso">En proceso</option>
                <option value="completada">Completadas</option>
              </select>
            </div>
          </div>
        </div>
        {/* Botones de acción - grid simétrico 2x4 en desktop */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {canCreate && (
            <button
              onClick={() => navigate("/ordenes_fabricacion/nuevo")}
              className="w-full bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
            >
              <FiPlus size={16} /> Orden
            </button>
          )}
          <button
            onClick={() => navigate("/etapas_produccion")}
            className="w-full bg-slate-600 hover:bg-slate-700 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiPlus size={16} /> Etapa
          </button>
          <button
            onClick={() => navigate("/lotes_fabricados")}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiBox size={16} /> Lotes
          </button>
          <button
            onClick={() => navigate("/avances_fabricacion")}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiArrowRight size={16} /> Avances
          </button>
          <button
            onClick={() => setDrawerConsumo(true)}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiBox size={16} /> Consumo
          </button>
          <button
            onClick={() => navigate("/progreso-fabricacion")}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiArrowRight size={16} /> Progreso
          </button>
          <button
            onClick={toggleMostrarCanceladas}
            className={`w-full h-[40px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-md font-medium text-sm transition cursor-pointer ${
              mostrarCanceladas
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-slate-200 hover:bg-slate-300 text-slate-700"
            }`}
          >
            {mostrarCanceladas ? (
              <>
                <FiEye size={16} /> Activas
              </>
            ) : (
              <>
                <FiEyeOff size={16} /> Canceladas
              </>
            )}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-gray-200 hover:bg-gray-300 text-slate-700 px-3 py-2 rounded-md font-medium text-sm h-[40px] flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <FiArrowLeft size={16} /> Volver
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
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-4 text-gray-500">
                  Cargando…
                </td>
              </tr>
            ) : ordenesFiltradas.length > 0 ? (
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
                      {orden.fecha_inicio
                        ? String(orden.fecha_inicio)
                            .substring(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")
                        : ""}
                    </td>

                    <td className="px-4 py-2">
                      {orden.fecha_fin_estimada
                        ? String(orden.fecha_fin_estimada)
                            .substring(0, 10)
                            .split("-")
                            .reverse()
                            .join("/")
                        : ""}
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
                      <div className="flex items-center gap-4 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                            );
                          }}
                          className="text-blue-600 hover:text-blue-400 transition cursor-pointer"
                          title="Ver progreso de fabricación"
                        >
                          <FiTrendingUp size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate("/costos_indirectos/nuevo", {
                              state: {
                                id_orden_fabricacion:
                                  orden.id_orden_fabricacion,
                              },
                            });
                          }}
                          className="text-emerald-700 hover:text-emerald-500 transition cursor-pointer"
                          title="Registrar costo indirecto para esta OF"
                        >
                          <FiPlus size={18} />
                        </button>
                        {canDelete && (
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
                        )}
                        {!canDelete && (
                          <span className="text-gray-400 italic select-none">
                            Sin permisos
                          </span>
                        )}
                      </div>
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
                        {(() => {
                          const completada = esOrdenCompletada(orden.estado);
                          if (completada) {
                            return (
                              <div className="mt-4 flex items-center gap-6">
                                <button
                                  type="button"
                                  disabled
                                  title="La orden está completada. No se pueden registrar más avances."
                                  className="text-slate-400 flex items-center gap-2 cursor-not-allowed"
                                >
                                  <FiPlus /> Registrar nuevo avance
                                </button>
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                                    )
                                  }
                                  className="text-blue-600 flex items-center gap-2 hover:underline cursor-pointer"
                                  title="Ver progreso de fabricación"
                                >
                                  <FiTrendingUp /> Ver progreso de fabricación
                                </button>
                              </div>
                            );
                          }
                          return (
                            <div className="mt-4 flex items-center gap-6">
                              <button
                                onClick={() =>
                                  setMostrarFormularioAvance((prev) =>
                                    prev === orden.id_orden_fabricacion
                                      ? null
                                      : orden.id_orden_fabricacion,
                                  )
                                }
                                className="text-slate-700 flex items-center gap-2 hover:underline cursor-pointer"
                              >
                                <FiPlus /> Registrar nuevo avance
                              </button>
                              <button
                                onClick={() =>
                                  navigate("/costos_indirectos/nuevo", {
                                    state: {
                                      id_orden_fabricacion:
                                        orden.id_orden_fabricacion,
                                    },
                                  })
                                }
                                className="text-emerald-700 flex items-center gap-2 hover:underline cursor-pointer"
                                title="Registrar un costo indirecto y asignarlo a esta OF"
                              >
                                <FiPlus /> Registrar costo indirecto
                              </button>
                              <button
                                onClick={() =>
                                  navigate(
                                    `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                                  )
                                }
                                className="text-blue-600 flex items-center gap-2 hover:underline cursor-pointer"
                                title="Ver progreso de fabricación"
                              >
                                <FiTrendingUp /> Ver progreso de fabricación
                              </button>
                            </div>
                          );
                        })()}
                        {mostrarFormularioAvance ===
                          orden.id_orden_fabricacion &&
                          !esOrdenCompletada(orden.estado) && (
                            <div
                              ref={formularioAvanceRef}
                              className="mt-4 p-4 rounded-md bg-white shadow border border-slate-200 animate-fade-in-up"
                            >
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  if (esOrdenCompletada(orden.estado)) {
                                    toast.error(
                                      "La orden está completada. No se pueden registrar más avances.",
                                    );
                                    setMostrarFormularioAvance(null);
                                    return;
                                  }
                                  const form =
                                    formularios[orden.id_orden_fabricacion] ||
                                    {};
                                  const claveCosto = `${orden.id_orden_fabricacion}-${form?.articulo}-${form?.etapa}`;
                                  const valorEnEdicion =
                                    editandoCosto[claveCosto];
                                  const costoNormalizado =
                                    valorEnEdicion !== undefined
                                      ? cleanCOPFormat(valorEnEdicion)
                                      : Number(form?.costo_fabricacion) || 0;

                                  const formNormalizado = {
                                    ...form,
                                    costo_fabricacion: costoNormalizado,
                                  };

                                  manejarRegistroAvance(
                                    orden.id_orden_fabricacion,
                                    formNormalizado,
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
                                        Number(e.target.value),
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
                                        Number(e.target.value),
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
                                        Number(e.target.value),
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
                                      <option
                                        key={trab.value}
                                        value={trab.value}
                                      >
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
                                        e.target.value,
                                      )
                                    }
                                    className="border rounded px-2 py-1 border-slate-300 p-5 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="Costo de fabricación unitario"
                                    value={(() => {
                                      const form =
                                        formularios[
                                          orden.id_orden_fabricacion
                                        ] || {};
                                      const clave = `${orden.id_orden_fabricacion}-${form?.articulo}-${form?.etapa}`;
                                      const enEdicion = editandoCosto[clave];
                                      if (enEdicion !== undefined)
                                        return enEdicion;
                                      const num = Number(
                                        form?.costo_fabricacion,
                                      );
                                      return Number.isFinite(num) && num > 0
                                        ? formatCOP(num)
                                        : "";
                                    })()}
                                    onChange={(e) => {
                                      const raw = e.target.value;
                                      const form =
                                        formularios[
                                          orden.id_orden_fabricacion
                                        ] || {};
                                      const clave = `${orden.id_orden_fabricacion}-${form?.articulo}-${form?.etapa}`;
                                      if (!raw || raw.trim() === "") {
                                        setEditandoCosto((prev) => ({
                                          ...prev,
                                          [clave]: "",
                                        }));
                                        actualizarFormulario(
                                          orden.id_orden_fabricacion,
                                          "costo_fabricacion",
                                          "",
                                        );
                                        return;
                                      }
                                      const num = cleanCOPFormat(raw);
                                      costoManualEditado.current[clave] = true;
                                      setEditandoCosto((prev) => ({
                                        ...prev,
                                        [clave]: formatCOP(num),
                                      }));
                                      actualizarFormulario(
                                        orden.id_orden_fabricacion,
                                        "costo_fabricacion",
                                        num,
                                      );
                                    }}
                                    onFocus={() => {
                                      /* mantener formato mientras escribe */
                                    }}
                                    onBlur={() => {
                                      /* ya formateado en onChange */
                                    }}
                                    className="border rounded px-2 py-1 border-slate-300 p-5"
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
                                        e.target.value,
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
        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span>{" "}
              de{" "}
              <span className="font-semibold text-gray-800">{totalPages}</span>{" "}
              — <span className="font-semibold text-gray-800">{total}</span>{" "}
              órdenes
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
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
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

      {/* Drawer de consumo de materia prima */}
      <ConsumoMateriaPrimaDrawer
        isOpen={drawerConsumo}
        onClose={() => setDrawerConsumo(false)}
      />
    </div>
  );
};

export default ListaOrdenesFabricacion;
