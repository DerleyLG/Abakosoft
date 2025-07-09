import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const EditarArticulo = () => {
  const [referencia, setReferencia] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioVenta, setPrecioVenta] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [idCategoria, setIdCategoria] = useState('');

  const navigate = useNavigate();
  const { id } = useParams(); 

  useEffect(() => {
    const fetchArticulo = async () => {
      try {
        const res = await api.get(`/articulos/${id}`);
        const articulo = res.data;
        setReferencia(articulo.referencia);
        setDescripcion(articulo.descripcion);
        setPrecioVenta(articulo.precio_venta);
        setPrecioCosto(articulo.precio_costo);
        setIdCategoria(articulo.id_categoria);
      } catch (error) {
        console.error('Error al obtener el artículo', error);
        alert('No se pudo cargar el artículo.');
      }
    };

    const fetchCategorias = async () => {
      try {
        const res = await api.get('/categorias');
        setCategorias(res.data);
      } catch (error) {
        console.error('Error cargando categorías', error);
      }
    };

    fetchArticulo();
    fetchCategorias();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        referencia: referencia.trim(),
        descripcion: descripcion.trim(),
        precio_venta: parseInt(precioVenta),
        precio_costo: parseInt(precioCosto),
        id_categoria: idCategoria ? parseInt(idCategoria) : null,
      };

      await api.put(`/articulos/${id}`, formData);
      toast.success('✅ Artículo actualizado correctamente', {
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
        navigate('/articulos');
      }, 500);
    } catch (error) {
       const mensajeBackend =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message;
      toast.error(mensajeBackend);
    }
  };

  const handleCancelar = () => {
    navigate('/articulos');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Editar artículo
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="referencia" className="block text-sm font-semibold text-gray-700 mb-1">
              Referencia <span className="text-red-500">*</span>
            </label>
            <input
              id="referencia"
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: 001-A"
            />
          </div>

          <div>
            <label htmlFor="precio_venta" className="block text-sm font-semibold text-gray-700 mb-1">
              Precio de Venta <span className="text-red-500">*</span>
            </label>
            <input
              id="precio_venta"
              type="number"
              step="0.01"
              min="0"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: 120.00"
            />
          </div>
<div>
        <label htmlFor="precio_costo" className="block text-sm font-semibold text-gray-700 mb-1">
          Precio de costo <span className="text-red-500">*</span>
        </label>
        <input
          id="precio_costo"
          type="number"
          step="0.01"
          min="0"
          value={precioCosto}
          onChange={(e) => setPrecioCosto(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
          placeholder="Ej: 120.000"
        />
      </div>
          <div className="md:col-span-2">
            <label htmlFor="descripcion" className="block text-sm font-semibold text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows="4"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Descripción del artículo"
            ></textarea>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="categoria" className="block text-sm font-semibold text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="categoria"
              value={idCategoria}
              onChange={(e) => setIdCategoria(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="">-- Seleccione una categoría --</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-4 h-[60px]">
            <button
              type="submit"
              className=" bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-md text-2xs font-medium transition cursor-pointer"
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

export default EditarArticulo;
