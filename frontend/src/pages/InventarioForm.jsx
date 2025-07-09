import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../services/api';
import toast from 'react-hot-toast';

const NuevoInventario = () => {
  const [articulos, setArticulos] = useState([]);
  const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
  const [cantidad, setCantidad] = useState(0); // Antes stock
  const [stockMinimo, setStockMinimo] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const res = await api.get('/articulos');
        // Mapear artículos para react-select {value, label}
        const opciones = res.data.map((art) => ({
          value: art.id_articulo,
          label: art.descripcion,
        }));
        setArticulos(opciones);
      } catch (error) {
        console.error('Error al cargar artículos', error);
        toast.error('Error al cargar artículos');
      }
    };
    fetchArticulos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!articuloSeleccionado) {
      toast.error('Por favor selecciona un artículo');
      return;
    }

    try {
      await api.post('/inventario/movimientos', {
        id_articulo: Number(articuloSeleccionado.value),
        cantidad: Number(cantidad),
        tipo_movimiento: 'entrada',
        descripcion: 'Ingreso inicial',
        origen: 'Stock inicial',
        stock_minimo: Number(stockMinimo),
      });
      toast.success('Artículo agregado al inventario');
      navigate('/inventario');
    } catch (error) {
      console.error('Error al agregar inventario', error.response?.data || error.message);
      toast.error('No se pudo agregar el artículo al inventario');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">Agregar artículo al inventario</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-semibold mb-1 ">Artículo</label>
          <Select
            options={articulos}
            value={articuloSeleccionado}
            onChange={setArticuloSeleccionado}
            placeholder="Selecciona un artículo"
            isClearable
            className="text-sm "
            styles={{
              control: (base) => ({
                ...base,
                borderColor: '#d1d5db', 
                boxShadow: 'none',
                '&:hover': {
                  borderColor: '#64748b', 
                },
                borderRadius: '0.375rem', 
              }),
            }}
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Cantidad (stock inicial)</label>
          <input
            type="number"
            min="0"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Stock mínimo</label>
          <input
            type="number"
            min="0"
            value={stockMinimo}
            onChange={(e) => setStockMinimo(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-500"
            required
          />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <button
            type="submit"
            className="bg-slate-800 text-white px-4 py-2 rounded-md hover:bg-slate-600 transition cursor-pointer"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventario')}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 transition cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default NuevoInventario;
