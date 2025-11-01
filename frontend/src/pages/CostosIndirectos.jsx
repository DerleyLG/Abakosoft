import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';
import { FiTrash2, FiPlus, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const CostosIndirectos = () => {
  const [costos, setCostos] = useState([]);
  const [resumenAsignado, setResumenAsignado] = useState({});
  const [filterMode, setFilterMode] = useState('pendientes'); // 'pendientes' | 'asignados' | 'todos'
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

 const fetchCostos = async () => {
      try {
        const res = await api.get('/costos-indirectos');
        const rows = Array.isArray(res.data) ? res.data : [];
        setCostos(rows);
        // Cargar resumen asignado
        const ids = rows.map((r) => r.id_costo_indirecto).filter(Boolean);
        if (ids.length > 0) {
          const chunkSize = 60; // evitar URLs enormes
          const map = {};
          for (let i = 0; i < ids.length; i += chunkSize) {
            const sub = ids.slice(i, i + chunkSize);
            const rr = await api.get('/costos-indirectos-asignados/resumen', {
              params: { ids: sub.join(',') },
            });
            (Array.isArray(rr.data) ? rr.data : []).forEach((row) => {
              map[row.id_costo_indirecto] = Number(row.total_asignado) || 0;
            });
          }
          setResumenAsignado(map);
        } else {
          setResumenAsignado({});
        }
      } catch (error) {
        console.error('Error cargando costos indirectos', error);
      }
    };

  useEffect(() => {
    fetchCostos();
  }, []);

  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar este costo indirecto?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/costos-indirectos/${id}`);
              toast.success('Costo indirecto eliminado');
              fetchCostos();
              setCostos((prev) => prev.filter((c) => c.id !== id));
            } catch (error) {
              console.error('Error eliminando costo indirecto', error);
              toast.error('Error al eliminar el costo');
            }
          },
        },
        { label: 'No', onClick: () => {} },
      ],
    });
  };

  const filteredCostos = costos.filter((costo) => {
    const match = (costo.tipo_costo || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!match) return false;
    const asignado = resumenAsignado[costo.id_costo_indirecto] || 0;
    const total = Number(costo.valor || 0);
    if (filterMode === 'pendientes') return asignado < total;
    if (filterMode === 'asignados') return asignado >= total && total > 0;
    return true;
  });


  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Costos Indirectos</h2>
        <div className="flex w-full flex-wrap items-center gap-2 md:gap-3 justify-end">
          <input
            type="text"
            placeholder="Buscar por tipo de costo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="min-w-[220px] flex-1 border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <div className="flex items-center rounded-md border border-slate-300 overflow-hidden h-[42px]">
            <button
              type="button"
              onClick={() => setFilterMode('pendientes')}
              className={`px-3 h-full text-sm ${filterMode==='pendientes' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}
            >Pendientes</button>
            <button
              type="button"
              onClick={() => setFilterMode('asignados')}
              className={`px-3 h-full text-sm border-l ${filterMode==='asignados' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}
            >Asignados</button>
            <button
              type="button"
              onClick={() => setFilterMode('todos')}
              className={`px-3 h-full text-sm border-l ${filterMode==='todos' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`}
            >Todos</button>
          </div>
          <button
            onClick={() => navigate('/costos_indirectos/nuevo')}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Registrar nuevo
          </button>
           <button
            onClick={() => navigate('/costos_materia_prima')}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 rounded-md font-semibold transition cursor-pointer"
          >
           <FiArrowRight />
            Costos de materia prima
          </button>
          <button
            onClick={() => navigate(-1)}
            className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 rounded-md font-semibold transition cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
         
              <th className="px-4 py-3">Tipo de Costo</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCostos.length > 0 ? (
              filteredCostos.map((costo) => (
                <tr
                  key={costo.id_costo_indirecto}
                  className="hover:bg-slate-300 cursor-pointer transition select-none"
                >
          
                  <td className="px-4 py-3 capitalize">{costo.tipo_costo}</td>
                  <td className="px-4 py-3">{new Date(costo.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(costo.valor)||0)}</td>
                  <td className="px-4 py-3">{costo.observaciones || '-'}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const asignado = resumenAsignado[costo.id_costo_indirecto] || 0;
                      const total = Number(costo.valor || 0);
                      if (!total || asignado <= 0) {
                        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pendiente</span>;
                      }
                      if (asignado >= total) {
                        return <span className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800">Asignado 100%</span>;
                      }
                      const pct = Math.round((asignado / total) * 100);
                      return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">Asignado {pct}%</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(costo.id_costo_indirecto)}
                      className="text-red-600 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No se encontraron costos indirectos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CostosIndirectos;
