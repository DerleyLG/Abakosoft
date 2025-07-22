import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const CrearEtapa = () => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post('/etapas-produccion', {
        nombre,
        descripcion,
      });
      toast.success('Etapa registrada exitosamente');
      navigate('/ordenes_fabricacion');
    } catch (error) {
      const msg =
        error.response?.data?.error || error.response?.data?.message || 'Error al registrar etapa';
      toast.error(msg);
      console.error(error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-md mt-10">
      <div className="flex items-center justify-between mb-6 border-b border-slate-300 p-5">
        <h2 className="text-3xl font-bold text-slate-700">Registrar Nueva Etapa</h2>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition cursor-pointer"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="text-sm text-slate-600 mb-1 block">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm text-slate-600 mb-1 block">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border border-slate-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            rows={4}
          />
        </div>

        <div className="col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            className="bg-slate-700 text-white px-6 py-2 rounded-md hover:bg-slate-800 transition font-semibold cursor-pointer"
          >
            Registrar Etapa
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearEtapa;
