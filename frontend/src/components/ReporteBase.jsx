import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FiLoader, FiArrowLeft, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { jsPDF } from 'jspdf';
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatInTimeZone } from 'date-fns-tz';

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const ReporteBase = ({ endpoint, columnas, titulo, filtros = [] }) => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState({});
  const [filtrosParaAPI, setFiltrosParaAPI] = useState({});
  const navigate = useNavigate();

  const timezone = 'America/Bogota'; 

  const obtenerDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await axios.get(endpoint, { params: filtrosParaAPI });
      
      let datosProcesados = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDatos(datosProcesados);
      toast.success("Datos cargados exitosamente.");
    } catch (error) {
      console.error("Error al cargar los datos:", error);
      toast.error(`Error al cargar los datos: ${error.response?.data?.message || error.message}`);
    } finally {
      setCargando(false);
    }
  }, [endpoint, filtrosParaAPI]);

  useEffect(() => {
    obtenerDatos();
  }, [obtenerDatos]);

  const debouncedSetFiltrosParaAPI = useCallback(
    debounce((newFiltros) => {
      setFiltrosParaAPI(newFiltros);
    }, 1000),
    []
  );

  const handleChangeFiltro = (name, value) => {
    const newFiltros = { ...filtrosActivos, [name]: value };
    setFiltrosActivos(newFiltros);
    debouncedSetFiltrosParaAPI(newFiltros);
  };

  const generarPDF = () => {
    // ... (sin cambios)
  };

  const handleDownloadExcel = () => {
    // ... (sin cambios)
  };

  const formatCurrencyCOP = (value) => {
    if (value === null || value === undefined) {
      return ''; 
    }
  
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value); 
    }
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0, 
    }).format(numValue);
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-slate-700">{titulo}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadExcel}
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datos.length === 0}
          >
            Exportar Excel
          </button>
          <button
            onClick={generarPDF}
            className="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datos.length === 0}
          >
            Exportar PDF
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
            disabled={cargando}
          >
            <FiArrowLeft />
            <span>Volver</span>
          </button>
        </div>
      </div>

      {filtros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 mb-4">
          {filtros.map((filtro) => (
            <div key={filtro.name} className="flex flex-col">
              <label className="text-sm mb-1 text-slate-600">{filtro.label}</label>
              {filtro.type === "datepicker" ? (
                <div className="relative"> 
                  <DatePicker
                    selected={
                      filtrosActivos[filtro.name]
                        ? new Date(filtrosActivos[filtro.name] + 'T00:00:00')
                        : null
                    }
                    onChange={(date) => {
                      if (date) {
                        const formattedDate = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
                        handleChangeFiltro(filtro.name, formattedDate);
                      } else {
                        handleChangeFiltro(filtro.name, null); 
                      }
                    }}
                    dateFormat="yyyy-MM-dd"
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full" 
                    disabled={cargando}
                    placeholderText={filtro.label}
                
                  />
                
                  {filtrosActivos[filtro.name] && (
                    <button
                      type="button"
                      onClick={() => handleChangeFiltro(filtro.name, null)}
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <FiX className="h-5 w-5" /> 
                    </button>
                  )}
                </div>
              ) : (
                <input
                  type={filtro.type || "text"}
                  name={filtro.name}
                  placeholder={filtro.label}
                  value={filtrosActivos[filtro.name] || ""}
                  onChange={(e) => handleChangeFiltro(e.target.name, e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full" 
                  disabled={cargando}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow border border-slate-200">
        {cargando ? (
          <div className="text-center p-8 text-slate-500 flex justify-center items-center gap-2">
            <FiLoader className="animate-spin" /> Cargando datos...
          </div>
        ) : (
          <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
            <thead className="bg-slate-100">
              <tr>
                {columnas.map((col) => (
                  <th key={col.accessor} className="text-left px-4 py-2 font-medium border-b border-gray-300">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.length === 0 ? (
                <tr>
                  <td colSpan={columnas.length} className="text-center text-slate-400 py-6">
                    No hay datos para mostrar.
                  </td>
                </tr>
              ) : (
                datos.map((fila, i) => (
  <tr key={i} className="hover:bg-slate-50">
    {columnas.map((col) => (
      <td key={col.accessor} className="px-2 py-2 border-b border-gray-300">
        {(() => {
          let value;
       
          if (typeof col.accessor === 'function') {
            value = col.accessor(fila);
          } else {
          
            value = fila[col.accessor];
          }

       
          const isDateColumn = [
            "fecha_registro", 
            "ultima_actualizacion", 
            "fecha", 
            "fecha_pago", 
            "fecha_inicio"
          ].includes(col.accessor);

          if (isDateColumn && value) {
            return new Date(value).toLocaleDateString();
          }

          if (col.isCurrency) {
            return formatCurrencyCOP(value);
          }
          

          return value;
        })()}
      </td>
    ))}
  </tr>
))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReporteBase;