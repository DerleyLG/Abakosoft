import React, { useEffect, useState, useMemo } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';
import toast from 'react-hot-toast';

const ListaAvances = () => {
  const [avances, setAvances] = useState([]);
  const [mostrarPagados, setMostrarPagados] = useState(false);
  const [trabajadores, setTrabajadores] = useState([]);
  const [idTrabajadorSeleccionado, setIdTrabajadorSeleccionado] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  const handleToggle = (avance) => {
    const isSelected = seleccionados.includes(avance.id_avance_etapa);

   
    if (isSelected) {
      setSeleccionados(seleccionados.filter((id) => id !== avance.id_avance_etapa));
      return;
    }

  
    if (seleccionados.length > 0) {
      const primeraId = seleccionados[0];
     
      const primera = avances.find((a) => a.id_avance_etapa === primeraId);
       
      if (primera && primera.id_trabajador !== avance.id_trabajador) {
        toast.error('Solo puedes seleccionar avances del mismo trabajador.');
        return;
      }
    }

    
    setSeleccionados([...seleccionados, avance.id_avance_etapa]);
  };


  const avancesSeleccionados = useMemo(() => {
    return avances.filter(av => seleccionados.includes(av.id_avance_etapa));
  }, [avances, seleccionados]);

  // Subtotal de costo de fabricación (costo unitario x cantidad) de los seleccionados
  const subtotalSeleccionados = useMemo(() => {
    return avancesSeleccionados.reduce((acc, av) => {
      const costo = Number(av.costo_fabricacion) || 0;
      const cant = Number(av.cantidad) || 0;
      return acc + costo * cant;
    }, 0);
  }, [avancesSeleccionados]);

  // Verifica si al menos uno de los avances seleccionados tiene un anticipo
  const hayAnticipoVinculado = useMemo(() => {
    return avancesSeleccionados.some(av => av.monto_anticipo > 0);
  }, [avancesSeleccionados]);


  useEffect(() => {
    const fetchTrabajadores = async () => {
      try {
        const res = await api.get('/trabajadores');
        setTrabajadores(res.data);
      } catch (error) {
        console.error('Error al cargar trabajadores:', error);
        toast.error('Error al cargar trabajadores.'); 
      }
    };
    fetchTrabajadores();
  }, []);

  useEffect(() => {
    const fetchAvances = async () => {
      setLoading(true);
      try {
        const params = {
          page,
          pageSize,
          sortBy: 'fecha',
          sortDir: 'desc',
        };
        if (idTrabajadorSeleccionado) params.id_trabajador = idTrabajadorSeleccionado;
        if (buscar && buscar.trim()) params.buscar = buscar.trim();

        const endpoint = mostrarPagados ? '/avances-etapa/pagados' : '/avances-etapa';
        const res = await api.get(endpoint, { params });
        const payload = res.data || {};
        setAvances(payload.data || []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setHasNext(!!payload.hasNext);
        setHasPrev(!!payload.hasPrev);
        setSeleccionados([]);
      } catch (error) {
        console.error('Error al obtener avances:', error);
        setAvances([]);
        setTotal(0);
        setTotalPages(1);
        setHasNext(false);
        setHasPrev(false);
        toast.error('Error al cargar avances.'); 
      } finally {
        setLoading(false);
      }
    };
    fetchAvances();
  }, [idTrabajadorSeleccionado, mostrarPagados, page, pageSize, buscar]);

  // Resetear página cuando cambian filtros principales
  useEffect(() => {
    setPage(1);
  }, [idTrabajadorSeleccionado, mostrarPagados]);

  const confirmarPago = (avance) => {
    confirmAlert({
      title: '¿Registrar pago?',
      message: `¿Deseas registrar un pago para el avance de '${avance.nombre_etapa}' del artículo '${avance.descripcion}' realizado por el trabajador '${avance.nombre_trabajador}'?`,
      buttons: [
        {
          label: 'Sí, registrar',
          onClick: () =>
            navigate('/pagos/nuevo', {
              state: { avances: [avance] }
            })
        },
        { label: 'Cancelar' }
      ]
    });
  };


  const manejarPagoMultiple = () => {
    
     
      navigate('/pagos/nuevo', {
        state: { avances: avancesSeleccionados }
      });
  };


  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-4xl font-bold text-gray-800">Avances de Producción</h2>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setMostrarPagados(!mostrarPagados)}
            className={`px-4 py-2 rounded-md font-semibold transition ${
              mostrarPagados
                ? 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800 cursor-pointer'
            }`}
          >
            {mostrarPagados ? 'Ver no pagados' : 'Ver pagados'}
          </button>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3">
     
        <label htmlFor="trabajador" className="block text-sm font-medium text-gray-700 mb-1">
          Selecciona un trabajador:
        </label>
        <select
          id="trabajador"
          value={idTrabajadorSeleccionado}
          onChange={(e) => setIdTrabajadorSeleccionado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md w-full max-w-xs"
        >
       
          <option value="">-- Todos --</option>
          {trabajadores.map((t) => (
            <option key={t.id_trabajador} value={t.id_trabajador}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      
      <div className="overflow-x-auto shadow rounded-lg mt-4">
        <table className="min-w-full table-auto border border-slate-300 bg-white">
          <thead className="bg-slate-200 text-slate-700">
            <tr>
              {!mostrarPagados && (
                <th className="px-4 py-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      title="Seleccionar todos los avances de esta página"
                      checked={avances.length > 0 && avances.every(a => seleccionados.includes(a.id_avance_etapa))}
                      onChange={(e) => {
                        // Si desmarca: quitar de la selección todos los visibles
                        if (!e.target.checked) {
                          const idsPagina = new Set(avances.map(a => a.id_avance_etapa));
                          setSeleccionados(prev => prev.filter(id => !idsPagina.has(id)));
                          return;
                        }
                        // Si marca: intentar seleccionar todos los visibles respetando la regla de mismo trabajador
                        if (avances.length === 0) return;
                        const trabajadoresEnPagina = Array.from(new Set(avances.map(a => a.id_trabajador)));
                        if (!idTrabajadorSeleccionado && trabajadoresEnPagina.length > 1) {
                          toast.error('Para seleccionar todos, filtra por un trabajador primero.');
                          return;
                        }
                        // Si ya hay selección previa de otro trabajador, validarlo
                        if (seleccionados.length > 0) {
                          const primeraSel = avances.find(a => a.id_avance_etapa === seleccionados[0]);
                          const trabajadorSel = primeraSel?.id_trabajador;
                          const todosMismo = avances.every(a => a.id_trabajador === trabajadorSel);
                          if (!todosMismo) {
                            toast.error('Solo puedes seleccionar avances del mismo trabajador.');
                            return;
                          }
                        }
                        setSeleccionados(
                          Array.from(
                            new Set([
                              ...seleccionados,
                              ...avances.map(a => a.id_avance_etapa),
                            ])
                          )
                        );
                      }}
                    />
                    <span>Seleccionar</span>
                  </div>
                </th>
              )}
              <th className="px-4 py-2 text-left">Orden</th>
              <th className="px-4 py-2 text-left">Artículo</th>
              <th className="px-4 py-2 text-left">Etapa</th>
              <th className="px-4 py-2 text-left">Trabajador</th>
              <th className="px-4 py-2 text-left">Cantidad</th>
              <th className="px-4 py-2 text-left">Costo unitario</th>
              <th className="px-4 py-2 text-left">Anticipo</th>
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-left">Estado</th>
              <th className="px-4 py-2 text-left">Estado de pago</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={mostrarPagados ? 10 : 11} className="px-4 py-4 text-center text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && avances.map((avance) => (
              <tr key={avance.id_avance_etapa} className="border-t border-slate-300 hover:bg-slate-50">
                {!mostrarPagados && (
                  <td className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(avance.id_avance_etapa)}
                          onChange={() => handleToggle(avance)}
                        />
                  </td>
                )}
                <td className="px-4 py-2">
                  #{avance.id_orden_fabricacion} - {avance.nombre_cliente}
                </td>
                <td className="px-4 py-2">{avance.descripcion || avance.id_articulo}</td>
                <td className="px-4 py-2">{avance.nombre_etapa || avance.id_etapa_produccion}</td>
                <td className="px-4 py-2">{avance.nombre_trabajador || avance.id_trabajador}</td>
                <td className="px-4 py-2">{avance.cantidad}</td>
                <td className="px-4 py-2">{`$${(avance.costo_fabricacion ?? 0).toLocaleString()}`}</td>
                 <td className="px-4 py-2">
                  {avance.monto_anticipo > 0 && avance.estado_anticipo !== 'saldado' ? (
                    <span className="text-red-600 font-semibold">
                      Si, ${avance.monto_anticipo.toLocaleString()}
                    </span>
                  ) : avance.monto_anticipo > 0 && avance.estado_anticipo === 'saldado' ? (
                    <span className="text-green-600 italic text-sm">
                      Saldado
                    </span>
                  ) : (
                    <span className="text-gray-500 italic text-sm">
                      Sin anticipo
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {new Date(avance.fecha_registro).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 capitalize">{avance.estado}</td>
                <td className="px-4 py-2">
                  {mostrarPagados ? (
                    <span className="text-green-700 font-semibold">Pagado</span>
                  ) : (
                    <span className="text-green-700 font-semibold">Pendiente</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && avances.length === 0 && (
              <tr>
                <td colSpan={mostrarPagados ? 10 : 11} className="px-4 py-4 text-center text-slate-500">
                  No hay avances registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!mostrarPagados && seleccionados.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4">
            <div className="text-base text-slate-700">
              Subtotal seleccionado: <span className="text-green-700 font-extrabold">${subtotalSeleccionados.toLocaleString()}</span>
            </div>
            <button
              onClick={manejarPagoMultiple}
              className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded font-semibold mb-4  cursor-pointer"
            >
              Registrar Pago ({seleccionados.length})
            </button>
          </div>
        )}

       
      </div>
  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 ">
          <div className="text-sm text-gray-600">
            Página {page} de {totalPages} — {total} avances
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev}
            >Anterior</button>
            <button
              className="px-3 py-2 rounded-md bg-gray-200 hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasNext}
            >Siguiente</button>
            <select
              className="ml-2 border border-gray-400 rounded-md px-2 py-2"
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
    </div>
  );
};

export default ListaAvances;