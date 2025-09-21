import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const CrearArticulo = () => {
    //  Estado para los campos del artículo principal
    const [referencia, setReferencia] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [precioVenta, setPrecioVenta] = useState('');
    const [precioCosto, setPrecioCosto] = useState('');
    const [categorias, setCategorias] = useState([]);
    const [idCategoria, setIdCategoria] = useState('');

    //  Estado para artículos compuestos
    const [esCompuesto, setEsCompuesto] = useState(false);
    const [componentes, setComponentes] = useState([{ id: '', cantidad: '' }]);
    const [articulos, setArticulos] = useState([]);

    const navigate = useNavigate();

    //  Efecto para cargar categorías y todos los artículos disponibles
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resCategorias, resArticulos] = await Promise.all([
                    api.get('/categorias'),
                    api.get('/articulos'),
                ]);
           
                setCategorias(resCategorias.data);
              
                const articulosSimples = resArticulos.data.filter(art => !art.es_compuesto);
                setArticulos(articulosSimples);
            } catch (error) {
                console.error('Error cargando datos', error);
                toast.error('Error al cargar categorías o artículos');
            }
        };
        fetchData();
    }, []);

    //  Funciones para manejar los componentes
    const handleAddComponente = () => {
        setComponentes([...componentes, { id: '', cantidad: '' }]);
    };

    const handleRemoveComponente = (indexToRemove) => {
        setComponentes(componentes.filter((_, index) => index !== indexToRemove));
    };

    const handleComponenteChange = (indexToUpdate, field, value) => {
        const nuevosComponentes = [...componentes];
        nuevosComponentes[indexToUpdate][field] = value;
        setComponentes(nuevosComponentes);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Validaciones del lado del cliente para artículos compuestos
            if (esCompuesto) {
                if (componentes.length === 0 || componentes.some(comp => !comp.id || !comp.cantidad || parseInt(comp.cantidad) <= 0)) {
                    return toast.error('Un artículo compuesto debe tener al menos un componente válido y una cantidad mayor a 0.');
                }
                // Evitar IDs de componentes duplicados
                const idsUnicos = new Set(componentes.map(c => c.id));
                if (idsUnicos.size !== componentes.length) {
                    return toast.error('No se pueden seleccionar componentes duplicados.');
                }
            }

            
            const formData = {
                referencia: referencia.trim(),
                descripcion: descripcion.trim(),
                precio_venta: parseInt(precioVenta),
                precio_costo: parseInt(precioCosto),
                id_categoria: idCategoria ? parseInt(idCategoria) : null,
                es_compuesto: esCompuesto, // Enviamos el estado del checkbox
                componentes: esCompuesto ? componentes.map(c => ({ id: parseInt(c.id), cantidad: parseInt(c.cantidad) })) : []
            };

            await api.post('/articulos', formData);
            toast.success('Artículo creado correctamente');
            setTimeout(() => {
                navigate('/articulos');
            }, 500);
        } catch (error) {
            const mensajeBackend = error.response?.data?.error || error.response?.data?.message || error.message;
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
                    Nuevo artículo
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
                            placeholder="Ej: 120.000"
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

                
                    <div className="md:col-span-2 flex items-center gap-2 mt-4">
                        <input
                            type="checkbox"
                            id="esCompuesto"
                            checked={esCompuesto}
                            onChange={(e) => setEsCompuesto(e.target.checked)}
                            className="w-4 h-4 text-slate-600 bg-gray-100 border-gray-300 rounded focus:ring-slate-500"
                        />
                        <label htmlFor="esCompuesto" className="text-sm font-semibold text-gray-700">
                            ¿El un articulo compuesto?
                        </label>
                    </div>
                 
                    {esCompuesto && (
                        <div className="md:col-span-2 bg-gray-50 p-6 rounded-md border border-gray-200 mt-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Componentes del Artículo</h3>
                            {componentes.map((comp, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4 p-4 border border-gray-200 rounded-md bg-white">
                                    <div className="col-span-2">
                                        <label htmlFor={`componente-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                            Artículo Componente
                                        </label>
                                        <select
                                            id={`componente-${index}`}
                                            value={comp.id}
                                            onChange={(e) => handleComponenteChange(index, 'id', e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                                            required
                                        >
                                            <option value="">-- Seleccione un artículo --</option>
                                            {articulos.map((art) => (
                                                <option key={art.id_articulo} value={art.id_articulo}>
                                                    {art.referencia} - {art.descripcion}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor={`cantidad-${index}`} className="block text-sm font-medium text-gray-700 mb-1">
                                            Cantidad
                                        </label>
                                        <input
                                            id={`cantidad-${index}`}
                                            type="number"
                                            min="1"
                                            value={comp.cantidad}
                                            onChange={(e) => handleComponenteChange(index, 'cantidad', e.target.value)}
                                            required
                                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                                            placeholder="Cantidad"
                                        />
                                    </div>
                                    {index > 0 && (
                                        <div className="col-span-1 md:col-span-3 lg:col-span-1">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveComponente(index)}
                                                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-md transition cursor-pointer"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddComponente}
                                className="mt-4 w-full bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 rounded-md transition cursor-pointer"
                            >
                                + Agregar otro componente
                            </button>
                        </div>
                    )}
                    
                    <div className="md:col-span-2 flex justify-end gap-4 pt-4 h-[60px]">
                        <button
                            type="submit"
                            className="text-2xs flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
                        >
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="text-2xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md text-sm font-medium transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CrearArticulo;