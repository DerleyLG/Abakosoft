import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';



const ListaClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  const cargarClientes = async () => {
    try {
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (error) {
      console.error('Error cargando clientes', error);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleDelete = (id_cliente) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Deseas eliminar este cliente?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/clientes/${id_cliente}`);
              toast.success('Cliente eliminado correctamente');
              cargarClientes();
            } catch (error) {
              console.error('Error al eliminar cliente:', error);
              toast.error('No se pudo eliminar el cliente');
            }
          },
        },
        {
          label: 'No',
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/clientes/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate('/clientes/nuevo');
  };

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Clientes</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            onClick={handleCrearClick}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition h-[42px] cursor-pointer"
          >
            <FiPlus size={20} />
            Crear cliente
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Identificación</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Departamento</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cli) => (
              <tr
                key={cli.id_cliente}
                onDoubleClick={() => handleRowDoubleClick(cli.id_cliente)}
                className="hover:bg-slate-300 cursor-pointer transition select-none"
              >
                <td className="px-4 py-3">{cli.nombre}</td>
                <td className="px-4 py-3">{Number(cli.identificacion).toLocaleString()}</td>
                <td className="px-4 py-3">{cli.telefono}</td>
                <td className="px-4 py-3">{cli.ciudad}</td>
                <td className="px-4 py-3">{cli.departamento}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cli.id_cliente);
                    }}
                    className="text-red-600 hover:text-red-400 transition cursor-pointer"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No hay clientes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaClientes;
