import React from 'react';
import { Link } from 'react-router-dom';

const DashboardCard = ({ title, value, className, to}) => {
  return (
    <Link 
      to={to} 
      className={`relative h-full bg-white rounded-lg shadow-md p-4 transition-transform duration-200  group flex flex-col justify-between items-center ${className}`}
    >
      <h2 className=" font-semibold text-center text-gray-800 mb-2">{title}</h2>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
      
      {/* Tooltip para el efecto de hover */}
      <div 
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap"
      >
        Ir a {title.toLowerCase()}
      </div>
    </Link>
  );
};

export default DashboardCard;