import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import { FiTrash2, FiPlus, FiDollarSign } from 'react-icons/fi';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';

const ListaTrabajadores = () => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        const res = await api.get('/trabajadores');
        setTrabajadores(res.data);
      } catch (error) {
        console.error('Error cargando trabajadores', error);
      }
    };

    fetchTrabajadores();
  }, []);

const cargarTrabajadores = async () => {
    try {
      const res = await api.get('/trabajadores');
      setTrabajadores(res.data);
    } catch (error) {
      console.error('Error cargando clientes', error);
    }
  };
  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar este trabajador?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/trabajadores/${id}`);
              toast.success('Trabajador eliminado');
              setTrabajadores((prev) => prev.filter((t) => t.id_trabajador !== id));
              cargarTrabajadores();
            } catch (error) {
              console.error('Error eliminando trabajador', error);
              alert(error.response?.data?.mensaje || 'Error interno al eliminar el trabajador');
            }
          }
        },
        {
          label: 'No',
          onClick: () => {}
        }
      ]
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/trabajadores/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate('/trabajadores/nuevo');
  };

  const filteredTrabajadores = trabajadores.filter((trab) => {
    const term = searchTerm.toLowerCase();
    return (
      trab.nombre.toLowerCase().includes(term) ||
      (trab.cargo && trab.cargo.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Trabajadores</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
        <input
          type="text"
          placeholder="Buscar por nombre o cargo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
        />
        <button
          onClick={handleCrearClick}
          className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          title="Crear nuevo trabajador"
        >
          <FiPlus size={20} />
          Crear trabajador
        </button>

    
      </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Activo</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrabajadores.length > 0 ? (
                
              filteredTrabajadores.map((trab) => (
              console.log('Activo:', trab.activo, typeof trab.activo),
                <tr
                  key={trab.id_trabajador}
                  onDoubleClick={() => handleRowDoubleClick(trab.id_trabajador)}
                  className="hover:bg-slate-300 cursor-pointer transition select-none"
                >
                  <td className="px-4 py-3">{trab.nombre}</td>
                  <td className="px-4 py-3">{trab.telefono || '-'}</td>
                  <td className="px-4 py-3">{trab.cargo || '-'}</td>
                  <td className="px-4 py-3">{Number(trab.activo) == 1 ? 'Sí' : 'No'}</td>
                  <td className="px-4 py-3 text-center">
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(trab.id_trabajador);
                      }}
                      className="text-red-600 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar trabajador"
                    >
                      <FiTrash2 size={18} />
                    </button>
                    
                  </td>
                  
                </tr>
                
              ))
              
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No se encontraron trabajadores.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaTrabajadores;
