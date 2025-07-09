import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit3 } from 'react-icons/fi';
import Swal from 'sweetalert2';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import withReactContent from 'sweetalert2-react-content';
import { FiTrash2 } from 'react-icons/fi';
import '../styles/confirmAlert.css'; 

const MySwal = withReactContent(Swal);

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
   const [articulo, setArticulos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    cargarInventario();
  }, []);

  const cargarInventario = async () => {
    try {
      const res = await api.get('/inventario');
      setInventario(res.data);
    } catch (error) {
      console.error('Error al cargar inventario', error);
      toast.error('Error al cargar inventario');
    }
  };

const handleDelete = (id_articulo) => {
  confirmAlert({
    title: 'Confirmar eliminación',
    message: '¿Seguro que quieres quitar este artículo?',
    buttons: [
      {
        label: 'Sí',
        onClick: async () => {
          try {
            
            await api.delete(`/inventario/${id_articulo}`);
            toast.success('Artículo removido');
             cargarInventario();
            setArticulos((prev) => prev.filter((a) => a.id_articulo !== id_articulo));
          } catch (error) {
            const mensajeBackend =
                    error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message;
                  toast.error(mensajeBackend);
          }
        }
      },
      {
        label: 'No',
        onClick: () => {}
      }
    ]
  });
};

  const editarStockYMinimo = async (item) => {
    let stockValue = item.stock;
    let stockMinimoValue = item.stock_minimo;

 const { value: formValues } = await MySwal.fire({
  title: `Editar stock y mínimo de "${item.descripcion}"`,
  html: `
    <div style="display: flex; flex-direction: column; gap: 0.25rem; text-align: left;">
      <label for="swal-input1" style="font-weight: 600;">Stock actual:</label>
      <input id="swal-input1" type="number" min="0" class="swal2-input" value="${stockValue}" />
      
      <label for="swal-input2" style="font-weight: 600; margin-top: 1rem;">Stock mínimo:</label>
      <input id="swal-input2" type="number" min="0" class="swal2-input" value="${stockMinimoValue}" />
    </div>
  `,
  focusConfirm: false,
  showCancelButton: true,
  confirmButtonText: 'Guardar',
  cancelButtonText: 'Cancelar',
  preConfirm: () => {
    const stock = parseInt(document.getElementById('swal-input1').value, 10);
    const stockMinimo = parseInt(document.getElementById('swal-input2').value, 10);
    if (isNaN(stock) || stock < 0) {
      Swal.showValidationMessage('El stock debe ser un número mayor o igual a 0');
      return false;
    }
    if (isNaN(stockMinimo) || stockMinimo < 0) {
      Swal.showValidationMessage('El stock mínimo debe ser un número mayor o igual a 0');
      return false;
    }
    return { stock, stockMinimo };
  },
});

    if (formValues) {
      try {
        await api.put(`/inventario/${item.id_articulo}`, {
            id_articulo: item.id_articulo,
          stock: formValues.stock,
          stock_minimo: formValues.stockMinimo,
        });
        toast.success('Inventario actualizado correctamente');
        cargarInventario();
      } catch (error) {
         console.error('Error al actualizar inventario', error.response?.data || error.message);
  toast.error('Error al actualizar inventario');
      }
    }
  };

  const filteredItems = inventario.filter((item) =>
    item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Inventario</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar artículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            onClick={() => navigate('/inventario/nuevo')}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Agregar articulo
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Artículo</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Stock mínimo</th>
              <th className="px-4 py-3">Última actualización</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr
                  key={item.id_inventario}
                  onDoubleClick={() => handleRowDoubleClick(item.id_articulo)}
                  className="hover:bg-slate-300  transition select-none"
                >
                  <td className="px-4 py-3">{item.descripcion}</td>
                  <td className="px-4 py-3">{item.stock}</td>
                  <td className="px-4 py-3">{item.stock_minimo}</td>
                  <td className="px-4 py-3">{new Date(item.ultima_actualizacion).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button
    onClick={(e) => {
      e.stopPropagation();
      editarStockYMinimo(item);
    }}
    className="text-slate-700 hover:text-slate-400 transition mr-3 cursor-pointer"
    title="Editar stock y stock mínimo"
  >
    <FiEdit3 size={18} />
  </button>
  <button
    onClick={(e) => {
      e.stopPropagation();
     handleDelete(item.id_articulo);
    }}
    className="text-red-600 hover:text-red-300 transition cursor-pointer"
    title="Eliminar artículo del inventario"
  >
    <FiTrash2 size={18} />
  </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-500">
                  No se encontraron artículos en inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventario;
