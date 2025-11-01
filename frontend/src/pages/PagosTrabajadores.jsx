import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiPlus, FiEye, FiArrowLeft } from 'react-icons/fi';
import React from 'react';

const PagosTrabajadores = () => {
  const [pagos, setPagos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorFiltro, setTrabajadorFiltro] = useState('');
  const [expandedPago, setExpandedPago] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const resTrabajadores = await api.get('/trabajadores');
        setTrabajadores(resTrabajadores.data || []);
      } catch (error) {
        console.error('Error cargando trabajadores:', error);
      }
    };
    fetchInit();
  }, []);

  // Cargar pagos paginados cuando cambian filtros/paginación
  useEffect(() => {
    const fetchPagos = async () => {
      setLoading(true);
      try {
        const resPagos = await api.get('/pagos', {
          params: {
            page,
            pageSize,
            sortBy: 'fecha_pago',
            sortDir: 'desc',
            trabajadorId: trabajadorFiltro || undefined,
          },
        });
        const payload = resPagos.data || {};
        setPagos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
      } catch (error) {
        console.error('Error cargando pagos:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, [page, pageSize, trabajadorFiltro]);

  const toggleExpand = async (id_pago) => {
    if (expandedPago === id_pago) {
      setExpandedPago(null);
      return;
    }

    const pago = pagos.find((p) => p.id_pago === id_pago);
    if (!pago.detalles) {
      try {
        const res = await api.get(`/detalle-pago-trabajador/${id_pago}`);
        setPagos((prev) =>
          prev.map((p) =>
            p.id_pago === id_pago ? { ...p, detalles: res.data } : p
          )
        );
      } catch (error) {
        console.error('Error al cargar detalles:', error);
        return;
      }
    }
    setExpandedPago(id_pago);
  };

  // Al cambiar el filtro de trabajador, volver a página 1
  const onTrabajadorChange = (e) => {
    setTrabajadorFiltro(e.target.value);
    setPage(1);
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800">Pagos</h2>
        <div className="flex gap-4 items-center">
      
      <div className="">
        <label className="text-gray-700 font-semibold mr-2">
          Filtrar por trabajador:
        </label>
        <select
          className="border border-gray-300 rounded-md px-4 py-2"
          value={trabajadorFiltro}
          onChange={onTrabajadorChange}
        >
          <option value="">Todos</option>
          {trabajadores.map((t) => (
            <option key={t.id_trabajador} value={t.id_trabajador}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>
      <button
            onClick={() => navigate("/avances_fabricacion")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            
            Avances de fabricacion
          </button> 
          <button
            onClick={() => navigate("/pagos_anticipados")}
            className="bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
          >
            
            Anticipos
          </button>
          <button
            onClick={() => navigate('/pagos/nuevo')}
            className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 hover:text-slate-400 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
            title="Crear nuevo trabajador"
          >
            <FiPlus size={20} />
            Registrar pago
          </button>
          <button
            onClick={() => navigate('/Trabajadores')}
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
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto Total</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-500">Cargando...</td>
              </tr>
            )}
            {!loading && pagos.length === 0 && (
              <tr>
                <td colSpan="4" className="text-center py-6 text-gray-500">No se encontraron pagos.</td>
              </tr>
            )}
            {!loading && pagos.length > 0 && pagos.map((pago) => (
              <React.Fragment key={pago.id_pago}>
                <tr
                  onClick={() => toggleExpand(pago.id_pago)}
                  className={`cursor-pointer ${
                    expandedPago === pago.id_pago ? 'bg-gray-200 hover:bg-gray-200' : 'hover:bg-gray-200'
                  }`}
                >
                  <td className="px-4 py-3">{pago.trabajador}</td>
                  <td className="px-4 py-3">
                    {new Date(pago.fecha_pago).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    ${Number(pago.total).toLocaleString("es-CO") || '0.00'}
                  </td>
  
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleExpand(pago.id_pago)}
                      className="flex text-blue-600 hover:text-blue-400 transition cursor-pointer mr-3 gap-3"
                      title="Ver detalles"
                    >
                      <FiEye size={20} />
                    </button>
                  </td>
                </tr>
                {expandedPago === pago.id_pago && (
                  
                  <tr>
                    <td colSpan="5" className="px-2 py-2 border-b border-gray-300">
                      <strong>Observaciones:</strong>{' '}
                      {pago.observaciones || 'Ninguna'}

                      <div className="mt-3">
                        <table className="w-full text-sm border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden mt-2">
                          <thead className='bg-gray-200 text-gray-700'>
                            <tr className="px-2 py-2 border-b border-gray-300">
                              <th className="px-2 py-2 border-b border-gray-300">
                                Orden de fabricacion - etapa
                              </th>
                              <th className="px-2 py-2 border-b border-gray-300">Cantidad</th>
                              <th className="px-2 py-2 border-b border-gray-300">Pago Unitario</th>
                              <th className="ppx-2 py-2 border-b border-gray-300">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="hover:bg-gray-50">
                            {pago.detalles && pago.detalles.length > 0 ? (
                              pago.detalles.map((d, index) => (
                                <tr key={index}>
                                  <td className="px-2 py-2 border-b border-gray-300">
  {parseInt(d.es_descuento) === 1
    ? "Descuento por anticipo"
    : `#${d.id_orden_fabricacion}  -  ${d.nombre_cliente} --- ${d.nombre_etapa}`
  }
</td>
                                  <td className="px-2 py-2 border-b border-gray-300">{d.cantidad}</td>
                                  <td className="px-2 py-2 border-b border-gray-300">
                                    ${Number(d.pago_unitario).toLocaleString()}
                                  </td>
                                  <td className="px-2 py-2 border-b border-gray-300">
                                    ${Number(d.subtotal).toLocaleString()}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="text-center py-2 text-gray-500"
                                >
                                  No hay detalles disponibles.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600">Página {page} de {totalPages} {total ? `(total: ${total})` : ''}</div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">Filas por página</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="border border-gray-300 rounded-md px-2 py-1 h-[36px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <button
              onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className={`px-3 py-2 rounded-md border ${hasPrev && !loading ? 'bg-white hover:bg-slate-100 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'}`}
            >
              Anterior
            </button>
            <button
              onClick={() => hasNext && setPage((p) => p + 1)}
              disabled={!hasNext || loading}
              className={`px-3 py-2 rounded-md border ${hasNext && !loading ? 'bg-white hover:bg-slate-100 cursor-pointer' : 'bg-gray-100 cursor-not-allowed'}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosTrabajadores;
