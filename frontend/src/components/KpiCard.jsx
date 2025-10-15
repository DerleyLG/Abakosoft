import React from 'react';

const Trend = ({ value }) => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  const up = n >= 0;
  const color = up ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50';
  const arrow = up ? '▲' : '▼';
  return (
    <span className={`ml-2 inline-flex items-center px-2 py-0.5 text-xs rounded ${color}`}>
      {arrow} {Math.abs(n).toLocaleString()}%
    </span>
  );
};

const KpiCard = ({ title, value, prefix = '', suffix = '', trend = null, to, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">
        {prefix}{value}{suffix}
        <Trend value={trend} />
      </div>
    </div>
  );
};

export default KpiCard;
