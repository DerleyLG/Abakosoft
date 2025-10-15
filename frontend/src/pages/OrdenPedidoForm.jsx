import React, { useEffect, useState } from "react";
import { Listbox } from "@headlessui/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api"; 
import Select from "react-select"; 
import { PlusCircle } from "lucide-react";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

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


const OrdenPedidoForm = () => {
    const navigate = useNavigate();
    const [clientes, setClientes] = useState([]);
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]); 
    const [cliente, setCliente] = useState(null);
    const [estado, setEstado] = useState("pendiente");
    const [observaciones, setObservaciones] = useState("");
    const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
    const [articuloSeleccionado, setArticuloSeleccionado] = useState(null);
    const [mostrarFormularioArticulo, setMostrarFormularioArticulo] =
        useState(false);
    const [nuevoArticulo, setNuevoArticulo] = useState({
        referencia: "",
        descripcion: "",
        precio_venta: 0,
        id_categoria: "",
    });
    const [loading, setLoading] = useState(false);
    const [editandoPrecio, setEditandoPrecio] = useState({}); // Para manejar el estado de edición de precios 

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true); 
            try {
                const [resClientes, resArticulos, resCategorias] = await Promise.all([
                    api.get("/clientes"),
                    api.get("/articulos"),
                    api.get("/categorias"),
                ]);
                setClientes(resClientes.data || []);
                setArticulos(resArticulos.data || []);
                setCategorias(resCategorias.data || []); 
            } catch (error) {
                console.error("Error al cargar datos iniciales:", error);
                toast.error("Error al cargar datos iniciales (clientes, artículos, categorías)");
            } finally {
                setLoading(false); // Desactivar carga al finalizar
            }
        };
        fetchData();
    }, []);

    const agregarArticulo = async (articulo) => {
     
        const yaExiste = articulosSeleccionados.some(
            (a) => a.id_articulo === articulo.id_articulo
        );
        if (yaExiste) {
            toast.error("Este artículo ya ha sido añadido al pedido.");
            return;
        }

        const puedeAgregar = await verificarYAgregarAlInventario(
            articulo.id_articulo,
            articulo.descripcion
        );

        if (!puedeAgregar) {
            // Si el usuario canceló la inicialización o hubo un error
            setArticuloSeleccionado(null); // Limpiar la selección en el Select
            return;
        }

        setArticulosSeleccionados((prev) => [
            ...prev,
            {
                ...articulo,
                cantidad: 1,
                precio_unitario: articulo.precio_venta || 0,
            },
        ]);
        setArticuloSeleccionado(null); // Limpiar la selección después de agregar
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

    const validarFormulario = () => {
        if (!cliente) {
            toast.error("Selecciona un cliente");
            return false;
        }
        if (articulosSeleccionados.length === 0) {
            toast.error("Agrega al menos un artículo");
            return false;
        }
        if (articulosSeleccionados.some((a) => a.cantidad <= 0)) {
            toast.error("Las cantidades deben ser mayores a cero");
            return false;
        }
        return true;
    };

    const verificarYAgregarAlInventario = async (idArticulo, descripcionArticulo) => {
        setLoading(true); // Activar carga al verificar inventario
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
                                        // Usamos el endpoint /inventario/inicializar como habíamos acordado
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
            setLoading(false); // Desactivar carga después de la verificación/inicialización
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        setLoading(true); // Activar carga al enviar el formulario
        // Asegurar que si hay un precio en edición (input con foco), se tome ese valor
        const detallesConPrecios = articulosSeleccionados.map((a) => {
            const valorEditado = editandoPrecio?.[a.id_articulo];
            const precio_unitario =
                valorEditado !== undefined
                    ? (typeof valorEditado === "string" && valorEditado.includes("$")
                        ? cleanCOPFormat(valorEditado)
                        : parseInt(valorEditado, 10) || 0)
                    : a.precio_unitario;
            return {
                id_articulo: a.id_articulo,
                cantidad: a.cantidad,
                precio_unitario,
            };
        });

        const payload = {
            id_cliente: cliente.id_cliente,
            estado,
            observaciones,
            detalles: detallesConPrecios,
        };

        try {
            await api.post("/pedidos", payload);
            toast.success("Orden de pedido creada");
            navigate("/ordenes_pedido");
        } catch (error) {
            toast.error(error.response?.data?.error || error.message);
        } finally {
            setLoading(false); // Desactivar carga al finalizar el envío
        }
    };

    const handleCrearArticulo = async (e) => {
        e.preventDefault();
        setLoading(true); // Activar carga al crear artículo
        try {
            const res = await api.post("/articulos", nuevoArticulo);
            toast.success("Artículo creado");
            const articuloCreado = res.data.articulo;

            // Actualizar la lista de artículos disponibles para el Select
            setArticulos((prev) => [...prev, articuloCreado]);

            // Seleccionar y agregar el artículo recién creado al pedido
            if (articuloCreado?.id_articulo) {
                // Mapear el articuloCreado al formato que `react-select` espera
                const newOption = {
                    value: articuloCreado.id_articulo,
                    label: articuloCreado.descripcion,
                    ...articuloCreado,
                };
                setArticuloSeleccionado(newOption); // Establecerlo como seleccionado en el Select
                await agregarArticulo(newOption); // Agregarlo al pedido, lo que disparará la verificación de inventario
            }

            setMostrarFormularioArticulo(false);
            setNuevoArticulo({
                referencia: "",
                descripcion: "",
                precio_venta: 0,
                id_categoria: "",
            }); // Limpiar formulario
        } catch (error) {
            const mensajeBackend =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;
            toast.error(mensajeBackend);
        } finally {
            setLoading(false); // Desactivar carga al finalizar la creación
        }
    };

    const cambiarPrecioUnitario = (id_articulo, valor) => {
        // Actualizar el estado de edición
        setEditandoPrecio(prev => ({
            ...prev,
            [id_articulo]: valor
        }));
    };

    const handleFocusPrecio = (id_articulo, precioActual) => {
        // Al hacer focus, mostrar el valor numérico sin formato
        setEditandoPrecio(prev => ({
            ...prev,
            [id_articulo]: precioActual.toString()
        }));
    };

    const handleBlurPrecio = (id_articulo, valor) => {
        // Al perder focus, procesar y guardar el valor
        const numPrecio = valor.includes('$') ? cleanCOPFormat(valor) : parseInt(valor, 10) || 0;
        
        if (isNaN(numPrecio) || numPrecio < 0) {
            toast.error("El precio unitario debe ser un número positivo o cero.");
            // Restaurar el valor original
            setEditandoPrecio(prev => {
                const newState = {...prev};
                delete newState[id_articulo];
                return newState;
            });
            return;
        }
        
        // Actualizar el precio en los artículos seleccionados
        setArticulosSeleccionados((prev) =>
            prev.map((a) => (a.id_articulo === id_articulo ? { ...a, precio_unitario: numPrecio } : a))
        );

        // Limpiar el estado de edición
        setEditandoPrecio(prev => {
            const newState = {...prev};
            delete newState[id_articulo];
            return newState;
        });
    };

    return (
        <div className="w-full px-4 md:px-12 lg:px-20 py-10">
            <div className="bg-white p-8 rounded-xl shadow-lg">
                <h2 className="text-4xl font-bold mb-8 text-gray-800 border-b pb-4">
                    Nuevo pedido
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

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Cliente *
                            </label>
                            <Listbox value={cliente} onChange={setCliente} disabled={loading}>
                                <div className="relative">
                                    <Listbox.Button className="w-full border border-gray-300 rounded-md px-4 py-2 text-left focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {cliente ? cliente.nombre : "Selecciona un cliente"}
                                    </Listbox.Button>
                                    <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {clientes.map((c) => (
                                            <Listbox.Option
                                                key={c.id_cliente}
                                                value={c}
                                                className={({ active }) =>
                                                    `cursor-pointer select-none px-4 py-2 ${active ? "bg-slate-100" : ""
                                                    }`
                                                }
                                            >
                                                {c.nombre}
                                            </Listbox.Option>
                                        ))}
                                    </Listbox.Options>
                                </div>
                            </Listbox>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Observaciones
                            </label>
                            <textarea
                                rows={2}
                                value={observaciones}
                                onChange={(e) => setObservaciones(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder="Observaciones del pedido (opcional)"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                            Agregar artículo
                        </label>
                        <div className="flex items-center gap-2">
                            <Select
                                options={articulos.map((a) => ({
                                    value: a.id_articulo,
                                    label: a.descripcion,
                                    ...a,
                                }))}
                                value={
                                    articuloSeleccionado
                                        ? {
                                            value: articuloSeleccionado.id_articulo,
                                            label: articuloSeleccionado.descripcion,
                                        }
                                        : null
                                }
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
                            <button
                                type="button"
                                className="h-[38px] px-4 text-sm text-white bg-slate-600 hover:bg-slate-700 rounded-md flex items-center justify-center whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => setMostrarFormularioArticulo(true)}
                                disabled={loading}
                            >
                                Crear artículo
                            </button>
                        </div>

                        {mostrarFormularioArticulo && (
                            <div className="mt-6 border border-gray-300 rounded-2xl p-6 shadow-sm bg-white space-y-6">
                                <h2 className="text-xl font-semibold text-slate-700 cursor-pointer">
                                    Nuevo Artículo
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4  ">
                                    <div>
                                        <label className="text-sm text-slate-600">Referencia</label>
                                        <input
                                            type="text"
                                            value={nuevoArticulo.referencia}
                                            onChange={(e) =>
                                                setNuevoArticulo({
                                                    ...nuevoArticulo,
                                                    referencia: e.target.value,
                                                })
                                            }
                                            placeholder="Ej: REF-001"
                                            className="w-full border border-gray-300  rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">
                                            Descripción
                                        </label>
                                        <input
                                            type="text"
                                            value={nuevoArticulo.descripcion}
                                            onChange={(e) =>
                                                setNuevoArticulo({
                                                    ...nuevoArticulo,
                                                    descripcion: e.target.value,
                                                })
                                            }
                                            placeholder="Ej: Silla de madera"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">
                                            Precio de venta
                                        </label>
                                        <input
                                            type="text"
                                            value={formatCOP(nuevoArticulo.precio_venta)}
                                            onChange={(e) =>
                                                setNuevoArticulo({
                                                    ...nuevoArticulo,
                                                    precio_venta: parseFloat(e.target.value),
                                                })
                                            }
                                            placeholder="Ej: 120.00"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={loading}
                                        />
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-sm text-slate-600">Categoría</label>
                                        <select
                                            value={nuevoArticulo.id_categoria}
                                            onChange={(e) =>
                                                setNuevoArticulo({
                                                    ...nuevoArticulo,
                                                    id_categoria: parseInt(e.target.value, 10),
                                                })
                                            }
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2 mt-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={loading}
                                        >
                                            <option value="">Seleccionar categoría</option>
                                            {categorias.map((cat) => (
                                                <option key={cat.id_categoria} value={cat.id_categoria}>
                                                    {cat.nombre}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={handleCrearArticulo}
                                        className="bg-slate-700 text-white px-4 py-3 rounded-xl text-sm hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        Guardar artículo
                                    </button>
                                    <button
                                        onClick={() => setMostrarFormularioArticulo(false)}
                                        type="button"
                                        className="bg-gray-300 text-slate-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-400 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={loading}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <h3 className="text-2xl font-bold mb-8 text-gray-800">
                            Artículos seleccionados
                        </h3>
                        <table className="w-full table-auto border-collapse border border-gray-300">
                            <thead>
                                <tr className="bg-slate-200">
                                    <th className="px-4 py-2 text-left" >Descripción</th>
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
                                        <tr key={art.id_articulo}>
                                            <td className="px-4 py-2">{art.descripcion}</td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={art.cantidad}
                                                    onChange={(e) =>
                                                        cambiarCantidad(
                                                            art.id_articulo,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="w-20 border border-gray-300 rounded-md px-2 py-1 text-right disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={loading}
                                                />
                                            </td>
                                            <td className="px-4 py-2 text-right">
                                                <input
                                                    type="text"
                                                    value={editandoPrecio[art.id_articulo] !== undefined 
                                                        ? editandoPrecio[art.id_articulo] 
                                                        : formatCOP(art.precio_unitario)
                                                    }
                                                    onChange={(e) =>
                                                        cambiarPrecioUnitario(
                                                            art.id_articulo,
                                                            e.target.value
                                                        )
                                                    }
                                                    onFocus={() => handleFocusPrecio(art.id_articulo, art.precio_unitario)}
                                                    onBlur={(e) => handleBlurPrecio(art.id_articulo, e.target.value)}
                                                    className="w-32 border border-gray-300 rounded-md px-2 py-1 text-right focus:ring-2 focus:ring-slate-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                                    disabled={loading}
                                                    placeholder="$0"
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

                    {articulosSeleccionados.length > 0 && (
                        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 p-6 rounded-xl shadow-sm">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                                        Total del Pedido
                                    </span>
                                    <span className="text-xs text-gray-500 mt-1">
                                        {articulosSeleccionados.length} artículo{articulosSeleccionados.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-800">
                                        {formatCOP(
                                            articulosSeleccionados.reduce(
                                                (total, art) => total + (art.precio_unitario * art.cantidad), 
                                                0
                                            )
                                        )}
                                    </div>
                                    
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="bg-slate-700 text-white px-6 py-3 rounded-xl hover:bg-slate-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            Guardar pedido
                        </button>
                        <button
                            className="bg-gray-300 px-6 py-3 rounded-xl hover:bg-gray-400 cursor-pointer ml-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            type="button"
                            onClick={() => navigate("/ordenes_pedido")}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OrdenPedidoForm;
