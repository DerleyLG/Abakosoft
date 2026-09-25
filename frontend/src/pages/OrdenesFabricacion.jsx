import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { generateUUID } from "../utils/uuid";
import "../styles/confirmAlert.css";
import {
  FiTrash2,
  FiPlus,
  FiArrowLeft,
  FiArrowRight,
  FiEdit,
  FiX,
  FiTrendingUp,
  FiBox,
  FiEye,
  FiEyeOff,
  FiChevronDown,
  FiShoppingCart,
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
  const [avanceKey, setAvanceKey] = useState(null);
  const [guardandoAvance, setGuardandoAvance] = useState({});
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
  const canCreate = can(user, ACTIONS.FABRICATION_CREATE);
  const canDelete = can(user, ACTIONS.FABRICATION_DELETE);
  const canEdit = can(user, ACTIONS.FABRICATION_EDIT);
  const canCreateAdvance = can(user, ACTIONS.ADVANCES_CREATE);
  const canEditAdvance = can(user, ACTIONS.ADVANCES_EDIT);
  const canEditAdvanceQuantity = can(user, ACTIONS.ADVANCES_EDIT_QUANTITY);
  const yaConsultadoCosto = useRef({});
  const historialCostos = useRef({});
  const formularioAvanceRef = useRef(null);
  const costoManualEditado = useRef({});
  const [editandoCosto, setEditandoCosto] = useState({});
  const [editandoAvanceCosto, setEditandoAvanceCosto] = useState({});
  const [editandoAvanceResponsable, setEditandoAvanceResponsable] = useState(
    {},
  );
  const [editandoAvanceCantidad, setEditandoAvanceCantidad] = useState({});
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

  // Focus y scroll suave al formulario de avance cuando se abre
  useEffect(() => {
    if (mostrarFormularioAvance && formularioAvanceRef.current) {
      setTimeout(() => {
        formularioAvanceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
        const primerSelect =
          formularioAvanceRef.current?.querySelector("select, input");
        if (primerSelect) primerSelect.focus({ preventScroll: true });
      }, 150);
    }
  }, [mostrarFormularioAvance]);

  // Cuando hay algún filtro activo, pedir todos los registros al backend
  const hayFiltro =
    (searchTerm && searchTerm.length > 1) || !!articuloSeleccion;

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        setLoading(true);
        // Si hay filtro activo, ignorar paginación y traer todo
        const pageSizeEfectivo = hayFiltro ? 1000 : pageSize;
        const pageEfectiva = hayFiltro ? 1 : page;
        const params = {
          page: pageEfectiva,
          pageSize: pageSizeEfectivo,
          sortBy: "id",
          sortDir: "desc",
        };

        // Al buscar por #ID buscamos en todos los estados (incluidas canceladas)
        if (searchTerm && searchTerm.startsWith("#") && searchTerm.length > 1) {
          params.buscar = searchTerm;
          // Sin filtro de estado para encontrar cualquier orden
        } else {
          if (mostrarCanceladas) {
            params.estados = "cancelada";
          } else if (filtroEstadoActivas !== "todas") {
            params.estados = filtroEstadoActivas;
          }
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
  }, [
    mostrarCanceladas,
    filtroEstadoActivas,
    page,
    pageSize,
    searchTerm,
    articuloSeleccion,
    hayFiltro,
  ]);

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
      const nombreCargoEtapa = (etapaSeleccionada?.cargo || "").trim();

      // Si la etapa tiene cargo configurado, filtrar por coincidencia case-insensitive
      // Si no tiene cargo configurado, mostrar todos los trabajadores
      const trabajadoresFiltrados = nombreCargoEtapa
        ? trabajadores.filter(
            (trab) =>
              trab.cargo &&
              trab.cargo.toLowerCase().trim() ===
                nombreCargoEtapa.toLowerCase(),
          )
        : trabajadores;

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
      return (
        <p className="text-sm text-slate-400 py-2">
          No hay detalles para mostrar.
        </p>
      );
    }
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200">
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Artículo
              </th>
              <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Cantidad
              </th>
              <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Etapa final
              </th>
            </tr>
          </thead>
          <tbody>
            {orden.detalles.map((detalle, idx) => (
              <tr
                key={idx}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
              >
                <td className="px-4 py-2.5 text-slate-900 font-semibold text-xs">
                  {detalle.descripcion || "N/A"}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 font-bold text-xs">
                  {detalle.cantidad}
                </td>
                <td className="px-4 py-2.5 text-slate-700 text-xs font-medium">
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
      return (
        <p className="text-sm text-slate-400 py-2">
          No hay avances registrados.
        </p>
      );
    }

    const ordenCompletada = esOrdenCompletada(orden.estado);

    const avancesPorArticulo = {};
    orden.avances.forEach((avance) => {
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
      <div className="flex flex-col gap-4">
        {Object.entries(avancesPorArticulo).map(([idArticulo, data], idx) => (
          <div key={idx}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1 h-4 rounded-full bg-indigo-400 inline-block"></span>
              <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                {data.descripcion}
              </p>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Etapa
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Responsable
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Cantidad
                    </th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Costo fab.
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Estado
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Observaciones
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
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
                      <tr
                        key={idx2}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-slate-900 text-xs font-semibold">
                          {avance.nombre_etapa || "N/A"}
                        </td>
                        <td className="px-4 py-2.5">
                          {ordenCompletada ? (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-800 font-semibold text-xs">
                                {avance.nombre_trabajador || "N/A"}
                              </span>
                              <button
                                className="text-slate-300 cursor-not-allowed"
                                title="La orden está completada. No se puede editar el responsable."
                                disabled
                              >
                                <FiEdit size={11} />
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
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                                className="px-2 py-1 text-xs text-white bg-slate-800 rounded-lg hover:bg-slate-700 font-medium cursor-pointer"
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
                                className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
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
                              <span className="text-slate-800 font-semibold text-xs">
                                {avance.nombre_trabajador || "N/A"}
                              </span>
                              {trabajadoresFiltrados.length === 0 ? (
                                <button
                                  className="text-slate-300 cursor-not-allowed"
                                  title="No hay trabajadores con el cargo requerido"
                                  disabled
                                >
                                  <FiEdit size={11} />
                                </button>
                              ) : canEditAdvance ? (
                                <button
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                                  <FiEdit size={11} />
                                </button>
                              ) : null}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {ordenCompletada ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-800 font-bold tabular-nums text-xs">
                                {avance.cantidad}
                              </span>
                              <button
                                className="text-slate-300 cursor-not-allowed"
                                title="La orden está completada. No se puede editar la cantidad."
                                disabled
                              >
                                <FiEdit size={11} />
                              </button>
                            </div>
                          ) : editandoAvanceCantidad[avance.id_avance_etapa] !==
                            undefined ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min="1"
                                value={
                                  editandoAvanceCantidad[avance.id_avance_etapa]
                                }
                                onChange={(e) => {
                                  setEditandoAvanceCantidad((prev) => ({
                                    ...prev,
                                    [avance.id_avance_etapa]: e.target.value,
                                  }));
                                }}
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-16 text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                              <button
                                className="px-2 py-1 text-xs text-white bg-slate-800 rounded-lg hover:bg-slate-700 font-medium cursor-pointer"
                                onClick={async () => {
                                  const num = Number(
                                    editandoAvanceCantidad[
                                      avance.id_avance_etapa
                                    ],
                                  );
                                  if (!num || num <= 0) {
                                    toast.error("Ingresa una cantidad válida");
                                    return;
                                  }
                                  try {
                                    await api.put(
                                      `/avance-etapas/${avance.id_avance_etapa}/cantidad`,
                                      { cantidad: num },
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
                                            ? { ...av, cantidad: num }
                                            : av,
                                        );
                                        return {
                                          ...o,
                                          avances: avancesActualizados,
                                        };
                                      }),
                                    );
                                    setEditandoAvanceCantidad((prev) => {
                                      const n = { ...prev };
                                      delete n[avance.id_avance_etapa];
                                      return n;
                                    });
                                    toast.success("Cantidad actualizada");
                                  } catch (error) {
                                    const msg =
                                      error?.response?.data?.error ||
                                      "No se pudo actualizar la cantidad";
                                    toast.error(msg);
                                  }
                                }}
                              >
                                Guardar
                              </button>
                              <button
                                className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                                onClick={() =>
                                  setEditandoAvanceCantidad((prev) => {
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
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-800 font-bold tabular-nums text-xs">
                                {avance.cantidad}
                              </span>
                              {canEditAdvanceQuantity && (
                                <button
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Editar cantidad"
                                  onClick={() =>
                                    setEditandoAvanceCantidad((prev) => ({
                                      ...prev,
                                      [avance.id_avance_etapa]:
                                        avance.cantidad || 0,
                                    }))
                                  }
                                >
                                  <FiEdit size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {ordenCompletada ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-800 font-bold tabular-nums text-xs">
                                {formatCOP(Number(avance.costo_fabricacion))}
                              </span>
                              <button
                                className="text-slate-300 cursor-not-allowed"
                                title="La orden está completada. No se puede editar el costo."
                                disabled
                              >
                                <FiEdit size={11} />
                              </button>
                            </div>
                          ) : editandoAvanceCosto[avance.id_avance_etapa] !==
                            undefined ? (
                            <div className="flex items-center justify-end gap-2">
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
                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-28 text-right focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                              <button
                                className="px-2 py-1 text-xs text-white bg-slate-800 rounded-lg hover:bg-slate-700 font-medium cursor-pointer"
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
                                className="px-2 py-1 text-xs text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
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
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-slate-800 font-bold tabular-nums text-xs">
                                {formatCOP(Number(avance.costo_fabricacion))}
                              </span>
                              {canEditAdvance && (
                                <button
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
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
                                  <FiEdit size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {(() => {
                            const est = (avance.estado || "").toLowerCase();
                            const CLS = {
                              completado:
                                "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              completada:
                                "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              "en proceso":
                                "bg-indigo-50 text-indigo-700 border border-indigo-200",
                              pendiente:
                                "bg-amber-50 text-amber-700 border border-amber-200",
                              parcial:
                                "bg-sky-50 text-sky-700 border border-sky-200",
                            };
                            const cls =
                              CLS[est] ||
                              "bg-slate-50 text-slate-600 border border-slate-200";
                            return est ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${cls}`}
                              >
                                {avance.estado.toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 text-xs">
                          {avance.observaciones || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs font-medium whitespace-nowrap">
                          {new Date(avance.fecha_registro).toLocaleDateString(
                            "es-CO",
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  };
  const manejarRegistroAvance = async (idOrden, formulario) => {
    if (!formulario) {
      toast.error("Formulario vacío");
      return;
    }
    // Evitar doble envío mientras se procesa la solicitud
    if (guardandoAvance[idOrden]) return;
    setGuardandoAvance((prev) => ({ ...prev, [idOrden]: true }));
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
      await api.post("/avance-etapas", datos, {
        headers: { "X-Idempotency-Key": avanceKey },
      });

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
    } finally {
      setGuardandoAvance((prev) => ({ ...prev, [idOrden]: false }));
    }
  };
  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Modal consumo de materia prima */}
      {showModalConsumo && (
        <div className="flex items-center justify-center fixed inset-0 z-40 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="flex flex-col items-center mb-4">
              <div className="bg-amber-100 rounded-full p-3 mb-2">
                <FiTrendingUp className="text-amber-700" size={28} />
              </div>
              <h3 className="text-xl font-bold text-amber-700 mb-1">
                ¡Acción requerida!
              </h3>
              <p className="text-slate-700 text-sm font-medium mb-1">
                Registraste un avance en mecanizado, pero aún no has registrado
                consumos de materia prima.
              </p>
              <p className="text-slate-400 text-xs">¿Deseas hacerlo ahora?</p>
            </div>
            <div className="flex gap-3 justify-center mt-4">
              <button
                className="cursor-pointer inline-flex items-center gap-2 bg-amber-700 hover:bg-amber-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                onClick={() => {
                  setShowModalConsumo(false);
                  setDrawerConsumo(true);
                }}
              >
                <FiBox size={16} /> Registrar consumo
              </button>
              <button
                className="cursor-pointer inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                onClick={() => setShowModalConsumo(false)}
              >
                <FiX size={16} /> Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header + botones de navegación */}
      <div className="flex flex-col gap-3">
        {/* Fila 1: título | filtros */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
          {/* Título */}
          <div className="flex items-center gap-2 shrink-0">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Manufactura y
              </p>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
                Órdenes de fabricación
              </h1>
            </div>
            {total > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                {total}
              </span>
            )}
          </div>

          {/* Filtros — siempre en una sola fila, se encogen proporcionalmente */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* ID */}
            <input
              type="text"
              placeholder="#ID orden"
              className="flex-[1] min-w-0 w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400 transition"
              value={searchTerm}
              onChange={(e) => {
                const val = e.target.value;
                if (val && !val.startsWith("#")) {
                  setSearchTerm("#" + val);
                } else {
                  setSearchTerm(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                }
              }}
            />

            {/* Artículo */}
            <div
              className="relative flex-[3] min-w-0 w-0"
              ref={articuloFilterRef}
            >
              <input
                type="text"
                placeholder="Buscar por artículo…"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 placeholder:text-slate-400 transition pr-8"
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
                      setArticuloSeleccion(s[0]);
                      setArticuloQuery(s[0].label);
                      setShowSugArticulos(false);
                      e.preventDefault();
                    }
                  }
                }}
              />
              {(articuloQuery || articuloSeleccion) && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                  onClick={() => {
                    setArticuloQuery("");
                    setArticuloSeleccion(null);
                    setShowSugArticulos(false);
                  }}
                >
                  <FiX size={13} />
                </button>
              )}
              {showSugArticulos && sugerenciasArticulos.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full border border-slate-200 rounded-xl bg-white shadow-lg max-h-56 overflow-auto">
                  <ul className="divide-y divide-slate-100 py-1">
                    {sugerenciasArticulos.map((opt) => (
                      <li
                        key={opt.value}
                        className="px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 cursor-pointer transition-colors"
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

            {/* Estado */}
            <select
              value={filtroEstadoActivas}
              onChange={handleFiltroEstadoChange}
              disabled={mostrarCanceladas}
              className="flex-[1.5] min-w-0 w-0 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <option value="todas">Todos los estados</option>
              <option value="pendiente">Pendientes</option>
              <option value="en proceso">En proceso</option>
              <option value="completada">Completadas</option>
            </select>
          </div>
        </div>

        {/* Fila 2: acciones */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 w-full mb-4">
          {canCreate && (
            <button
              onClick={() => navigate("/ordenes_fabricacion/nuevo")}
              className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={14} /> Nueva orden
            </button>
          )}
          <button
            onClick={() => navigate("/etapas_produccion")}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 shadow-sm transition-colors cursor-pointer"
          >
            <FiPlus size={14} /> Etapa
          </button>
          <button
            onClick={() => navigate("/lotes_fabricados")}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100 shadow-sm transition-colors cursor-pointer"
          >
            <FiBox size={14} /> Lotes
          </button>
          <button
            onClick={() => navigate("/avances_fabricacion")}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-sm transition-colors cursor-pointer"
          >
            <FiArrowRight size={14} /> Avances
          </button>
          <button
            onClick={() => setDrawerConsumo(true)}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm transition-colors cursor-pointer"
          >
            <FiBox size={14} /> Consumo
          </button>
          <button
            onClick={() => navigate("/progreso-fabricacion")}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 shadow-sm transition-colors cursor-pointer"
          >
            <FiTrendingUp size={14} /> Progreso
          </button>
          <button
            onClick={toggleMostrarCanceladas}
            className={`inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer ${
              mostrarCanceladas
                ? "bg-red-600 hover:bg-red-500 text-white border border-red-600"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {mostrarCanceladas ? (
              <>
                <FiEye size={14} /> Ver activas
              </>
            ) : (
              <>
                <FiEyeOff size={14} /> Canceladas
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Fecha inicio
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Fecha fin est.
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Pedido
                </th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="animate-pulse h-4 bg-slate-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : ordenesFiltradas.length > 0 ? (
                ordenesFiltradas.map((orden) => {
                  const isExpanded =
                    expandedOrden === orden.id_orden_fabricacion;
                  const estado = (orden.estado || "").toLowerCase().trim();
                  const handleCrearOrdenVenta = (e, orden) => {
                    e.stopPropagation();

                    confirmAlert({
                      title: "Confirmar orden de venta",
                      message:
                        "¿Está seguro que desea crear una orden de venta a partir de esta orden de fabricación?",
                      buttons: [
                        {
                          label: "Sí",
                          onClick: () => {
                            navigate("/ordenes_venta/nuevo", {
                              state: {
                                pedidoData: {
                                  id_cliente: orden.id_cliente || null,
                                  detalles: (orden.detalles || []).map((d) => ({
                                    id_articulo: d.id_articulo,
                                    descripcion: d.descripcion,
                                    cantidad: d.cantidad,
                                    precio_unitario:
                                      Number(d.precio_unitario) || 0,
                                  })),
                                },
                              },
                            });
                          },
                        },
                        { label: "No" },
                      ],
                    });
                  };

                  const ESTADO_BADGE = {
                    pendiente:
                      "bg-amber-50 text-amber-700 border border-amber-200",
                    "en proceso":
                      "bg-indigo-50 text-indigo-700 border border-indigo-200",
                    completada:
                      "bg-emerald-50 text-emerald-700 border border-emerald-200",
                    cancelada: "bg-red-50 text-red-700 border border-red-200",
                  };
                  const badgeClass =
                    ESTADO_BADGE[estado] ||
                    "bg-slate-50 text-slate-600 border border-slate-200";
                  const ESTADO_BORDER = {
                    pendiente: "border-l-amber-400",
                    "en proceso": "border-l-indigo-400",
                    completada: "border-l-emerald-400",
                    cancelada: "border-l-red-400",
                  };
                  const borderColor =
                    ESTADO_BORDER[estado] || "border-l-slate-200";

                  return (
                    <React.Fragment key={orden.id_orden_fabricacion}>
                      <tr
                        className={`border-b last:border-b-0 border-slate-200 cursor-pointer transition-all select-none group border-l-4 ${
                          isExpanded
                            ? "bg-indigo-100 border-l-indigo-500 hover:bg-indigo-100 shadow-md ring-1 ring-indigo-200"
                            : `${borderColor} border-l-2 border-slate-200 hover:bg-slate-50 hover:shadow-sm`
                        }`}
                        onClick={() =>
                          expandirOrden(orden.id_orden_fabricacion)
                        }
                      >
                        <td className="px-4 py-3.5">
                          <FiChevronDown
                            size={16}
                            className={`transition-transform font-bold ${
                              isExpanded
                                ? "rotate-180 text-indigo-600 drop-shadow-sm"
                                : "text-slate-300 hover:text-slate-500"
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3.5 font-mono text-sm font-extrabold text-slate-900">
                          #{orden.id_orden_fabricacion}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {orden.fecha_inicio
                            ? String(orden.fecha_inicio)
                                .substring(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700 text-xs font-medium whitespace-nowrap">
                          {orden.fecha_fin_estimada
                            ? String(orden.fecha_fin_estimada)
                                .substring(0, 10)
                                .split("-")
                                .reverse()
                                .join("/")
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${badgeClass}`}
                          >
                            {(orden.estado || "—").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-xs">
                          {orden.nombre_cliente ? (
                            <span>
                              <span className="font-mono font-bold text-slate-700">
                                #{orden.id_pedido}
                              </span>{" "}
                              <span className="text-slate-600 font-medium">
                                — {orden.nombre_cliente}
                              </span>
                            </span>
                          ) : orden.id_pedido ? (
                            <span className="font-mono font-bold text-slate-700">
                              #{orden.id_pedido}
                            </span>
                          ) : (
                            <span className="text-slate-300">No asociada</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            {canEdit &&
                              (!orden.avances ||
                                orden.avances.length === 0) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/ordenes_fabricacion/editar/${orden.id_orden_fabricacion}`,
                                    );
                                  }}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                                  title="Editar orden"
                                >
                                  <FiEdit size={14} />
                                </button>
                              )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                  `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                                );
                              }}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                              title="Ver progreso"
                            >
                              <FiTrendingUp size={14} />
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
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                              title="Registrar costo indirecto"
                            >
                              <FiPlus size={14} />
                            </button>
                            {esOrdenCompletada(orden.estado) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCrearOrdenVenta(e, orden);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                                title="Crear orden de venta a partir de esta orden de fabricación"
                              >
                                <FiShoppingCart size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  eliminarOrden(orden.id_orden_fabricacion);
                                }}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                                title="Eliminar"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr
                          className="border-b border-indigo-100 bg-indigo-200"
                          ref={(el) => {
                            if (el) {
                              setTimeout(() => {
                                el.scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                });
                              }, 50);
                            }
                          }}
                        >
                          <td
                            colSpan="7"
                            className="px-6 pb-6 pt-4 bg-indigo-50 border-t border-indigo-200"
                          >
                            <div className="flex flex-col gap-5">
                              {/* Artículos a fabricar */}
                              <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-md overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-indigo-100 bg-indigo-50/60">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                                  <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                                    Artículos a fabricar
                                  </p>
                                </div>
                                <div className="p-3">
                                  {renderDetalles(orden)}
                                </div>
                              </div>

                              {/* Avances */}
                              <div className="bg-white border-2 border-emerald-100 rounded-xl shadow-md overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-emerald-100 bg-emerald-50/60">
                                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                                    Avances de producción
                                  </p>
                                </div>
                                <div className="p-3">
                                  {renderAvancesPorArticulo(orden)}
                                </div>
                              </div>

                              {/* Acciones rápidas */}
                              {(() => {
                                const completada = esOrdenCompletada(
                                  orden.estado,
                                );
                                if (completada) {
                                  return (
                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        disabled
                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-300 bg-white cursor-not-allowed"
                                        title="La orden está completada"
                                      >
                                        <FiPlus size={12} /> Registrar avance
                                      </button>
                                      <button
                                        onClick={() =>
                                          navigate(
                                            `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                                          )
                                        }
                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                                      >
                                        <FiTrendingUp size={12} /> Ver progreso
                                      </button>
                                      <button
                                        onClick={(e) =>
                                          handleCrearOrdenVenta(e, orden)
                                        }
                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                                        title="Crear orden de venta a partir de esta orden de fabricación"
                                      >
                                        <FiShoppingCart size={12} /> Crear orden
                                        de venta
                                      </button>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-wrap items-center gap-2">
                                    {canCreateAdvance && (
                                      <button
                                        onClick={() => {
                                          const next =
                                            mostrarFormularioAvance ===
                                            orden.id_orden_fabricacion
                                              ? null
                                              : orden.id_orden_fabricacion;
                                          setMostrarFormularioAvance(next);
                                          if (next)
                                            setAvanceKey(generateUUID());
                                        }}
                                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                      >
                                        <FiPlus size={12} />
                                        {mostrarFormularioAvance ===
                                        orden.id_orden_fabricacion
                                          ? "Cerrar formulario"
                                          : "Registrar avance"}
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        navigate("/costos_indirectos/nuevo", {
                                          state: {
                                            id_orden_fabricacion:
                                              orden.id_orden_fabricacion,
                                          },
                                        })
                                      }
                                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                                    >
                                      <FiPlus size={12} /> Costo indirecto
                                    </button>
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/progreso-fabricacion?orden=${orden.id_orden_fabricacion}`,
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                                    >
                                      <FiTrendingUp size={12} /> Ver progreso
                                    </button>
                                  </div>
                                );
                              })()}

                              {/* Formulario de avance */}
                              {canCreateAdvance &&
                                mostrarFormularioAvance ===
                                  orden.id_orden_fabricacion &&
                                !esOrdenCompletada(orden.estado) && (
                                  <div
                                    ref={formularioAvanceRef}
                                    className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden"
                                  >
                                    <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                        Registrar avance de producción
                                      </p>
                                    </div>
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
                                          formularios[
                                            orden.id_orden_fabricacion
                                          ] || {};
                                        const claveCosto = `${orden.id_orden_fabricacion}-${form?.articulo}-${form?.etapa}`;
                                        const valorEnEdicion =
                                          editandoCosto[claveCosto];
                                        const costoNormalizado =
                                          valorEnEdicion !== undefined
                                            ? cleanCOPFormat(valorEnEdicion)
                                            : Number(form?.costo_fabricacion) ||
                                              0;
                                        const formNormalizado = {
                                          ...form,
                                          costo_fabricacion: costoNormalizado,
                                        };
                                        manejarRegistroAvance(
                                          orden.id_orden_fabricacion,
                                          formNormalizado,
                                        );
                                      }}
                                      className="p-4"
                                    >
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Artículo *
                                          </label>
                                          <select
                                            value={
                                              formularios[
                                                orden.id_orden_fabricacion
                                              ]?.articulo || ""
                                            }
                                            onChange={(e) =>
                                              actualizarFormulario(
                                                orden.id_orden_fabricacion,
                                                "articulo",
                                                Number(e.target.value),
                                              )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                                          >
                                            <option value="">
                                              Selecciona el artículo
                                            </option>
                                            {(
                                              articulosPendientesPorOrden[
                                                orden.id_orden_fabricacion
                                              ] || []
                                            ).map((art) => (
                                              <option
                                                key={art.value}
                                                value={art.value}
                                              >
                                                {art.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Etapa *
                                          </label>
                                          <select
                                            value={
                                              formularios[
                                                orden.id_orden_fabricacion
                                              ]?.etapa || ""
                                            }
                                            onChange={(e) =>
                                              actualizarFormulario(
                                                orden.id_orden_fabricacion,
                                                "etapa",
                                                Number(e.target.value),
                                              )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                                          >
                                            <option value="">
                                              Selecciona etapa
                                            </option>
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
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Trabajador *
                                          </label>
                                          <select
                                            value={
                                              formularios[
                                                orden.id_orden_fabricacion
                                              ]?.trabajador || ""
                                            }
                                            onChange={(e) =>
                                              actualizarFormulario(
                                                orden.id_orden_fabricacion,
                                                "trabajador",
                                                Number(e.target.value),
                                              )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Cantidad *
                                          </label>
                                          <input
                                            type="number"
                                            placeholder="Cantidad"
                                            value={
                                              formularios[
                                                orden.id_orden_fabricacion
                                              ]?.cantidad || ""
                                            }
                                            onChange={(e) =>
                                              actualizarFormulario(
                                                orden.id_orden_fabricacion,
                                                "cantidad",
                                                e.target.value,
                                              )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Costo unitario *
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Costo de fabricación unitario"
                                            value={(() => {
                                              const form =
                                                formularios[
                                                  orden.id_orden_fabricacion
                                                ] || {};
                                              const clave = `${orden.id_orden_fabricacion}-${form?.articulo}-${form?.etapa}`;
                                              const enEdicion =
                                                editandoCosto[clave];
                                              if (enEdicion !== undefined)
                                                return enEdicion;
                                              const num = Number(
                                                form?.costo_fabricacion,
                                              );
                                              return Number.isFinite(num) &&
                                                num > 0
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
                                              costoManualEditado.current[
                                                clave
                                              ] = true;
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
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                          />
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <label className="text-xs font-medium text-slate-500">
                                            Observaciones
                                          </label>
                                          <input
                                            type="text"
                                            placeholder="Observaciones (opcional)"
                                            value={
                                              formularios[
                                                orden.id_orden_fabricacion
                                              ]?.observaciones || ""
                                            }
                                            onChange={(e) =>
                                              actualizarFormulario(
                                                orden.id_orden_fabricacion,
                                                "observaciones",
                                                e.target.value,
                                              )
                                            }
                                            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setMostrarFormularioAvance(null)
                                          }
                                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                          Cerrar
                                        </button>
                                        <button
                                          type="submit"
                                          disabled={
                                            !!guardandoAvance[
                                              orden.id_orden_fabricacion
                                            ]
                                          }
                                          className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {guardandoAvance[
                                            orden.id_orden_fabricacion
                                          ]
                                            ? "Registrando..."
                                            : "Registrar avance"}
                                        </button>
                                      </div>
                                    </form>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiBox size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron órdenes de fabricación
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {!hayFiltro && (
          <div className="border-t border-slate-200 px-4 py-3 bg-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Página{" "}
                <span className="font-semibold text-slate-700">{page}</span> de{" "}
                <span className="font-semibold text-slate-700">
                  {totalPages}
                </span>
                {total > 0 && (
                  <>
                    {" "}
                    —{" "}
                    <span className="font-semibold text-slate-700">
                      {total}
                    </span>{" "}
                    órdenes
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  disabled={!hasPrev || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ← Anterior
                </button>
                <button
                  disabled={!hasNext || loading}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Siguiente →
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value={10}>10 / pág.</option>
                  <option value={25}>25 / pág.</option>
                  <option value={50}>50 / pág.</option>
                </select>
              </div>
            </div>
          </div>
        )}
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
