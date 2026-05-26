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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
                  estado.primera_fecha_movimiento,
                )}</li>
                <li><strong>Primer período:</strong> Desde ${formatearFecha(
                  estado.primer_lunes,
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
          ultimoCerradoBasico.id_cierre,
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
                  det.saldo_final,
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
                  ultimoCerrado.fecha_inicio,
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

  // Paginación del histórico
  const totalPaginas = Math.ceil(cierresFiltrados.length / pageSize);
  const startIdx = (page - 1) * pageSize;
  const cierresPaginados = cierresFiltrados.slice(
    startIdx,
    startIdx + pageSize,
  );

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando cierres de caja...</p>
      </div>
    );
  }

  if (!cierreAbierto && cierres.length === 0) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 select-none">
        {mostrarModalIniciar && (
          <IniciarPeriodoModal
            onClose={() => setMostrarModalIniciar(false)}
            onSuccess={fetchData}
          />
        )}
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="text-center max-w-2xl w-full">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6">
              <FiCalendar size={36} className="text-slate-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Bienvenido al Control de Caja
            </h1>
            <p className="text-slate-500 mb-8">
              Elige cómo deseas iniciar tu control de caja
            </p>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-left">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                  <FiPlus size={18} className="text-slate-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Inicio Manual
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  Crea un período desde hoy ingresando los saldos iniciales por
                  método de pago
                </p>
                <button
                  onClick={() => setMostrarModalIniciar(true)}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <FiPlus size={14} />
                  Iniciar Manualmente
                </button>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <FiZap size={18} className="text-emerald-600" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Cálculo Automático
                </h3>
                <p className="text-slate-500 text-sm mb-4">
                  Crea períodos semanales basándose en los movimientos
                  históricos existentes
                </p>
                <button
                  onClick={manejarMigracionAutomatica}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <FiZap size={14} />
                  Calcular Automático
                </button>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-left text-sm text-slate-600 shadow-sm">
              <p className="font-semibold text-slate-800 mb-1">¿Cuál elegir?</p>
              <p>
                <strong>Manual:</strong> Para empezar de cero o si no tienes
                historial.
              </p>
              <p>
                <strong>Automático:</strong> Si tienes movimientos y quieres
                crear períodos retroactivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6 select-none">
      {mostrarModalIniciar && (
        <IniciarPeriodoModal
          onClose={() => setMostrarModalIniciar(false)}
          onSuccess={fetchData}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Control de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Cierres de Caja
            </h1>
          </div>
          <span className="mt-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg shadow-sm">
            {cierres.length} períodos
          </span>
        </div>
        {cierres.length === 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={manejarMigracionAutomatica}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              <FiZap size={14} />
              Automático
            </button>
            <button
              onClick={() => setMostrarModalIniciar(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={14} />
              Nuevo Período
            </button>
          </div>
        )}
      </div>

      {/* Período activo */}
      {cierreAbierto && (
        <div className="bg-white border border-emerald-200 rounded-xl shadow-sm">
          <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <FiClock size={18} className="text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Período activo
                  </p>
                  <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md">
                    ABIERTO
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  Desde {formatFecha(cierreAbierto.fecha_inicio)} —{" "}
                  {calcularDias(
                    cierreAbierto.fecha_inicio,
                    cierreAbierto.fecha_fin,
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(`/cierres-caja/${cierreAbierto.id_cierre}`)
                }
                className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <FiEye size={14} />
                Ver detalle
              </button>
              <button
                onClick={() =>
                  navigate(`/cierres-caja/${cierreAbierto.id_cierre}/cerrar`)
                }
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <FiCheck size={14} />
                Cerrar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de Tendencias */}
      {cierres.length > 0 && <GraficoTendenciaCierres cierres={cierres} />}

      {/* Histórico */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        {/* Header + filtros */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <h3 className="text-sm font-bold text-slate-900">Histórico</h3>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-md">
              {cierresFiltrados.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Desde
              </span>
              <input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) => {
                  setFiltros({ ...filtros, fechaInicio: e.target.value });
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                Hasta
              </span>
              <input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) => {
                  setFiltros({ ...filtros, fechaFin: e.target.value });
                  setPage(1);
                }}
                className="flex-1 px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
            <select
              value={filtros.estado}
              onChange={(e) => {
                setFiltros({ ...filtros, estado: e.target.value });
                setPage(1);
              }}
              className="flex-1 min-w-[140px] px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="abierto">Abierto</option>
              <option value="cerrado">Cerrado</option>
            </select>
            {(filtros.fechaInicio ||
              filtros.fechaFin ||
              filtros.estado !== "todos") && (
              <button
                onClick={() => {
                  limpiarFiltros();
                  setPage(1);
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <FiX size={12} />
                Limpiar
              </button>
            )}
          </div>
          <button
            onClick={manejarLimpiarDatos}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer shrink-0"
          >
            <FiTrash2 size={13} />
            Limpiar datos
          </button>
        </div>

        {/* Tabla */}
        {cierresFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <FiCalendar size={36} className="mb-3 opacity-40" />
            <p className="text-sm">No hay cierres con los filtros actuales</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Período
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Inicio
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Fin
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Duración
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Ingresos
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Egresos
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Saldo Final
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cierresPaginados.map((cierre) => {
                    const numeroPeriodo =
                      cierres.length -
                      cierres.findIndex(
                        (c) => c.id_cierre === cierre.id_cierre,
                      );
                    const esAbierto = cierre.estado === "abierto";
                    return (
                      <tr
                        key={cierre.id_cierre}
                        className={`hover:bg-slate-50/70 transition-colors ${esAbierto ? "border-l-2 border-l-emerald-400" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-slate-800">
                            #{numeroPeriodo}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatFecha(cierre.fecha_inicio)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {cierre.fecha_fin ? (
                            formatFecha(cierre.fecha_fin)
                          ) : (
                            <span className="text-emerald-500 font-semibold">
                              En curso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {calcularDias(cierre.fecha_inicio, cierre.fecha_fin)}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                          {cierre.total_ingresos_total != null ? (
                            formatMonto(cierre.total_ingresos_total)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-rose-600">
                          {cierre.total_egresos_total != null ? (
                            formatMonto(cierre.total_egresos_total)
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-bold text-slate-800">
                            {formatMonto(cierre.saldo_final_total)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${esAbierto ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}
                          >
                            {esAbierto ? (
                              <FiClock size={10} />
                            ) : (
                              <FiCheck size={10} />
                            )}
                            {esAbierto ? "Abierto" : "Cerrado"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() =>
                              navigate(`/cierres-caja/${cierre.id_cierre}`)
                            }
                            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer border border-slate-200"
                            title="Ver detalle"
                          >
                            <FiEye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            <div className="px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Mostrando{" "}
                <span className="font-semibold text-slate-700">
                  {cierresFiltrados.length === 0 ? 0 : startIdx + 1}–
                  {Math.min(startIdx + pageSize, cierresFiltrados.length)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-700">
                  {cierresFiltrados.length}
                </span>{" "}
                períodos
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  ← Anterior
                </button>
                <span className="text-xs text-slate-500 px-1">
                  Pág.{" "}
                  <span className="font-semibold text-slate-700">{page}</span> /{" "}
                  {totalPaginas || 1}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPaginas}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CierresCajaList;
