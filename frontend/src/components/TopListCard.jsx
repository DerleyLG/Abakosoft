import React from 'react';
import { Link } from 'react-router-dom';

const TopListCard = ({ title, items = [], className = '', to }) => {
  const max = Math.max(1, ...items.map(i => Number(i.total) || 0));
  const Container = to ? Link : 'div';
  const containerProps = to ? { to } : {};
  return (
    <Container 
      {...containerProps}
      className={`bg-white rounded-lg shadow p-4 ${to ? 'hover:shadow-md transition-shadow cursor-pointer' : ''} ${className}`}
    >
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-slate-500">Sin datos en el periodo.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, idx) => {
            const val = Number(it.total) || 0;
            const width = Math.round((val / max) * 100);
            return (
              <li key={idx} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-7 text-right">{idx + 1}.</span>
                <div className="flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate pr-2">{it.descripcion}</span>
                    <span className="font-semibold">{val}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded mt-1">
                    <div className="h-1.5 bg-blue-600 rounded" style={{ width: `${width}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
};

export default TopListCard;
