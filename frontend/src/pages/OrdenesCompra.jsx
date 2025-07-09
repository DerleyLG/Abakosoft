import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';
import { FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';
import axios from 'axios';

const ListaOrdenesCompra = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrdenes = async () => {
      try {
        const res = await api.get('/ordenes_compra');
        setOrdenes(res.data);
      } catch (error) {
        console.error('Error cargando órdenes de compra', error);
      }
    };

    fetchOrdenes();
  }, []);

  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar esta orden de compra?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/ordenes_compra/${id}`);
              toast.success('Orden de compra eliminada');
              setOrdenes((prev) => prev.filter((o) => o.id_orden_compra !== id));
            } catch (error) {
              console.error('Error eliminando orden de compra', error);
              alert(error.response?.data?.mensaje || 'Error interno al eliminar la orden');
            }
          },
        },
        {
          label: 'No',
          onClick: () => {},
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/ordenes_compra/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate('/ordenes_compra/nuevo');
  };

  // Filtrar por proveedor o estado (puedes ajustar según tus campos)
  const filteredOrdenes = ordenes.filter((orden) => {
    const term = searchTerm.toLowerCase();
    return (
      (orden.proveedor && orden.proveedor.toLowerCase().includes(term)) ||
      (orden.estado && orden.estado.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Órdenes de compra</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por proveedor o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            onClick={handleCrearClick}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            title="Crear nueva orden de compra"
          >
            <FiPlus size={20} />
            Crear orden
          </button>
          <button
            onClick={() => navigate("/ordenes")}
            className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
             >
            <FiArrowLeft />
              Volver
            </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrdenes.length > 0 ? (
              filteredOrdenes.map((orden) => (
                <tr
                  key={orden.id_orden_compra}
                  onDoubleClick={() => handleRowDoubleClick(orden.id_orden_compra)}
                  className="hover:bg-slate-300 cursor-pointer transition select-none"
                >
                  <td className="px-4 py-3">{orden.id_orden_compra}</td>
                  <td className="px-4 py-3">{new Date(orden.fecha).toLocaleDateString()}</td>
                  <td className="px-4 py-3">{orden.proveedor}</td>
                  <td className="px-4 py-3">${orden.total.toFixed(2)}</td>
                  <td className="px-4 py-3 capitalize">{orden.estado}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(orden.id_orden_compra);
                      }}
                      className="text-red-600 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar orden"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No se encontraron órdenes de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListaOrdenesCompra;
