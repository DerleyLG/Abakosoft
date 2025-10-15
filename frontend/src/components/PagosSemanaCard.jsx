import React from 'react';

const Divider = () => <div className="w-px bg-slate-200 mx-2 md:mx-4" />;

const Item = ({ label, value, color }) => (
  <div className="flex-1 min-w-0">
    <div className="text-xs text-slate-500 truncate">{label}</div>
    <div className={`text-xl font-bold ${color} truncate`}>{value}</div>
  </div>
);

const PagosSemanaCard = ({ pagos = 0, anticipos = 0, descuentos = 0, trend = null, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="text-sm text-slate-500 mb-2">PAGOS TRABAJADORES (SEMANA)</div>
      <div className="flex items-start md:items-center gap-2 md:gap-3">
        <Item label="Pagos" value={`$${Number(pagos).toLocaleString()}`} color="text-slate-900" />
        <Divider />
        <Item label="Anticipos" value={`$${Number(anticipos).toLocaleString()}`} color="text-amber-600" />
        <Divider />
        <Item label="Descuentos" value={`$${Number(descuentos).toLocaleString()}`} color="text-rose-600" />
      </div>
    </div>
  );
};

export default PagosSemanaCard;
