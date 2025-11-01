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
  const [allItems, setAllItems] = useState([]); // fuente única para filtrar en cliente
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  // Eliminado índice cruzado; el backend ya entrega categoría por ítem
  const [stockFabricadoFilter, setStockFabricadoFilter] = useState('');
  const [stockProcesoFilter, setStockProcesoFilter] = useState('');
  const [stockDisponibleFilter, setStockDisponibleFilter] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.rol;
  const canCreate = can(role, ACTIONS.INVENTORY_EDIT);
  const canEdit = can(role, ACTIONS.INVENTORY_EDIT);
  const canDelete = can(role, ACTIONS.INVENTORY_DELETE);

  // 1) Cargar categorías e inventario completo una sola vez o cuando se necesite refrescar
  useEffect(() => {
    const initialFetch = async () => {
      try {
        const [resCat, resAll, resArticulos] = await Promise.all([
          api.get('/categorias'),
          api.get('/inventario', { params: { page: 1, pageSize: 10000 } }),
          api.get('/articulos'), // Traer artículos con id_categoria
        ]);
        setCategorias(Array.isArray(resCat.data) ? resCat.data : []);
        
        const payload = resAll.data;
        let items = Array.isArray(payload) ? payload : (payload?.data || []);
        
        // Si los items del inventario no tienen id_categoria, cruzarlos con artículos
        const articulos = Array.isArray(resArticulos.data) ? resArticulos.data : [];
        console.log('[Inventario] Artículos recibidos:', {
          total: articulos.length,
          muestra: articulos.slice(0, 3).map(a => ({ id: a.id_articulo, desc: a.descripcion, cat: a.id_categoria }))
        });
        
        const articulosMap = {};
        articulos.forEach(art => {
          articulosMap[art.id_articulo] = art.id_categoria;
        });
        
        items = items.map(item => ({
          ...item,
          id_categoria: item.id_categoria ?? articulosMap[item.id_articulo] ?? null
        }));
        
        console.debug('[Inventario] Cargado total de items:', items.length);
        console.log('[Inventario] Payload completo recibido del backend:', {
          esArray: Array.isArray(payload),
          primerItem: items[0]
        });
        setAllItems(items);
      } catch (error) {
        console.error('Error cargando inventario o categorías', error);
        const msg = error.response?.data?.mensaje || error.response?.data?.message || error.message;
        toast.error(msg);
      }
    };
    initialFetch();
  }, []);

  // 2) Aplicar filtro y paginar en cliente cada vez que cambian filtros o paginación
  useEffect(() => {
    const term = (searchTerm || '').toLowerCase();
    const rule = (val, r) => {
      if (!r) return true;
      const n = Number(val || 0);
      if (r === 'gt0') return n > 0;
      if (r === 'eq0') return n === 0;
      return true;
    };

    // Log detallado ANTES de filtrar
    if (categoriaSeleccionada) {
      console.log('[Inventario] DEBUG filtro categoría:', {
        categoriaSeleccionada,
        tipo: typeof categoriaSeleccionada,
        totalItems: allItems.length,
        muestraItems: allItems.slice(0, 5).map(it => ({
          desc: it.descripcion,
          id_cat: it.id_categoria,
          tipo_id_cat: typeof it.id_categoria,
          coincide: String(it.id_categoria) === String(categoriaSeleccionada)
        }))
      });
    }

    const filtered = (allItems || [])
      .filter((it) => {
        const bySearch = term
          ? ((it.descripcion || '').toLowerCase().includes(term) || (it.referencia || '').toLowerCase().includes(term))
          : true;
        const byCat = categoriaSeleccionada
          ? String(it.id_categoria) === String(categoriaSeleccionada)
          : true;
        const okDisp = rule(it.stock_disponible ?? it.stock, stockDisponibleFilter);
        const okFab = rule(it.stock_fabricado, stockFabricadoFilter);
        const okProc = (typeof it.stock_en_proceso !== 'undefined')
          ? rule(it.stock_en_proceso, stockProcesoFilter)
          : true;
        return bySearch && byCat && okDisp && okFab && okProc;
      })
      .sort((a, b) => String(a.descripcion || '').localeCompare(String(b.descripcion || '')));

    console.debug('[Inventario] Filtro aplicado:', {
      categoriaSeleccionada,
      searchTerm,
      stockDisponibleFilter,
      stockFabricadoFilter,
      stockProcesoFilter,
      totalAntes: allItems.length,
      totalDespues: filtered.length,
      ejemploCategorias: filtered.slice(0, 3).map(x => ({id_cat: x.id_categoria, desc: x.descripcion})),
    });

    const total = filtered.length;
    const tp = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);
    setInventario(paged);
    setTotalPages(tp);
  }, [allItems, page, pageSize, searchTerm, categoriaSeleccionada, stockDisponibleFilter, stockFabricadoFilter, stockProcesoFilter]);

  const cargarInventario = async () => {
    try {
      const [resAll, resArticulos] = await Promise.all([
        api.get('/inventario', { params: { page: 1, pageSize: 10000 } }),
        api.get('/articulos'),
      ]);
      
      const payload = resAll.data;
      let items = Array.isArray(payload) ? payload : (payload?.data || []);
      
      // Cruzar con artículos para obtener id_categoria si falta
      const articulos = Array.isArray(resArticulos.data) ? resArticulos.data : [];
      const articulosMap = {};
      articulos.forEach(art => {
        articulosMap[art.id_articulo] = art.id_categoria;
      });
      
      items = items.map(item => ({
        ...item,
        id_categoria: item.id_categoria ?? articulosMap[item.id_articulo] ?? null
      }));
      
      console.debug('[Inventario] Refetch total:', items.length);
      setAllItems(items);
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

  
  const filteredItems = inventario;

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
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
            />
          </div>
          <div className="w-full md:col-span-2">
            <label className="block text-gray-700 font-semibold mb-1">Categoría</label>
            <select
              value={categoriaSeleccionada}
              onChange={(e) => { setCategoriaSeleccionada(e.target.value); setPage(1); }}
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
              onChange={(e) => { setStockFabricadoFilter(e.target.value); setPage(1); }}
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
              onChange={(e) => { setStockProcesoFilter(e.target.value); setPage(1); }}
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
              onChange={(e) => { setStockDisponibleFilter(e.target.value); setPage(1); }}
              className="w-full md:min-w-[180px] border border-gray-500 rounded-md px-3 py-2 h-[42px]"
              title="Filtrar stock disponible"
            >
              <option value="">Todos</option>
              <option value="gt0">Con stock </option>
              <option value="eq0">Sin stock </option>
            </select>
          </div>
        </div>
        {categoriaSeleccionada && filteredItems.length === 0 && allItems.length > 0 && (
          <div className="mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
            ⚠️ <strong>Filtro de categoría no disponible:</strong> Los artículos en el inventario no tienen categorías asignadas. 
            Para habilitar este filtro, asigna categorías a tus artículos desde el módulo de Artículos.
          </div>
        )}
        {categoriaSeleccionada && filteredItems.length === 0 && allItems.length === 0 && (
          <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
            No hay artículos inicializados en inventario para esta categoría. Puedes agregarlos desde "Agregar artículo" para iniciar con stock 0.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600">Página {page} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className={`px-3 py-1 rounded border ${page <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>Anterior</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={`px-3 py-1 rounded border ${page >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-100 cursor-pointer'}`}>Siguiente</button>
          </div>
        </div>
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
