import React from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteAvanceFabricacion = () => {
    // Título del reporte
    const titulo = "Avances en fabricacion";

    // Endpoint de la API para este reporte
    const endpoint = `${import.meta.env.VITE_API_URL}/reportes/avance-fabricacion`;


 const filtros = [
    {
      name: "desde",
      label: "Desde",
      type: "datepicker",
    },
    {
      name: "hasta",
      label: "Hasta",
      type: "datepicker",
    },
 
  ];

    const columnas = [
        { header: "ID Orden Fabricación", accessor: "id_orden_fabricacion" },
        { header: "Etapa", accessor: "etapa" },
        { header: "Fecha Registro", accessor: "fecha_registro" },
        { header: "Trabajador", accessor: "trabajador" },
        { header: "Estado", accessor: "estado" },
        { header: "Observaciones", accessor: "observaciones" },
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

export default ReporteAvanceFabricacion;
