import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Ajusta según tu estructura
import toast from 'react-hot-toast';
import Select from 'react-select'; // Importar react-select
import { X } from 'lucide-react'; // Para el icono de eliminar item
import { confirmAlert } from 'react-confirm-alert'; // Importar react-confirm-alert
import 'react-confirm-alert/src/react-confirm-alert.css'; // Importar los estilos CSS de react-confirm-alert

const CrearOrdenCompra = () => {
    const [proveedores, setProveedores] = useState([]);
    const [articulos, setArticulos] = useState([]); // Lista de todos los artículos disponibles
    const [idProveedor, setIdProveedor] = useState('');
    const [categoriaCosto, setCategoriaCosto] = useState('');
    const [articulosSeleccionados, setArticulosSeleccionados] = useState([]); // Artículos agregados a la orden
    const [articuloSeleccionado, setArticuloSeleccionado] = useState(null); // Artículo seleccionado en el Select para agregar
    const [loading, setLoading] = useState(false); // Estado de carga

    const navigate = useNavigate();

    // Cargar proveedores y artículos al inicio
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [resProveedores, resArticulos] = await Promise.all([
                    api.get('/proveedores'),
                    api.get('/articulos'),
                ]);
                setProveedores(resProveedores.data || []);
                // Mapear artículos para react-select {value, label, ...articuloData}
                const opcionesArticulos = resArticulos.data.map((art) => ({
                    value: art.id_articulo,
                    label: art.descripcion,
                    ...art, // Incluir todos los datos del artículo para acceder a precio_venta
                }));
                setArticulos(opcionesArticulos || []);
            } catch (error) {
                console.error('Error al cargar datos iniciales:', error);
                toast.error('Error al cargar datos iniciales (proveedores, artículos)');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Función para verificar si el artículo existe en inventario y, si no, preguntar para inicializar
    const verificarYAgregarAlInventario = async (idArticulo, descripcionArticulo) => {
        setLoading(true);
        try {
            await api.get(`/inventario/${idArticulo}`);
            return true; // Artículo encontrado en inventario
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
                                        // Usamos el endpoint /inventario/inicializar
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
                        closeOnEscape: false, // Evitar que se cierre sin una elección
                        closeOnClickOutside: false, // Evitar que se cierre sin una elección
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

    // Función para agregar un artículo a la lista de seleccionados
    const agregarArticulo = async (articulo) => {
        // Verificar si el artículo ya está seleccionado para evitar duplicados en la UI
        const yaExiste = articulosSeleccionados.some(
            (a) => a.id_articulo === articulo.id_articulo
        );
        if (yaExiste) {
            toast.error("Este artículo ya ha sido añadido a la orden de compra.");
            setArticuloSeleccionado(null); // Limpiar la selección en el Select
            return;
        }

        const puedeAgregar = await verificarYAgregarAlInventario(
            articulo.value, // Usamos 'value' que es el id_articulo en react-select
            articulo.label // Usamos 'label' que es la descripción en react-select
        );

        if (!puedeAgregar) {
            // Si el usuario canceló la inicialización o hubo un error
            setArticuloSeleccionado(null); // Limpiar la selección en el Select
            return;
        }

        setArticulosSeleccionados((prev) => [
            ...prev,
            {
                id_articulo: articulo.value, // Usar el value del Select
                descripcion: articulo.label, // Usar la descripción de la opción de Select
                cantidad: 1,
                precio_unitario: articulo.precio_venta || 0, // Usar precio_venta del artículo
            },
        ]);
        setArticuloSeleccionado(null); // Limpiar la selección después de agregar
    };

    // Función para eliminar un artículo de la lista de seleccionados
    const eliminarArticulo = (id_articulo) => {
        setArticulosSeleccionados((prev) =>
            prev.filter((a) => a.id_articulo !== id_articulo)
        );
    };

    // Función para cambiar la cantidad de un artículo seleccionado
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

    // Función para validar el formulario antes de enviar
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
        return true;
    };

    // Manejador para el envío del formulario
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setLoading(true);
        const payload = {
            id_proveedor: parseInt(idProveedor),
            categoria_costo: categoriaCosto.trim() || null,
            id_orden_fabricacion: null, // Asumiendo que no se usa en este formulario
            estado: 'pendiente', // Estado inicial de la orden de compra
            items: articulosSeleccionados.map((a) => ({
                id_articulo: Number(a.id_articulo),
                cantidad: Number(a.cantidad),
                precio_unitario: Number(a.precio_unitario),
            })),
        };

        try {
            await api.post("/ordenes-compra", payload);
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

    // Manejador para el botón de cancelar
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
                    {/* Selección de proveedor */}
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

                    {/* Categoria de costo */}
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

                    {/* Sección de agregar artículo */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Agregar artículo
                        </label>
                        <div className="flex items-center gap-2">
                            <Select
                                options={articulos}
                                value={articuloSeleccionado}
                                onChange={(option) => {
                                    setArticuloSeleccionado(option); // Actualiza el estado del Select
                                    if (option) {
                                        agregarArticulo(option); // Llama a agregarArticulo si se selecciona una opción
                                    }
                                }}
                                placeholder="Selecciona un artículo"
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
                                }}
                                isDisabled={loading}
                            />
                            {/* El botón "Crear artículo" ha sido eliminado según tu solicitud */}
                        </div>
                    </div>

                    {/* Tabla de artículos seleccionados */}
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
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={art.precio_unitario}
                                                    readOnly
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

                    {/* Botones de acción */}
                    <div className="flex gap-4 justify-end mt-8">
                        <button
                            type="button"
                            onClick={handleCancelar}
                            className="px-6 py-3 border border-gray-400 rounded-xl hover:bg-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="bg-slate-700 text-white px-6 py-3 rounded-xl hover:bg-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
