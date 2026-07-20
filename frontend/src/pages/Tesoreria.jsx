import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { generateUUID } from "../utils/uuid";
import {
  FiDollarSign,
  FiCreditCard,
  FiArrowLeft,
  FiArrowRight,
  FiRepeat,
} from "react-icons/fi";
import TransferenciaDrawer from "../components/TransferenciaDrawer";
import { usePlan } from "../hooks/usePlanApi";

const TesoreriaDashboard = () => {
  const { features } = usePlan();
  const [movimientos, setMovimientos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [ingresosSummary, setIngresosSummary] = useState({
    total30Dias: 0,
    ventasHoy: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Estados de filtros
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroMetodo, setFiltroMetodo] = useState("");
  const [filtroIdReferencia, setFiltroIdReferencia] = useState("");
  const [cacheCreditos, setCacheCreditos] = useState({});

  // Estados para drawer de transferencias
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [transferenciaKey, setTransferenciaKey] = useState(null);
  const [procesandoTransferencia, setProcesandoTransferencia] = useState(false);

  // Tooltip flotante para referencia y observaciones
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: "",
    x: 0,
    y: 0,
  });
  const showTooltip = (e, text) => {
    if (!text) return;
    setTooltip({ visible: true, text, x: e.clientX, y: e.clientY });
  };
  const moveTooltip = (e) => {
    setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }));
  };
  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const [resumenFinanciero, setResumenFinanciero] = useState({
    fecha_inicio_periodo: null,
    id_cierre: null,
    saldoInicialEfectivo: 0,
    saldoInicialTransferencia: 0,
    totalCompras: 0,
    totalVentas: 0,
    ventasEfectivo: 0,
    ventasTransferencia: 0,
    comprasEfectivo: 0,
    comprasTransferencia: 0,
    costosEfectivo: 0,
    costosTransferencia: 0,
    pagosEfectivo: 0,
    pagosTransferencia: 0,
    anticiposEfectivo: 0,
    anticiposTransferencia: 0,
    abonosEfectivo: 0,
    abonosTransferencia: 0,
    transferenciasIngresoEfectivo: 0,
    transferenciasEgresoEfectivo: 0,
    transferenciasIngresoTransferencia: 0,
    transferenciasEgresoTransferencia: 0,
    ventasReparacionesEfectivo: 0,
    ventasReparacionesTransferencia: 0,
    totalSaldoUsado: 0,
    saldoFavorEfectivo: 0,
    saldoFavorTransferencia: 0,
    saldoUsadoEfectivo: 0,
    saldoUsadoTransferencia: 0,
  });

  const [egresosSummary, setEgresosSummary] = useState({
    totalEgresos: 0,
    pagosTrabajadoresCount: 0,
    ordenesCompraCount: 0,
    costosCount: 0,
    materiaPrimaCount: 0,
    anticiposCount: 0,
  });

  // Utilidad para parsear fechas 'YYYY-MM-DD' (string) o Date a fecha local sin hora
  const parseFecha = (value) => {
    if (!value) return null;
    if (value instanceof Date) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (typeof value === "string") {
      const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        const y = Number(m[1]);
        const mo = Number(m[2]);
        const d = Number(m[3]);
        return new Date(y, (mo || 1) - 1, d || 1);
      }
    }
    try {
      const dt = new Date(value);
      if (!isNaN(dt)) return dt;
    } catch (_) {}
    return null;
  };

  useEffect(() => {
    const fetchTesoreriaData = async () => {
      try {
        setLoading(true);
        const [
          movimientosRes,
          metodosRes,
          resumenTarjetasRes,
          ingresosRes,
          egresosRes,
          pagosCountRes,
          ordenesCountRes,
          costosCountRes,
          materiaPrimaCountRes,
          anticiposCountRes,
        ] = await Promise.all([
          api.get("/tesoreria/movimientos-tesoreria"),
          api.get("/tesoreria/metodos-pago"),
          api.get("/tesoreria/resumen-tarjetas"),
          api.get("/tesoreria/ingresos-summary"),
          api.get("/tesoreria/egresos-summary"),
          api.get("/tesoreria/pagos-trabajadores/count"),
          api.get("/tesoreria/ordenes-compra/count"),
          api.get("/tesoreria/costos/count"),
          api.get("/tesoreria/materia-prima/count"),
          api.get("/tesoreria/anticipos/count"),
        ]);

        const movimientosData = movimientosRes.data;
        const metodosData = metodosRes.data;
        // Garantizar orden: más reciente primero (por id_movimiento desc como desempate)
        const movimientosOrdenados = [...movimientosData].sort((a, b) => {
          const fechaDiff =
            new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento);
          if (fechaDiff !== 0) return fechaDiff;
          return b.id_movimiento - a.id_movimiento;
        });
        setMovimientos(movimientosOrdenados);
        setMetodosPago(metodosData);
        setIngresosSummary(ingresosRes.data);

        const totalEgresos =
          egresosRes.data.totalPagosTrabajadores +
          egresosRes.data.totalOrdenesCompra +
          egresosRes.data.totalCostos +
          egresosRes.data.totalMateriaPrima +
          egresosRes.data.totalAnticipos;

        setEgresosSummary({
          totalEgresos: totalEgresos,
          pagosTrabajadoresCount: pagosCountRes.data.count,
          ordenesCompraCount: ordenesCountRes.data.count,
          costosCount: costosCountRes.data.count,
          materiaPrimaCount: materiaPrimaCountRes.data.count,
          anticiposCount: anticiposCountRes.data.count,
        });

        setResumenFinanciero({
          ...resumenTarjetasRes.data,
          saldoInicialEfectivo:
            resumenTarjetasRes.data?.saldoInicialEfectivo ?? 0,
          saldoInicialTransferencia:
            resumenTarjetasRes.data?.saldoInicialTransferencia ?? 0,
        });
      } catch (err) {
        setError("Error al cargar los datos de tesorería.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTesoreriaData();
  }, []);

  const navigate = useNavigate();

  const formatDate = (value) => {
    const dt = parseFecha(value);
    if (!dt) return "-";
    return dt.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMetodoNombre = (id) => {
    if (!id) return "No aplica";
    const metodo = metodosPago.find((m) => m.id_metodo_pago === id);
    return metodo ? metodo.nombre : "Desconocido";
  };

  const getTipoMovimiento = (mov) => {
    if (mov.tipo_documento) {
      const tipoLower = mov.tipo_documento.toString().toLowerCase();
      if (tipoLower.includes("venta")) return "venta";
      if (tipoLower.includes("compra")) return "compra";
      if (tipoLower === "abono_credito" || tipoLower.includes("abono"))
        return "abono_credito";
      if (tipoLower === "reparacion" || tipoLower.includes("reparacion"))
        return "reparacion";
      if (tipoLower === "saldo_favor_usado") return "saldo_favor_usado";
      if (tipoLower === "saldo_favor") return "saldo_favor";
      if (tipoLower === "costo_indirecto" || tipoLower.includes("costo"))
        return "costo_indirecto";
      if (tipoLower === "pago_trabajador" || tipoLower.includes("pago"))
        return "pago_trabajador";
      if (tipoLower === "anticipo" || tipoLower.includes("anticipo"))
        return "anticipo";
      if (
        tipoLower === "transferencia_fondos" ||
        tipoLower.includes("transferencia")
      )
        return "transferencia_fondos";
      return mov.tipo_documento;
    }
    if (mov.id_orden_venta) return "venta";
    if (mov.id_orden_compra) return "compra";
    if (mov.id_documento) return "referencia";
    return "otro";
  };

  const getIdReferencia = (mov) => {
    if (!mov.id_documento) return "-";
    const tipo = mov.tipo_documento ? mov.tipo_documento.toLowerCase() : "";
    if (tipo === "orden_venta") return `OV-${mov.id_documento}`;
    if (tipo === "abono_credito") return `OV-${mov.id_documento} (Abono)`;
    if (tipo === "orden_compra") return `OC-${mov.id_documento}`;
    if (tipo === "reparacion") return `RP-${mov.id_documento}`;
    if (tipo === "saldo_favor_usado" || tipo === "saldo_favor")
      return `SF-${mov.id_documento}`;
    if (tipo === "reversion_orden_compra")
      return `OC-${mov.id_documento} (Rev.)`;
    if (tipo === "cancelacion_orden_compra")
      return `OC-${mov.id_documento} (Canc.)`;
    if (tipo === "pago_trabajador") return `PT-${mov.id_documento}`;
    if (tipo === "anticipo") return `ANT-${mov.id_documento}`;
    if (tipo === "costo_indirecto") return `CI-${mov.id_documento}`;
    if (tipo === "transferencia_fondos") return `TR-${mov.id_documento}`;
    return `#${mov.id_documento}`;
  };

  // Calcular movimientos filtrados y paginados
  const movimientosFiltrados = movimientos.filter((mov) => {
    const tipo = getTipoMovimiento(mov);

    if (filtroTipo && filtroTipo !== "todos" && tipo !== filtroTipo) {
      return false;
    }

    if (filtroMetodo && mov.id_metodo_pago.toString() !== filtroMetodo) {
      return false;
    }

    if (filtroIdReferencia && filtroTipo !== "todos") {
      if (mov.id_documento?.toString() !== filtroIdReferencia) {
        return false;
      }
    }

    return true;
  });

  const totalFiltrados = movimientosFiltrados.length;
  const totalPages = Math.ceil(totalFiltrados / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const movimientosPaginados = movimientosFiltrados.slice(startIndex, endIndex);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  useEffect(() => {
    let mounted = true;
    const creditosIds = Array.from(
      new Set(
        movimientosFiltrados
          .filter(
            (m) => getTipoMovimiento(m) === "abono_credito" && m.id_documento,
          )
          .map((m) => m.id_documento),
      ),
    );

    if (creditosIds.length === 0) return;

    const fetchAll = async () => {
      try {
        await Promise.all(
          creditosIds.map(async (id) => {
            if (!mounted) return;
            if (id in cacheCreditos) return;
            try {
              const res = await api.get(`/creditos/buscar-documento/${id}`);
              if (mounted) {
                setCacheCreditos((prev) => ({ ...prev, [id]: res.data }));
              }
            } catch (e) {
              // Si no existe el crédito, cachear null para no reintentar
              if (e.response?.status === 404) {
                if (mounted) {
                  setCacheCreditos((prev) => ({ ...prev, [id]: null }));
                }
              }
            }
          }),
        );
      } catch (e) {
        console.error("Error preloading creditos", e);
      }
    };
    fetchAll();
    return () => {
      mounted = false;
    };
  }, [movimientosFiltrados]);

  // Función para manejar transferencias entre métodos
  const handleTransferenciaExitosa = async (datos) => {
    setProcesandoTransferencia(true);
    const loadingToast = toast.loading("Procesando transferencia...");

    try {
      await api.post("/tesoreria/transferencia-metodos", datos, {
        headers: { "X-Idempotency-Key": transferenciaKey },
      });

      toast.dismiss(loadingToast);
      toast.success("Transferencia registrada exitosamente");

      // Recargar datos
      const [movimientosRes, resumenTarjetasRes] = await Promise.all([
        api.get("/tesoreria/movimientos-tesoreria"),
        api.get("/tesoreria/resumen-tarjetas"),
      ]);
      const movimientosOrdenados2 = [...movimientosRes.data].sort((a, b) => {
        const fechaDiff =
          new Date(b.fecha_movimiento) - new Date(a.fecha_movimiento);
        if (fechaDiff !== 0) return fechaDiff;
        return b.id_movimiento - a.id_movimiento;
      });
      setMovimientos(movimientosOrdenados2);
      setResumenFinanciero({
        ...resumenTarjetasRes.data,
        saldoInicialEfectivo:
          resumenTarjetasRes.data?.saldoInicialEfectivo ?? 0,
        saldoInicialTransferencia:
          resumenTarjetasRes.data?.saldoInicialTransferencia ?? 0,
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error en transferencia:", error);
      toast.error(
        error.response?.data?.error || "Error al procesar transferencia",
      );
      throw error; // Re-lanzar para que el drawer lo maneje
    } finally {
      setProcesandoTransferencia(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando tesorería...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-68px)] bg-slate-50 flex items-center justify-center">
        <p className="text-rose-500 text-sm">{error}</p>
      </div>
    );
  }

  const balanceEfectivo =
    (Number(resumenFinanciero.saldoInicialEfectivo) || 0) +
    resumenFinanciero.ventasEfectivo +
    resumenFinanciero.saldoFavorEfectivo +
    resumenFinanciero.abonosEfectivo +
    resumenFinanciero.transferenciasIngresoEfectivo -
    resumenFinanciero.comprasEfectivo -
    resumenFinanciero.costosEfectivo -
    resumenFinanciero.pagosEfectivo -
    resumenFinanciero.anticiposEfectivo -
    resumenFinanciero.saldoUsadoEfectivo -
    resumenFinanciero.transferenciasEgresoEfectivo;
  const balanceTransferencia =
    (Number(resumenFinanciero.saldoInicialTransferencia) || 0) +
    resumenFinanciero.ventasTransferencia +
    resumenFinanciero.saldoFavorTransferencia +
    resumenFinanciero.abonosTransferencia +
    resumenFinanciero.transferenciasIngresoTransferencia -
    resumenFinanciero.comprasTransferencia -
    resumenFinanciero.costosTransferencia -
    resumenFinanciero.pagosTransferencia -
    resumenFinanciero.anticiposTransferencia -
    resumenFinanciero.saldoUsadoTransferencia -
    resumenFinanciero.transferenciasEgresoTransferencia;
  const efectivoClass =
    balanceEfectivo >= 0 ? "text-green-600" : "text-red-600";
  const transferenciaClass =
    balanceTransferencia >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-6 select-none">
      {/* Tooltip flotante global */}
      {tooltip.visible && (
        <div
          className="fixed z-[9999] pointer-events-none max-w-sm bg-slate-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl whitespace-pre-wrap break-words leading-relaxed"
          style={{
            left: tooltip.x + 14,
            top: tooltip.y + 14,
          }}
        >
          {tooltip.text}
        </div>
      )}
      <TransferenciaDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        metodosPago={metodosPago}
        balanceEfectivo={balanceEfectivo}
        balanceTransferencia={balanceTransferencia}
        onTransferenciaExitosa={handleTransferenciaExitosa}
      />

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Panel de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Tesorería
            </h1>
          </div>
          <span className="mt-1 px-2.5 py-1 bg-white border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg shadow-sm">
            {totalFiltrados} movimientos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setDrawerOpen(true);
              setTransferenciaKey(generateUUID());
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <FiRepeat size={14} />
            Transferir Fondos
          </button>
          {features.includes("creditos") && (
            <button
              onClick={() => navigate("/ventas_credito")}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Créditos
              <FiArrowRight size={14} />
            </button>
          )}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <FiArrowLeft size={14} />
            Volver
          </button>
        </div>
      </div>

      {/* ─── Balance Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Efectivo */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <FiDollarSign size={17} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Balance
                </p>
                <p className="text-sm font-bold text-slate-800 -mt-0.5">
                  Efectivo
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Disponible
              </p>
              <p className={`text-xl font-bold -mt-0.5 ${efectivoClass}`}>
                {formatCurrency(balanceEfectivo)}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 gap-x-6">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2.5">
                Ingresos
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo inicial</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {formatCurrency(
                      resumenFinanciero.saldoInicialEfectivo || 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Ventas</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        (resumenFinanciero.ventasEfectivo || 0) -
                          (resumenFinanciero.ventasReparacionesEfectivo || 0),
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Reparaciones</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(
                      resumenFinanciero.ventasReparacionesEfectivo || 0,
                    )}
                  </span>
                </div>
                {features.includes("creditos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">
                      Abonos crédito
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {formatCurrency(resumenFinanciero.abonosEfectivo)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo a favor</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(resumenFinanciero.saldoFavorEfectivo || 0)}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2.5">
                Egresos
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Compras</span>
                  <span className="text-xs font-semibold text-rose-600">
                    -{formatCurrency(resumenFinanciero.comprasEfectivo)}
                  </span>
                </div>
                {features.includes("costos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Costos</span>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(resumenFinanciero.costosEfectivo)}
                    </span>
                  </div>
                )}
                {features.includes("pagos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">
                      Pagos trabaj.
                    </span>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(resumenFinanciero.pagosEfectivo)}
                    </span>
                  </div>
                )}
                {features.includes("anticipos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Anticipos</span>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(resumenFinanciero.anticiposEfectivo)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo usado</span>
                  <span className="text-xs font-semibold text-rose-600">
                    -{formatCurrency(resumenFinanciero.saldoUsadoEfectivo || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transferencia */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <FiCreditCard size={17} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Balance
                </p>
                <p className="text-sm font-bold text-slate-800 -mt-0.5">
                  Transferencia
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Disponible
              </p>
              <p className={`text-xl font-bold -mt-0.5 ${transferenciaClass}`}>
                {formatCurrency(balanceTransferencia)}
              </p>
            </div>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 gap-x-6">
            <div>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2.5">
                Ingresos
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo inicial</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {formatCurrency(
                      resumenFinanciero.saldoInicialTransferencia || 0,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Ventas</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        (resumenFinanciero.ventasTransferencia || 0) -
                          (resumenFinanciero.ventasReparacionesTransferencia ||
                            0),
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Reparaciones</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(
                      resumenFinanciero.ventasReparacionesTransferencia || 0,
                    )}
                  </span>
                </div>
                {features.includes("creditos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">
                      Abonos crédito
                    </span>
                    <span className="text-xs font-semibold text-emerald-700">
                      {formatCurrency(resumenFinanciero.abonosTransferencia)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo a favor</span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {formatCurrency(
                      resumenFinanciero.saldoFavorTransferencia || 0,
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2.5">
                Egresos
              </p>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Compras</span>
                  <span className="text-xs font-semibold text-rose-600">
                    -{formatCurrency(resumenFinanciero.comprasTransferencia)}
                  </span>
                </div>
                {features.includes("costos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Costos</span>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(resumenFinanciero.costosTransferencia)}
                    </span>
                  </div>
                )}
                {features.includes("pagos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">
                      Pagos trabaj.
                    </span>
                    <span className="text-xs font-semibold text-rose-600">
                      -{formatCurrency(resumenFinanciero.pagosTransferencia)}
                    </span>
                  </div>
                )}
                {features.includes("anticipos") && (
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Anticipos</span>
                    <span className="text-xs font-semibold text-rose-600">
                      -
                      {formatCurrency(resumenFinanciero.anticiposTransferencia)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-slate-500">Saldo usado</span>
                  <span className="text-xs font-semibold text-rose-600">
                    -
                    {formatCurrency(
                      resumenFinanciero.saldoUsadoTransferencia || 0,
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabla de Movimientos ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
        {/* Header + Filtros */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <h3 className="text-sm font-bold text-slate-900">Movimientos</h3>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-md">
              {totalFiltrados}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setFiltroIdReferencia("");
                setPage(1);
              }}
              className="flex-1 min-w-[140px] px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="venta">Venta</option>
              <option value="reparacion">Reparación</option>
              <option value="saldo_favor_usado">Saldo a favor</option>
              <option value="compra">Compra</option>
              {features.includes("costos") && (
                <option value="costo_indirecto">Costo Indirecto</option>
              )}
              {features.includes("pagos") && (
                <option value="pago_trabajador">Pagos a Trabajadores</option>
              )}
              {features.includes("anticipos") && (
                <option value="anticipo">Anticipos</option>
              )}
              {features.includes("creditos") && (
                <option value="abono_credito">Abonos Crédito</option>
              )}
              <option value="transferencia_fondos">Transferencia fondos</option>
            </select>
            <input
              id="filtroIdReferencia"
              type="text"
              placeholder={
                filtroTipo === "todos"
                  ? "Selecciona tipo primero"
                  : "Buscar por ID..."
              }
              value={filtroIdReferencia}
              disabled={filtroTipo === "todos"}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setFiltroIdReferencia(val);
                setPage(1);
              }}
              className="flex-1 min-w-[140px] px-3 py-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <select
              id="filtroMetodo"
              value={filtroMetodo}
              onChange={(e) => {
                setFiltroMetodo(e.target.value);
                setPage(1);
              }}
              className="flex-1 min-w-[140px] px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value="">Todos los métodos</option>
              {metodosPago.map((metodo) => (
                <option
                  key={metodo.id_metodo_pago}
                  value={metodo.id_metodo_pago}
                >
                  {metodo.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Referencia
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Método
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Ref.
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Observaciones
                </th>
                <th className="px-4 py-3 text-[11px] font-bold text-slate-600 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movimientosPaginados.length > 0 ? (
                movimientosPaginados.map((mov) => {
                  const tipo = getTipoMovimiento(mov);
                  const idRef = getIdReferencia(mov);
                  const montoNum = Number(mov.monto ?? 0);
                  const esEgreso = montoNum < 0;
                  const td = mov.tipo_documento?.toLowerCase() || "";

                  const badgeClass =
                    tipo === "venta"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : td === "reparacion"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : td === "saldo_favor_usado"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : td === "saldo_favor"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : td === "reversion_orden_compra" ||
                                td === "cancelacion_orden_compra"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : tipo === "compra"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : tipo === "costo_indirecto"
                                  ? "bg-orange-50 text-orange-700 border border-orange-200"
                                  : tipo === "pago_trabajador"
                                    ? "bg-violet-50 text-violet-700 border border-violet-200"
                                    : tipo === "anticipo"
                                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                                      : tipo === "abono_credito"
                                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                                        : tipo === "transferencia_fondos"
                                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                          : "bg-slate-50 text-slate-600 border border-slate-200";

                  const tipoLabel =
                    td === "orden_venta"
                      ? "Venta"
                      : td === "abono_credito"
                        ? "Abono"
                        : td === "orden_compra"
                          ? "Compra"
                          : td === "reparacion"
                            ? "Reparación"
                            : td === "reversion_orden_compra"
                              ? "Reversión OC"
                              : td === "cancelacion_orden_compra"
                                ? "Cancelación OC"
                                : td === "pago_trabajador"
                                  ? "Pago Trabajador"
                                  : td === "anticipo"
                                    ? "Anticipo"
                                    : td === "saldo_favor_usado"
                                      ? "Saldo usado"
                                      : td === "saldo_favor"
                                        ? "Saldo a favor"
                                        : td === "costo_indirecto"
                                          ? "Costo Indirecto"
                                          : td === "transferencia_fondos"
                                            ? "Transferencia"
                                            : tipo.charAt(0).toUpperCase() +
                                              tipo.slice(1).replace(/_/g, " ");

                  return (
                    <tr
                      key={mov.id_movimiento}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold ${badgeClass}`}
                        >
                          {tipoLabel}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-semibold text-slate-700 cursor-default"
                        onMouseEnter={(e) => {
                          const labelMap = {
                            venta: "Orden de Venta",
                            reparacion: "Reparación",
                            compra: "Orden de Compra",
                            pago_trabajador: "Pago Trabajador",
                            anticipo: "Anticipo",
                            costo_indirecto: "Costo Indirecto",
                            transferencia_fondos: "Transferencia",
                            saldo_favor: "Saldo a Favor",
                            saldo_favor_usado: "Saldo usado",
                            abono_credito: "Abono a Crédito",
                            devolucion_cliente: "Devolución",
                          };
                          const docLabel = labelMap[tipo] || "Documento";
                          showTooltip(e, `${docLabel} #${mov.id_documento || ""}`);
                        }}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {idRef}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(mov.fecha_movimiento)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-bold ${esEgreso ? "text-rose-600" : "text-emerald-600"}`}
                        >
                          {esEgreso ? "" : "+"}
                          {formatCurrency(montoNum)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {getMetodoNombre(mov.id_metodo_pago)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-slate-500 max-w-[150px] truncate cursor-default"
                        onMouseEnter={(e) => showTooltip(e, `${getIdReferencia(mov)} — ${mov.observaciones || mov.referencia || ""}`)}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {mov.referencia || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate cursor-default"
                        onMouseEnter={(e) => showTooltip(e, mov.observaciones)}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                      >
                        {mov.observaciones || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tipo === "abono_credito" && mov.id_documento && (
                          <button
                            onClick={() =>
                              navigate("/ventas_credito", {
                                state: { openCreditId: mov.id_documento },
                              })
                            }
                            className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                            title="Ver crédito"
                          >
                            <FiCreditCard size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-12 text-slate-400 text-sm"
                  >
                    No se encontraron movimientos con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Mostrando{" "}
            <span className="font-semibold text-slate-700">
              {totalFiltrados === 0 ? 0 : startIndex + 1}–
              {Math.min(endIndex, totalFiltrados)}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-700">
              {totalFiltrados}
            </span>{" "}
            movimientos
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            <span className="text-xs text-slate-500 px-1">
              Pág. <span className="font-semibold text-slate-700">{page}</span>{" "}
              / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
            >
              <option value={10}>10 / pág</option>
              <option value={25}>25 / pág</option>
              <option value={50}>50 / pág</option>
              <option value={100}>100 / pág</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesoreriaDashboard;
