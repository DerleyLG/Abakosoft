import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // ajusta según tu estructura
import toast from 'react-hot-toast';

const CrearOrdenCompra = () => {
  const [proveedores, setProveedores] = useState([]);
  const [idProveedor, setIdProveedor] = useState('');
    const [ordenesFabricacion, setOrdenesFabricacion] = useState([]);
  const [categoriaCosto, setCategoriaCosto] = useState('');
  const [idOrdenFabricacion, setIdOrdenFabricacion] = useState('');
  const [estado, setEstado] = useState('pendiente');

  const [items, setItems] = useState([
    { descripcion_articulo: '', cantidad: '', precio: '' }
  ]);

  const navigate = useNavigate();

  // Cargar proveedores para el select
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get('/proveedores');
        setProveedores(res.data);
      } catch (error) {
        console.error('Error cargando proveedores', error);
      }
    };
    fetchProveedores();
  }, []);

   useEffect(() => {
    const fetchOrdenesFabricacion = async () => {
      try {
        const res = await api.get('/ordenes-fabricacion');
        setOrdenesFabricacion(res.data);
      } catch (error) {
        console.error('Error cargando órdenes de fabricación', error);
      }
    };
    fetchOrdenesFabricacion();
  }, []);

  // Manejo de cambio en un item
  const handleItemChange = (index, field, value) => {
    const nuevosItems = [...items];
    nuevosItems[index][field] = value;
    setItems(nuevosItems);
  };

  // Agregar nuevo item vacío
  const agregarItem = () => {
    setItems([...items, { descripcion_articulo: '', cantidad: '', precio: '' }]);
  };

  // Eliminar un item por índice
  const eliminarItem = (index) => {
    if (items.length === 1) return; // Al menos un item debe haber
    const nuevosItems = items.filter((_, i) => i !== index);
    setItems(nuevosItems);
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campos obligatorios
    if (!idProveedor || !idOrdenFabricacion || items.length === 0) {
      toast.error('Proveedor, orden de fabricación e ítems son obligatorios');
      return;
    }

    // Validar items
    for (const item of items) {
      if (!item.descripcion_articulo.trim() || !item.cantidad || !item.precio) {
        toast.error('Todos los campos de ítems son obligatorios y deben ser válidos');
        return;
      }
      if (isNaN(item.cantidad) || Number(item.cantidad) <= 0) {
        toast.error('Cantidad debe ser un número positivo');
        return;
      }
      if (isNaN(item.precio) || Number(item.precio) <= 0) {
        toast.error('Precio debe ser un número positivo');
        return;
      }
    }

    // Preparar datos para API (parsear números)
    const dataEnviar = {
      id_proveedor: parseInt(idProveedor),
      categoria_costo: categoriaCosto.trim(),
      id_orden_fabricacion: parseInt(idOrdenFabricacion),
      estado,

      items: items.map(({ descripcion_articulo, cantidad, precio }) => ({
        descripcion_articulo: descripcion_articulo.trim(),
        cantidad: Number(cantidad),
        precio: Number(precio),
      })),
    };

    try {
      await api.post('/ordenes-compra', dataEnviar);
      toast.success('Orden de compra creada correctamente', {
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

      setTimeout(() => navigate('/ordenes_compra'), 500);
    } catch (error) {
      console.error('Error creando orden de compra', error);
      toast.error(
        error.response?.data?.message || 'Error interno al crear la orden de compra'
      );
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
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
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
              placeholder="Ej: Materiales"
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>
{/* Estado de la orden */}
<div>
  <label htmlFor="estado" className="block text-sm font-semibold text-gray-700 mb-1">
    Estado de la Orden <span className="text-red-500">*</span>
  </label>
  <select
    id="estado"
    value={estado}
    onChange={(e) => setEstado(e.target.value)}
    required
    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
  >
    <option value="pendiente">Pendiente</option>
    <option value="completada">Completada</option>
    <option value="cancelada">Cancelada</option>
  </select>
</div>

          {/* Id orden fabricación */}
          <div>
            <label htmlFor="idOrdenFabricacion" className="block text-sm font-semibold text-gray-700 mb-1">
              Orden de Fabricación <span className="text-red-500">*</span>
            </label>
           <select
              id="idOrdenFabricacion"
              value={idOrdenFabricacion}
              onChange={(e) => setIdOrdenFabricacion(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            >
              <option value="">-- Seleccione una orden de fabricación --</option>
              {ordenesFabricacion.map((orden) => (
                <option key={orden.id_orden_fabricacion} value={orden.id_orden_fabricacion}>
                  {`#${orden.id_orden_fabricacion} - ${orden.descripcion || orden.nombre_cliente || ''}`}
                </option>
              ))}
            </select>
          </div>

          {/* Lista dinámica de items */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Items <span className="text-red-500">*</span>
            </label>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-3 mb-4 items-end"
              >
                <div className="col-span-5">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    value={item.descripcion_articulo}
                    onChange={(e) => handleItemChange(index, 'descripcion_articulo', e.target.value)}
                    required
                    placeholder="Descripción del artículo"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.cantidad}
                    onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                    required
                    placeholder="Cantidad"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.precio}
                    onChange={(e) => handleItemChange(index, 'precio', e.target.value)}
                    required
                    placeholder="Precio"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  />
                </div>

                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => eliminarItem(index)}
                    className="text-red-600 hover:text-red-800 font-bold text-lg"
                    title="Eliminar item"
                    disabled={items.length === 1}
                  >
                    &times;
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={agregarItem}
              className="bg-slate-700 hover:bg-slate-900 text-white px-4 py-2 rounded-md font-semibold cursor-pointer"
            >
              + Agregar Item
            </button>
          </div>

          {/* Botones */}
          <div className="flex gap-4 justify-end">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-6 py-2 border border-gray-400 rounded-md hover:bg-gray-300 cursor-pointer "
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-slate-700 text-white px-6 py-2 rounded-md hover:bg-slate-900 cursor-pointer"
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
