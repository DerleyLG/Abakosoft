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
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [total, setTotal] = useState(0);
  const [sortBy] = useState('descripcion');
  const [sortDir] = useState('asc');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cargar categorías al inicio
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const resCategorias = await api.get('/categorias');
        setCategorias(Array.isArray(resCategorias.data) ? resCategorias.data : []);
      } catch (error) {
        console.error('Error cargando categorías', error);
        const msg = error.response?.data?.mensaje || error.response?.data?.message || error.message;
        toast.error(msg);
      }
    };
    fetchCategorias();
  }, []);

  // Cargar artículos con paginación y filtros
  useEffect(() => {
    const fetchArticulos = async () => {
      setLoading(true);
      try {
        // Si hay categoría seleccionada, usamos su nombre dentro de la búsqueda para que el backend filtre por c.nombre LIKE
        const catName = categoriaSeleccionada
          ? (categorias.find(c => Number(c.id_categoria) === Number(categoriaSeleccionada))?.nombre || '')
          : '';
        const buscar = [searchTerm, catName].filter(Boolean).join(' ').trim();

        const res = await api.get('/articulos', {
          params: {
            buscar,
            page,
            pageSize,
            sortBy,
            sortDir,
          },
        });

        const payload = res.data || {};
        setArticulos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
        setTotal(Number(payload.total) || 0);
      } catch (error) {
        console.error('Error cargando artículos', error);
        const msg = error.response?.data?.mensaje || error.response?.data?.message || error.message;
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchArticulos();
  }, [searchTerm, categoriaSeleccionada, page, pageSize, sortBy, sortDir, categorias]);


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


  // Handlers para resetear página cuando cambian filtros/búsqueda
  const onSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const onCategoriaChange = (e) => {
    setCategoriaSeleccionada(e.target.value);
    setPage(1);
  };
  return (
 <div className="w-full px-4 md:px-12 lg:px-20 py-10">
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Artículos</h2>
      <div className="flex w-full md:w-200 items-center gap-4">
        <input
          type="text"
          placeholder="Buscar por referencia o descripción..."
          value={searchTerm}
          onChange={onSearchChange}
          className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
        />
        <select
          value={categoriaSeleccionada}
          onChange={onCategoriaChange}
          className="border border-gray-500 rounded-md px-3 py-2 h-[42px] min-w-[200px]"
          title="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id_categoria} value={cat.id_categoria}>
              {cat.nombre}
            </option>
          ))}
        </select>
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
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">Cargando...</td>
              </tr>
            ) : articulos.length > 0 ? (
              articulos.map((art) => (
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
        {/* Controles de paginación */}
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">
            Página {page} de {totalPages} {total ? `(total: ${total})` : ''}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Filas por página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="border border-gray-500 rounded-md px-2 py-1 h-[36px] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className={`px-3 py-2 rounded-md border ${hasPrev && !loading ? 'bg-white hover:bg-slate-100 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'} `}
            >
              Anterior
            </button>
            <button
              onClick={() => hasNext && setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className={`px-3 py-2 rounded-md border ${hasNext && !loading ? 'bg-white hover:bg-slate-100 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'} `}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaArticulos;
