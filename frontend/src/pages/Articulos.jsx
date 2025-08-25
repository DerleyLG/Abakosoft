import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css'; // 
import { FiTrash2, FiPlus } from 'react-icons/fi';
import '../styles/confirmAlert.css'; 


const ListaArticulos = () => {
  const [articulos, setArticulos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const res = await api.get('/articulos');
        
        setArticulos(res.data);
      } catch (error) {
        console.error('Error cargando artículos', error);
        toast.error(error.response?.data?.mensaje || "Error al eliminar");
      }
    };

    fetchArticulos();
  }, []);


const handleDelete = (id) => {
  confirmAlert({
    title: 'Confirmar eliminación',
    message: '¿Seguro que quieres eliminar este artículo?',
    buttons: [
      {
        label: 'Sí',
        onClick: async () => {
          try {
            await api.delete(`/articulos/${id}`);
            toast.success(' Artículo eliminado');
            setArticulos((prev) => prev.filter((a) => a.id_articulo !== id));
          } catch (error) {
            const mensajeBackend =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;

              toast.error(mensajeBackend);
          }
        }
      },
      {
        label: 'No',
        onClick: () => {} // No hace nada, solo cierra el modal
      }
    ]
  });
};


  const handleRowDoubleClick = (id) => {
    navigate(`/articulos/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate('/articulos/nuevo');
  };

  // Filtrar artículos según el término de búsqueda (referencia o descripción)
  const filteredArticulos = articulos.filter((art) => {
    const term = searchTerm.toLowerCase();
    return (
      art.referencia.toLowerCase().includes(term) ||
      (art.descripcion && art.descripcion.toLowerCase().includes(term))
    );
  });
  return (
 <div className="w-full px-4 md:px-12 lg:px-20 py-10">
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Artículos</h2>
      <div className="flex w-full md:w-200 items-center gap-4">
        <input
          type="text"
          placeholder="Buscar por referencia o descripción..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
        />
        <button
          onClick={handleCrearClick}
          className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          title="Crear nuevo artículo"
        >
          <FiPlus size={20} />
          Crear artículo
        </button>
      </div>
    </div>
      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Precio de venta</th>
              <th className="px-4 py-3">Precio de costo</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredArticulos.length > 0 ? (
              filteredArticulos.map((art) => (
                <tr
                  key={art.id_articulo}
                  onDoubleClick={() => handleRowDoubleClick(art.id_articulo)}
                  className="hover:bg-slate-300  cursor-pointer transition select-none"
                >
                  <td className="px-4 py-3">{art.referencia}</td>
                  <td className="px-4 py-3">{art.descripcion}</td>
                  <td className="px-4 py-3">${Number(art.precio_venta).toLocaleString()}</td>
                  <td className="px-4 py-3">${Number(art.precio_costo).toLocaleString()}</td>
                  <td className="px-4 py-3">{art.nombre_categoria}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(art.id_articulo);
                      }}
                      className="text-red-600 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar artículo"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No se encontraron artículos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaArticulos;
