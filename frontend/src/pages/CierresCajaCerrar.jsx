import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import cierresCajaService from "../services/cierresCajaService";
import api from "../services/api";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import ConfirmarCierrePeriodoModal from "../components/ConfirmarCierrePeriodoModal";
import {
  FiArrowLeft,
  FiCheck,
  FiAlertCircle,
  FiBox,
  FiTruck,
  FiPercent,
} from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const CierresCajaCerrar = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const [cierre, setCierre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resumenConsumo, setResumenConsumo] = useState(null);
  const [loadingConsumo, setLoadingConsumo] = useState(false);
  const [formData, setFormData] = useState({
    fecha_fin: new Date().toISOString().split("T")[0],
    observaciones: "",
  });
  const [mostrarModalConfirmar, setMostrarModalConfirmar] = useState(false);
  const [datosConfirmacion, setDatosConfirmacion] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  // Cargar resumen de consumo cuando cambie la fecha
  // Usa la semana actual para el prorrateo, no todo el período del cierre
  useEffect(() => {
    if (formData.fecha_fin) {
      cargarResumenConsumo();
    }
  }, [formData.fecha_fin]);

  // Calcular la semana que contiene la fecha de fin
  const getSemanaDeConsumo = (fechaFin) => {
    const fecha = new Date(fechaFin + "T00:00:00");
    const diaSemana = fecha.getDay();
    const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() + diffLunes);

    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);

    const formatDate = (d) => d.toISOString().split("T")[0];
    return { fechaInicio: formatDate(lunes), fechaFin: formatDate(domingo) };
  };

  const cargarResumenConsumo = async () => {
    setLoadingConsumo(true);
    try {
      // Usar la semana de la fecha de cierre para el prorrateo
      const semana = getSemanaDeConsumo(formData.fecha_fin);
      const res = await api.get("/consumos-materia-prima/resumen-cierre", {
        params: {
          fechaInicio: semana.fechaInicio,
          fechaFin: semana.fechaFin,
        },
      });
      setResumenConsumo(res.data);
    } catch (error) {
      console.error("Error cargando resumen de consumo:", error);
    } finally {
      setLoadingConsumo(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const detalleCierre = await cierresCajaService.getById(id);

      if (detalleCierre.estado === "cerrado") {
        toast.error("Este período ya está cerrado");
        navigate("/cierres-caja");
        return;
      }

      setCierre(detalleCierre);

      // Calcular fecha de fin sugerida
      // Si es después de las 22:00, sugerir el día actual
      // Si es antes de las 22:00 y hay movimientos hoy, sugerir hoy
      // Caso contrario, sugerir ayer
      const ahora = new Date();
      const hora = ahora.getHours();
      const hoy = new Date().toISOString().split("T")[0];
      const ayer = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Por defecto usamos ayer si estamos en las primeras horas del día (00:00 - 05:59)
      // para evitar problemas cuando se cierra después de medianoche
      let fechaFinSugerida = hoy;
      if (hora < 6) {
        fechaFinSugerida = ayer;
      }

      setFormData((prev) => ({
        ...prev,
        fecha_fin: fechaFinSugerida,
      }));
    } catch (error) {
      console.error("Error cargando cierre:", error);
      toast.error("Error al cargar el cierre");
      navigate("/cierres-caja");
    } finally {
      setLoading(false);
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
    // Evitar problemas de zona horaria
    const [year, month, day] = fecha.split("T")[0].split("-");
    return new Date(year, month - 1, day).toLocaleDateString("es-CO");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar fecha de fin
    if (new Date(formData.fecha_fin) < new Date(cierre.fecha_inicio)) {
      toast.error("La fecha de fin no puede ser anterior a la fecha de inicio");
      return;
    }

    // Warning si se está cerrando cerca de medianoche
    const ahora = new Date();
    const hora = ahora.getHours();
    const fechaFinSeleccionada = new Date(formData.fecha_fin + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Si son las 23:00 o posterior y la fecha_fin es hoy, advertir
    if (hora >= 23 && fechaFinSeleccionada.getTime() === hoy.getTime()) {
      const confirmarHoraTardia = await Swal.fire({
        title: "⚠️ Hora Tardía Detectada",
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-3">
              Son las <strong>${ahora.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</strong>. 
              Has seleccionado cerrar el período hasta <strong>hoy ${formatFecha(formData.fecha_fin)}</strong>.
            </p>
            <p class="text-amber-700 bg-amber-50 p-3 rounded border border-amber-200 mb-3 text-sm">
              Si el proceso cruza la medianoche, los movimientos después de las 00:00 pertenecerán al día siguiente 
              y NO se incluirán en este cierre.
            </p>
            <p class="text-gray-700 font-semibold">¿Qué deseas hacer?</p>
          </div>
        `,
        icon: "warning",
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: "Continuar con hoy",
        denyButtonText: "Cambiar a ayer",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#10b981",
        denyButtonColor: "#f59e0b",
        cancelButtonColor: "#6b7280",
      });

      if (confirmarHoraTardia.isDenied) {
        // Usuario eligió cambiar a ayer
        const ayer = new Date(Date.now() - 86400000)
          .toISOString()
          .split("T")[0];
        setFormData((prev) => ({ ...prev, fecha_fin: ayer }));
        toast.info(
          "Fecha de fin cambiada a ayer. Revisa y confirma el cierre nuevamente.",
        );
        return;
      } else if (!confirmarHoraTardia.isConfirmed) {
        // Usuario canceló
        return;
      }
      // Si confirmó, continúa con el proceso normal
    }

    // Validar el período antes de cerrar
    try {
      const validaciones = await cierresCajaService.validarPeriodo(
        id,
        formData.fecha_fin,
      );

      // Si hay errores críticos, no permitir cerrar
      if (validaciones.errores && validaciones.errores.length > 0) {
        let errorHtml =
          '<div class="text-left"><p class="font-semibold mb-2">Errores encontrados:</p><ul class="list-disc pl-5">';
        validaciones.errores.forEach((error) => {
          errorHtml += `<li class="text-red-600">${error.mensaje}</li>`;
        });
        errorHtml += "</ul></div>";

        await Swal.fire({
          title: "No se puede cerrar el período",
          html: errorHtml,
          icon: "error",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#dc2626",
        });
        return;
      }

      // Calcular totales
      const totalIngresos = cierre.detalle_metodos.reduce(
        (sum, d) => sum + (d.total_ingresos || 0),
        0,
      );
      const totalEgresos = cierre.detalle_metodos.reduce(
        (sum, d) => sum + (d.total_egresos || 0),
        0,
      );
      const saldoFinal = cierre.detalle_metodos.reduce(
        (sum, d) => sum + (d.saldo_final || 0),
        0,
      );
      const saldoInicial = cierre.detalle_metodos.reduce(
        (sum, d) => sum + (d.saldo_inicial || 0),
        0,
      );

      // Mostrar modal de confirmación
      setDatosConfirmacion({
        resumen: { saldoInicial, totalIngresos, totalEgresos, saldoFinal },
        warnings: validaciones.warnings || [],
        fechaInicio: formatFecha(cierre.fecha_inicio),
        fechaFin: formatFecha(formData.fecha_fin),
      });
      setMostrarModalConfirmar(true);
    } catch (error) {
      console.error("Error validando período:", error);
      toast.error("Error al validar el período");
      return;
    }
  };

  const ejecutarCierre = async () => {
    try {
      setSubmitting(true);
      const response = await cierresCajaService.cerrar(
        id,
        formData,
        idempotencyKey,
      );

      setMostrarModalConfirmar(false);

      if (response.warnings && response.warnings.length > 0) {
        const msgs = response.warnings.map((w) => `• ${w.mensaje}`).join("\n");
        toast.success(`Período cerrado con advertencias:\n${msgs}`, {
          duration: 6000,
        });
      } else {
        toast.success("Período cerrado exitosamente");
      }

      navigate("/cierres-caja");
    } catch (error) {
      console.error("Error cerrando período:", error);
      toast.error(error.response?.data?.error || "Error al cerrar el período");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    );
  }

  if (!cierre) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6 select-none">
      {/* Modal confirmar cierre */}
      {mostrarModalConfirmar && datosConfirmacion && (
        <ConfirmarCierrePeriodoModal
          datos={datosConfirmacion}
          onConfirmar={ejecutarCierre}
          onCancelar={() => setMostrarModalConfirmar(false)}
          submitting={submitting}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Cierre de
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
            Cerrar Período
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Iniciado el {formatFecha(cierre.fecha_inicio)}
          </p>
        </div>
        <button
          onClick={() => navigate(`/cierres-caja/${id}`)}
          className="self-start flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
        >
          <FiArrowLeft size={14} />
          Volver
        </button>
      </div>

      {/* Alerta importante */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-start gap-3">
        <FiAlertCircle className="text-amber-500 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-amber-800">Importante</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Una vez cerrado el período, no podrás editar ni agregar movimientos
            en estas fechas. El sistema creará automáticamente el siguiente
            período con los saldos finales como saldos iniciales.
          </p>
        </div>
      </div>

      {/* Warning horario tardío */}
      {new Date().getHours() >= 22 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <FiAlertCircle
            className="text-orange-500 shrink-0 mt-0.5"
            size={18}
          />
          <div>
            <p className="text-sm font-bold text-orange-800">
              Cierre en horario tardío
            </p>
            <p className="text-sm text-orange-700 mt-0.5">
              Son las{" "}
              <strong>
                {new Date().toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
              . Verifica cuidadosamente la <strong>fecha de fin</strong>. Los
              movimientos después de las 00:00 pertenecerán al día siguiente.
            </p>
          </div>
        </div>
      )}

      {/* Resumen de Saldos */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            Resumen de Saldos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Saldo Inicial
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Ingresos
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Egresos
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                  Saldo Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cierre.detalle_metodos.map((detalle) => (
                <tr
                  key={detalle.id_detalle}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                    {detalle.metodo_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 text-right">
                    {formatMonto(detalle.saldo_inicial)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                      +{formatMonto(detalle.total_ingresos)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                      -{formatMonto(detalle.total_egresos)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-bold text-slate-900">
                      {formatMonto(detalle.saldo_final)}
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="px-4 py-3 text-sm font-bold text-slate-900">
                  TOTAL
                </td>
                <td className="px-4 py-3 text-sm font-bold text-slate-700 text-right">
                  {formatMonto(
                    cierre.detalle_metodos.reduce(
                      (sum, d) => sum + d.saldo_inicial,
                      0,
                    ),
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold">
                    +
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.total_ingresos,
                        0,
                      ),
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold">
                    -
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.total_egresos,
                        0,
                      ),
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="text-base font-extrabold text-slate-900">
                    {formatMonto(
                      cierre.detalle_metodos.reduce(
                        (sum, d) => sum + d.saldo_final,
                        0,
                      ),
                    )}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumen de Consumo de Materia Prima */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              Consumo de Materia Prima
            </h3>
            {resumenConsumo?.periodo && (
              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-md">
                Semana{" "}
                {new Date(
                  resumenConsumo.periodo.fechaInicio + "T00:00:00",
                ).toLocaleDateString("es-CO")}{" "}
                —{" "}
                {new Date(
                  resumenConsumo.periodo.fechaFin + "T00:00:00",
                ).toLocaleDateString("es-CO")}
              </span>
            )}
          </div>
          {resumenConsumo && (
            <div className="text-right">
              <p className="text-base font-extrabold text-emerald-700">
                {formatMonto(resumenConsumo.totales?.costo_total || 0)}
              </p>
              <p className="text-[10px] text-slate-400">
                {resumenConsumo.totales?.total_registros || 0} registros
              </p>
            </div>
          )}
        </div>

        <div className="p-6">
          {loadingConsumo ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-emerald-500 border-t-transparent"></div>
            </div>
          ) : !resumenConsumo || resumenConsumo.totales?.costo_total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <FiBox size={32} className="mb-2 opacity-40" />
              <p className="text-sm">
                No hay consumos registrados en este período
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Consumos por Etapa */}
              {resumenConsumo.consumosPorEtapa &&
                resumenConsumo.consumosPorEtapa.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Por etapa de producción
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {resumenConsumo.consumosPorEtapa.map((etapa, idx) => {
                        const etapaColorsMap = {
                          Mecanizado: {
                            bg: "bg-blue-50",
                            border: "border-blue-200",
                            text: "text-blue-700",
                            badge: "bg-blue-100 border-blue-200 text-blue-700",
                          },
                          Pintura: {
                            bg: "bg-pink-50",
                            border: "border-pink-200",
                            text: "text-pink-700",
                            badge: "bg-pink-100 border-pink-200 text-pink-700",
                          },
                          Tapizado: {
                            bg: "bg-emerald-50",
                            border: "border-emerald-200",
                            text: "text-emerald-700",
                            badge:
                              "bg-emerald-100 border-emerald-200 text-emerald-700",
                          },
                          Pulido: {
                            bg: "bg-amber-50",
                            border: "border-amber-200",
                            text: "text-amber-700",
                            badge:
                              "bg-amber-100 border-amber-200 text-amber-700",
                          },
                          Ensamble: {
                            bg: "bg-purple-50",
                            border: "border-purple-200",
                            text: "text-purple-700",
                            badge:
                              "bg-purple-100 border-purple-200 text-purple-700",
                          },
                        };
                        const colors = etapaColorsMap[etapa.nombre_etapa] || {
                          bg: "bg-slate-50",
                          border: "border-slate-200",
                          text: "text-slate-700",
                          badge: "bg-slate-100 border-slate-200 text-slate-700",
                        };
                        const formatUnidades = (unidadesPorTipo) => {
                          if (
                            !unidadesPorTipo ||
                            Object.keys(unidadesPorTipo).length === 0
                          )
                            return "0 uds";
                          return Object.entries(unidadesPorTipo)
                            .map(
                              ([unidad, cantidad]) =>
                                `${Number(cantidad).toFixed(1)} ${unidad}`,
                            )
                            .join(", ");
                        };
                        return (
                          <div
                            key={idx}
                            className={`rounded-xl border ${colors.border} ${colors.bg} p-3 shadow-sm`}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              <FiBox size={13} className={colors.text} />
                              <span
                                className={`text-xs font-bold ${colors.text}`}
                              >
                                {etapa.nombre_etapa || "Sin etapa"}
                              </span>
                            </div>
                            <p
                              className={`text-sm font-extrabold ${colors.text}`}
                            >
                              {formatMonto(etapa.costo_total)}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {formatUnidades(etapa.unidades_por_tipo)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Prorrateo por Orden */}
              {resumenConsumo.ordenesProrrateo &&
                resumenConsumo.ordenesProrrateo.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Distribución por orden de fabricación
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Orden
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                              Cliente
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                              %
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                              Consumo
                            </th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right">
                              Costo Est.
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {resumenConsumo.ordenesProrrateo
                            .slice(0, 10)
                            .map((orden, idx) => {
                              const formatUnidadesOrden = (unidadesPorTipo) => {
                                if (
                                  !unidadesPorTipo ||
                                  Object.keys(unidadesPorTipo).length === 0
                                )
                                  return "—";
                                return Object.entries(unidadesPorTipo)
                                  .map(
                                    ([unidad, cantidad]) =>
                                      `${Number(cantidad).toFixed(1)} ${unidad}`,
                                  )
                                  .join(", ");
                              };
                              return (
                                <tr
                                  key={idx}
                                  className="hover:bg-slate-50/70 transition-colors"
                                >
                                  <td className="px-4 py-2.5">
                                    <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-md">
                                      OF #{orden.id_orden_fabricacion}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-slate-600 truncate max-w-[150px]">
                                    {orden.nombre_cliente || "Sin cliente"}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-[11px] font-bold">
                                      <FiPercent size={9} />
                                      {(orden.porcentaje || 0).toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center text-xs text-slate-500">
                                    {formatUnidadesOrden(orden.unidadesPorTipo)}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-700">
                                    {formatMonto(orden.totalCostoEstimado)}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                        {resumenConsumo.ordenesProrrateo.length > 10 && (
                          <tfoot>
                            <tr className="bg-slate-50">
                              <td
                                colSpan={5}
                                className="px-4 py-2 text-center text-[11px] text-slate-400"
                              >
                                +{resumenConsumo.ordenesProrrateo.length - 10}{" "}
                                órdenes más...
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>

      {/* Formulario de cierre */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 flex flex-col gap-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <FiCheck size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">
              Información de Cierre
            </p>
            <p className="text-xs text-slate-500">
              Completa los datos para cerrar el período
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Fecha de Inicio
            </label>
            <input
              type="date"
              value={
                cierre.fecha_inicio ? cierre.fecha_inicio.split("T")[0] : ""
              }
              disabled
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Fecha de Fin <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={formData.fecha_fin}
              onChange={(e) =>
                setFormData({ ...formData, fecha_fin: e.target.value })
              }
              min={cierre.fecha_inicio ? cierre.fecha_inicio.split("T")[0] : ""}
              required
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <p className="text-[11px] text-slate-400">
              Última fecha a incluir en este período
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
            Observaciones
          </label>
          <textarea
            value={formData.observaciones}
            onChange={(e) =>
              setFormData({ ...formData, observaciones: e.target.value })
            }
            placeholder="Notas adicionales sobre el cierre (opcional)"
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-all"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => navigate(`/cierres-caja/${id}`)}
            className="cursor-pointer flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FiArrowLeft size={14} />
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px]"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Cerrando...
              </>
            ) : (
              <>
                <FiCheck size={15} />
                Cerrar Período
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CierresCajaCerrar;
