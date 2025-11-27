import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPackage, FiBox, FiTool } from 'react-icons/fi';

const CrearCategoria = () => {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('articulo_fabricable');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        nombre: nombre.trim(),
        tipo: tipo,
      };

      await api.post('/categorias', formData);

      toast.success('Categoría creada correctamente', {
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
        navigate('/categorias');
      }, 500);
    } catch (error) {
      console.error('Error creando categoría', error);
      alert(
        error.response?.data?.mensaje || 'Error interno al crear la categoría'
      );
    }
  };

  const handleCancelar = () => {
    navigate('/categorias');
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
          Nueva categoría
        </h2>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6">
          <div>
            <label htmlFor="nombre" className="block text-2sm font-semibold text-gray-700 mb-2">
              Nombre de la categoría <span className="text-red-500">*</span>
            </label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
              placeholder="Ej: Muebles de sala"
            />
          </div>

          <div>
            <label htmlFor="tipo" className="block text-2sm font-semibold text-gray-700 mb-2">
              Tipo de categoría <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                tipo === 'articulo_fabricable' 
                  ? 'border-blue-600 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="articulo_fabricable"
                  checked={tipo === 'articulo_fabricable'}
                  onChange={(e) => setTipo(e.target.value)}
                  className="sr-only"
                />
                <FiPackage size={24} className={tipo === 'articulo_fabricable' ? 'text-blue-600' : 'text-gray-500'} />
                <div>
                  <div className={`font-semibold ${tipo === 'articulo_fabricable' ? 'text-blue-600' : 'text-gray-700'}`}>
                    Artículo Fabricable
                  </div>
                  <div className="text-xs text-gray-500">Productos terminados</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                tipo === 'materia_prima' 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="materia_prima"
                  checked={tipo === 'materia_prima'}
                  onChange={(e) => setTipo(e.target.value)}
                  className="sr-only"
                />
                <FiBox size={24} className={tipo === 'materia_prima' ? 'text-green-600' : 'text-gray-500'} />
                <div>
                  <div className={`font-semibold ${tipo === 'materia_prima' ? 'text-green-600' : 'text-gray-700'}`}>
                    Materia Prima
                  </div>
                  <div className="text-xs text-gray-500">Insumos y materiales</div>
                </div>
              </label>

              <label className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                tipo === 'costo_produccion' 
                  ? 'border-orange-600 bg-orange-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="radio"
                  name="tipo"
                  value="costo_produccion"
                  checked={tipo === 'costo_produccion'}
                  onChange={(e) => setTipo(e.target.value)}
                  className="sr-only"
                />
                <FiTool size={24} className={tipo === 'costo_produccion' ? 'text-orange-600' : 'text-gray-500'} />
                <div>
                  <div className={`font-semibold ${tipo === 'costo_produccion' ? 'text-orange-600' : 'text-gray-700'}`}>
                    Costo de Producción
                  </div>
                  <div className="text-xs text-gray-500">Servicios y gastos</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CrearCategoria;
