import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import {
  FiDollarSign,
  FiCreditCard,
  FiArrowLeft,
  FiArrowRight,
  FiRepeat,
} from "react-icons/fi";
import TransferenciaDrawer from "../components/TransferenciaDrawer";

const TesoreriaDashboard = () => {
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
  const [cacheCreditos, setCacheCreditos] = useState({});

  // Estados para drawer de transferencias
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [procesandoTransferencia, setProcesandoTransferencia] = useState(false);

  const [resumenFinanciero, setResumenFinanciero] = useState({
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

  const calcularResumenFinanciero = (movs, metodos) => {
    const resumen = {
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
    };

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const efectivoId = metodos.find((m) =>
      m.nombre.toLowerCase().includes("efectivo")
    )?.id_metodo_pago;
    const transferenciaId = metodos.find((m) =>
      m.nombre.toLowerCase().includes("transferencia")
    )?.id_metodo_pago;

    movs.forEach((mov) => {
      const fecha = parseFecha(mov.fecha_movimiento);
      if (!fecha) return;
      if (
        fecha.getMonth() !== currentMonth ||
        fecha.getFullYear() !== currentYear
      )
        return;

      const tipo = getTipoMovimiento(mov);
      const monto = Number(mov.monto) || 0;
      const montoAbsoluto = Math.abs(monto);

      // Manejar transferencias entre métodos (NO son ventas ni compras)
      if (tipo === "transferencia_fondos") {
        if (mov.id_metodo_pago === efectivoId) {
          if (monto > 0) {
            resumen.transferenciasIngresoEfectivo += monto;
          } else {
            resumen.transferenciasEgresoEfectivo += montoAbsoluto;
          }
        } else if (mov.id_metodo_pago === transferenciaId) {
          if (monto > 0) {
            resumen.transferenciasIngresoTransferencia += monto;
          } else {
            resumen.transferenciasEgresoTransferencia += montoAbsoluto;
          }
        }
        return; // No continuar procesando este movimiento
      }

      if (tipo === "venta") {
        resumen.totalVentas += montoAbsoluto;
        if (mov.id_metodo_pago === efectivoId) {
          resumen.ventasEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.ventasTransferencia += montoAbsoluto;
        }
      } else if (tipo === "compra") {
        resumen.totalCompras += montoAbsoluto;
        if (mov.id_metodo_pago === efectivoId) {
          resumen.comprasEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.comprasTransferencia += montoAbsoluto;
        }
      } else if (tipo === "costo_indirecto") {
        // Costos indirectos como egresos (NO se suman a compras, solo a costos)
        if (mov.id_metodo_pago === efectivoId) {
          resumen.costosEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.costosTransferencia += montoAbsoluto;
        }
      } else if (tipo === "pago_trabajador") {
        // Pagos a trabajadores como egresos
        if (mov.id_metodo_pago === efectivoId) {
          resumen.pagosEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.pagosTransferencia += montoAbsoluto;
        }
      } else if (tipo === "anticipo") {
        // Anticipos como egresos
        if (mov.id_metodo_pago === efectivoId) {
          resumen.anticiposEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.anticiposTransferencia += montoAbsoluto;
        }
      } else if (tipo === "abono_credito") {
        // Abonos de crédito como ingresos (NO se suman a ventas, solo a abonos)
        if (mov.id_metodo_pago === efectivoId) {
          resumen.abonosEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.abonosTransferencia += montoAbsoluto;
        }
      }
    });
    return resumen;
  };

  useEffect(() => {
    const fetchTesoreriaData = async () => {
      try {
        setLoading(true);
        const [
          movimientosRes,
          metodosRes,
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
        setMovimientos(movimientosData);
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

        const resumenCalculado = calcularResumenFinanciero(
          movimientosData,
          metodosData
        );
        setResumenFinanciero(resumenCalculado);
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
            (m) => getTipoMovimiento(m) === "abono_credito" && m.id_documento
          )
          .map((m) => m.id_documento)
      )
    );

    if (creditosIds.length === 0) return;

    const fetchAll = async () => {
      try {
        await Promise.all(
          creditosIds.map(async (id) => {
            if (!mounted) return;
            if (cacheCreditos[id]) return;
            try {
              const res = await api.get(`/creditos/${id}`);
              if (mounted) {
                setCacheCreditos((prev) => ({ ...prev, [id]: res.data }));
              }
            } catch (e) {
              console.error("Error fetching credito", id, e);
            }
          })
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
      await api.post("/tesoreria/transferencia-metodos", datos);

      toast.dismiss(loadingToast);
      toast.success("Transferencia registrada exitosamente");

      // Recargar datos
      const movimientosRes = await api.get("/tesoreria/movimientos-tesoreria");
      setMovimientos(movimientosRes.data);
      const resumenCalculado = calcularResumenFinanciero(
        movimientosRes.data,
        metodosPago
      );
      setResumenFinanciero(resumenCalculado);
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error en transferencia:", error);
      toast.error(
        error.response?.data?.error || "Error al procesar transferencia"
      );
      throw error; // Re-lanzar para que el drawer lo maneje
    } finally {
      setProcesandoTransferencia(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-gray-500">
        Cargando datos de tesorería...
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  const balanceEfectivo =
    resumenFinanciero.ventasEfectivo +
    resumenFinanciero.abonosEfectivo +
    resumenFinanciero.transferenciasIngresoEfectivo -
    resumenFinanciero.comprasEfectivo -
    resumenFinanciero.costosEfectivo -
    resumenFinanciero.pagosEfectivo -
    resumenFinanciero.anticiposEfectivo -
    resumenFinanciero.transferenciasEgresoEfectivo;
  const balanceTransferencia =
    resumenFinanciero.ventasTransferencia +
    resumenFinanciero.abonosTransferencia +
    resumenFinanciero.transferenciasIngresoTransferencia -
    resumenFinanciero.comprasTransferencia -
    resumenFinanciero.costosTransferencia -
    resumenFinanciero.pagosTransferencia -
    resumenFinanciero.anticiposTransferencia -
    resumenFinanciero.transferenciasEgresoTransferencia;
  const efectivoClass =
    balanceEfectivo >= 0 ? "text-green-600" : "text-red-600";
  const transferenciaClass =
    balanceTransferencia >= 0 ? "text-green-600" : "text-red-600";

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      {/* Componente Drawer de Transferencias */}
      <TransferenciaDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        metodosPago={metodosPago}
        balanceEfectivo={balanceEfectivo}
        balanceTransferencia={balanceTransferencia}
        onTransferenciaExitosa={handleTransferenciaExitosa}
      />

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-bold text-gray-800">Panel de Tesorería</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 cursor-pointer shadow-lg"
          >
            <FiRepeat />
            Transferir Fondos
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
          <button
            onClick={() => navigate("/ventas_credito")}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 cursor-pointer"
          >
            Ir a Créditos
            <FiArrowRight />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">
              Balance Efectivo
            </h3>
            <FiDollarSign size={28} className="text-gray-300" />
          </div>
          <div className={`text-3xl font-bold mb-3 ${efectivoClass}`}>
            {formatCurrency(balanceEfectivo)}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Ventas:</span>
              <span className="font-medium text-green-700">
                {formatCurrency(resumenFinanciero.ventasEfectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Abonos credito:</span>
              <span className="font-medium text-green-700">
                {formatCurrency(resumenFinanciero.abonosEfectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Compras:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.comprasEfectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Costos:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.costosEfectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pagos Trababajdores.:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.pagosEfectivo)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Anticipos:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.anticiposEfectivo)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-700">
              Balance Transferencia
            </h3>
            <FiCreditCard size={28} className="text-gray-300" />
          </div>
          <div className={`text-3xl font-bold mb-3 ${transferenciaClass}`}>
            {formatCurrency(balanceTransferencia)}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Ventas:</span>
              <span className="font-medium text-green-700">
                {formatCurrency(resumenFinanciero.ventasTransferencia)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Abonos:</span>
              <span className="font-medium text-green-700">
                {formatCurrency(resumenFinanciero.abonosTransferencia)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Compras:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.comprasTransferencia)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Costos:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.costosTransferencia)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Pagos Trab.:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.pagosTransferencia)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Anticipos:</span>
              <span className="font-medium text-red-700">
                -{formatCurrency(resumenFinanciero.anticiposTransferencia)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">
          Movimientos Recientes
        </h3>
        <div className="mb-4 flex flex-wrap gap-8 items-end">
          <div className="flex-1 max-w-[200px]">
            <label
              htmlFor="filtroTipo"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por Tipo
            </label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => {
                setFiltroTipo(e.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="todos">Todos</option>
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
              <option value="costo_indirecto">Costo Indirecto</option>
              <option value="pago_trabajador">Pagos a Trabajadores</option>
              <option value="anticipo">Anticipos</option>
              <option value="abono_credito">Abonos Crédito</option>
              <option value="transferencia_fondos">Transferencia fondos</option>
            </select>
          </div>
          <div className="flex-1 max-w-[200px]">
            <label
              htmlFor="filtroMetodo"
              className="block text-sm font-medium text-gray-700"
            >
              Filtrar por Método
            </label>
            <select
              id="filtroMetodo"
              value={filtroMetodo}
              onChange={(e) => {
                setFiltroMetodo(e.target.value);
                setPage(1);
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
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

        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">ID Referencia</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Método de Pago</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movimientosPaginados.length > 0 ? (
              movimientosPaginados.map((mov) => {
                const tipo = getTipoMovimiento(mov);
                const idRef = getIdReferencia(mov);
                // Color según símbolo '-' en el valor: si comienza con '-' -> rojo, si no -> verde
                const montoStr = String(mov.monto ?? "").trim();
                const montoColor = montoStr.startsWith("-")
                  ? "text-red-700"
                  : "text-green-700";
                const creditoInfo = mov.id_documento
                  ? cacheCreditos[mov.id_documento]
                  : null;
                const clienteNombre = creditoInfo
                  ? creditoInfo.cliente_nombre
                  : null;
                return (
                  <tr
                    key={mov.id_movimiento}
                    className="hover:bg-slate-100 transition"
                  >
                    <td className="px-4 py-3 font-medium">
                      {tipo.charAt(0).toUpperCase() +
                        tipo.slice(1).replace("_", " ")}
                    </td>
                    <td className="px-4 py-3">
                      #{idRef}
                      {clienteNombre ? ` · ${clienteNombre}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(mov.fecha_movimiento)}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${montoColor}`}>
                      {formatCurrency(mov.monto)}
                    </td>
                    <td className="px-4 py-3">
                      {getMetodoNombre(mov.id_metodo_pago)}
                    </td>
                    <td className="px-4 py-3">{mov.referencia || "-"}</td>
                    <td className="px-4 py-3">{mov.observaciones || "-"}</td>
                    <td className="px-4 py-3">
                      {tipo === "abono_credito" && mov.id_documento && (
                        <button
                          onClick={() =>
                            navigate("/ventas_credito", {
                              state: { openCreditId: mov.id_documento },
                            })
                          }
                          className="p-2 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          title="Ver crédito"
                        >
                          <FiCreditCard />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">
                  No se encontraron movimientos de tesorería que coincidan con
                  los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Paginación */}
        <div className="mt-4 bg-white rounded-lg p-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span>{" "}
              de{" "}
              <span className="font-semibold text-gray-800">
                {totalPages || 1}
              </span>{" "}
              — {totalFiltrados} movimientos
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNext}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value));
                  setPage(1);
                }}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 cursor-pointer"
              >
                <option value={10}>10 / página</option>
                <option value={25}>25 / página</option>
                <option value={50}>50 / página</option>
                <option value={100}>100 / página</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TesoreriaDashboard;
