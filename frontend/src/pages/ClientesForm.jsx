import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const CrearCliente = () => {
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        nombre: nombre.trim(),
        identificacion: identificacion.trim() || null,
        telefono: telefono.trim(),
        direccion: direccion.trim() || null,
        ciudad: ciudad.trim() || null,
        departamento: departamento.trim() || null,
      };

  

      await api.post('/clientes', formData);
      toast.success('Cliente creado correctamente', {
        duration: 4000,
        style: {
          borderRadius: '8px',
          background: '#1e293b',
          color: '#fff',
          fontWeight: 'bold',
          padding: '14px 20px',
          fontSize: '16px',
        },
        iconTheme: {
          primary: '#10b981',
          secondary: '#f0fdf4',
        },
      });
      setTimeout(() => {
        navigate('/clientes');
      }, 500);
    } catch (error) {
      console.error('Error creando cliente', error);
      alert(error.response?.data?.mensaje || 'Error interno al crear el cliente');
    }
  };

  const handleCancelar = () => {
    navigate('/clientes');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nuevo cliente
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label htmlFor="identificacion" className="block text-sm font-semibold text-gray-700 mb-1">
              Identificación
            </label>
            <input
              id="identificacion"
              type="number"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="DNI / Cédula / RUC"
            />
          </div>

          <div>
            <label htmlFor="telefono" className="block text-sm font-semibold text-gray-700 mb-1">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              id="telefono"
              type="number"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: 3001234567"
            />
          </div>

          <div>
            <label htmlFor="direccion" className="block text-sm font-semibold text-gray-700 mb-1">
              Dirección
            </label>
            <textarea
              id="direccion"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              rows="2"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Dirección completa"
            ></textarea>
          </div>

          <div>
            <label htmlFor="ciudad" className="block text-sm font-semibold text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              id="ciudad"
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ciudad"
            />
          </div>

          <div>
            <label htmlFor="departamento" className="block text-sm font-semibold text-gray-700 mb-1">
              Departamento
            </label>
            <input
              id="departamento"
              type="text"
              value={departamento}
              onChange={(e) => setDepartamento(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Departamento o estado"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearCliente;
