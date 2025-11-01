import React, { useEffect, useState, useMemo } from "react";
import { Listbox } from "@headlessui/react";
import { X } from "lucide-react"; 
import { FiSave, FiArrowLeft, FiPlus, FiTrash2, FiDollarSign } from "react-icons/fi"; 
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../services/api";
import Select from "react-select";



const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }
    
   
    return Number(value).toLocaleString('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0,
    });
};


const OrdenVentaEdit = () => {
    const navigate = useNavigate();
    const { id } = useParams(); 
    const [loading, setLoading] = useState(true); 
    const [vieneDeUndefined, setVieneDeUndefined] = useState(false); // Controla si la orden viene de un pedido
    
   
    const [clientes, setClientes] = useState([]);
    const [articulos, setArticulos] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);

 
    const [cliente, setCliente] = useState(null); 
    const [fecha, setFecha] = useState("");
    const [estado, setEstado] = useState("pendiente");
    
    
    const [metodoPago, setMetodoPago] = useState(null); 
    const [referencia, setReferencia] = useState("");
    const [observaciones, setObservaciones] = useState(""); 

   
    const [articulosSeleccionados, setArticulosSeleccionados] = useState([]);
    const [articuloSeleccionado, setArticuloSeleccionado] = useState(null); 

  
    const [focusedPrice, setFocusedPrice] = useState({}); 

   
    const estados = [
        { id: "pendiente", nombre: "Pendiente" },
        { id: "completada", nombre: "Completada" },
        { id: "anulada", nombre: "Anulada" },
    ];
    
    

    const handlePriceChange = (id_articulo, value) => {
        const sanitizedValue = value.replace(/[^0-9.]/g, ''); 

        setArticulosSeleccionados((prev) =>
            prev.map((a) =>
                a.id_articulo === id_articulo 
                    ? { ...a, precio_unitario: Number(sanitizedValue) || 0 } 
                    : a
            )
        );

        setFocusedPrice((prev) => ({
            ...prev,
            [id_articulo]: sanitizedValue,
        }));
    };

    const handlePriceFocus = (id_articulo, value) => {
        setFocusedPrice((prev) => ({
            ...prev,
            [id_articulo]: String(value),
        }));
    };

    const handlePriceBlur = (id_articulo) => {
        setFocusedPrice((prev) => {
            const newFocused = { ...prev };
            delete newFocused[id_articulo];
            return newFocused;
        });
    };
    
    

    const fetchMovimientoPago = async (ordenId, metodosPagoAPI) => {
        try {
            
            const resMovimiento = await api.get(`/tesoreria/documento/${ordenId}?tipo=orden_venta`);
            const movimiento = resMovimiento.data;

            if (movimiento) {
             
                const metodoPagoExistente = metodosPagoAPI.find((m) => m.id_metodo_pago == movimiento.id_metodo_pago);
                
              
                if (metodoPagoExistente) setMetodoPago(metodoPagoExistente);
                setReferencia(movimiento.referencia || '');
                
                setObservaciones(movimiento.observaciones || ''); 
            } else {
               
                setMetodoPago(null);
                setReferencia('');
                setObservaciones('');
            }
        } catch (error) {
            console.warn('Advertencia: No se encontró movimiento de tesorería o hubo un error al buscarlo.', error);
            setMetodoPago(null);
            setReferencia('');
            setObservaciones('');
        }
    };
    
    
    const agregarArticulo = (articulo) => {
        if (!articulo) {
            setArticuloSeleccionado(null);
            return;
        }

        const yaExiste = articulosSeleccionados.some(
            (a) => a.id_articulo === articulo.value
        );
        if (yaExiste) {
            toast.error("El artículo ya está en la lista.");
            setArticuloSeleccionado(null);
            return;
        }

        setArticulosSeleccionados((prev) => [
            ...prev,
            {
                id_articulo: articulo.value,
                descripcion: articulo.label,
                cantidad: 1,
                precio_unitario: Number(articulo.precio_venta) || 0,
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
        const cant = Number(cantidad);
        if (cant < 1 || isNaN(cant)) return;
        setArticulosSeleccionados((prev) =>
            prev.map((a) =>
                a.id_articulo === id_articulo ? { ...a, cantidad: cant } : a
            )
        );
    };
    
  
    
    const calcularSubtotal = (cantidad, precio) => {
        const cant = Number(cantidad) || 0;
        const prec = Number(precio) || 0;
        return cant * prec;
    };

    const calcularTotalGeneral = () => {
        return articulosSeleccionados.reduce((sum, detalle) => sum + calcularSubtotal(detalle.cantidad, detalle.precio_unitario), 0);
    };
    
    const totalGeneral = useMemo(calcularTotalGeneral, [articulosSeleccionados]);
    

  

    useEffect(() => {
        const cargarDatosYFormulario = async () => {
            try {
                setLoading(true);
                
               
                const [clientesRes, articulosRes, metodosPagoRes, ordenRes] =
                    await Promise.all([
                        api.get("/clientes"),
                        api.get("/ordenes-venta/articulos-con-stock"),
                        api.get("/tesoreria/metodos-pago"),
                        api.get(`/ordenes-venta/${id}`), 
                    ]);

                const clientesAPI = clientesRes.data;
                const articulosAPI = articulosRes.data;
                const metodosPagoAPI = metodosPagoRes.data;
                const ordenData = ordenRes.data; 

                setClientes(clientesAPI);
                setArticulos(articulosAPI);
                setMetodosPago(metodosPagoAPI);

                // Verificar si la orden viene de un pedido
                const vieneDeUndefinedOrden = ordenData.id_pedido == null || ordenData.id_pedido === undefined;
                setVieneDeUndefined(vieneDeUndefinedOrden);

                // Si viene de un pedido, mostrar mensaje y no permitir edición
                if (!vieneDeUndefinedOrden) {
                    toast.error("Esta orden proviene de un pedido y no puede ser editada directamente.");
                }

             
                setEstado(ordenData.estado);
                
                const clienteExistente = clientesAPI.find((c) => c.id_cliente === ordenData.id_cliente);
                if (clienteExistente) setCliente(clienteExistente);
                
                setFecha(ordenData.fecha ? ordenData.fecha.split("T")[0] : ""); 
                
            
                await fetchMovimientoPago(id, metodosPagoAPI); 

             
                let detalles = ordenData.detalles; 
                
                if (!detalles) { 
                   
                     const detallesRes = await api.get(`/detalle-orden-venta/${id}`);
                     detalles = detallesRes.data;
                }

                const articulosDeLaOrden = detalles.map((item) => ({
                    id_articulo: item.id_articulo,
                    descripcion: item.descripcion || articulosAPI.find(a => a.id_articulo === item.id_articulo)?.descripcion || `Artículo ${item.id_articulo}`,
                    cantidad: item.cantidad,
                    precio_unitario: Number(item.precio_unitario) || 0,
                }));
                setArticulosSeleccionados(articulosDeLaOrden);
                
                
            } catch (error) {
                console.error("Error al cargar datos de la orden:", error);
                toast.error("Error al cargar los datos de la orden para editar.");
                navigate('/ordenes_venta');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            cargarDatosYFormulario();
        }
    }, [id, navigate]);

 

    const validarFormulario = () => {
        if (!cliente) {
            toast.error("Selecciona un cliente");
            return false;
        }
        // Fecha no es editable ni requerida desde el cliente
        if (!metodoPago) {
            toast.error("Selecciona un método de pago");
            return false;
        }
        if (!estado) {
            toast.error("Selecciona un estado");
            return false;
        }
        if (articulosSeleccionados.length === 0) {
            toast.error("Agrega al menos un artículo");
            return false;
        }
        const detallesInvalidos = articulosSeleccionados.some(d => 
            !d.id_articulo || d.cantidad <= 0 || d.precio_unitario <= 0 || isNaN(d.cantidad) || isNaN(d.precio_unitario)
        );
        if (detallesInvalidos) {
            toast.error('Asegúrate de que todos los artículos tengan cantidad y precio válidos (> 0).');
            return false;
        }
        return true;
    };

    

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validarFormulario()) return;

        const detallesFormateados = articulosSeleccionados.map((a) => ({
            id_articulo: a.id_articulo,
            cantidad: a.cantidad,
            precio_unitario: a.precio_unitario,
        }));

        const payload = {
            id_orden_venta: id,
            id_cliente: cliente.id_cliente,
            estado,
            detalles: detallesFormateados,
            id_metodo_pago: metodoPago.id_metodo_pago, 
            referencia,
            observaciones_pago: observaciones, 
        };

        try {
            await api.put(`/ordenes-venta/${id}`, payload); 
            toast.success("Orden de venta actualizada ");
            navigate("/ordenes_venta");
        } catch (error) {
            const mensajeBackend = error.response?.data?.message || 'Error al actualizar la orden de venta.';
            console.error('Error de actualización:', error);
            toast.error(mensajeBackend);
        }
    };

  

    if (loading) {
        return <div className="text-center py-10 text-xl font-medium text-slate-700">Cargando orden de venta...</div>;
    }

    return (
        <div className="w-full px-4 md:px-12 lg:px-20 py-10">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    Editar Orden de Venta <span className="text-slate-500 font-normal">#{id}</span>
                    {!vieneDeUndefined && (
                        <span className="text-base text-red-500 ml-4 p-1 border border-red-500 rounded font-semibold">
                            ORDEN DE PEDIDO - SOLO LECTURA
                        </span>
                    )}
                </h2>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-slate-800 px-4 py-2 rounded-lg font-semibold transition"
                >
                    <FiArrowLeft />
                    Volver
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl">
                
             
                <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700">Detalles de la Orden</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    
                    
                    <div className="flex flex-col">
                        <label htmlFor="cliente" className="mb-2 font-medium text-slate-600">Cliente</label>
                        <Listbox value={cliente} onChange={setCliente} disabled={!vieneDeUndefined}>
                            <div className="relative">
                                <Listbox.Button className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500">
                                    {cliente ? cliente.nombre : "Selecciona un cliente"}
                                </Listbox.Button>
                                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {clientes.map((c) => (
                                        <Listbox.Option
                                            key={c.id_cliente}
                                            value={c}
                                            className={({ active }) => `cursor-pointer select-none px-4 py-2 ${active ? "bg-slate-100" : ""}`}
                                        >
                                            {c.nombre}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </div>
                        </Listbox>
                    </div>

                   
                    {/* Campo de fecha removido: la fecha está definida por el backend y no es editable */}

                
                    <div className="flex flex-col">
                        <label htmlFor="estado" className="mb-2 font-medium text-slate-600">Estado</label>
                        <Listbox value={estado} onChange={setEstado} disabled={!vieneDeUndefined}>
                            <div className="relative">
                                <Listbox.Button className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500">
                                    {estados.find((e) => e.id === estado)?.nombre || "Selecciona un estado"}
                                </Listbox.Button>
                                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {estados.map((e) => (
                                        <Listbox.Option
                                            key={e.id}
                                            value={e.id}
                                            className={({ active }) => `cursor-pointer select-none px-4 py-2 ${active ? "bg-slate-100" : ""}`}
                                        >
                                            {e.nombre}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </div>
                        </Listbox>
                    </div>

                    <div className="flex flex-col">
                        <label htmlFor="id_metodo_pago" className="mb-2 font-medium text-slate-600">Método de Pago</label>
                        <Listbox value={metodoPago} onChange={setMetodoPago} disabled={!vieneDeUndefined}>
                            <div className="relative">
                                <Listbox.Button className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-left focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500">
                                    {metodoPago ? metodoPago.nombre : "Selecciona un método"}
                                </Listbox.Button>
                                <Listbox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                    {metodosPago.map((m) => (
                                        <Listbox.Option
                                            key={m.id_metodo_pago}
                                            value={m}
                                            className={({ active }) => `cursor-pointer select-none px-4 py-2 ${active ? "bg-slate-100" : ""}`}
                                        >
                                            {m.nombre}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </div>
                        </Listbox>
                    </div>
                    
                  
                    <div className="flex flex-col">
                        <label htmlFor="referencia" className="mb-2 font-medium text-slate-600">Referencia / No. Transacción</label>
                        <input
                            type="text"
                            id="referencia"
                            name="referencia"
                            value={referencia}
                            onChange={(e) => setReferencia(e.target.value)}
                            disabled={!vieneDeUndefined}
                            placeholder="Ej: N° de comprobante, tarjeta"
                            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                    
                  
                    <div className="flex flex-col">
                        <label htmlFor="observaciones" className="mb-2 font-medium text-slate-600">Observaciones (Pago)</label>
                        <input
                            type="text"
                            id="observaciones"
                            name="observaciones"
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            disabled={!vieneDeUndefined}
                            placeholder="Notas adicionales sobre el pago"
                            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                </div>

            
                
                <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700 mt-10">Detalles de Venta</h3>
                
               
                {vieneDeUndefined && (
                    <div className="flex flex-col mb-6">
                        <label className="mb-2 font-medium text-slate-600">Agregar Artículo</label>
                        <Select
                            options={articulos.map((a) => ({
                                value: a.id_articulo,
                                label: a.descripcion,
                                precio_venta: a.precio_venta,
                                ...a,
                            }))}
                            value={articuloSeleccionado}
                            onChange={agregarArticulo}
                            placeholder="Buscar y seleccionar artículo para agregar"
                            isClearable
                           
                            className="text-sm"
                        />
                    </div>
                )}


              
                <div className="space-y-6 mb-8">
                    {articulosSeleccionados.map((art, index) => (
                        <div key={art.id_articulo} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                            
                          
                            <div className="col-span-1 md:col-span-5 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Artículo</label>
                                <p className="py-2.5 px-3 bg-white text-slate-800 border border-gray-300 rounded-lg">
                                    {art.descripcion}
                                </p>
                            </div>

                       
                            <div className="col-span-1 md:col-span-2 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    value={art.cantidad}
                                    onChange={(e) => cambiarCantidad(art.id_articulo, e.target.value)}
                                    min="1"
                                    required
                                    disabled={!vieneDeUndefined}
                                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right"
                                />
                            </div>

                          
                            <div className="col-span-1 md:col-span-3 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Precio Unitario (COP)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="precio_unitario"
                                        value={focusedPrice[art.id_articulo] !== undefined 
                                            ? focusedPrice[art.id_articulo] 
                                            : formatCurrency(art.precio_unitario)}
                                        onChange={(e) => handlePriceChange(art.id_articulo, e.target.value)}
                                        onFocus={() => handlePriceFocus(art.id_articulo, art.precio_unitario)}
                                        onBlur={() => handlePriceBlur(art.id_articulo)}
                                        required
                                        disabled={!vieneDeUndefined}
                                        className="border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right w-full"
                                    />
                                    <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                            </div>
                            
                       
                            <div className="col-span-1 md:col-span-1 flex flex-col justify-end">
                                <label className="mb-1 font-medium text-sm text-slate-700">Subtotal</label>
                                <p className="py-2.5 px-3 bg-white text-slate-800 font-semibold border border-gray-300 rounded-lg text-right">
                                    {formatCurrency(calcularSubtotal(art.cantidad, art.precio_unitario))}
                                </p>
                            </div>

                        
                            <div className="col-span-1 md:col-span-1 flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => eliminarArticulo(art.id_articulo)}
                                    disabled={articulosSeleccionados.length === 1 || !vieneDeUndefined}
                                    className="bg-red-500 text-white p-2.5 rounded-lg hover:bg-red-600 disabled:bg-red-300 transition shadow-md"
                                    title="Eliminar artículo"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    { (
                        <button
                            type="button"
                            onClick={() => agregarArticulo({ value: null })} 
                          
                            className="hidden items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold transition mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            <FiPlus size={20} />
                            Agregar Artículo
                        </button>
                    )}
                </div>
                
                
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-10">
                    <div className="text-xl font-bold text-slate-700">
                        Total General: <span className="text-3xl text-green-700 ml-2">{formatCurrency(totalGeneral)}</span>
                    </div>

                    <button
                        type="submit"
                        disabled={!vieneDeUndefined}
                        className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                    >
                        <FiSave size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default OrdenVentaEdit;