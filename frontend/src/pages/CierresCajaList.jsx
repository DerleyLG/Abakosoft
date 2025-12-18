import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import cierresCajaService from "../services/cierresCajaService";
import GraficoTendenciaCierres from "../components/GraficoTendenciaCierres";
import IniciarPeriodoModal from "../components/IniciarPeriodoModal";
import Swal from "sweetalert2";
import toast from "react-hot-toast";
import {
  FiCalendar,
  FiCheck,
  FiClock,
  FiDollarSign,
  FiPlus,
  FiEye,
  FiFilter,
  FiX,
  FiZap,
  FiTrash2,
} from "react-icons/fi";

const CierresCajaList = () => {
  const [cierres, setCierres] = useState([]);
  const [cierresFiltrados, setCierresFiltrados] = useState([]);
  const [cierreAbierto, setCierreAbierto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarModalIniciar, setMostrarModalIniciar] = useState(false);
  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    estado: "todos",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [cierres, filtros]);

  const aplicarFiltros = () => {
    let resultado = [...cierres];

    // Filtrar por fecha de inicio
    if (filtros.fechaInicio) {
      resultado = resultado.filter((c) => {
        const fechaCierre = new Date(c.fecha_inicio);
        const fechaFiltro = new Date(filtros.fechaInicio);
        return fechaCierre >= fechaFiltro;
      });
    }

    // Filtrar por fecha de fin
    if (filtros.fechaFin) {
      resultado = resultado.filter((c) => {
        const fechaCierre = new Date(c.fecha_fin || c.fecha_inicio);
        const fechaFiltro = new Date(filtros.fechaFin);
        return fechaCierre <= fechaFiltro;
      });
    }

    // Filtrar por estado
    if (filtros.estado !== "todos") {
      resultado = resultado.filter((c) => c.estado === filtros.estado);
    }

    setCierresFiltrados(resultado);
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: "",
      fechaFin: "",
      estado: "todos",
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const [historico, abierto] = await Promise.all([
        cierresCajaService.getAll(),
        cierresCajaService.getCierreAbierto().catch(() => null),
      ]);

      setCierres(historico);
      setCierreAbierto(abierto);
    } catch (error) {
      console.error("Error cargando cierres:", error);
      toast.error("Error al cargar los cierres de caja");
    } finally {
      setLoading(false);
    }
  };

  const manejarMigracionAutomatica = async () => {
    try {
      // Primero verificar estado del sistema
      const estado = await cierresCajaService.verificarEstadoSistema();

      if (!estado.necesita_migracion && !estado.necesita) {
        toast.error("No hay movimientos históricos para migrar");
        return;
      }

      // Formatear fechas para mostrar
      const formatearFecha = (fecha) => {
        if (!fecha) return "-";
        const [year, month, day] = fecha.split("T")[0].split("-");
        return `${day}/${month}/${year}`;
      };

      const confirmar = await Swal.fire({
        title: "⚡ Crear Períodos Automáticamente",
        html: `
          <div class="text-left">
            <p class="mb-3">El sistema creará períodos semanales basados en tus movimientos históricos:</p>
            <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-3">
              <p class="text-sm mb-2"><strong> Resumen:</strong></p>
              <ul class="list-disc pl-5 text-sm space-y-1">
                <li><strong>Primer movimiento:</strong> ${formatearFecha(
                  estado.primera_fecha_movimiento
                )}</li>
                <li><strong>Primer período:</strong> Desde ${formatearFecha(
                  estado.primer_lunes
                )}</li>
                <li><strong>Total movimientos:</strong> ${
                  estado.cantidad_movimientos
                }</li>
                <li><strong>Períodos a crear:</strong> ${
                  estado.periodos_a_crear
                }</li>
              </ul>
            </div>
            <div class="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p class="text-sm"><strong> Qué hará el sistema:</strong></p>
              <ul class="list-disc pl-5 text-sm space-y-1">
                <li>Crear períodos semanales (Lunes-Domingo)</li>
                <li>Calcular saldos automáticamente</li>
                <li>Períodos pasados quedarán cerrados</li>
                <li>Período actual quedará abierto</li>
              </ul>
            </div>
            <div class="bg-amber-50 border border-amber-300 rounded p-3 mb-3">
              <p class="text-sm text-amber-800"><strong>⚠️ Advertencia:</strong></p>
              <p class="text-sm">Si ya tienes períodos registrados, se eliminarán y se crearán nuevos basados en los movimientos históricos.</p>
            </div>
            <p class="text-amber-600 text-sm font-semibold">⚠️ Este proceso no se puede deshacer</p>
          </div>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, crear períodos",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#10b981",
        cancelButtonColor: "#6b7280",
        width: "600px",
      });

      if (!confirmar.isConfirmed) return;

      toast.loading("Creando períodos históricos...", { id: "migracion" });

      const response = await cierresCajaService.migrarPeriodosHistoricos();

      toast.success(` ${response.periodos_creados} períodos creados`, {
        id: "migracion",
      });

      await Swal.fire({
        title: " Migración Exitosa",
        html: `
          <div class="text-left">
            <div class="bg-green-50 border border-green-200 rounded p-4">
              <p class="mb-2"><strong>Períodos creados:</strong> ${response.periodos_creados}</p>
              <p class="mb-2"><strong>Primer período:</strong> ${response.primer_periodo}</p>
              <p><strong>Período actual:</strong> #${response.periodo_actual} (abierto)</p>
            </div>
          </div>
        `,
        icon: "success",
        confirmButtonColor: "#10b981",
      });

      fetchData();
    } catch (error) {
      console.error("Error en migración:", error);
      toast.error(error.response?.data?.error || "Error al crear períodos", {
        id: "migracion",
      });
    }
  };

  const manejarLimpiarDatos = async () => {
    try {
      // Obtener último cierre cerrado con detalles
      const cierresCerrados = cierres
        .filter((c) => c.estado === "cerrado")
        .sort((a, b) => b.id_cierre - a.id_cierre); // Ordenar descendente por id_cierre
      const ultimoCerradoBasico = cierresCerrados[0]; // Primer elemento es el más reciente

      let ultimoCerrado = null;
      let saldosHTML = "";

      if (ultimoCerradoBasico) {
        // Obtener detalle completo del último cierre
        ultimoCerrado = await cierresCajaService.getById(
          ultimoCerradoBasico.id_cierre
        );

        // Construir HTML de saldos (backend devuelve 'detalle_metodos')
        if (
          ultimoCerrado.detalle_metodos &&
          ultimoCerrado.detalle_metodos.length > 0
        ) {
          saldosHTML = ultimoCerrado.detalle_metodos
            .map((det) => {
              const colorClase =
                det.saldo_final < 0 ? "text-red-700" : "text-green-700";
              return `<div class="flex justify-between text-xs py-1 border-b">
                <span class="font-medium">${det.metodo_nombre}:</span>
                <span class="font-bold ${colorClase}">${formatMonto(
                det.saldo_final
              )}</span>
              </div>`;
            })
            .join("");
        }
      }

      const confirmar = await Swal.fire({
        title: "Limpiar Datos de Control de Caja",
        html: `
          <div class="text-left">
            <div class="bg-red-50 border border-red-300 rounded p-4 mb-3">
              <p class="text-red-700 font-bold mb-2">⚠️ ADVERTENCIA IMPORTANTE</p>
              <p class="text-sm mb-2">Esta acción eliminará <strong>TODOS</strong> los registros de:</p>
              <ul class="list-disc pl-5 text-sm space-y-1">
                <li>Todos los períodos de caja (abiertos y cerrados)</li>
                <li>Todos los detalles de cierre</li>
              </ul>
            </div>

            ${
              ultimoCerrado
                ? `
            <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-3">
              <p class="text-sm mb-2"><strong>💡 Recomendación:</strong></p>
              <p class="text-sm mb-2">Anota los <strong>saldos finales</strong> del último período cerrado:</p>
              <div class="bg-white rounded p-3 text-xs">
                <p class="font-bold mb-2">Período #${
                  ultimoCerrado.id_cierre
                }</p>
                <p class="text-gray-600 mb-2">${formatFecha(
                  ultimoCerrado.fecha_inicio
                )} - ${formatFecha(ultimoCerrado.fecha_fin)}</p>
                <div class="border-t pt-2">
                  <p class="font-semibold mb-2 text-gray-700">Saldos Finales:</p>
                  ${saldosHTML}
                </div>
              </div>
            </div>
            `
                : '<div class="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3"><p class="text-sm">No hay períodos cerrados. Se eliminarán todos los períodos actuales.</p></div>'
            }

            <div class="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
              <p class="text-sm"><strong> Importante:</strong> Usa estos saldos finales como <strong>saldos iniciales</strong> cuando vuelvas a crear períodos.</p>
            </div>

            <p class="text-red-600 text-sm font-bold text-center">Esta acción NO se puede deshacer</p>
            
            <div class="mt-4">
              <p class="text-sm mb-2">Para confirmar, escribe <strong>LIMPIAR</strong></p>
            </div>
          </div>
        `,
        input: "text",
        inputPlaceholder: "Escribe LIMPIAR",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar todo",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        width: "650px",
        inputValidator: (value) => {
          if (value !== "LIMPIAR") {
            return "Debes escribir LIMPIAR para confirmar";
          }
        },
      });

      if (!confirmar.isConfirmed) return;

      toast.loading("Limpiando datos...", { id: "limpiar" });

      await cierresCajaService.limpiarDatos();

      toast.success(" Datos eliminados exitosamente", { id: "limpiar" });

      await Swal.fire({
        title: "Datos Eliminados",
        text: "Todos los registros de control de caja han sido eliminados. Puedes empezar de cero.",
        icon: "success",
        confirmButtonColor: "#10b981",
      });

      fetchData();
    } catch (error) {
      console.error("Error limpiando datos:", error);
      toast.error(error.response?.data?.error || "Error al limpiar datos", {
        id: "limpiar",
      });
    }
  };

  const formatMonto = (monto) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(monto || 0);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return "-";
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO");
  };

  const calcularDias = (fecha_inicio, fecha_fin) => {
    if (!fecha_fin) return "En curso";
    const [yearI, monthI, dayI] = fecha_inicio.split("T")[0].split("-");
    const [yearF, monthF, dayF] = fecha_fin.split("T")[0].split("-");
    const inicio = new Date(yearI, monthI - 1, dayI);
    const fin = new Date(yearF, monthF - 1, dayF);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return `${dias} día${dias !== 1 ? "s" : ""}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500 text-lg">Cargando cierres de caja...</div>
      </div>
    );
  }

  // Si no hay cierres ni período abierto, mostrar pantalla de inicio
  if (!cierreAbierto && cierres.length === 0) {
    return (
      <div className="p-6">
        {mostrarModalIniciar && (
          <IniciarPeriodoModal
            onClose={() => setMostrarModalIniciar(false)}
            onSuccess={fetchData}
          />
        )}

        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center max-w-3xl">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <FiCalendar className="text-blue-600" size={64} />
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-4">
              Bienvenido al Control de Caja
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Elige cómo deseas iniciar tu control de caja
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Opción 1: Manual */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200 hover:border-blue-400 transition">
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FiPlus className="text-blue-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Inicio Manual
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Crea un período desde hoy, ingresando los saldos iniciales de
                  cada método de pago
                </p>
                <button
                  onClick={() => setMostrarModalIniciar(true)}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiPlus size={20} />
                  Iniciar Manualmente
                </button>
              </div>

              {/* Opción 2: Automático */}
              <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200 hover:border-green-400 transition">
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FiZap className="text-green-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Cálculo Automático
                </h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Sistema crea períodos semanales basándose en tus movimientos
                  históricos
                </p>
                <button
                  onClick={manejarMigracionAutomatica}
                  className="cursor-pointer w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <FiZap size={20} />
                  Calcular Automático
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700">
                <strong>💡 ¿Cuál elegir?</strong>
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>
                  <strong>Manual:</strong> Para empezar de cero o si no tienes
                  historial
                </li>
                <li>
                  <strong>Automático:</strong> Si tienes movimientos registrados
                  y quieres crear períodos retroactivos
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {mostrarModalIniciar && (
        <IniciarPeriodoModal
          onClose={() => setMostrarModalIniciar(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Cierres de Caja</h1>
          <p className="text-gray-600 mt-1">Gestión de períodos de caja</p>
        </div>
      </div>

      {/* Período Actual */}
      {cierreAbierto && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FiClock className="text-green-600" size={24} />
                <h2 className="text-xl font-bold text-green-800">
                  Período Actual
                </h2>
                <span className="bg-green-200 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">
                  ABIERTO
                </span>
              </div>
              <p className="text-gray-700">
                <span className="font-semibold">Desde:</span>{" "}
                {formatFecha(cierreAbierto.fecha_inicio)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  navigate(`/cierres-caja/${cierreAbierto.id_cierre}`)
                }
                className="cursor-pointer flex items-center gap-2 bg-white border-2 border-green-600 text-green-700 px-4 py-2 rounded-lg font-semibold hover:bg-green-50 transition"
              >
                <FiEye />
                Ver Detalle
              </button>
              <button
                onClick={() =>
                  navigate(`/cierres-caja/${cierreAbierto.id_cierre}/cerrar`)
                }
                className="cursor-pointer flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <FiCheck />
                Cerrar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Tendencias */}
      {cierres.length > 0 && (
        <div className="mb-6">
          <GraficoTendenciaCierres cierres={cierres} />
        </div>
      )}

      {/* Tabla de Histórico */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">
            Histórico de Cierres
          </h2>
          <div className="flex gap-2">
            <button
              onClick={manejarLimpiarDatos}
              className="cursor-pointer flex items-center gap-2 text-red-700 hover:text-red-900 px-3 py-2 rounded-lg hover:bg-red-50 border border-red-200 hover:border-red-300 transition"
              title="Limpiar todos los datos"
            >
              <FiTrash2 />
              Limpiar Datos
            </button>
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className="cursor-pointer flex items-center gap-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
            >
              <FiFilter />
              {mostrarFiltros ? "Ocultar Filtros" : "Filtros"}
            </button>
          </div>
        </div>

        {/* Panel de Filtros */}
        {mostrarFiltros && (
          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Desde
                </label>
                <input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) =>
                    setFiltros({ ...filtros, fechaInicio: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasta
                </label>
                <input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) =>
                    setFiltros({ ...filtros, fechaFin: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={filtros.estado}
                  onChange={(e) =>
                    setFiltros({ ...filtros, estado: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="todos">Todos</option>
                  <option value="abierto">Abiertos</option>
                  <option value="cerrado">Cerrados</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={limpiarFiltros}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition"
                >
                  <FiX />
                  Limpiar
                </button>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              Mostrando {cierresFiltrados.length} de {cierres.length} cierres
            </div>
          </div>
        )}

        {cierres.length === 0 ? (
          <div className="text-center py-12">
            <FiCalendar className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 text-lg">No hay cierres registrados</p>
          </div>
        ) : (
          <div className="p-6">
            {/* Grid de Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cierresFiltrados.map((cierre, index) => {
                const numeroPeriodo =
                  cierres.length -
                  cierres.findIndex((c) => c.id_cierre === cierre.id_cierre);
                const esAbierto = cierre.estado === "abierto";

                return (
                  <div
                    key={cierre.id_cierre}
                    className={`bg-white rounded-lg border-2 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${
                      esAbierto
                        ? "border-green-400 hover:border-green-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Header de la Card */}
                    <div
                      className={`px-5 py-4 ${
                        esAbierto
                          ? "bg-gradient-to-r from-green-50 to-green-100"
                          : "bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">
                            Período #{numeroPeriodo}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {formatFecha(cierre.fecha_inicio)}
                            {cierre.fecha_fin && (
                              <> - {formatFecha(cierre.fecha_fin)}</>
                            )}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                            esAbierto
                              ? "bg-green-600 text-white"
                              : "bg-gray-600 text-white"
                          }`}
                        >
                          {esAbierto ? (
                            <>
                              <FiClock size={12} />
                              Abierto
                            </>
                          ) : (
                            <>
                              <FiCheck size={12} />
                              Cerrado
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Body de la Card */}
                    <div className="px-5 py-4">
                      {/* Duración */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <FiCalendar size={16} className="text-gray-400" />
                        <span>
                          {calcularDias(cierre.fecha_inicio, cierre.fecha_fin)}
                        </span>
                      </div>

                      {/* Saldo Final o Actual */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <FiDollarSign size={18} className="text-blue-600" />
                          <span className="text-xs font-medium text-gray-600 uppercase">
                            {esAbierto ? "Saldo Actual" : "Saldo Final"}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatMonto(cierre.saldo_final_total)}
                        </p>
                      </div>

                      {/* Estadísticas Rápidas */}
                      {cierre.total_ingresos !== undefined &&
                        cierre.total_egresos !== undefined && (
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-green-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">
                                Ingresos
                              </p>
                              <p className="text-sm font-semibold text-green-700">
                                {formatMonto(cierre.total_ingresos)}
                              </p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                              <p className="text-xs text-gray-600 mb-1">
                                Egresos
                              </p>
                              <p className="text-sm font-semibold text-red-700">
                                {formatMonto(cierre.total_egresos)}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Botón de Acción */}
                      <button
                        onClick={() =>
                          navigate(`/cierres-caja/${cierre.id_cierre}`)
                        }
                        className={`w-full cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all ${
                          esAbierto
                            ? "bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                        }`}
                      >
                        <FiEye size={18} />
                        {esAbierto ? "Ver y Gestionar" : "Ver Detalle"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CierresCajaList;
