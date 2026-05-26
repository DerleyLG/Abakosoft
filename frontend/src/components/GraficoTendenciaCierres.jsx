import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const GraficoTendenciaCierres = ({ cierres }) => {
  const cierresCerrados = useMemo(() => {
    return cierres
      .filter((c) => c.estado === "cerrado")
      .slice(0, 10)
      .reverse();
  }, [cierres]);

  const data = useMemo(() => {
    const labels = cierresCerrados.map((c, index) => {
      // Usar fecha_fin (fecha de cierre) en lugar de fecha_inicio
      const fechaFin = new Date(c.fecha_fin || c.fecha_inicio);
      const mes = fechaFin.toLocaleDateString("es-CO", { month: "short" });
      const dia = fechaFin.getDate();

      // Si solo hay un cierre, mostrar rango completo
      if (cierresCerrados.length === 1) {
        const fechaInicio = new Date(c.fecha_inicio);
        const diaInicio = fechaInicio.getDate();
        const mesInicio = fechaInicio.toLocaleDateString("es-CO", {
          month: "short",
        });
        return `${diaInicio} ${mesInicio} - ${dia} ${mes}`;
      }

      return `${dia} ${mes}`;
    });

    const ingresos = cierresCerrados.map((c) => c.total_ingresos_total || 0);

    const egresos = cierresCerrados.map((c) => c.total_egresos_total || 0);

    return {
      labels,
      datasets: [
        {
          label: "Ingresos",
          data: ingresos,
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.3,
          fill: true,
          pointRadius: cierresCerrados.length === 1 ? 8 : 4,
          pointHoverRadius: cierresCerrados.length === 1 ? 10 : 6,
        },
        {
          label: "Egresos",
          data: egresos,
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.3,
          fill: true,
          pointRadius: cierresCerrados.length === 1 ? 8 : 4,
          pointHoverRadius: cierresCerrados.length === 1 ? 10 : 6,
        },
      ],
    };
  }, [cierresCerrados]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: "bold",
          },
        },
      },
      tooltip: {
        mode: "index",
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat("es-CO", {
                style: "currency",
                currency: "COP",
                minimumFractionDigits: 0,
              }).format(context.parsed.y);
            }
            return label;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
              notation: "compact",
              compactDisplay: "short",
            }).format(value);
          },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  if (cierresCerrados.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Tendencia
        </p>
        <h3 className="text-sm font-bold text-slate-900 mb-4">
          Ingresos y Egresos
        </h3>
        <div className="flex flex-col items-center justify-center h-52 text-slate-400">
          <svg
            className="w-12 h-12 mb-3 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-sm text-center">
            Sin períodos cerrados aún.
            <br />
            <span className="text-xs">
              Cierra al menos dos períodos para ver la tendencia.
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Si solo hay 1 período, mostrar resumen en lugar de gráfico
  if (cierresCerrados.length === 1) {
    const cierre = cierresCerrados[0];
    const formatMonto = (monto) => {
      return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(monto);
    };

    const formatFecha = (fecha) => {
      if (!fecha) return "-";
      const [year, month, day] = fecha.split("T")[0].split("-");
      return new Date(year, month - 1, day).toLocaleDateString("es-CO");
    };

    return (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Tendencia
        </p>
        <h3 className="text-sm font-bold text-slate-900 mb-3">
          Primer Período Cerrado
        </h3>
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4">
          <p className="text-xs text-indigo-700">
            Al cerrar más períodos (mínimo 2) verás un gráfico comparativo de
            tendencias.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Período
            </p>
            <p className="text-sm font-semibold text-slate-700">
              {formatFecha(cierre.fecha_inicio)}
            </p>
            <p className="text-xs text-slate-500">
              al {formatFecha(cierre.fecha_fin)}
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
              Total Ingresos
            </p>
            <p className="text-xl font-extrabold text-emerald-700">
              {formatMonto(cierre.total_ingresos_total || 0)}
            </p>
          </div>
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
              Total Egresos
            </p>
            <p className="text-xl font-extrabold text-rose-600">
              {formatMonto(cierre.total_egresos_total || 0)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Mensaje header para 2+ cierres
  const mensajeHeader = `Últimos ${cierresCerrados.length} períodos cerrados`;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tendencia
          </p>
          <h3 className="text-sm font-bold text-slate-900 -mt-0.5">
            Ingresos y Egresos
          </h3>
        </div>
        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-bold rounded-lg">
          {mensajeHeader}
        </span>
      </div>
      <div className="h-64">
        <Line options={options} data={data} />
      </div>
    </div>
  );
};

export default GraficoTendenciaCierres;
