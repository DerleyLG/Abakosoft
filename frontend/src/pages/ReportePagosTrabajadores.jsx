import React from 'react';
import ReporteBase from '../components/ReporteBase'; 
const ReportePagosTrabajadores = () => {

  const titulo = "Reporte de Pagos a Trabajadores";

  const endpoint = "http://localhost:3300/api/reportes/pagos-trabajadores"; 

  const columnas = [
    { header: "ID Pago", accessor: "id_pago" },
    { header: "Fecha Pago", accessor: "fecha_pago" },
    { header: "Monto Total", accessor: "monto_total", isCurrency: true },
    { header: "Trabajador", accessor: "trabajador" }, // 'AS trabajador' en SQL

  ];


  const filtros = [
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

export default ReportePagosTrabajadores;