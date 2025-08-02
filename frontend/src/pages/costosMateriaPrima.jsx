import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';
import { FiTrash2, FiPlus, FiArrowLeft } from 'react-icons/fi';

const CostosMateriaPrima = () => {
  const [compras, setCompras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchComprasMateriaPrima = async () => {
    try {
      const res = await api.get('/compras_materia_prima');
      setCompras(res.data);
    } catch (error) {
      console.error('Error cargando costos de materia prima', error);
      toast.error('Error al cargar los costos de materia prima.');
    }
  };

  useEffect(() => {
    fetchComprasMateriaPrima();
  }, []);

  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar este registro de materia prima?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/compras_materia_prima/${id}`);
              toast.success('Registro de materia prima eliminado');
              setCompras((prev) => prev.filter((c) => c.id_compra_materia_prima !== id));
            } catch (error) {
              console.error('Error eliminando registro de materia prima', error);
              toast.error('Error al eliminar el registro.');
            }
          },
        },
        { label: 'No', onClick: () => {} },
      ],
    });
  };

  const filteredCompras = compras.filter((compra) =>
    (compra.descripcion_gasto || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Costos de Materia Prima</h2>
        <div className="flex w-full md:w-200 items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por descripción de gasto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
          />
          <button
            
            onClick={() => navigate('/costos_indirectos/nuevo', { state: { esMateriaPrima: true } })}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiPlus size={20} />
            Registrar nuevo
          </button>
          <button
            onClick={() => navigate('/costos_indirectos')}
            className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Descripción del Gasto</th>
              <th className="px-4 py-3">Cantidad</th>
              <th className="px-4 py-3">precio Unitario</th>
              <th className="px-4 py-3">Valor total</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Fecha de Compra</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompras.length > 0 ? (
              filteredCompras.map((compra) => (
                <tr
                  key={compra.id_compra_materia_prima}
                  className="hover:bg-slate-300 cursor-pointer transition select-none"
                >
                  <td className="px-4 py-3">{compra.descripcion_gasto || '-'}</td>
                  <td className="px-4 py-3">{compra.cantidad != null ? compra.cantidad.toLocaleString() : '-'}</td>
                   <td className="px-4 py-3">
                    {compra.precio_unitario != null && !isNaN(Number(compra.precio_unitario))
                      ? `$${Number(compra.precio_unitario).toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {compra.valor_total != null && !isNaN(Number(compra.valor_total))
                      ? `$${Number(compra.valor_total).toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">{compra.nombre_proveedor || '-'}</td>
                  <td className="px-4 py-3">
                    {compra.fecha_compra ? new Date(compra.fecha_compra).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">{compra.observaciones || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleDelete(compra.id_compra_materia_prima)}
                      className="text-red-600 hover:text-red-400 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  No se encontraron registros de materia prima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CostosMateriaPrima;
