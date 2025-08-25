import React from 'react';
import ReporteBase from '../components/ReporteBase'; 
const ReporteCostosProduccion = () => {

  const titulo = "Costos en la producción";
  

  const endpoint = `${import.meta.env.VITE_API_URL}/reportes/costos-produccion` ;


  const columnas = [
    { header: "ID Orden", accessor: "id_orden_fabricacion" },
    { header: "Fecha", accessor: "fecha_inicio" },
    { header: "Costo de Artículos", accessor: "costo_articulos", isCurrency: true },
    { header: "Costo de Mano de Obra", accessor: "costo_mano_obra", isCurrency: true },
    { 

    header: "Costo Total",
    accessor: (row) => (Number(row.costo_articulos) || 0) + (Number(row.costo_mano_obra) || 0),
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

export default ReporteCostosProduccion;