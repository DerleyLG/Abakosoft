import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiTrash2, FiPlus } from 'react-icons/fi';
import 'react-confirm-alert/src/react-confirm-alert.css'; 
import '../styles/confirmAlert.css';
import { confirmAlert } from 'react-confirm-alert';


const ListaCategorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  // Función para cargar categorías desde el backend
  const cargarCategorias = async () => {
    try {
      const res = await api.get('/categorias');
      setCategorias(res.data);
    } catch (error) {
      console.error('Error cargando categorías', error);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleDelete = (id_categoria) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Estás seguro de que deseas eliminar esta categoría?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/categorias/${id_categoria}`);
              toast.success(' Categoría eliminada correctamente') ;
              cargarCategorias(); // ahora sí funciona
            } catch (error) {
              console.error('Error al eliminar categoría:', error);
              toast.error(' No se pudo eliminar la categoría');
            }
          },
        },
        {
          label: 'No',
          onClick: () => {
            
          },
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/categorias/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate('/categorias/nuevo');
  };

  const categoriasFiltradas = categorias.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Categorías</h2>
        <div className="flex w-full md:w-200 items-center gap-4 ">
          <input
            type="text"
            placeholder="Buscar categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            onClick={handleCrearClick}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition h-[42px] cursor-pointer"
          >
            <FiPlus size={20} />
            Crear categoría
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categoriasFiltradas.map((cat) => (
              <tr
                key={cat.id_categoria}
                onDoubleClick={() => handleRowDoubleClick(cat.id_categoria)}
                className="hover:bg-slate-300 cursor-pointer transition select-none"
              >
                <td className="px-4 py-3">{cat.nombre}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(cat.id_categoria);
                    }}
                    className="text-red-600 hover:text-red-400 transition cursor-pointer"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {categoriasFiltradas.length === 0 && (
              <tr>
                <td colSpan="2" className="text-center py-6 text-gray-500">
                  No hay categorías registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaCategorias;
