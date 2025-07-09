import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';
import { FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';

const CostosIndirectos = () => {
  const [costos, setCostos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCostos = async () => {
      try {
        const res = await api.get('/costos-indirectos');
        setCostos(res.data);
      } catch (error) {
        console.error('Error cargando costos indirectos', error);
      }
    };

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
              await api.delete(`/costos_indirectos/${id}`);
              toast.success('Costo indirecto eliminado');
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

  const filteredCostos = costos.filter((costo) =>
    (costo.tipo_costo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Costos Indirectos</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por tipo de costo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            onClick={() => navigate('/costos_indirectos/nuevo')}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Registrar nuevo
          </button>
          <button
            onClick={() => navigate('/ordenes')}
            className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
         
              <th className="px-4 py-3">Tipo de Costo</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCostos.length > 0 ? (
              filteredCostos.map((costo) => (
                <tr
                  key={costo.id}
                  className="hover:bg-slate-300 cursor-pointer transition select-none"
                >
          
                  <td className="px-4 py-3 capitalize">{costo.tipo_costo}</td>
                  <td className="px-4 py-3">{new Date(costo.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-2">${Number(costo.valor).toLocaleString()}</td>
                  <td className="px-4 py-3">{costo.observaciones || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(costo.id)}
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
