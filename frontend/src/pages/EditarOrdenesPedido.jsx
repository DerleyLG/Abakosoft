

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiSave, FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';

const EditarPedido = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();


  const [pedidoData, setPedidoData] = useState({
    id_cliente: '',
    estado: '',
    observaciones: '',
    fecha_pedido: format(new Date(), 'yyyy-MM-dd'),
  });
  const [detalles, setDetalles] = useState([]);
  const [clientes, setClientes] = useState([]); 
  const [articulos, setArticulos] = useState([]); 
  const [loading, setLoading] = useState(true);


  const [allArticulos, setAllArticulos] = useState([]);
  const [allClientes, setAllClientes] = useState([]);




  const fetchDependencies = async () => {
    try {
  
      const resClientes = await api.get('/clientes');
      setAllClientes(resClientes.data);
      setClientes(resClientes.data);

    
      const resArticulos = await api.get('/articulos');
      setAllArticulos(resArticulos.data);
      setArticulos(resArticulos.data); 

    } catch (error) {
      toast.error('Error al cargar dependencias (Clientes/Artículos).');
      console.error('Error cargando dependencias:', error);
    }
  };

  const fetchPedidoData = async () => {
    try {
   
      const resPedido = await api.get(`/pedidos/${id}`); 
      const pedido = resPedido.data;

 
      const resDetalles = await api.get(`/detalle-orden-pedido/${id}`);
      
   
      const formattedDate = pedido.fecha_pedido ? format(new Date(pedido.fecha_pedido), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

   
      setPedidoData({
        id_cliente: pedido.id_cliente,
        estado: pedido.estado,
        observaciones: pedido.observaciones || '',
        fecha_pedido: formattedDate,
      });

    
      setDetalles(resDetalles.data.map(d => ({
        id_articulo: d.id_articulo,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
      })));

    } catch (error) {
      toast.error('Error al cargar datos del pedido.');
      console.error('Error cargando pedido:', error);
      navigate('/ordenes_pedido'); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchPedidoData();
  }, [id]);


  
  const handlePedidoChange = (e) => {
    const { name, value } = e.target;
    setPedidoData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetalleChange = (index, e) => {
    const { name, value } = e.target;
    const list = [...detalles];
    list[index][name] = name === 'cantidad' || name === 'precio_unitario' ? Number(value) : value;

   let processedValue;

    if (name === 'precio_unitario') {
       
        processedValue = parseCurrency(value);
    } else if (name === 'cantidad') {
       
        processedValue = Number(value);
    } else {
        processedValue = value;
    }

    list[index][name] = processedValue;
    
    if (name === 'id_articulo' && allArticulos.length > 0) {
      const selectedArticle = allArticulos.find(a => a.id_articulo == value);
      if (selectedArticle) {
        
        list[index].precio_unitario = selectedArticle.precio_venta || 0; 
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
      toast.error('El pedido debe tener al menos un detalle.');
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (detalles.length === 0 || detalles.some(d => !d.id_articulo || d.cantidad <= 0 || d.precio_unitario <= 0)) {
      toast.error('Asegúrate de que todos los detalles estén completos y sean válidos (Artículos seleccionados, Cantidad y Precio > 0).');
      return;
    }

    try {
     const dataToSend = {
            ...pedidoData, 
            detalles: detalles 
        };
      await api.put(`/pedidos/${id}`, dataToSend); 
      toast.success('Pedido y detalles actualizados correctamente.');
      navigate('/ordenes_pedido');
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Error al actualizar el pedido.';
      console.error('Error de actualización:', error);
      toast.error(errorMessage);
    }
  };
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

  if (loading) {
    return <div className="text-center py-10">Cargando pedido...</div>;
  }


  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Editar Pedido #{id}</h2>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg">
       
        <h3 className="text-xl font-semibold mb-4 border-b pb-2">Información Principal</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
       
          <div className="flex flex-col">
            <label htmlFor="id_cliente" className="mb-2 font-medium">Cliente</label>
            <select
              id="id_cliente"
              name="id_cliente"
              value={pedidoData.id_cliente}
              onChange={handlePedidoChange}
              required
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="">Selecciona un cliente</option>
              {allClientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

       
          <div className="flex flex-col">
            <label htmlFor="estado" className="mb-2 font-medium">Estado</label>
            <select
              id="estado"
              name="estado"
              value={pedidoData.estado}
              onChange={handlePedidoChange}
              required
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en fabricacion">En Fabricación</option>
              <option value="listo para entrega">Listo para Entrega</option>
              <option value="completado">Completado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

         
          <div className="flex flex-col">
            <label htmlFor="fecha_pedido" className="mb-2 font-medium">Fecha del Pedido</label>
            <input
              type="date"
              id="fecha_pedido"
              name="fecha_pedido"
              value={pedidoData.fecha_pedido}
              onChange={handlePedidoChange}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
        </div>
        
    
        <div className="flex flex-col mb-8">
          <label htmlFor="observaciones" className="mb-2 font-medium">Observaciones</label>
          <textarea
            id="observaciones"
            name="observaciones"
            rows="3"
            value={pedidoData.observaciones}
            onChange={handlePedidoChange}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
          ></textarea>
        </div>


     
        <h3 className="text-xl font-semibold mb-4 border-b pb-2">Detalles (Artículos)</h3>
        <div className="space-y-4 mb-8">
          {detalles.map((detalle, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end p-4 border rounded-md bg-gray-50">
              
             
              <div className="col-span-1 md:col-span-2 flex flex-col">
                <label className="mb-1 font-medium text-sm">Artículo</label>
                <select
                  name="id_articulo"
                  value={detalle.id_articulo}
                  onChange={(e) => handleDetalleChange(index, e)}
                  required
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                >
                  <option value="">Seleccione artículo</option>
                  {allArticulos.map(a => (
                    <option key={a.id_articulo} value={a.id_articulo}>
                      {a.descripcion}
                    </option>
                  ))}
                </select>
              </div>

           
              <div className="flex flex-col">
                <label className="mb-1 font-medium text-sm">Cantidad</label>
                <input
                  type="number"
                  name="cantidad"
                  value={detalle.cantidad}
                  onChange={(e) => handleDetalleChange(index, e)}
                  min="1"
                  required
                  className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              <div className="flex flex-col">
                <label className="mb-1 font-medium text-sm">Precio Unitario</label>
                <input
                  type="text"
                  name="precio_unitario"
                  value={formatCurrency(detalle.precio_unitario)} 
                  onChange={(e) => handleDetalleChange(index, e)}
              
                  
                  required
                   className="border rounded-md px-3 py-2 border-gray-300  focus:outline-none focus:ring-2 focus:ring-slate-600 [appearance:textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

            
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveDetalle(index)}
                  disabled={detalles.length === 1}
                  className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 disabled:bg-red-300 transition"
                >
                  <FiTrash2 size={20} />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddDetalle}
            className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-md font-semibold transition mt-4 cursor-pointer"
          >
            <FiPlus size={20} />
            Agregar Artículo
          </button>
        </div>
        
       
        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-6 py-3 rounded-md font-semibold transition cursor-pointer"
          >
            <FiSave size={20} />
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarPedido;