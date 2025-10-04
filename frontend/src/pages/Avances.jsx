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
      try {
        let endpoint;
        if (mostrarPagados) {
          endpoint = idTrabajadorSeleccionado
            ? `/avances-etapa/pagados?id_trabajador=${idTrabajadorSeleccionado}`
            : `/avances-etapa/pagados`; 
        } else {
          endpoint = idTrabajadorSeleccionado
            ? `/avances-etapa?id_trabajador=${idTrabajadorSeleccionado}`
            : `/avances-etapa`;
        }

        const res = await api.get(endpoint);
        setAvances(res.data);
        setSeleccionados([]); 
      } catch (error) {
        console.error('Error al obtener avances:', error);
        setAvances([]);
        toast.error('Error al cargar avances.'); 
      }
    };
    fetchAvances();
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

      <div className="mb-4">
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
              {!mostrarPagados && <th className="px-4 py-2 text-left">Seleccionar</th>}
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
            {avances.map((avance) => (
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
                <td className="px-4 py-2">${avance.costo_fabricacion?.toLocaleString() || 0}</td>
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
            {avances.length === 0 && (
              <tr>
                <td colSpan="10" className="px-4 py-4 text-center text-slate-500">
                  No hay avances registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {!mostrarPagados && seleccionados.length > 0 && (
          <div className="mt-4 flex justify-end px-4">
            <button
              onClick={manejarPagoMultiple}
              className="bg-green-700 hover:bg-green-600 text-white px-6 py-2 rounded font-semibold mb-4 cursor-pointer"
            >
              Registrar Pago ({seleccionados.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaAvances;