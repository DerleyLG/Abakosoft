import React from 'react';
import { Link } from 'react-router-dom';

const OrdenesEnProceso = ({ ordenes, to }) => {
  return (
    <div className="flex-1">
      <Link 
        to={to} 
        className="relative block h-full bg-white rounded-lg shadow-md p-4 transition-transform duration-200 w group"
      >
        <h2 className=" font-semibold mb-4 py-3 text-center text-gray-800">
          ÓRDENES DE FABRICACIÓN EN PROCESO
        </h2>
        {ordenes.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {ordenes.map((orden) => (
              <li key={orden.id_orden_fabricacion} className="py-2">
                <div className="flex justify-between">
                  <span className="text-gray-700 font-semibold">Orden #{orden.id_orden_fabricacion}</span>
                  <span className="text-sm text-gray-500">
                    Iniciada: {new Date(orden.fecha_inicio).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No hay órdenes de producción en proceso.</p>
        )}
        
        {/* Tooltip visible al pasar el cursor */}
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
        >
          Ir a órdenes de fabricación
        </div>
      </Link>
    </div>
  );
};


export default OrdenesEnProceso;