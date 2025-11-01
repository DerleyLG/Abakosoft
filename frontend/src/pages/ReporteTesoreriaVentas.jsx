import React, { useMemo, useState } from 'react';
import ReporteBase from '../components/ReporteBase';

const ReporteTesoreriaVentas = () => {
  const titulo = 'Tesorería: Ventas y Cobros';
  const endpoint = `${import.meta.env.VITE_API_URL}/tesoreria/ventas-cobros`;
  const [summary, setSummary] = useState([]);

  const columnas = [
    { header: 'Documento', accessor: 'documento' },
    { header: 'Fecha', accessor: 'fecha' },
    { header: 'Cliente', accessor: 'cliente' },
    { header: 'Formas de pago', accessor: 'formas_pago' },
    { header: 'Total Factura', accessor: 'total_factura', isCurrency: true },
    { header: 'Pagado', accessor: 'total_pagado', isCurrency: true },
    { header: 'Saldo', accessor: 'saldo', isCurrency: true },
    { header: 'Estado de pago', accessor: 'estado_pago' },
  ];

  const filtros = [
    { name: 'desde', label: 'Desde', type: 'datepicker' },
    { name: 'hasta', label: 'Hasta', type: 'datepicker' },
  ];

  const handleDataChange = (rows) => {
    try {
      const arr = Array.isArray(rows) ? rows : [];
      const totalFacturado = arr.reduce((acc, r) => acc + (Number(r?.total_factura) || 0), 0);
      const totalPagado = arr.reduce((acc, r) => acc + (Number(r?.total_pagado) || 0), 0);
      const totalSaldo = arr.reduce((acc, r) => acc + (Number(r?.saldo) || 0), 0);
      setSummary([
        { label: 'Total valor recibido', value: totalPagado, isCurrency: true },
        { label: 'Total saldo pendiente', value: totalSaldo, isCurrency: true },
        { label: 'Total facturado', value: totalFacturado, isCurrency: true },
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

export default ReporteTesoreriaVentas;
