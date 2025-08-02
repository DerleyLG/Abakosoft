import React from 'react';
import ReporteBase from '../components/ReporteBase'; // Asegúrate de que la ruta sea correcta

const ReporteOrdenesCompra = () => {

  const columnasOrdenesCompra = [
    { header: 'ID Orden', accessor: 'id_orden_compra' }, 
    { header: 'Fecha Orden', accessor: 'fecha' }, 
    { header: 'Proveedor', accessor: 'proveedor' },
    { header: 'Total', accessor: 'total', isCurrency: true },
    
    
   
  ];

  
  const filtrosOrdenesCompra = [
    {
      name: 'desde', 
      label: 'Fecha Inicio',
      type: 'datepicker',
    },
    {
      name: 'hasta', 
      label: 'Fecha Fin',
      type: 'datepicker',
    },

  ];

  return (
    <ReporteBase
    
      endpoint="http://localhost:3300/api/reportes/ordenes-compra"
      columnas={columnasOrdenesCompra}
      titulo="Reporte de órdenes de compra"
      filtros={filtrosOrdenesCompra}
    />
  );
};

export default ReporteOrdenesCompra;