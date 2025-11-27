import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; 
import toast from 'react-hot-toast';
import AsyncSelect from 'react-select/async'; 
import { X } from 'lucide-react';
import { confirmAlert } from 'react-confirm-alert'; 
import 'react-confirm-alert/src/react-confirm-alert.css'; 


const formatCOP = (number) => {
    if (!number) return '0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0,
    }).format(number);
};


const cleanCOPFormat = (formattedValue) => {
    
    return parseInt(formattedValue.replace(/[^0-9]/g, ''), 10) || 0;
};

const CrearOrdenCompra = () => {
    const [proveedores, setProveedores] = useState([]);
    const [idProveedor, setIdProveedor] = useState('');
    const [categoriaCosto, setCategoriaCosto] = useState('');
    const [articulosSeleccionados, setArticulosSeleccionados] = useState([]); 
    const [articuloSeleccionado, setArticuloSeleccionado] = useState(null); 
    const [loading, setLoading] = useState(false); 
    const [idMetodoPago, setIdMetodoPago] = useState('');
    const [referenciaPago, setReferenciaPago] = useState('');
    const [observacionesPago, setObservacionesPago] = useState('');
    const [metodosPago, setMetodosPago] = useState([]);
    const [adjuntarComprobante, setAdjuntarComprobante] = useState(false);
    const [archivoComprobante, setArchivoComprobante] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const navigate = useNavigate();


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resProveedores, resMetodosPago] = await Promise.all([
                    api.get('/proveedores'),
                    api.get('/tesoreria/metodos-pago'),
                ]);
                setProveedores(resProveedores.data || []);
                setMetodosPago(resMetodosPago.data || []);
            } catch (error) {
                console.error('Error al cargar datos iniciales:', error);
                const msg = error.response?.data?.mensaje || error.response?.data?.message || error.message;
                toast.error(`Error al cargar datos iniciales (proveedores, métodos de pago): ${msg}`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Caché para almacenar resultados de búsqueda
    const cacheRef = useRef({});
    const timerRef = useRef(null);
    const [todosLosArticulos, setTodosLosArticulos] = useState([]);

    // Cargar todos los artículos al inicio
    useEffect(() => {
        const cargarTodosArticulos = async () => {
            try {
                const response = await api.get('/articulos', { 
                    params: { 
                        page: 1, 
                        pageSize: 1000, // Cargar muchos artículos
                        sortBy: 'descripcion', 
                        sortDir: 'asc' 
                    } 
                });
                const lista = Array.isArray(response.data?.data) ? response.data.data : [];
                const opciones = lista.map((art) => ({
                    value: art.id_articulo,
                    label: `${art.descripcion} (Ref: ${art.referencia})`,
                    ...art,
                }));
                setTodosLosArticulos(opciones);
                // Guardar en caché como opciones por defecto
                cacheRef.current[''] = opciones;
            } catch (error) {
                console.error('Error al cargar artículos:', error);
                toast.error('Error al cargar lista de artículos');
            }
        };
        cargarTodosArticulos();
    }, []);

    // Función para cargar artículos dinámicamente con debounce y caché
    const loadArticulosOptions = useCallback((inputValue, callback) => {
        const cacheKey = inputValue?.toLowerCase() || '';

        // Si no hay búsqueda, retornar todos los artículos
        if (!inputValue || inputValue.trim() === '') {
            callback(todosLosArticulos);
            return;
        }

        // Si ya está en caché, retornar inmediatamente
        if (cacheRef.current[cacheKey]) {
            callback(cacheRef.current[cacheKey]);
            return;
        }

        // Limpiar el timer anterior
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        // Debounce: esperar 300ms después de que el usuario deje de escribir
        timerRef.current = setTimeout(() => {
            // Filtrar localmente en todos los artículos cargados
            const filtered = todosLosArticulos.filter(art => 
                art.label.toLowerCase().includes(inputValue.toLowerCase()) ||
                art.referencia?.toLowerCase().includes(inputValue.toLowerCase()) ||
                art.descripcion?.toLowerCase().includes(inputValue.toLowerCase())
            );
            
            // Guardar en caché
            cacheRef.current[cacheKey] = filtered;
            callback(filtered);
        }, 300); // 300ms de delay
    }, [todosLosArticulos]);

  
    const verificarYAgregarAlInventario = async (idArticulo, descripcionArticulo) => {
        setLoading(true);
        try {
            await api.get(`/inventario/${idArticulo}`);
            return true; 
        } catch (error) {
            if (error.response?.status === 404) {
                let seAceptoAgregar = false;
                await new Promise((resolve) => {
                    confirmAlert({
                        title: "Artículo no encontrado en Inventario",
                        message: `El artículo "${descripcionArticulo}" (ID: ${idArticulo}) no está inicializado en el inventario. ¿Desea agregarlo con stock 0 para continuar?`,
                        buttons: [
                            {
                                label: "Sí",
                                onClick: async () => {
                                    try {
                                       
                                        await api.post("/inventario/inicializar", {
                                            id_articulo: Number(idArticulo),
                                        });
                                        toast.success("Artículo agregado al inventario con stock 0");
                                        seAceptoAgregar = true;
                                    } catch (err) {
                                        toast.error("Error al agregar al inventario: " + (err.response?.data?.message || err.message));
                                    }
                                    resolve();
                                },
                            },
                            {
                                label: "No",
                                onClick: () => {
                                    toast.error("Operación cancelada. El artículo no fue inicializado.");
                                    resolve();
                                },
                            },
                        ],
                        closeOnEscape: false, 
                        closeOnClickOutside: false, 
                    });
                });
                return seAceptoAgregar;
            } else {
                toast.error("Error al verificar el inventario: " + (error.response?.data?.message || error.message));
                return false;
            }
        } finally {
            setLoading(false);
        }
    };

 
    const agregarArticulo = async (articulo) => {
     
        const yaExiste = articulosSeleccionados.some(
            (a) => a.id_articulo === articulo.id_articulo
        );
        if (yaExiste) {
            toast.error("Este artículo ya ha sido añadido a la orden de compra.");
            setArticuloSeleccionado(null); 
            return;
        }

        const puedeAgregar = await verificarYAgregarAlInventario(
            articulo.value, 
            articulo.label 
        );

        if (!puedeAgregar) {
       
            setArticuloSeleccionado(null); 
            return;
        }

        setArticulosSeleccionados((prev) => [
            ...prev,
            {
                id_articulo: articulo.value, 
                descripcion: articulo.label, 
                cantidad: 1,
                precio_unitario: articulo.precio_costo || 0, 
            },
        ]);
        setArticuloSeleccionado(null);
    };


    const eliminarArticulo = (id_articulo) => {
        setArticulosSeleccionados((prev) =>
            prev.filter((a) => a.id_articulo !== id_articulo)
        );
    };

 
    const cambiarCantidad = (id_articulo, cantidad) => {
        const numCantidad = parseInt(cantidad, 10);
        if (isNaN(numCantidad) || numCantidad < 1) {
            toast.error("La cantidad debe ser un número positivo.");
            return;
        }
        setArticulosSeleccionados((prev) =>
            prev.map((a) => (a.id_articulo === id_articulo ? { ...a, cantidad: numCantidad } : a))
        );
    };

   const cambiarPrecioUnitario = (id_articulo, precioFormateado) => {
    const numPrecio = cleanCOPFormat(precioFormateado);
    if (isNaN(numPrecio) || numPrecio < 0) {
        toast.error("El precio unitario debe ser un número positivo o cero.");
        return;
    }
    setArticulosSeleccionados((prev) =>
        prev.map((a) => (a.id_articulo === id_articulo ? { ...a, precio_unitario: numPrecio } : a))
    );
};
    const validarFormulario = () => {
        if (!idProveedor) {
            toast.error('Selecciona un proveedor');
            return false;
        }
        if (articulosSeleccionados.length === 0) {
            toast.error("Agrega al menos un artículo a la orden de compra");
            return false;
        }
        if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
            toast.error("Las cantidades de los artículos deben ser mayores a cero");
            return false;
        }
         if (!idMetodoPago) {
            toast.error("Selecciona un método de pago");
            return false;
        }
        return true;
    };

   
    const handleArchivoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (!tiposPermitidos.includes(file.type)) {
            toast.error('Solo se permiten archivos JPG, PNG o PDF');
            e.target.value = '';
            return;
        }

        // Validar tamaño (5MB máximo)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('El archivo no puede superar los 5MB');
            e.target.value = '';
            return;
        }

        setArchivoComprobante(file);

        // Crear preview para imágenes
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(null);
        }
    };

    const eliminarArchivo = () => {
        setArchivoComprobante(null);
        setPreviewUrl(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setLoading(true);
        
        const datos = {
            id_proveedor: parseInt(idProveedor),
            categoria_costo: categoriaCosto.trim() || null,
            id_orden_fabricacion: null, 
            estado: 'pendiente', 
            items: articulosSeleccionados.map((a) => ({
                id_articulo: Number(a.id_articulo),
                cantidad: Number(a.cantidad),
                precio_unitario: Number(a.precio_unitario),
            })),
            id_metodo_pago: parseInt(idMetodoPago),
            referencia: referenciaPago.trim() || null,
            observaciones_pago: observacionesPago.trim() || null,
        };

        try {
            // Si hay archivo, usar FormData
            if (adjuntarComprobante && archivoComprobante) {
                const formData = new FormData();
                
                // Agregar campos como strings
                formData.append('id_proveedor', datos.id_proveedor);
                if (datos.categoria_costo) formData.append('categoria_costo', datos.categoria_costo);
                formData.append('items', JSON.stringify(datos.items));
                formData.append('id_metodo_pago', datos.id_metodo_pago);
                if (datos.referencia) formData.append('referencia', datos.referencia);
                if (datos.observaciones_pago) formData.append('observaciones_pago', datos.observaciones_pago);
                
                // Agregar archivo
                formData.append('comprobante', archivoComprobante);

                await api.post("/ordenes-compra", formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // Sin archivo, enviar JSON normal
                await api.post("/ordenes-compra", datos);
            }
            
            toast.success("Orden de compra creada correctamente", {
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
            navigate("/ordenes_compra");
        } catch (error) {
            console.error('Error creando orden de compra', error.response?.data || error.message);
            toast.error(error.response?.data?.message || 'Error interno al crear la orden de compra');
        } finally {
            setLoading(false);
        }
    };


    const handleCancelar = () => {
        navigate('/ordenes_compra');
    };

    return (
        <div className="w-full px-4 md:px-12 lg:px-20 py-10">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
                    Nueva Orden de Compra
                </h2>

                {loading && (
                    <div className="flex items-center justify-center p-4 bg-blue-100 text-blue-700 rounded-md mb-4">
                        <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cargando...
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
           
                    <div>
                        <label htmlFor="proveedor" className="block text-sm font-semibold text-gray-700 mb-1">
                            Proveedor <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="proveedor"
                            value={idProveedor}
                            onChange={(e) => setIdProveedor(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            <option value="">-- Seleccione un proveedor --</option>
                            {proveedores.map((prov) => (
                                <option key={prov.id_proveedor} value={prov.id_proveedor}>
                                    {prov.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="categoriaCosto" className="block text-sm font-semibold text-gray-700 mb-1">
                            Categoría de costo
                        </label>
                        <input
                            id="categoriaCosto"
                            type="text"
                            value={categoriaCosto}
                            onChange={(e) => setCategoriaCosto(e.target.value)}
                            placeholder="Ej: compra de articulos ya fabricados"
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        />
                    </div>

                      <hr className="my-6 border-gray-300" />
<h3 className="text-xl font-bold mb-2 text-gray-800">Datos de Pago</h3>
                    <div>
                        <label htmlFor="metodoPago" className="block text-sm font-semibold text-gray-700 mb-1">
                            Método de Pago <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="metodoPago"
                            value={idMetodoPago}
                            onChange={(e) => setIdMetodoPago(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            <option value="">-- Seleccione un método de pago --</option>
                            {metodosPago.map((metodo) => (
                                <option key={metodo.id_metodo_pago} value={metodo.id_metodo_pago}>
                                    {metodo.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="referenciaPago" className="block text-sm font-semibold text-gray-700 mb-1">
                            Referencia de Pago
                        </label>
                        <input
                            id="referenciaPago"
                            type="text"
                            value={referenciaPago}
                            onChange={(e) => setReferenciaPago(e.target.value)}
                            placeholder="Ej: Numero de cuenta"
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        />
                    </div>
                    <div>
                        <label htmlFor="observacionesPago" className="block text-sm font-semibold text-gray-700 mb-1">
                            Observaciones de Pago
                        </label>
                        <textarea
                            id="observacionesPago"
                            rows="3"
                            value={observacionesPago}
                            onChange={(e) => setObservacionesPago(e.target.value)}
                            placeholder="Notas adicionales sobre el pago"
                            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        />
                    </div>

                    {/* Checkbox para habilitar carga de comprobante */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="adjuntarComprobante"
                            checked={adjuntarComprobante}
                            onChange={(e) => {
                                setAdjuntarComprobante(e.target.checked);
                                if (!e.target.checked) {
                                    setArchivoComprobante(null);
                                    setPreviewUrl(null);
                                }
                            }}
                            className="w-4 h-4 text-slate-600 cursor-pointer"
                            disabled={loading}
                        />
                        <label htmlFor="adjuntarComprobante" className="text-sm font-medium text-gray-700 cursor-pointer">
                            Adjuntar comprobante/factura (opcional)
                        </label>
                    </div>

                    {/* Campo de archivo (solo si está habilitado) */}
                    {adjuntarComprobante && (
                        <div className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Cargar archivo
                            </label>
                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={handleArchivoChange}
                                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 file:cursor-pointer"
                                disabled={loading}
                            />
                            <p className="mt-2 text-xs text-gray-500">
                                Formatos permitidos: JPG, PNG, PDF. Tamaño máximo: 5MB
                            </p>

                            {/* Preview de imagen */}
                            {previewUrl && (
                                <div className="mt-4 relative">
                                    <img 
                                        src={previewUrl} 
                                        alt="Preview" 
                                        className="max-w-full h-auto max-h-48 rounded-md border border-gray-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={eliminarArchivo}
                                        className="cursor-pointer absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Nombre de archivo PDF */}
                            {archivoComprobante && !previewUrl && (
                                <div className="mt-4 flex items-center justify-between bg-white border border-gray-300 rounded-md p-3">
                                    <span className="text-sm text-gray-700">{archivoComprobante.name}</span>
                                    <button
                                        type="button"
                                        onClick={eliminarArchivo}
                                        className="cursor-pointer text-red-600 hover:text-red-700"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <hr className="my-6 border-gray-300" />
                
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Agregar artículo
                        </label>
                        <div className="flex items-center gap-2">
                            <AsyncSelect
                                cacheOptions
                                loadOptions={loadArticulosOptions}
                                defaultOptions={todosLosArticulos}
                                value={articuloSeleccionado}
                                onChange={(option) => {
                                    setArticuloSeleccionado(option); 
                                    if (option) {
                                        agregarArticulo(option); 
                                    }
                                }}
                                placeholder="Escribe para buscar un artículo o selecciona de la lista..."
                                isClearable
                                className="text-sm w-full"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderColor: "#d1d5db",
                                        boxShadow: "none",
                                        "&:hover": { borderColor: "#64748b" },
                                        borderRadius: "0.375rem",
                                    }),
                                    menuList: (base) => ({
                                        ...base,
                                        maxHeight: "300px",
                                    }),
                                }}
                                isDisabled={loading}
                                noOptionsMessage={() => "No se encontraron artículos"}
                                loadingMessage={() => "Cargando artículos..."}
                            />
                          
                        </div>
                    </div>

                 
                    <div>
                        <h3 className="text-2xl font-bold mb-4 text-gray-800">
                            Artículos seleccionados
                        </h3>
                        <table className="w-full table-auto border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-slate-200">
                                    <th className="px-4 py-2 text-left">Descripción</th>
                                    <th className="px-4 py-2 text-right">Cantidad</th>
                                    <th className="px-4 py-2 text-right">Precio Unitario</th>
                                    <th className="px-4 py-2 text-center">Eliminar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {articulosSeleccionados.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-4 py-4 text-center text-gray-500">
                                            No hay artículos seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    articulosSeleccionados.map((art) => (
                                        <tr key={art.id_articulo} className="border-t border-gray-200">
                                            <td className="px-4 py-2">{art.descripcion}</td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={art.cantidad}
                                                    onChange={(e) => cambiarCantidad(art.id_articulo, e.target.value)}
                                                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={loading}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="text"
                                                    min="0"
                                                    value={formatCOP(art.precio_unitario)}
                                                    onChange={(e) => cambiarPrecioUnitario(art.id_articulo, e.target.value)}

                                                    className="w-28 border border-gray-300 rounded-md px-2 py-1 text-right bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={loading}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarArticulo(art.id_articulo)}
                                                    className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={loading}
                                                >
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    
                    <div className="flex gap-4 justify-end mt-8">
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            Guardar Orden
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CrearOrdenCompra;
