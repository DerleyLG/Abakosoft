import React from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteUtilidadPorOrden = () => {

  const titulo = "Reporte de Utilidad por Orden";


  const endpoint = `${import.meta.env.VITE_API_URL}/reportes/utilidad-por-orden`;


  const columnas = [
    { header: "ID Orden", accessor: "id_orden_fabricacion" },
    { header: "Fecha", accessor: "fecha_inicio" },
    { header: "Costo de Artículos", accessor: "costo_articulos", isCurrency: true },
    { header: "Costo de Mano de Obra", accessor: "costo_mano_obra", isCurrency: true },
    { header: "Total Ingresos", accessor: "total_ingresos", isCurrency: true },
    {
      header: "Utilidad",
      accessor: (row) =>
        (parseFloat(row.total_ingresos) || 0) -
        ((parseFloat(row.costo_articulos) || 0) + (parseFloat(row.costo_mano_obra) || 0)),
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

  return (
    <ReporteBase
      titulo={titulo}
      endpoint={endpoint}
      filtros={filtros}
      columnas={columnas}
    />
  );
};

export default ReporteUtilidadPorOrden;