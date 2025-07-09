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
      console.log("Datos a enviar:", { nombre, descripcion});
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
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-xl">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-slate-600 hover:text-black">
        <FiArrowLeft className="mr-1" />
        Volver
      </button>

      <h2 className="text-2xl font-semibold text-slate-800 mb-4">Registrar Nueva Etapa</h2>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
          />
        </div>

       

        <div className="col-span-2 mt-4">
          <button
            type="submit"
            className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800 transition"
          >
            Registrar Etapa
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearEtapa;
