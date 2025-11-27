import React, { useState } from 'react';
import ReporteBase from '../components/ReporteBase'; 

const ReporteOrdenesCompra = () => {
  const [summary, setSummary] = useState([]);

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

  const handleDataChange = (rows) => {
    try {
      const total = (Array.isArray(rows) ? rows : []).reduce((acc, r) => {
        const val = Number(r?.total) || 0;
        return acc + val;
      }, 0);
      const count = Array.isArray(rows) ? rows.length : 0;
      setSummary([
        { label: 'Registros', value: count },
        { label: 'Total Compras', value: total, isCurrency: true },
      ]);
    } catch {
      setSummary([]);
    }
  };

  return (
    <ReporteBase
    
      endpoint={`${import.meta.env.VITE_API_URL}/reportes/ordenes-compra`}
      columnas={columnasOrdenesCompra}
      titulo="Reporte de órdenes de compra"
      filtros={filtrosOrdenesCompra}
      onDataChange={handleDataChange}
      exportSummary={summary}
    />
  );
};

export default ReporteOrdenesCompra;