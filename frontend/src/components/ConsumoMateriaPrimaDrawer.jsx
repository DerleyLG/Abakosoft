import formateaCantidad from "../utils/formateaCantidad";
import { useState, useEffect, useRef, useCallback } from "react";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import {
  FiX,
  FiMinus,
  FiSearch,
  FiCalendar,
  FiFileText,
  FiBox,
  FiExternalLink,
  FiPackage,
  FiCheck,
  FiAlertCircle,
  FiPlus,
  FiDatabase,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import AsignarEtapaModal from "./AsignarEtapaModal";

const ConsumoMateriaPrimaDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const idempotencyKeyInicializar = useIdempotencyKey();
  const [searchTerm, setSearchTerm] = useState("");
  const [articulos, setArticulos] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingArticulos, setLoadingArticulos] = useState(false);

  // Form states
  const [cantidad, setCantidad] = useState("");
  const getFechaHoy = () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return hoy.toISOString().split("T")[0];
  };
  const [fecha, setFecha] = useState(getFechaHoy());
  const [notas, setNotas] = useState("");

  // Consumos recientes
  const [consumosRecientes, setConsumosRecientes] = useState([]);
  const [loadingConsumos, setLoadingConsumos] = useState(false);

  const searchInputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Cargar lista inicial (vacía o con pocos resultados)
      buscarArticulos("");
      cargarConsumosRecientes();
      setTimeout(() => searchInputRef.current?.focus(), 300);
    } else {
      setSearchTerm("");
      setArticulos([]);
      setArticuloSeleccionado(null);
      setCantidad("");
      setNotas("");
      setFecha(getFechaHoy());
    }
  }, [isOpen]);

  // Busqueda dinámica con debounce
  const buscarArticulos = useCallback(async (termino) => {
    setLoadingArticulos(true);
    try {
      const res = await api.get("/inventario", {
        params: {
          tipo_categoria: "materia_prima",
          buscar: termino,
          pageSize: 20, // Solo traer los primeros 20 resultados
        },
      });
      setArticulos(res.data?.data || []);
    } catch (error) {
      console.error("Error buscando articulos:", error);
    } finally {
      setLoadingArticulos(false);
    }
  }, []);

  // Efecto para búsqueda con debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      buscarArticulos(searchTerm);
    }, 300); // 300ms de debounce

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, buscarArticulos]);

  const cargarConsumosRecientes = async () => {
    setLoadingConsumos(true);
    try {
      const res = await api.get("/consumos-materia-prima/recientes", {
        params: { limite: 10 },
      });
      setConsumosRecientes(res.data?.data || []);
    } catch (error) {
      console.error("Error cargando consumos:", error);
    } finally {
      setLoadingConsumos(false);
    }
  };

  const [consumoPendiente, setConsumoPendiente] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!articuloSeleccionado) {
      toast.error("Selecciona un articulo");
      return;
    }

    if (!cantidad || isNaN(Number(cantidad)) || parseFloat(cantidad) <= 0) {
      toast.error("Ingresa una cantidad valida");
      return;
    }

    const cantidadNum = parseFloat(cantidad);
    const stockDisponible = articuloSeleccionado?.stock_disponible || 0;

    if (cantidadNum > stockDisponible) {
      toast.error(`Stock insuficiente. Disponible: ${stockDisponible}`);
      return;
    }

    setLoading(true);
    try {
      await api.post(
        "/consumos-materia-prima",
        {
          fecha,
          id_articulo: articuloSeleccionado.id_articulo,
          cantidad: cantidadNum,
          notas: notas || null,
          id_orden_fabricacion: null,
        },
        { headers: { "X-Idempotency-Key": idempotencyKey } },
      );

      toast.success(
        `Consumo registrado: ${cantidadNum} ${articuloSeleccionado.abreviatura_unidad || "uds"} de ${articuloSeleccionado.descripcion}`,
      );

      buscarArticulos(searchTerm);
      cargarConsumosRecientes();

      setArticuloSeleccionado(null);
      setCantidad("");
      setNotas("");
      setSearchTerm("");
    } catch (error) {
      console.error("Error registrando consumo:", error);
      const msg =
        error.response?.data?.error || "Error al registrar el consumo";
      if (
        msg &&
        msg.includes("no tiene una etapa de consumo asignada") &&
        articuloSeleccionado
      ) {
        setConsumoPendiente({ articuloSeleccionado, cantidad, notas, fecha });
        setModalEtapa({ visible: true, articulo: articuloSeleccionado });
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatMoneda = (valor) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);
  };

  const stockDespues = articuloSeleccionado
    ? (articuloSeleccionado.stock_disponible || 0) - (parseFloat(cantidad) || 0)
    : 0;

  const [modalEtapa, setModalEtapa] = useState({
    visible: false,
    articulo: null,
  });
  const [etapaSeleccionada, setEtapaSeleccionada] = useState(null);
  const [guardandoEtapa, setGuardandoEtapa] = useState(false);

  // Modal para inicializar inventario
  const [modalInicializar, setModalInicializar] = useState({
    visible: false,
    articulo: null,
  });
  const [stockInicial, setStockInicial] = useState("");
  const [guardandoInventario, setGuardandoInventario] = useState(false);

  const handleGuardarEtapa = async () => {
    if (!etapaSeleccionada || !modalEtapa.articulo) {
      toast.error("Selecciona una etapa y un articulo");
      return;
    }
    setGuardandoEtapa(true);
    try {
      await api.put(`/articulos/${modalEtapa.articulo.id_articulo}`, {
        id_etapa: etapaSeleccionada.value,
      });
      toast.success("Etapa asignada correctamente");
      setModalEtapa({ visible: false, articulo: null });
      buscarArticulos(searchTerm);
      if (consumoPendiente) {
        setArticuloSeleccionado(consumoPendiente.articuloSeleccionado);
        setCantidad(consumoPendiente.cantidad);
        setNotas(consumoPendiente.notas);
        setFecha(consumoPendiente.fecha);
        setTimeout(() => {
          handleSubmit();
          setConsumoPendiente(null);
        }, 100);
      }
    } catch (error) {
      console.error("Error asignando etapa:", error);
      const msg = error.response?.data?.error || "Error al asignar la etapa";
      toast.error(msg);
    } finally {
      setGuardandoEtapa(false);
    }
  };

  // Funcion para inicializar articulo en inventario
  const handleInicializarInventario = async () => {
    if (!modalInicializar.articulo) return;

    const stockNum = parseFloat(stockInicial);
    if (!stockInicial || isNaN(stockNum) || stockNum <= 0) {
      toast.error("Ingresa un stock inicial válido mayor a 0");
      return;
    }

    setGuardandoInventario(true);
    try {
      const res = await api.post(
        "/inventario/inicializar",
        {
          id_articulo: modalInicializar.articulo.id_articulo,
          stock_inicial: stockNum,
          stock_minimo: 2,
        },
        { headers: { "X-Idempotency-Key": idempotencyKeyInicializar } },
      );

      toast.success(
        `${modalInicializar.articulo.descripcion} agregado al inventario con ${stockNum} ${modalInicializar.articulo.abreviatura_unidad || "uds"}`,
      );

      // Cerrar modal y refrescar lista
      setModalInicializar({ visible: false, articulo: null });
      setStockInicial("");
      buscarArticulos(searchTerm);
    } catch (error) {
      console.error("Error inicializando inventario:", error);
      const msg =
        error.response?.data?.error || "Error al inicializar el inventario";
      toast.error(msg);
    } finally {
      setGuardandoInventario(false);
    }
  };

  // Verificar si un articulo necesita inicializarse en inventario
  const necesitaInicializarInventario = (articulo) => {
    return (
      articulo.id_inventario === null || articulo.id_inventario === undefined
    );
  };

  // Colores por etapa
  const etapaColors = {
    Mecanizado: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
    },
    Pintura: {
      bg: "bg-pink-50",
      text: "text-pink-600",
      border: "border-pink-200",
      badge: "bg-pink-100 text-pink-700",
    },
    Tapizado: {
      bg: "bg-green-50",
      text: "text-green-600",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
    },
    Pulido: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
    },
    Ensamble: {
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-200",
      badge: "bg-purple-100 text-purple-700",
    },
  };
  const getEtapaColor = (nombre) =>
    etapaColors[nombre] || {
      bg: "bg-slate-50",
      text: "text-slate-600",
      border: "border-slate-200",
      badge: "bg-slate-100 text-slate-700",
    };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 transform-gpu will-change-transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">
              Inventario
            </p>
            <h3 className="text-lg font-bold text-slate-900">
              Registrar consumo de MP
            </h3>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <FiX size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          <div className="px-6 py-4 border-b border-slate-100">
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Buscar artículo
            </label>
            <div className="relative">
              <FiSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Referencia o descripción..."
                className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>

            {(searchTerm || !articuloSeleccionado) && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                {loadingArticulos ? (
                  <div className="p-4 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-800" />
                    Buscando...
                  </div>
                ) : articulos.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    <FiBox className="mx-auto text-2xl mb-2 text-slate-300" />
                    {searchTerm
                      ? "No se encontraron artículos"
                      : "Escribe para buscar artículos"}
                  </div>
                ) : (
                  articulos.map((art) => {
                    const etapaColor = getEtapaColor(art.nombre_etapa);
                    const sinInventario = necesitaInicializarInventario(art);
                    return (
                      <button
                        key={art.id_articulo}
                        onClick={() => {
                          if (sinInventario) {
                            setModalInicializar({
                              visible: true,
                              articulo: art,
                            });
                            setStockInicial("");
                          } else {
                            setArticuloSeleccionado(art);
                            setSearchTerm("");
                          }
                        }}
                        className={`w-full px-4 py-3 text-left border-b border-slate-100 last:border-0 transition cursor-pointer hover:bg-slate-50 ${
                          articuloSeleccionado?.id_articulo === art.id_articulo
                            ? "bg-slate-50"
                            : ""
                        } ${sinInventario ? "bg-amber-50/50 hover:bg-amber-50" : ""}`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-800 text-sm truncate">
                              {art.descripcion}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                Ref: {art.referencia || "N/A"}
                              </span>
                              {art.nombre_etapa && (
                                <span
                                  className={`text-xs px-1.5 py-0.5 rounded-md ${etapaColor.badge}`}
                                >
                                  {art.nombre_etapa}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3 flex-shrink-0">
                            {sinInventario ? (
                              <div className="flex items-center gap-1.5 text-amber-600">
                                <FiAlertCircle size={13} />
                                <span className="text-xs font-medium">
                                  Sin inventario
                                </span>
                              </div>
                            ) : (
                              <>
                                <p className="font-bold text-slate-900 text-sm">
                                  {formateaCantidad(art.stock_disponible)}{" "}
                                  {art.abreviatura_unidad || "uds"}
                                </p>
                                <p className="text-xs text-slate-400">
                                  disponible
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Selected article + form */}
          {articuloSeleccionado && (
            <div className="px-6 py-4">
              {/* Article card */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="bg-white rounded-lg border border-slate-200 p-2">
                      <FiBox className="text-slate-600 text-lg" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {articuloSeleccionado.descripcion}
                      </p>
                      <p className="text-sm text-slate-500">
                        Ref: {articuloSeleccionado.referencia || "N/A"}
                      </p>
                      {articuloSeleccionado.nombre_etapa && (
                        <span
                          className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-md ${getEtapaColor(articuloSeleccionado.nombre_etapa).badge}`}
                        >
                          {articuloSeleccionado.nombre_etapa}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setArticuloSeleccionado(null)}
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg p-1 transition cursor-pointer"
                  >
                    <FiX size={16} />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm text-slate-500">
                    Stock disponible
                  </span>
                  <span className="font-bold text-slate-900">
                    {formateaCantidad(articuloSeleccionado.stock_disponible)}{" "}
                    {articuloSeleccionado.abreviatura_unidad || "uds"}
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    max={getFechaHoy()}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Cantidad a consumir (
                    {articuloSeleccionado.abreviatura_unidad || "unidades"})
                  </label>
                  <input
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                    placeholder={`Ej: 10.5 ${articuloSeleccionado.abreviatura_unidad || ""}`}
                    min="0.001"
                    step="0.001"
                    max={articuloSeleccionado.stock_disponible || 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                    required
                  />
                  {cantidad && parseFloat(cantidad) > 0 && (
                    <div
                      className={`mt-2 p-3 rounded-xl text-sm flex items-center justify-between border ${
                        stockDespues < 0
                          ? "bg-red-50 border-red-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {stockDespues < 0 ? (
                          <FiAlertCircle className="text-red-500" size={15} />
                        ) : (
                          <FiCheck className="text-emerald-600" size={15} />
                        )}
                        <span className="text-slate-600">
                          Stock después del consumo:
                        </span>
                      </div>
                      <span
                        className={`font-bold ${stockDespues < 0 ? "text-red-600" : "text-slate-900"}`}
                      >
                        {formateaCantidad(stockDespues)}{" "}
                        {articuloSeleccionado.abreviatura_unidad || "uds"}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">
                    Notas (opcional)
                  </label>
                  <input
                    type="text"
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Ej: Consumo para órdenes de la semana"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    !cantidad ||
                    parseFloat(cantidad) <= 0 ||
                    stockDespues < 0
                  }
                  className="w-full px-5 py-3 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FiMinus size={16} />
                  {loading ? "Registrando..." : "Registrar Consumo"}
                </button>
              </form>
            </div>
          )}

          {/* Recent consumptions */}
          <div className="px-6 py-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Últimos consumos
            </h4>
            {loadingConsumos ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800" />
              </div>
            ) : consumosRecientes.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-8 bg-slate-50 rounded-xl border border-slate-200">
                <FiPackage className="mx-auto text-2xl mb-2 text-slate-300" />
                No hay consumos recientes
              </div>
            ) : (
              <div className="space-y-2">
                {consumosRecientes.slice(0, 6).map((item) => {
                  let fechaStr = "";
                  if (item.fecha) {
                    const fechaObj = new Date(item.fecha);
                    if (!isNaN(fechaObj)) {
                      const day = fechaObj
                        .getDate()
                        .toString()
                        .padStart(2, "0");
                      const month = fechaObj.toLocaleString("es-CO", {
                        month: "short",
                      });
                      fechaStr = `${day} ${month}`;
                    }
                  }
                  const etapaColor = getEtapaColor(item.nombre_etapa);
                  return (
                    <div
                      key={item.id_consumo}
                      className="p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm truncate">
                            {item.descripcion}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-slate-400">
                              {fechaStr}
                            </span>
                            {item.nombre_etapa && (
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded-md ${etapaColor.badge}`}
                              >
                                {item.nombre_etapa}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="font-bold text-slate-900 text-sm">
                            -{formateaCantidad(item.cantidad)}{" "}
                            {item.abreviatura_unidad || "uds"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatMoneda(item.costo_total)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-white flex-shrink-0">
          <button
            onClick={() => {
              onClose();
              navigate("/inventario/consumo-mp");
            }}
            className="w-full px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <FiExternalLink size={15} />
            Ver historial completo
          </button>
        </div>
      </div>

      {/* Overlay for inner modal */}
      {modalEtapa.visible && (
        <div
          className="absolute inset-0 bg-white/60 z-50"
          style={{ pointerEvents: "auto" }}
        />
      )}

      {/* Assign stage modal */}
      <AsignarEtapaModal
        visible={modalEtapa.visible}
        articulo={modalEtapa.articulo}
        etapaSeleccionada={etapaSeleccionada}
        setEtapaSeleccionada={setEtapaSeleccionada}
        guardandoEtapa={guardandoEtapa}
        onGuardar={handleGuardarEtapa}
        onClose={() => setModalEtapa({ visible: false, articulo: null })}
      />

      {/* Initialize inventory modal */}
      {modalInicializar.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setModalInicializar({ visible: false, articulo: null });
              setStockInicial("");
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">
                  Inventario
                </p>
                <h4 className="text-lg font-bold text-slate-900">
                  Inicializar en inventario
                </h4>
              </div>
              <button
                onClick={() => {
                  setModalInicializar({ visible: false, articulo: null });
                  setStockInicial("");
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                <FiX size={15} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white rounded-lg border border-slate-200 p-2">
                    <FiBox className="text-slate-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {modalInicializar.articulo?.descripcion}
                    </p>
                    <p className="text-sm text-slate-500">
                      Ref: {modalInicializar.articulo?.referencia || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <FiAlertCircle
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                  size={18}
                />
                <p className="text-sm text-amber-800">
                  Para registrar consumos de este artículo, primero debes
                  agregarlo al inventario con un stock inicial.
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-600 mb-2">
                  Stock inicial (
                  {modalInicializar.articulo?.abreviatura_unidad || "unidades"})
                </label>
                <input
                  type="number"
                  value={stockInicial}
                  onChange={(e) => setStockInicial(e.target.value)}
                  placeholder={`Ej: 100 ${modalInicializar.articulo?.abreviatura_unidad || ""}`}
                  min="0.001"
                  step="0.001"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Ingresa la cantidad disponible actualmente en físico
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalInicializar({ visible: false, articulo: null });
                    setStockInicial("");
                  }}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInicializarInventario}
                  disabled={
                    guardandoInventario ||
                    !stockInicial ||
                    parseFloat(stockInicial) <= 0
                  }
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FiPlus size={15} />
                  {guardandoInventario ? "Guardando..." : "Agregar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ConsumoMateriaPrimaDrawer;
