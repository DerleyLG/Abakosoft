import formateaCantidad from "../utils/formateaCantidad";
import { useState, useEffect, useRef, useCallback } from "react";
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

  // Búsqueda dinámica con debounce
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
      await api.post("/consumos-materia-prima", {
        fecha,
        id_articulo: articuloSeleccionado.id_articulo,
        cantidad: cantidadNum,
        notas: notas || null,
        id_orden_fabricacion: null,
      });

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
      const res = await api.post("/inventario/inicializar", {
        id_articulo: modalInicializar.articulo.id_articulo,
        stock_inicial: stockNum,
        stock_minimo: 2,
      });

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
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-gradient-to-br from-slate-50 to-white shadow-2xl z-50 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 px-6 py-5 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2.5">
                  <FiPackage className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Consumo de MP
                  </h3>
                  <p className="text-emerald-100 text-sm">
                    Registra salida de inventario
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition cursor-pointer"
              >
                <FiX size={22} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Busqueda de articulo */}
            <div className="p-4 bg-white border-b border-slate-200">
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <FiSearch className="text-emerald-500" />
                Buscar articulo
              </label>
              <div className="relative">
                <FiSearch
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Referencia o descripcion..."
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 transition-all"
                />
              </div>

              {/* Lista de articulos */}
              {(searchTerm || !articuloSeleccionado) && (
                <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  {loadingArticulos ? (
                    <div className="p-4 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
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
                              // Mostrar modal para inicializar inventario
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
                          className={`w-full px-4 py-3 text-left hover:bg-emerald-50 border-b border-slate-100 last:border-0 transition cursor-pointer ${
                            articuloSeleccionado?.id_articulo ===
                            art.id_articulo
                              ? "bg-emerald-50"
                              : ""
                          } ${sinInventario ? "bg-amber-50/50" : ""}`}
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
                                  <FiAlertCircle size={14} />
                                  <span className="text-xs font-medium">
                                    Sin inventario
                                  </span>
                                </div>
                              ) : (
                                <>
                                  <p className="font-bold text-emerald-700 text-sm">
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

            {/* Articulo seleccionado y formulario */}
            {articuloSeleccionado && (
              <div className="p-4">
                {/* Card del articulo seleccionado */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 mb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-lg p-2">
                        <FiBox className="text-emerald-600 text-lg" />
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-800">
                          {articuloSeleccionado.descripcion}
                        </p>
                        <p className="text-sm text-emerald-600">
                          Ref: {articuloSeleccionado.referencia || "N/A"}
                        </p>
                        {articuloSeleccionado.nombre_etapa && (
                          <span
                            className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-md ${getEtapaColor(articuloSeleccionado.nombre_etapa).badge}`}
                          >
                            Etapa: {articuloSeleccionado.nombre_etapa}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setArticuloSeleccionado(null)}
                      className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg p-1 transition cursor-pointer"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-emerald-200 flex justify-between items-center">
                    <span className="text-sm text-emerald-700">
                      Stock disponible:
                    </span>
                    <span className="font-bold text-emerald-800 text-lg">
                      {formateaCantidad(articuloSeleccionado.stock_disponible)}{" "}
                      {articuloSeleccionado.abreviatura_unidad || "uds"}
                    </span>
                  </div>
                </div>

                {/* Formulario de consumo */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Fecha */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                      <FiCalendar className="text-slate-400" size={14} />
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      max={getFechaHoy()}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                    />
                  </div>

                  {/* Cantidad */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                      required
                    />
                    {cantidad && parseFloat(cantidad) > 0 && (
                      <div
                        className={`mt-2 p-3 rounded-xl text-sm flex items-center justify-between ${
                          stockDespues < 0
                            ? "bg-red-50 border border-red-200"
                            : "bg-slate-50 border border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {stockDespues < 0 ? (
                            <FiAlertCircle className="text-red-500" />
                          ) : (
                            <FiCheck className="text-emerald-500" />
                          )}
                          <span className="text-slate-600">
                            Stock despues del consumo:
                          </span>
                        </div>
                        <span
                          className={`font-bold ${stockDespues < 0 ? "text-red-600" : "text-emerald-600"}`}
                        >
                          {formateaCantidad(stockDespues)}{" "}
                          {articuloSeleccionado.abreviatura_unidad || "uds"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                      <FiFileText className="text-slate-400" size={14} />
                      Notas (opcional)
                    </label>
                    <input
                      type="text"
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      placeholder="Ej: Consumo para ordenes de la semana"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>

                  {/* Boton submit */}
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      !cantidad ||
                      parseFloat(cantidad) <= 0 ||
                      stockDespues < 0
                    }
                    className="w-full px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                  >
                    <FiMinus size={18} />
                    {loading ? "Registrando..." : "Registrar Consumo"}
                  </button>
                </form>
              </div>
            )}

            {/* Consumos recientes */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <FiBox className="text-emerald-600" size={16} />
                  Ultimos consumos
                </h4>
              </div>

              {loadingConsumos ? (
                <div className="text-center text-slate-500 text-sm py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
                </div>
              ) : consumosRecientes.length === 0 ? (
                <div className="text-center text-slate-400 text-sm py-8 bg-white rounded-xl border border-slate-200">
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
                        className="p-3 bg-white rounded-xl hover:shadow-sm transition border border-slate-100"
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
                                  className={`text-xs px-1.5 py-0.5 rounded ${etapaColor.badge}`}
                                >
                                  {item.nombre_etapa}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-3">
                            <p className="font-bold text-emerald-700 text-sm">
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
              className="w-full py-2.5 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl font-medium transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FiExternalLink size={16} />
              Ver historial completo
            </button>
          </div>
        </div>
      </div>

      {/* Overlay interno para modal */}
      {modalEtapa.visible && (
        <div
          className="absolute inset-0 bg-white/60 z-50"
          style={{ pointerEvents: "auto" }}
        />
      )}

      {/* Modal para asignar etapa */}
      <AsignarEtapaModal
        visible={modalEtapa.visible}
        articulo={modalEtapa.articulo}
        etapaSeleccionada={etapaSeleccionada}
        setEtapaSeleccionada={setEtapaSeleccionada}
        guardandoEtapa={guardandoEtapa}
        onGuardar={handleGuardarEtapa}
        onClose={() => setModalEtapa({ visible: false, articulo: null })}
      />

      {/* Modal para inicializar inventario */}
      {modalInicializar.visible && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setModalInicializar({ visible: false, articulo: null });
              setStockInicial("");
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-xl p-2.5">
                  <FiDatabase className="text-white text-xl" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">
                    Inicializar en Inventario
                  </h4>
                  <p className="text-amber-100 text-sm">
                    Este artículo no está en inventario
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              {/* Info del articulo */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-5">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 rounded-lg p-2.5">
                    <FiBox className="text-amber-600 text-lg" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {modalInicializar.articulo?.descripcion}
                    </p>
                    <p className="text-sm text-slate-500">
                      Ref: {modalInicializar.articulo?.referencia || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mensaje explicativo */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <FiAlertCircle
                  className="text-amber-500 flex-shrink-0 mt-0.5"
                  size={20}
                />
                <p className="text-sm text-amber-800">
                  Para registrar consumos de este artículo, primero debes
                  agregarlo al inventario con un stock inicial.
                </p>
              </div>

              {/* Campo stock inicial */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-semibold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Ingresa la cantidad disponible actualmente en físico
                </p>
              </div>

              {/* Botones */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setModalInicializar({ visible: false, articulo: null });
                    setStockInicial("");
                  }}
                  className="flex-1 px-4 py-3 border-2 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-medium transition cursor-pointer"
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
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  <FiPlus size={18} />
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
