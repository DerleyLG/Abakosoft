import * as React from "react";
import {
  FiBox,
  FiDollarSign,
  FiX,
  FiPieChart,
  FiPackage,
  FiTruck,
  FiPercent,
} from "react-icons/fi";

const ProrrateoOrdenDrawer = ({
  open,
  onClose,
  prorrateoPorArticulo,
  avancesReales,
  resumen,
  ordenes = [],
  totales = {},
}) => {
  if (!open) return null;

  const etapaColors = {
    Mecanizado: {
      bg: "bg-blue-50",
      text: "text-blue-700",
      border: "border-blue-200",
      dot: "bg-blue-500",
      gradient: "from-blue-500 to-blue-600",
      light: "bg-blue-100",
    },
    Pintura: {
      bg: "bg-pink-50",
      text: "text-pink-700",
      border: "border-pink-200",
      dot: "bg-pink-500",
      gradient: "from-pink-500 to-pink-600",
      light: "bg-pink-100",
    },
    Tapizado: {
      bg: "bg-green-50",
      text: "text-green-700",
      border: "border-green-200",
      dot: "bg-green-500",
      gradient: "from-green-500 to-green-600",
      light: "bg-green-100",
    },
    Pulido: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      dot: "bg-amber-500",
      gradient: "from-amber-500 to-amber-600",
      light: "bg-amber-100",
    },
    Ensamble: {
      bg: "bg-purple-50",
      text: "text-purple-700",
      border: "border-purple-200",
      dot: "bg-purple-500",
      gradient: "from-purple-500 to-purple-600",
      light: "bg-purple-100",
    },
  };
  const getColor = (nombre) =>
    etapaColors[nombre] || {
      bg: "bg-slate-50",
      text: "text-slate-700",
      border: "border-slate-200",
      dot: "bg-slate-400",
      gradient: "from-slate-500 to-slate-600",
      light: "bg-slate-100",
    };

  const etapasData = {};
  if (Array.isArray(avancesReales)) {
    avancesReales.forEach((av) => {
      const etapaNombre = av.nombre_etapa || "Sin etapa";
      if (!etapasData[etapaNombre]) {
        etapasData[etapaNombre] = { articulos: {}, totalPrecioVenta: 0 };
      }
      const artKey = av.id_articulo;
      if (!etapasData[etapaNombre].articulos[artKey]) {
        etapasData[etapaNombre].articulos[artKey] = {
          id_articulo: av.id_articulo,
          descripcion:
            av.descripcion_articulo || av.descripcion || "Sin descripcion",
          referencia: av.referencia || "",
          precio_venta: Number(av.precio_venta) || 0,
          cantidad_avanzada: 0,
          ordenes: {},
        };
      }
      etapasData[etapaNombre].articulos[artKey].cantidad_avanzada +=
        Number(av.cantidad_avanzada) || 0;
      const ordenId = av.id_orden_fabricacion;
      if (ordenId) {
        if (!etapasData[etapaNombre].articulos[artKey].ordenes[ordenId]) {
          etapasData[etapaNombre].articulos[artKey].ordenes[ordenId] = 0;
        }
        etapasData[etapaNombre].articulos[artKey].ordenes[ordenId] +=
          Number(av.cantidad_avanzada) || 0;
      }
    });
  }

  const consumosPorEtapa = {};
  if (Array.isArray(resumen)) {
    resumen.forEach((c) => {
      const etapaNombre = c.nombre_etapa || "Sin etapa";
      if (!consumosPorEtapa[etapaNombre]) {
        consumosPorEtapa[etapaNombre] = {
          totalCosto: 0,
          unidadesPorTipo: {},
          articulos: [],
        };
      }
      consumosPorEtapa[etapaNombre].totalCosto += Number(c.costo_total) || 0;
      // Agrupar por tipo de unidad
      const unidad = c.abreviatura_unidad || "uds";
      if (!consumosPorEtapa[etapaNombre].unidadesPorTipo[unidad]) {
        consumosPorEtapa[etapaNombre].unidadesPorTipo[unidad] = 0;
      }
      consumosPorEtapa[etapaNombre].unidadesPorTipo[unidad] +=
        Number(c.total_consumido) || 0;
      consumosPorEtapa[etapaNombre].articulos.push(c);
    });
  }

  // Helper para formatear unidades por tipo
  const formatUnidadesPorTipo = (unidadesPorTipo) => {
    if (!unidadesPorTipo || Object.keys(unidadesPorTipo).length === 0) {
      return "0 uds";
    }
    return Object.entries(unidadesPorTipo)
      .map(([unidad, cantidad]) => `${Number(cantidad).toFixed(1)} ${unidad}`)
      .join(", ");
  };

  Object.keys(etapasData).forEach((etapaNombre) => {
    const etapa = etapasData[etapaNombre];
    etapa.totalPrecioVenta = Object.values(etapa.articulos).reduce(
      (sum, art) => sum + art.precio_venta * art.cantidad_avanzada,
      0,
    );
    etapa.totalCostoConsumo = consumosPorEtapa[etapaNombre]?.totalCosto || 0;
    etapa.unidadesPorTipo =
      consumosPorEtapa[etapaNombre]?.unidadesPorTipo || {};
  });

  const ordenesProrrateo = {};
  avancesReales.forEach((av) => {
    const ordenId = av.id_orden_fabricacion;
    if (!ordenId) return;
    if (!ordenesProrrateo[ordenId]) {
      const ordenInfo =
        ordenes.find((o) => o.id_orden_fabricacion === ordenId) || {};
      ordenesProrrateo[ordenId] = {
        id_orden_fabricacion: ordenId,
        nombre_cliente: ordenInfo.nombre_cliente || "Sin cliente",
        etapas: {},
        totalPrecioVenta: 0,
        totalCostoEstimado: 0,
      };
    }
    const etapaNombre = av.nombre_etapa || "Sin etapa";
    if (!ordenesProrrateo[ordenId].etapas[etapaNombre]) {
      ordenesProrrateo[ordenId].etapas[etapaNombre] = {
        cantidad: 0,
        precioVenta: 0,
      };
    }
    const cantidad = Number(av.cantidad_avanzada) || 0;
    const precioVenta = Number(av.precio_venta) || 0;
    ordenesProrrateo[ordenId].etapas[etapaNombre].cantidad += cantidad;
    ordenesProrrateo[ordenId].etapas[etapaNombre].precioVenta +=
      cantidad * precioVenta;
    ordenesProrrateo[ordenId].totalPrecioVenta += cantidad * precioVenta;
  });

  const totalGeneralPrecioVenta = Object.values(ordenesProrrateo).reduce(
    (sum, o) => sum + o.totalPrecioVenta,
    0,
  );
  const totalGeneralCosto = Number(totales.costo_total) || 0;
  Object.values(ordenesProrrateo).forEach((orden) => {
    orden.porcentaje =
      totalGeneralPrecioVenta > 0
        ? (orden.totalPrecioVenta / totalGeneralPrecioVenta) * 100
        : 0;
    orden.totalCostoEstimado = (orden.porcentaje / 100) * totalGeneralCosto;
    Object.keys(orden.etapas).forEach((etapaNombre) => {
      const etapaGlobal = etapasData[etapaNombre];
      const etapaOrden = orden.etapas[etapaNombre];
      etapaOrden.porcentaje =
        etapaGlobal?.totalPrecioVenta > 0
          ? (etapaOrden.precioVenta / etapaGlobal.totalPrecioVenta) * 100
          : 0;
      etapaOrden.costoEstimado =
        (etapaOrden.porcentaje / 100) * (etapaGlobal?.totalCostoConsumo || 0);
      // Calcular consumo prorrateado por tipo de unidad
      etapaOrden.unidadesProrrateadas = {};
      if (etapaGlobal?.unidadesPorTipo) {
        Object.entries(etapaGlobal.unidadesPorTipo).forEach(
          ([unidad, cantidad]) => {
            etapaOrden.unidadesProrrateadas[unidad] =
              (etapaOrden.porcentaje / 100) * cantidad;
          },
        );
      }
    });
  });

  const formatMoneda = (v) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(v || 0);
  // Solo etapas que tienen consumo de materia prima registrado
  const etapasArray = Object.entries(etapasData).filter(
    ([etapaNombre, etapa]) =>
      etapa.totalCostoConsumo > 0 ||
      Object.keys(etapa.unidadesPorTipo || {}).length > 0,
  );
  const hayDatos = etapasArray.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative ml-auto w-full max-w-6xl bg-gradient-to-br from-slate-50 to-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 px-8 py-5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-2xl p-3">
                <FiPieChart className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Prorrateo Detallado
                </h2>
                <p className="text-blue-100 text-sm">
                  Distribucion de costos por etapa y orden
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right text-white">
                <p className="text-xs text-blue-200">Costo Total Semana</p>
                <p className="text-2xl font-bold">
                  {formatMoneda(totalGeneralCosto)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white hover:bg-white/20 rounded-xl p-2 transition cursor-pointer"
              >
                <FiX size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hayDatos ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <FiPackage className="text-6xl mb-4" />
              <p className="text-xl font-medium">No hay datos de avances</p>
              <p className="text-sm">
                Registra avances de produccion para ver el prorrateo
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECCION 1: Prorrateo por Etapa - Una tabla por etapa, ancho completo */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FiBox className="text-emerald-600" />
                  Prorrateo por Etapa de Produccion
                </h3>
                <div className="space-y-6">
                  {etapasArray.map(([etapaNombre, etapa]) => {
                    const colors = getColor(etapaNombre);
                    const articulosArray = Object.values(etapa.articulos);
                    return (
                      <div
                        key={etapaNombre}
                        className={`rounded-2xl border-2 ${colors.border} overflow-hidden shadow-md`}
                      >
                        <div
                          className={`bg-gradient-to-r ${colors.gradient} px-6 py-4`}
                        >
                          <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                              <FiBox className="text-2xl" />
                              <div>
                                <span className="font-bold text-xl">
                                  {etapaNombre}
                                </span>
                                <p className="text-white/80 text-sm">
                                  {articulosArray.length} articulos avanzados
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <div className="text-right">
                                <p className="text-white/80 text-xs">
                                  Total P.Venta
                                </p>
                                <p className="font-bold text-lg">
                                  {formatMoneda(etapa.totalPrecioVenta)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/80 text-xs">
                                  Costo Consumo
                                </p>
                                <p className="font-bold text-lg">
                                  {formatMoneda(etapa.totalCostoConsumo)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-white/80 text-xs">
                                  Consumido
                                </p>
                                <p className="font-bold text-sm">
                                  {formatUnidadesPorTipo(etapa.unidadesPorTipo)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`${colors.bg}`}>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white/80 text-slate-700 border-b border-slate-200">
                                  <th className="text-left py-3 px-4 font-semibold">
                                    Articulo
                                  </th>
                                  <th className="text-center py-3 px-3 font-semibold w-20">
                                    Cant. Avanz.
                                  </th>
                                  <th className="text-right py-3 px-3 font-semibold w-28">
                                    P. Venta Unit.
                                  </th>
                                  <th className="text-right py-3 px-3 font-semibold w-32">
                                    Total P. Venta
                                  </th>
                                  <th className="text-center py-3 px-3 font-semibold w-20">
                                    %
                                  </th>
                                  <th className="text-right py-3 px-4 font-semibold w-32">
                                    Costo Est.
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/50">
                                {articulosArray.map((art) => {
                                  const totalArticulo =
                                    art.precio_venta * art.cantidad_avanzada;
                                  const porcentaje =
                                    etapa.totalPrecioVenta > 0
                                      ? (totalArticulo /
                                          etapa.totalPrecioVenta) *
                                        100
                                      : 0;
                                  const costoEstimado =
                                    (porcentaje / 100) *
                                    etapa.totalCostoConsumo;
                                  return (
                                    <tr
                                      key={art.id_articulo}
                                      className="hover:bg-white/60 transition bg-white/40"
                                    >
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`}
                                          ></span>
                                          <div>
                                            <p className="font-medium text-slate-800">
                                              {art.descripcion}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                              {art.referencia || "Sin ref."}
                                            </p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="text-center py-3 px-3 font-semibold text-slate-700">
                                        {art.cantidad_avanzada}
                                      </td>
                                      <td className="text-right py-3 px-3 text-slate-600">
                                        {formatMoneda(art.precio_venta)}
                                      </td>
                                      <td className="text-right py-3 px-3 font-semibold text-slate-800">
                                        {formatMoneda(totalArticulo)}
                                      </td>
                                      <td
                                        className={`text-center py-3 px-3 font-bold ${colors.text}`}
                                      >
                                        {porcentaje.toFixed(1)}%
                                      </td>
                                      <td className="text-right py-3 px-4 font-bold text-emerald-600">
                                        {formatMoneda(costoEstimado)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr className="bg-white font-bold border-t-2 border-slate-300">
                                  <td className="py-3 px-4 text-slate-800">
                                    TOTAL ETAPA
                                  </td>
                                  <td className="text-center py-3 px-3 text-slate-800">
                                    {articulosArray.reduce(
                                      (s, a) => s + a.cantidad_avanzada,
                                      0,
                                    )}
                                  </td>
                                  <td className="py-3 px-3"></td>
                                  <td
                                    className={`text-right py-3 px-3 ${colors.text}`}
                                  >
                                    {formatMoneda(etapa.totalPrecioVenta)}
                                  </td>
                                  <td className="text-center py-3 px-3 text-slate-800">
                                    100%
                                  </td>
                                  <td className="text-right py-3 px-4 text-emerald-700">
                                    {formatMoneda(etapa.totalCostoConsumo)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECCION 2: Prorrateo por Orden de Fabricacion */}
              {Object.keys(ordenesProrrateo).length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FiTruck className="text-indigo-600" />
                    Prorrateo por Orden de Fabricacion
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.values(ordenesProrrateo)
                      .sort((a, b) => b.porcentaje - a.porcentaje)
                      .map((orden) => (
                        <div
                          key={orden.id_orden_fabricacion}
                          className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md hover:shadow-lg transition-all"
                        >
                          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white text-lg">
                                  OF #{orden.id_orden_fabricacion}
                                </p>
                                <p className="text-slate-300 text-sm truncate max-w-[150px]">
                                  {orden.nombre_cliente}
                                </p>
                              </div>
                              <div className="bg-amber-500/20 rounded-xl px-3 py-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-xl font-bold text-amber-400">
                                    {orden.porcentaje.toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="p-4 bg-gradient-to-b from-emerald-50 to-white border-b border-emerald-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-500">
                                  Costo Estimado
                                </p>
                                <p className="text-xl font-bold text-emerald-700">
                                  {formatMoneda(orden.totalCostoEstimado)}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">
                              Desglose por Etapa
                            </p>
                            <div className="space-y-2">
                              {Object.entries(orden.etapas)
                                .filter(
                                  ([etapaNombre]) =>
                                    etapasData[etapaNombre]?.totalCostoConsumo >
                                      0 ||
                                    Object.keys(
                                      etapasData[etapaNombre]
                                        ?.unidadesPorTipo || {},
                                    ).length > 0,
                                )
                                .map(([etapaNombre, etapaData]) => {
                                  const colors = getColor(etapaNombre);
                                  return (
                                    <div
                                      key={etapaNombre}
                                      className={`p-2.5 rounded-lg ${colors.light} border ${colors.border}`}
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`w-2 h-2 rounded-full ${colors.dot}`}
                                          ></span>
                                          <span
                                            className={`text-sm font-semibold ${colors.text}`}
                                          >
                                            {etapaNombre}
                                          </span>
                                        </div>
                                        <span
                                          className={`text-xs font-bold ${colors.text}`}
                                        >
                                          {etapaData.porcentaje.toFixed(1)}%
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">
                                          {etapaData.cantidad} avanz. |{" "}
                                          {formatUnidadesPorTipo(
                                            etapaData.unidadesProrrateadas,
                                          )}
                                        </span>
                                        <span className="font-semibold text-emerald-600">
                                          {formatMoneda(
                                            etapaData.costoEstimado,
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Explicacion del calculo */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-200">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 rounded-xl p-2 text-blue-600">
                    <FiDollarSign className="text-xl" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 mb-3">
                      ¿Cómo se calcula el prorrateo?
                    </h4>
                    <div className="space-y-3 text-xs text-slate-600">
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <p className="font-semibold text-slate-700 mb-2">
                          1. Calcular el peso de cada orden:
                        </p>
                        <p className="mb-1">
                          Se suma el{" "}
                          <strong>precio de venta × cantidad avanzada</strong>{" "}
                          de todos los artículos que avanzaron en esa orden
                          durante el período.
                        </p>
                        <p className="text-blue-600 font-medium">
                          Ejemplo: Si la OF #1 avanzó 5 sillas de $100,000 c/u =
                          $500,000 de precio venta total
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <p className="font-semibold text-slate-700 mb-2">
                          2. Calcular el porcentaje de cada orden:
                        </p>
                        <p className="mb-1">
                          <strong>
                            % Orden = (Precio Venta de la Orden / Precio Venta
                            Total de todas las Órdenes) × 100
                          </strong>
                        </p>
                        <p className="text-blue-600 font-medium">
                          Ejemplo: Si el total general es $1,000,000, entonces
                          OF #1 tiene 50% del prorrateo
                        </p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                        <p className="font-semibold text-slate-700 mb-2">
                          3. Distribuir el consumo de MP:
                        </p>
                        <p className="mb-1">
                          <strong>
                            Costo Estimado = % de la Orden × Costo Total de
                            Consumo de MP
                          </strong>
                        </p>
                        <p className="text-blue-600 font-medium">
                          Ejemplo: Si se consumieron $200,000 en MP, OF #1
                          recibe 50% = $100,000
                        </p>
                      </div>
                      <p className="text-slate-500 italic mt-2">
                        La lógica es: quien produce artículos de mayor valor
                        (precio de venta) consume proporcionalmente más materia
                        prima.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProrrateoOrdenDrawer;
