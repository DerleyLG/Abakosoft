import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const EditarTrabajador = () => {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [cargo, setCargo] = useState('');
  const [activo, setActivo] = useState(true); // por defecto true para checkbox

  const navigate = useNavigate();
  const { id } = useParams(); // id del trabajador a editar

  useEffect(() => {
    const fetchTrabajador = async () => {
      try {
        const res = await api.get(`/trabajadores/${id}`);
        const trabajador = res.data;
        setNombre(trabajador.nombre);
        setTelefono(trabajador.telefono || '');
        setCargo(trabajador.cargo || '');
        setActivo(trabajador.activo === 1);
      } catch (error) {
        console.error('Error al obtener el trabajador', error);
        alert('No se pudo cargar el trabajador.');
      }
    };

    fetchTrabajador();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        cargo: cargo.trim() || null,
        activo: activo ? 1 : 0,
      };

      await api.put(`/trabajadores/${id}`, formData);
      toast.success('✅ Trabajador actualizado correctamente', {
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
        navigate('/trabajadores');
      }, 500);
    } catch (error) {
      console.error('Error actualizando trabajador', error);
      alert(
        error.response?.data?.mensaje || 'Error interno al actualizar el trabajador'
      );
    }
  };

  const handleCancelar = () => {
    navigate('/trabajadores');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Editar trabajador
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
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: +123456789"
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

          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="activo"
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="w-5 h-5"
            />
            <label htmlFor="activo" className="text-sm font-semibold text-gray-700">
              Activo
            </label>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4 h-[60px]">
            <button
              type="submit"
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-md text-2xs font-medium transition cursor-pointer"
            >
              Guardar cambios
            </button>
            <button
              type="button"
              onClick={handleCancelar}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md text-2xs font-medium transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarTrabajador;
