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
import { useAuth } from '../context/AuthContext';
import { can, ACTIONS } from '../utils/permissions';

const MySwal = withReactContent(Swal);

const Inventario = () => {
  const [inventario, setInventario] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [articulosIndex, setArticulosIndex] = useState({}); 
  const [stockFabricadoFilter, setStockFabricadoFilter] = useState('');
  const [stockProcesoFilter, setStockProcesoFilter] = useState('');
  const [stockDisponibleFilter, setStockDisponibleFilter] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.INVENTORY_EDIT);
  const canEdit = can(role, ACTIONS.INVENTORY_EDIT);
  const canDelete = can(role, ACTIONS.INVENTORY_DELETE);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resInv, resCat, resArt] = await Promise.all([
          api.get('/inventario'),
          api.get('/categorias'),
          api.get('/articulos'),
        ]);
        setInventario(resInv.data);
        setCategorias(Array.isArray(resCat.data) ? resCat.data : []);
        const idx = {};
        (Array.isArray(resArt.data) ? resArt.data : []).forEach((a) => {
          idx[a.id_articulo] = {
            id_categoria: a.id_categoria,
            nombre_categoria: a.nombre_categoria,
          };
        });
        setArticulosIndex(idx);
      } catch (error) {
        console.error('Error cargando inventario o categorías', error);
        const msg = error.response?.data?.mensaje || error.response?.data?.message || error.message;
        toast.error(msg);
      }
    };
    fetchData();
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
      message: '¿Seguro que quieres quitar este artículo del inventario? Si tiene stock, no se permitirá.',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/inventario/${id_articulo}`);
              toast.success('Artículo removido del inventario');
              cargarInventario();
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
          onClick: () => { }
        }
      ]
    });
  };

  const editarStockYMinimo = async (item) => {
    let stockValue = item.stock_disponible;
    let stockMinimoValue = item.stock_minimo;

    const { value: formValues } = await MySwal.fire({
      title: `Editar stock y mínimo de "${item.descripcion}"`,
      html: `
        <div style="display: flex; flex-direction: column; gap: 0.25rem; text-align: left;">
          <label for="swal-input1" style="font-weight: 600;">Stock disponible:</label>
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
          stock: formValues.stock,
          stock_minimo: formValues.stockMinimo,
        });
        toast.success('Inventario actualizado correctamente');
        cargarInventario();
      } catch (error) {
        console.error('Error al actualizar inventario', error.response?.data || error.message);
        const mensajeBackend = error.response?.data?.error || error.response?.data?.message || 'Error al actualizar inventario';
        toast.error(mensajeBackend);
      }
    }
  };

  const filteredItems = inventario.filter((item) => {
    const txt = (item.descripcion || '').toLowerCase();
    const matchesText = txt.includes((searchTerm || '').toLowerCase());

    
    const matchesStock = (val, rule) => {
      const n = Number(val || 0);
      switch (rule) {
        case 'gt0':
          return n > 0;
        case 'eq0':
          return n === 0;
        default:
          return true;
      }
    };

    
    const okFabricado = matchesStock(item.stock_fabricado, stockFabricadoFilter);
    const okProceso = matchesStock(item.stock_en_proceso, stockProcesoFilter);
    const okDisponible = matchesStock(item.stock_disponible, stockDisponibleFilter);

    if (!matchesText || !okFabricado || !okProceso || !okDisponible) return false;

    if (!categoriaSeleccionada) return true;

 
    const fromItemIdCat = item.id_categoria;
    const fromItemNomCat = item.nombre_categoria;
    const fromIdx = articulosIndex[item.id_articulo] || {};
    const idCat = fromItemIdCat ?? fromIdx.id_categoria;
    const nomCat = fromItemNomCat ?? fromIdx.nombre_categoria;

 
    const matchesById = idCat !== undefined && idCat !== null && Number(idCat) === Number(categoriaSeleccionada);
    if (matchesById) return true;
    const nombreSel = (categorias.find((c) => Number(c.id_categoria) === Number(categoriaSeleccionada))?.nombre || '').toLowerCase();
    const matchesByName = nombreSel && String(nomCat || '').toLowerCase() === nombreSel;
    return matchesByName;
  });

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex flex-col mb-6 gap-4">
        <div className="w-full flex items-center justify-between gap-4">
          <h2 className="text-4xl font-bold text-gray-800">Inventario</h2>
          {canCreate && (
            <button
              onClick={() => navigate('/inventario/nuevo')}
              className="h-[42px] inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            >
              <FiPlus size={20} />
              Agregar artículo
            </button>
          )}
        </div>
        <div className="w-full bg-white p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="w-full md:col-span-4">
            <label className="block text-gray-700 font-semibold mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Buscar artículo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
            />
          </div>
          <div className="w-full md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-1">Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full md:min-w-[160px] border border-gray-500 rounded-md px-3 py-2 h-[42px]"
              title="Filtrar por categoría"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((cat) => (
                <option key={cat.id_categoria} value={cat.id_categoria}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-1">Stock fabricado</label>
            <select
              value={stockFabricadoFilter}
              onChange={(e) => setStockFabricadoFilter(e.target.value)}
              className="w-full md:min-w-[180px] border border-gray-500 rounded-md px-3 py-2 h-[42px]"
              title="Filtrar stock fabricado"
            >
              <option value="">Todos</option>
              <option value="gt0">Con stock </option>
              <option value="eq0">Sin stock </option>
            </select>
          </div>
          <div className="w-full md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-1">Stock en proceso</label>
            <select
              value={stockProcesoFilter}
              onChange={(e) => setStockProcesoFilter(e.target.value)}
              className="w-full md:min-w-[180px] border border-gray-500 rounded-md px-3 py-2 h-[42px]"
              title="Filtrar stock en proceso"
            >
              <option value="">Todos</option>
              <option value="gt0">Con stock</option>
              <option value="eq0">Sin stock </option>
            </select>
          </div>
          <div className="w-full md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-1">Stock disponible</label>
            <select
              value={stockDisponibleFilter}
              onChange={(e) => setStockDisponibleFilter(e.target.value)}
              className="w-full md:min-w-[180px] border border-gray-500 rounded-md px-3 py-2 h-[42px]"
              title="Filtrar stock disponible"
            >
              <option value="">Todos</option>
              <option value="gt0">Con stock </option>
              <option value="eq0">Sin stock </option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Artículo</th>
              <th className="px-4 py-3">Stock disponible</th>
              <th className="px-4 py-3">Stock fabricado</th>
              <th className="px-4 py-3">Stock en proceso</th>
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
                  className="hover:bg-slate-300 transition select-none"
                >
                  <td className="px-4 py-3">{item.descripcion}</td>
                  <td className="px-4 py-3">{item.stock_disponible}</td>
                  <td className="px-4 py-3">{item.stock_fabricado}</td>
                  <td className="px-4 py-3">{item.stock_en_proceso}</td>
                  <td className="px-4 py-3">{item.stock_minimo}</td>
                  <td className="px-4 py-3">{new Date(item.ultima_actualizacion).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {canEdit && (
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
                    )}
                    {canDelete && (
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
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
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
