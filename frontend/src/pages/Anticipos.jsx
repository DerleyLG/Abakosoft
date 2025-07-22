import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const ListaAnticipos = () => {
  const [anticipos, setAnticipos] = useState([]);
    const navigate = useNavigate();

  useEffect(() => {
    const fetchAnticipos = async () => {
      try {
        const res = await api.get('/anticipos');
        setAnticipos(res.data);
      } catch (error) {
        console.error('Error al cargar anticipos:', error);
      }
    };
    fetchAnticipos();
  }, []);

  return (
    <div className="px-20 py-8 max-w-8xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b border-slate-300 p-5">
              <h2 className="text-4xl font-bold text-slate-700">Anticipos</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
                >
                  <FiArrowLeft />
                  <span>Volver</span>
                </button>
                
              </div>
            </div>
      <div className="bg-white p-4 rounded-2xl shadow-md overflow-x-auto border border-slate-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-2">Trabajador</th>
              <th className="px-4 py-2">Orden</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Usado</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            {anticipos.length > 0 ? (
              anticipos.map((a) => (
                <tr key={a.id_anticipo} className="hover:bg-slate-50 border-t border-slate-100">
                  <td className="px-4 py-2">{a.trabajador}</td>
                  <td className="px-4 py-2 font-mono">#{a.id_orden_fabricacion}</td>
                  <td className="px-4 py-2">{a.cliente || 'N/D'}</td>
                  <td className="px-4 py-2">
                    {new Date(a.fecha).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-4 py-2">${Number(a.monto).toLocaleString()}</td>
                  <td className="px-4 py-2">${Number(a.monto_usado).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        a.estado === 'pendiente'
                          ? 'bg-yellow-100 text-yellow-800'
                          : a.estado === 'parcial'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {a.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">{a.observaciones || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-6 text-slate-500">
                  No hay anticipos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaAnticipos;
