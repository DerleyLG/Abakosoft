import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const CostosIndirectosNuevo = () => {
  const [tipoCosto, setTipoCosto] = useState('');
  const [fecha, setFecha] = useState('');
  const [valor, setValor] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!tipoCosto || !fecha || !valor) {
      toast.error('Por favor completa todos los campos obligatorios.');
      return;
    }

    try {
      await api.post('/costos-indirectos', {
        tipo_costo: tipoCosto,
        fecha,
        valor: Number(valor),
        observaciones: observaciones || null,
      });

      toast.success('Costo indirecto registrado correctamente');
      navigate('/costos_indirectos');
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el costo');
    }
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
          Registrar nuevo costo indirecto
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block font-medium mb-1">
              Tipo de costo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tipoCosto}
              onChange={(e) => setTipoCosto(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">
              Valor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              min="1"
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows="3"
              className="w-full border border-gray-300 rounded-md px-4 py-2"
              placeholder="Opcional"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-600 text-white px-6 py-2 rounded-md font-semibold"
            >
              Registrar
            </button>
            <button
              type="button"
              onClick={() => navigate('/costos_indirectos')}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CostosIndirectosNuevo;
