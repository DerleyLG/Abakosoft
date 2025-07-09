import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // ajusta según tu estructura
import toast from 'react-hot-toast';

const CrearTrabajador = () => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [activo, setActivo] = useState(true); // true = 1

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      const formData = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        cargo: cargo.trim() || null,
        activo: activo ? 1 : 0,
      };

      console.log("Enviando datos:", formData);

      await api.post('/trabajadores', formData);

      toast.success('Trabajador creado correctamente', {
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
        navigate('/trabajadores'); // o la ruta que muestre la lista
      }, 500);

    } catch (error) {
      console.error('Error creando trabajador', error);
      alert(error.response?.data?.mensaje || 'Error interno al crear el trabajador');
    }
  };

  const handleCancelar = () => {
    navigate('/trabajadores');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nuevo Trabajador
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
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
            <label htmlFor="telefono" className="block text-sm font-semibold text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              id="telefono"
              type="number"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: +504 1234-5678"
            />
          </div>

          <div>
            <label htmlFor="cargo" className="block text-sm font-semibold text-gray-700 mb-1">
              Cargo
            </label>
            <input
              id="cargo"
              type="text"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: Carpintero"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="activo" className="text-sm font-semibold text-gray-700">
              ¿Está activo?
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4 h-[60px]">
            <button
              type="submit"
              className="text-2xs flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={handleCancelar}
              className="text-2xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md text-sm font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearTrabajador;
