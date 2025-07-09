import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const EditarCliente = () => {
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [departamento, setDepartamento] = useState('');

  const navigate = useNavigate();
  const { id } = useParams(); // id del cliente a editar

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const res = await api.get(`/clientes/${id}`);
        const cliente = res.data;
        setNombre(cliente.nombre);
        setIdentificacion(cliente.identificacion);
        setTelefono(cliente.telefono);
        setDireccion(cliente.direccion);
        setCiudad(cliente.ciudad);
        setDepartamento(cliente.departamento);
      } catch (error) {
        console.error('Error al obtener el cliente', error);
        alert('No se pudo cargar el cliente.');
      }
    };

    fetchCliente();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        nombre: nombre.trim(),
        identificacion: identificacion.trim(),
        telefono: telefono.trim(),
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        departamento: departamento.trim(),
      };

      await api.put(`/clientes/${id}`, formData);
      toast.success('✅ Cliente actualizado correctamente', {
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
      console.error('Error actualizando cliente', error);
      alert(
        error.response?.data?.mensaje || 'Error interno al actualizar el cliente'
      );
    }
  };

  const handleCancelar = () => {
    navigate('/clientes');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Editar cliente
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
              placeholder="Nombre del cliente"
            />
          </div>

          <div>
            <label htmlFor="identificacion" className="block text-sm font-semibold text-gray-700 mb-1">
              Identificación <span className="text-red-500">*</span>
            </label>
            <input
              id="identificacion"
              type="number"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Cédula, RUC, etc."
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
              placeholder="Número telefónico"
            />
          </div>

          <div>
            <label htmlFor="direccion" className="block text-sm font-semibold text-gray-700 mb-1">
              Dirección
            </label>
            <input
              id="direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Dirección del cliente"
            />
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
              placeholder="Departamento o provincia"
            />
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

export default EditarCliente;
