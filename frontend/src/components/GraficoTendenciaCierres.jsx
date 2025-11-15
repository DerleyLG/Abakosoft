import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const GraficoTendenciaCierres = ({ cierres }) => {
  const cierresCerrados = useMemo(() => {
    return cierres
      .filter(c => c.estado === 'cerrado')
      .slice(0, 10)
      .reverse();
  }, [cierres]);

  const data = useMemo(() => {
    const labels = cierresCerrados.map((c, index) => {
      // Usar fecha_fin (fecha de cierre) en lugar de fecha_inicio
      const fechaFin = new Date(c.fecha_fin || c.fecha_inicio);
      const mes = fechaFin.toLocaleDateString('es-CO', { month: 'short' });
      const dia = fechaFin.getDate();
      
      // Si solo hay un cierre, mostrar rango completo
      if (cierresCerrados.length === 1) {
        const fechaInicio = new Date(c.fecha_inicio);
        const diaInicio = fechaInicio.getDate();
        const mesInicio = fechaInicio.toLocaleDateString('es-CO', { month: 'short' });
        return `${diaInicio} ${mesInicio} - ${dia} ${mes}`;
      }
      
      return `${dia} ${mes}`;
    });

    const ingresos = cierresCerrados.map(c => 
      c.total_ingresos_total || 0
    );

    const egresos = cierresCerrados.map(c => 
      c.total_egresos_total || 0
    );

    return {
      labels,
      datasets: [
        {
          label: 'Ingresos',
          data: ingresos,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: cierresCerrados.length === 1 ? 8 : 4,
          pointHoverRadius: cierresCerrados.length === 1 ? 10 : 6
        },
        {
          label: 'Egresos',
          data: egresos,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true,
          pointRadius: cierresCerrados.length === 1 ? 8 : 4,
          pointHoverRadius: cierresCerrados.length === 1 ? 10 : 6
        }
      ]
    };
  }, [cierresCerrados]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
              }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              minimumFractionDigits: 0,
              notation: 'compact',
              compactDisplay: 'short'
            }).format(value);
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (cierresCerrados.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Tendencia de Ingresos y Egresos</h3>
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-center">
            No hay períodos cerrados aún.<br />
            <span className="text-sm">Cierra al menos dos períodos para ver la tendencia.</span>
          </p>
        </div>
      </div>
    );
  }

  // Si solo hay 1 período, mostrar resumen en lugar de gráfico
  if (cierresCerrados.length === 1) {
    const cierre = cierresCerrados[0];
    const formatMonto = (monto) => {
      return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(monto);
    };

    const formatFecha = (fecha) => {
      if (!fecha) return '-';
      const [year, month, day] = fecha.split('T')[0].split('-');
      return new Date(year, month - 1, day).toLocaleDateString('es-CO');
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Resumen del Primer Período Cerrado
        </h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-700">
         Al cerrar más períodos (mínimo 2), podrás visualizar un gráfico comparativo de tendencias.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Período */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-gray-600 uppercase">Período</span>
            </div>
            <p className="text-sm text-gray-700">
              {formatFecha(cierre.fecha_inicio)} <br />al {formatFecha(cierre.fecha_fin)}
            </p>
          </div>

          {/* Ingresos */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-xs font-medium text-green-700 uppercase">Total Ingresos</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatMonto(cierre.total_ingresos_total || 0)}
            </p>
          </div>

          {/* Egresos */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
              </svg>
              <span className="text-xs font-medium text-red-700 uppercase">Total Egresos</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
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
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Tendencia de Ingresos y Egresos
        <span className="text-sm font-normal text-gray-500 ml-2">
          ({mensajeHeader})
        </span>
      </h3>
      <div className="h-64">
        <Line options={options} data={data} />
      </div>
    </div>
  );
};

export default GraficoTendenciaCierres;
