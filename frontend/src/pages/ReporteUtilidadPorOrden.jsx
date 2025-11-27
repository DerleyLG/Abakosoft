import React, { useState } from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteUtilidadPorOrden = () => {
  const [summary, setSummary] = useState([]);

  const titulo = "Reporte de Utilidad por Orden";


  const endpoint = `${import.meta.env.VITE_API_URL}/reportes/utilidad-por-orden`;


  const columnas = [
    { header: "ID Orden", accessor: "id_orden_fabricacion" },
    { header: "Cliente", accessor: "cliente" },
    { header: "Fecha", accessor: "fecha_inicio" },
    { header: "Costo de Mano de Obra", accessor: "costo_mano_obra", isCurrency: true },
    { header: "Total Ingresos", accessor: "total_ingresos", isCurrency: true },
    {
      header: "Utilidad",
      accessor: "utilidad",
      isCurrency: true
    },
  ];


  const filtros = [
    {
      name: "orden",
      label: "ID Orden",
      type: "text",
    },
    {
      name: "desde",
      label: "Fecha Desde",
      type: "datepicker",
    },
    {
      name: "hasta",
      label: "Fecha Hasta",
      type: "datepicker",
    },
  ];

  const handleDataChange = (rows) => {
    try {
      const arr = Array.isArray(rows) ? rows : [];
      const totalCostoManoObra = arr.reduce((acc, r) => acc + (Number(r?.costo_mano_obra) || 0), 0);
      const totalIngresos = arr.reduce((acc, r) => acc + (Number(r?.total_ingresos) || 0), 0);
      const totalUtilidad = arr.reduce((acc, r) => acc + (Number(r?.utilidad) || 0), 0);
      
      setSummary([
        { label: 'Total Costo de Mano de Obra', value: totalCostoManoObra, isCurrency: true },
        { label: 'Total Ingresos', value: totalIngresos, isCurrency: true },
        { label: 'Utilidad Total', value: totalUtilidad, isCurrency: true },
      ]);
    } catch {
      setSummary([]);
    }
  };

  return (
    <ReporteBase
      titulo={titulo}
      endpoint={endpoint}
      filtros={filtros}
      columnas={columnas}
      onDataChange={handleDataChange}
      exportSummary={summary}
      summaryVariant="prominent-all"
    />
  );
};

export default ReporteUtilidadPorOrden;