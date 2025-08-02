import React from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteVentasPorPeriodo = () => {
  const titulo = "Ventas por periodo";
  const endpoint = "http://localhost:3300/api/reportes/ventas-periodo";

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

  return (
    <ReporteBase
      titulo={titulo}
      endpoint={endpoint}
      columnas={columnas}
      filtros={filtros}
    />
  );
};

export default ReporteVentasPorPeriodo;
