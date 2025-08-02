import React from 'react';
import { FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AlertaBajoStock = ({ articulos, className, to }) => {
  const hayArticulosBajoStock = articulos && articulos.length > 0;

  if (hayArticulosBajoStock) {
    return (
      <Link 
        to={to} 
        className={`relative block h-full bg-white rounded-lg shadow-md p-4 transition-transform duration-200  group ${className}`}
      >
        <h2 className="text-xl font-bold mb-4 flex items-center text-red-700">
          <FaExclamationTriangle className="h-6 w-6 mr-3" />
          ¡ALERTA DE INVENTARIO!
        </h2>
        <ul className="divide-y divide-gray-200">
          {articulos.map((articulo, index) => (
            <li 
              key={index} 
              className={`py-2 flex justify-between ${
                articulo.stock <= articulo.stock_minimo ? 'text-red-700 font-bold' : 'text-gray-700'
              }`}
            >
              <span className="truncate">{articulo.descripcion}</span>
              <span className="text-sm whitespace-nowrap">Stock: {articulo.stock}</span>
            </li>
          ))}
        </ul>
        {/* Tooltip visible al pasar el cursor */}
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
        >
          Ir a inventario
        </div>
      </Link>
    );
  }

  return (
    <Link 
      to={to} 
      className={`relative block h-full bg-white rounded-lg shadow-md p-4 transition-transform duration-200 group ${className}`}
    >
      <h2 className="text-xl font-bold mb-4 flex items-center text-green-700">
        <FaCheckCircle className="h-6 w-6 mr-3" />
        Todo en orden
      </h2>
      <p className="text-gray-500">No hay artículos bajo el stock mínimo.</p>
       {/* Tooltip visible al pasar el cursor */}
        <div 
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
        >
          Ir a inventario
        </div>
    </Link>
  );
};

export default AlertaBajoStock;