import React, { useMemo, useState } from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteVentasPorPeriodo = () => {
  const titulo = "Ventas por periodo";
  const endpoint = `${import.meta.env.VITE_API_URL}/reportes/ventas-periodo`;
  const [summary, setSummary] = useState([]);

  const columnas = [
    { header: "ID Orden", accessor: "id_orden_venta" },
    { header: "Fecha", accessor: "fecha" },
    { header: "Cliente", accessor: "cliente" },
    { header: "Estado", accessor: "estado" },
      { header: "Total", accessor: "total_venta", isCurrency: true},
  ];

  const filtros = [
    {
      name: "fecha_inicio",
      label: "Desde",
      type: "datepicker",
    },
    {
      name: "fecha_fin",
      label: "Hasta",
      type: "datepicker",
    }
  ];

  const handleDataChange = (rows) => {
    try {
      const total = (Array.isArray(rows) ? rows : []).reduce((acc, r) => {
        const val = Number(r?.total_venta) || 0;
        return acc + val;
      }, 0);
      const count = Array.isArray(rows) ? rows.length : 0;
      setSummary([
        { label: 'Registros', value: count },
        { label: 'Subtotal Ventas', value: total, isCurrency: true },
      ]);
    } catch {
      setSummary([]);
    }
  };

  return (
    <ReporteBase
      titulo={titulo}
      endpoint={endpoint}
      columnas={columnas}
      filtros={filtros}
      onDataChange={handleDataChange}
      exportSummary={summary}
    />
  );
};

export default ReporteVentasPorPeriodo;
