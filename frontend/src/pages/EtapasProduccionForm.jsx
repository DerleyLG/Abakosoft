import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';

const CrearEtapa = () => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [orden, setOrden] = useState('');
  const [etapasExistentes, setEtapasExistentes] = useState([]);
  const [diagrama, setDiagrama] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        const res = await api.get('/etapas-produccion');
        setEtapasExistentes(res.data);
      } catch (error) {
        console.error('Error al cargar etapas existentes:', error);
        toast.error('Error al cargar etapas existentes.');
      }
    };
    fetchEtapas();
  }, []);

  const actualizarDiagrama = (ordenSeleccionado, nombreNuevaEtapa) => {
    if (!ordenSeleccionado || !nombreNuevaEtapa) {
      setDiagrama('Selecciona un orden y escribe el nombre de la etapa.');
      return;
    }

    let etapasConNueva = [...etapasExistentes];
    const indiceDeInsercion = ordenSeleccionado - 1;
    const nuevaEtapaTemp = { nombre: nombreNuevaEtapa, orden: ordenSeleccionado };
    
    // Evita la inserción si el índice es inválido (ocurre si eligen un orden que ya existe y luego cambian el nombre)
    if (etapasExistentes.some(e => e.orden === ordenSeleccionado)) {
        // No hacemos nada si el orden está ocupado, la alerta ya la tenemos.
    } else {
        etapasConNueva.splice(indiceDeInsercion, 0, nuevaEtapaTemp);
    }
    
    const diagramaString = etapasConNueva
        .map(e => (e.orden === ordenSeleccionado && e.nombre === nombreNuevaEtapa) ? `**${e.nombre}**` : e.nombre)
        .join(' → ');

    setDiagrama(diagramaString);
  };
    
  const generarOpcionesOrden = () => {
    const maxOrden = etapasExistentes.length > 0
      ? Math.max(...etapasExistentes.map(e => e.orden))
      : 0;
    const opciones = [];
    for (let i = 1; i <= maxOrden + 1; i++) {
      opciones.push(i);
    }
    return opciones;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orden) {
      toast.error('Por favor, selecciona un orden para la etapa.');
      return;
    }

    try {
      await api.post('/etapas-produccion', {
        nombre,
        descripcion,
        orden: Number(orden),
      });
      toast.success('Etapa registrada exitosamente');
      navigate('/ordenes_fabricacion');
    } catch (error) {
      const msg =
        error.response?.data?.error || error.response?.data?.message || 'Error al registrar etapa';
      toast.error(msg);
      console.error(error);
    }
  };
  
  // Función de ayuda para verificar si el orden está ocupado
  const isOrdenOcupado = etapasExistentes.some(e => e.orden === Number(orden));

  return (
    <div className="max-w-6xl mx-auto bg-white p-8 rounded-2xl shadow-md mt-10">
      <div className="flex items-center justify-between mb-6 border-b border-slate-300 p-5">
        <h2 className="text-3xl font-bold text-slate-700">Registrar Nueva Etapa</h2>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-md hover:bg-slate-300 transition cursor-pointer"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-2">
          <label className="text-sm text-slate-600 mb-1 block">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              actualizarDiagrama(orden, e.target.value);
            }}
            className="w-full border border-slate-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            required
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm text-slate-600 mb-1 block">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full border border-slate-300 rounded-2xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            rows={4}
          />
        </div>

        <div className="col-span-2">
          <label className="text-sm text-slate-600 mb-1 block">Orden de la etapa</label>
          <select
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value);
              actualizarDiagrama(Number(e.target.value), nombre);
            }}
            className="w-full border border-slate-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
            required
          >
            <option value="">Selecciona un orden</option>
            {generarOpcionesOrden().map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <h4 className="font-bold text-slate-700 mb-2">Previsualización del orden:</h4>
          <div className="p-4 bg-slate-50 text-slate-700 rounded-md border border-slate-200">
            
            {isOrdenOcupado && (
              <p className="text-red-500 font-semibold mb-2">⚠️ ¡Advertencia! Este orden ya está ocupado.</p>
            )}
            
            <p>{diagrama || 'El diagrama aparecerá aquí una vez selecciones el orden y nombre.'}</p>
          </div>
        </div>

        <div className="col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer"
          >
            Registrar Etapa
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrearEtapa;