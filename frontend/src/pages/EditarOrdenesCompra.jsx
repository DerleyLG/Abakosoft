import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api'; 
import toast from 'react-hot-toast';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2, FiDollarSign } from 'react-icons/fi'; 
import { format } from 'date-fns';


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


const parseCurrency = (value) => {
    if (typeof value !== 'string' || !value) return 0;
    
  
    const cleanValue = value.replace(/[^0-9]/g, ''); 
    
    return Number(cleanValue); 
};


const EditarOrdenCompra = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();

    const [ordenData, setOrdenData] = useState({
        id_proveedor: '',
        estado: '',
        observaciones: '',
        categoria_costo: '', 
        fecha: format(new Date(), 'yyyy-MM-dd'), 
    });

  
    const [pagoData, setPagoData] = useState({
        id_metodo_pago: '',
        referencia: '',
        observaciones_pago: '',
    });
    
    const [allMetodosPago, setAllMetodosPago] = useState([]);
    const [detalles, setDetalles] = useState([]);

    const [loading, setLoading] = useState(true);
    const [allProveedores, setAllProveedores] = useState([]);
    const [allArticulos, setAllArticulos] = useState([]);
    const [isEditable, setIsEditable] = useState(true); 

 
    const fetchMovimientoPago = async (ordenId) => {
        try {
           
            const resMovimiento = await api.get(`/tesoreria/documento/${ordenId}?tipo=orden_compra`);
            const movimiento = resMovimiento.data;

            if (movimiento) {
                setPagoData({
                    id_metodo_pago: movimiento.id_metodo_pago ? String(movimiento.id_metodo_pago) : '',
                    referencia: movimiento.referencia || '',

                   observaciones_pago: movimiento.observaciones || '', 
                });
            } else {
                
                 setPagoData({ id_metodo_pago: '', referencia: '', observaciones_pago: '' });
            }
        } catch (error) {
            console.warn('Advertencia: No se encontró movimiento de tesorería para esta OC o hubo un error al buscarlo.', error);
            
             setPagoData({ id_metodo_pago: '', referencia: '', observaciones_pago: '' });
        }
    };
    
    
    const fetchDependencies = async () => {
        try {
            const [resProveedores, resArticulos, resMetodos] = await Promise.all([
                api.get('/proveedores'),
                api.get('/articulos', { params: { page: 1, pageSize: 10000, sortBy: 'descripcion', sortDir: 'asc' } }),
             
                api.get('/metodos-pago'), 
            ]);
            
            console.log('Artículos cargados (raw):', resArticulos.data);
            
            const articulosArray = Array.isArray(resArticulos.data) ? resArticulos.data : (resArticulos.data?.data || []);
            console.log('Artículos array:', articulosArray);
            
            setAllProveedores(Array.isArray(resProveedores.data) ? resProveedores.data : []);
            setAllArticulos(articulosArray); 
            setAllMetodosPago(Array.isArray(resMetodos.data) ? resMetodos.data : []);
        } catch (error) {
            toast.error('Error al cargar dependencias (Proveedores/Artículos/Pagos).');
            console.error('Error cargando dependencias:', error);
        }
    };

    
    const fetchOrdenData = async () => {
        try {
            const resOrden = await api.get(`/ordenes-compra/${id}`); 
            const orden = resOrden.data;

            console.log('Orden cargada:', orden);
            console.log('Detalles de la orden:', orden.detalles);
            
            const editable = orden.estado.toLowerCase() === 'pendiente';
            setIsEditable(editable);
            
            // Formatear fecha sin problemas de zona horaria
            let formattedDate = format(new Date(), 'yyyy-MM-dd');
            if (orden.fecha) {
                const date = new Date(orden.fecha);
                const year = date.getUTCFullYear();
                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                const day = String(date.getUTCDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
            }

            
            setOrdenData({
                id_proveedor: orden.id_proveedor || '',
                estado: orden.estado || 'pendiente',
                observaciones: orden.observaciones || '',
                categoria_costo: orden.categoria_costo || '', 
                fecha: formattedDate,
            });

            
            const detallesFormateados = Array.isArray(orden.detalles) 
                ? orden.detalles.map(d => ({
                    id_articulo: d.id_articulo,
                    cantidad: d.cantidad,
                    precio_unitario: Number(d.precio_unitario) || 0, 
                }))
                : [];
            
            console.log('Detalles formateados:', detallesFormateados);
            setDetalles(detallesFormateados);
            
        
            await fetchMovimientoPago(id); 

        } catch (error) {
            toast.error('Error al cargar datos de la orden de compra. Volviendo...');
            console.error('Error cargando orden:', error);
            navigate('/ordenes_compra'); 
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchDependencies();
        fetchOrdenData();
    }, [id]);


  
    const handleOrdenChange = (e) => {
        const { name, value } = e.target;
        setOrdenData(prev => ({ ...prev, [name]: value }));
    };

  
    const handlePagoChange = (e) => {
        const { name, value } = e.target;
        setPagoData(prev => ({ ...prev, [name]: value }));
    };
    
    
    const handleDetalleChange = (index, e) => {
        const { name, value } = e.target;
        const list = [...detalles];
        let processedValue = value;

        if (name === 'precio_unitario') {
            
            processedValue = parseCurrency(value); 
        } else if (name === 'cantidad') {
          
            processedValue = Number(value);
        }

        list[index][name] = processedValue;
        
        
        if (name === 'id_articulo' && allArticulos.length > 0) {
            const selectedArticle = allArticulos.find(a => a.id_articulo == value);
            if (selectedArticle) {
                
                list[index].precio_unitario = Number(selectedArticle.precio_costo) || 0; 
            } else {
                 list[index].precio_unitario = 0;
            }
        }

        setDetalles(list);
    };


    const handleAddDetalle = () => {
        setDetalles(prev => [...prev, { id_articulo: '', cantidad: 1, precio_unitario: 0 }]);
    };

    
    const handleRemoveDetalle = (index) => {
        if (detalles.length > 1) {
            setDetalles(prev => prev.filter((_, i) => i !== index));
        } else {
            toast.error('La orden debe tener al menos un artículo.');
        }
    };

 
    
    const calcularSubtotal = (cantidad, precio) => {
        const cant = Number(cantidad) || 0;
        const prec = Number(precio) || 0;
        return cant * prec;
    };

    
    const calcularTotalGeneral = () => {
        return detalles.reduce((sum, detalle) => sum + calcularSubtotal(detalle.cantidad, detalle.precio_unitario), 0);
    };
    
  
    const totalGeneral = useMemo(calcularTotalGeneral, [detalles]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!isEditable) {
            toast.error("No se puede editar una orden que no está en estado 'pendiente'.");
            return;
        }

        if (!ordenData.id_proveedor) {
            toast.error('Debe seleccionar un proveedor.');
            return;
        }

        const detallesInvalidos = detalles.some(d => 
            !d.id_articulo || 
            d.cantidad <= 0 || 
            d.precio_unitario <= 0 || 
            isNaN(d.cantidad) || 
            isNaN(d.precio_unitario)
        );
        
        if (detalles.length === 0 || detallesInvalidos) {
            toast.error('Asegúrate de que todos los detalles estén completos y sean válidos (Artículos seleccionados, Cantidad y Precio > 0).');
            return;
        }

        try {
            
            const dataToSend = {
                ...ordenData,
                ...pagoData, 
                detalles: detalles 
            };

         
            await api.put(`/ordenes-compra/${id}`, dataToSend); 

            toast.success('Orden de compra, detalles y movimiento de pago actualizados correctamente');
            navigate('/ordenes_compra');
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Error al actualizar la orden de compra.';
            
          
            if (error.response?.status === 409 && error.response.data?.needsInitialization) {
                 const articulo = error.response.data.articulo;
                 toast.error(`${error.response.data.message} Por favor, inicializa el artículo: ${articulo.descripcion}.`);
                 return;
            }
            
            console.error('Error de actualización:', error);
            toast.error(errorMessage);
        }
    };
    
    
    if (loading) {
        return <div className="text-center py-10 text-xl font-medium text-slate-700">Cargando orden de compra...</div>;
    }


    return (
        <div className="w-full px-4 md:px-12 lg:px-20 py-10">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    Editar Orden de Compra <span className="text-slate-500 font-normal">#{id}</span>
                    {!isEditable && <span className="text-base text-red-500 ml-4 p-1 border border-red-500 rounded font-semibold">(Solo Lectura)</span>}
                </h2>
                <button
                    onClick={() => navigate(-1)}
                    className="cursor-pointer flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-slate-800 px-4 py-2 rounded-lg font-semibold transition"
                >
                    <FiArrowLeft />
                    Volver
                </button>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl">
                
                {/* INFORMACIÓN GENERAL */}
                <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700">Información General</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                
                
                    <div className="flex flex-col">
                        <label htmlFor="id_proveedor" className="mb-2 font-medium text-slate-600">Proveedor</label>
                        <select
                            id="id_proveedor"
                            name="id_proveedor"
                            value={ordenData.id_proveedor}
                            onChange={handleOrdenChange}
                            required
                            disabled={!isEditable}
                            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Selecciona un proveedor</option>
                            {allProveedores.map(p => (
                                <option key={p.id_proveedor} value={p.id_proveedor}>
                                    {p.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                
                    <div className="flex flex-col">
                        <label htmlFor="estado" className="mb-2 font-medium text-slate-600">Estado</label>
                        <select
                            id="estado"
                            name="estado"
                            value={ordenData.estado}
                            disabled={true} 
                            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-gray-100 text-gray-500 focus:outline-none"
                        >
                            <option value="pendiente">Pendiente</option>
                            <option value="recibida">Recibida</option>
                            <option value="cancelada">Cancelada</option>
                        </select>
                    </div>

                
                    <div className="flex flex-col">
                        <label htmlFor="fecha" className="mb-2 font-medium text-slate-600">Fecha de la Orden</label>
                        <input
                            type="date"
                            id="fecha"
                            name="fecha"
                            value={ordenData.fecha}
                            onChange={handleOrdenChange}
                            disabled={!isEditable}
                            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                     <div className="flex flex-col">
                        <label htmlFor="id_metodo_pago" className="mb-2 font-medium text-slate-600">Método de Pago</label>
                        <select
                            id="id_metodo_pago"
                            name="id_metodo_pago"
                            value={pagoData.id_metodo_pago}
                            onChange={handlePagoChange}
                            disabled={!isEditable}
                            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        >
                            <option value="">Selecciona método (Opcional)</option>
                            {allMetodosPago.map(m => (
                                <option key={m.id_metodo_pago} value={m.id_metodo_pago}>
                                    {m.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    
               
                    <div className="flex flex-col">
                        <label htmlFor="referencia" className="mb-2 font-medium text-slate-600">Referencia / No. Transacción</label>
                        <input
                            type="text"
                            id="referencia"
                            name="referencia"
                            value={pagoData.referencia}
                            onChange={handlePagoChange}
                            disabled={!isEditable}
                            placeholder="Ej: Cheque #123, Transf. 5894, N/A"
                            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>
                    
                  
                    <div className="flex flex-col">
                        <label htmlFor="observaciones_pago" className="mb-2 font-medium text-slate-600">Observaciones del Pago</label>
                        <input
                            type="text"
                            id="observaciones_pago"
                            name="observaciones_pago"
                            value={pagoData.observaciones_pago}
                            onChange={handlePagoChange}
                            disabled={!isEditable}
                            placeholder="Notas sobre la transacción"
                            className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                    </div>

                </div>
                
              <div className="flex flex-col mb-8">
                    <label htmlFor="categoria_costo" className="mb-2 font-medium text-slate-600">Categoría de Costo</label>
                    <input
                        id="categoria_costo"
                        name="categoria_costo"
                        type="text"
                        value={ordenData.categoria_costo}
                        onChange={handleOrdenChange}
                        disabled={!isEditable}
                        placeholder="Ej: Materia prima, Compra de artículos ya fabricados, Suministros de oficina"
                        className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-600 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
                
            

                <h3 className="text-2xl font-semibold mb-4 border-b pb-2 text-slate-700 mt-10">Detalles (Artículos a Comprar)</h3>
                <div className="space-y-6 mb-8">
                    {detalles.map((detalle, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-5 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
                            
                            {/* Artículo */}
                            <div className="col-span-1 md:col-span-5 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Artículo</label>
                                <select
                                    name="id_articulo"
                                    value={detalle.id_articulo}
                                    onChange={(e) => handleDetalleChange(index, e)}
                                    required
                                    disabled={!isEditable}
                                    className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500"
                                >
                                    <option value="">Seleccione artículo</option>
                                    {allArticulos.map(a => (
                                        <option key={a.id_articulo} value={a.id_articulo}>
                                            {a.descripcion}
                                        </option>
                                    ))}
                                </select>
                            </div>

                        
                            {/* Cantidad */}
                            <div className="col-span-1 md:col-span-2 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Cantidad</label>
                                <input
                                    type="number"
                                    name="cantidad"
                                    value={detalle.cantidad}
                                    onChange={(e) => handleDetalleChange(index, e)}
                                    min="1"
                                    required
                                    disabled={!isEditable}
                                    className="border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right"
                                />
                            </div>

                        
                         
                            <div className="col-span-1 md:col-span-3 flex flex-col">
                                <label className="mb-1 font-medium text-sm text-slate-700">Precio Unitario (COP)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        name="precio_unitario"
                                        value={formatCurrency(detalle.precio_unitario)}
                                        onChange={(e) => handleDetalleChange(index, e)}
                                        required
                                        disabled={!isEditable}
                                        
                                        className="border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200 disabled:text-gray-500 text-right w-full"
                                    />
                                     <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                </div>
                            </div>
                            
                    
                             <div className="col-span-1 md:col-span-1 flex flex-col justify-end">
                                <label className="mb-1 font-medium text-sm text-slate-700">Subtotal</label>
                                <p className="py-2.5 px-3 bg-white text-slate-800 font-semibold border border-gray-300 rounded-lg text-right">
                                    {formatCurrency(calcularSubtotal(detalle.cantidad, detalle.precio_unitario))}
                                </p>
                            </div>

                       
                            <div className="col-span-1 md:col-span-1 flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveDetalle(index)}
                                    disabled={detalles.length === 1 || !isEditable}
                                    className="bg-red-500 text-white p-2.5 rounded-lg hover:bg-red-600 disabled:bg-red-300 transition shadow-md"
                                    title="Eliminar artículo"
                                >
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))}

                    
                    <button
                        type="button"
                        onClick={handleAddDetalle}
                        disabled={!isEditable}
                        className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold transition mt-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <FiPlus size={20} />
                        Agregar Artículo
                    </button>
                </div>
                
             
            
                <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-10">
                    <div className="text-xl font-bold text-slate-700">
                        Total General: <span className="text-3xl text-green-700 ml-2">{formatCurrency(totalGeneral)}</span>
                    </div>

                    <button
                        type="submit"
                        disabled={!isEditable}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg cursor-pointer"
                    >
                        <FiSave size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditarOrdenCompra;