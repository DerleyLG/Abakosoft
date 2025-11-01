import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import Select from 'react-select';
import AsyncSelect from 'react-select/async';

const CostosIndirectosNuevo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Inicializa esMateriaPrima, pero el useEffect lo ajustará si hay estado de navegación
  const [esMateriaPrima, setEsMateriaPrima] = useState(false);

  const [tipoCosto, setTipoCosto] = useState('');
  const [fecha, setFecha] = useState('');
  const [valor, setValor] = useState(''); // texto formateado COP
  const [observaciones, setObservaciones] = useState('');

  // ESTADOS para el formulario de materia prima
  const [descripcionGastoMateriaPrima, setDescripcionGastoMateriaPrima] = useState('');
  const [cantidadMateriaPrima, setCantidadMateriaPrima] = useState('');
  const [precioUnitarioMateriaPrima, setPrecioUnitarioMateriaPrima] = useState('');
  const [idProveedorMateriaPrima, setIdProveedorMateriaPrima] = useState(null);
  const [observacionesMateriaPrima, setObservacionesMateriaPrima] = useState('');

  const [proveedores, setProveedores] = useState([]);
  const [ofSeleccionada, setOfSeleccionada] = useState(null);
  const [asignarAOF, setAsignarAOF] = useState(false);
  const [asignacionMultiple, setAsignacionMultiple] = useState(false);
  const [ofsSeleccionadas, setOfsSeleccionadas] = useState([]); // para múltiple
  const [montosAsignados, setMontosAsignados] = useState({}); // { idOF: valorCOPNumber }
  const [driver, setDriver] = useState('cantidad'); // cantidad | avances | costo
  // Sugerencias (vista previa) para auto-distribución por driver
  const [sugerencias, setSugerencias] = useState([]); // [{ id_orden_fabricacion, driver_valor, peso, valor_asignado? }]
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  // useEffect para cargar proveedores
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const res = await api.get('/proveedores');
        const opcionesProveedores = res.data.map(prov => ({
          value: prov.id_proveedor,
          label: prov.nombre
        }));
        setProveedores(opcionesProveedores);
      } catch (error) {
        console.error('Error cargando proveedores:', error);
        toast.error('Error al cargar opciones de proveedores.');
      }
    };
    fetchProveedores();
  }, []);

  // NUEVO useEffect para manejar el estado de navegación y la casilla
  useEffect(() => {
    if (location.state?.esMateriaPrima) {
      setEsMateriaPrima(true);
      // Opcional: limpiar los campos de costo indirecto si se llega aquí con la intención de registrar MP
      setTipoCosto('');
      setValor('');
      setObservaciones('');
    } else {
      setEsMateriaPrima(false);
      // Opcional: limpiar los campos de materia prima si se llega aquí sin la intención de registrar MP
      setDescripcionGastoMateriaPrima('');
      setCantidadMateriaPrima('');
      setPrecioUnitarioMateriaPrima('');
      setIdProveedorMateriaPrima(null);
      setObservacionesMateriaPrima('');
    }
  }, [location.state]); // Dependencia: reacciona cuando cambia el estado de la ubicación

  // Prefill de OF si navegamos desde Órdenes de Fabricación
  useEffect(() => {
    const preId = location.state?.id_orden_fabricacion;
    if (!preId) return;
    (async () => {
      try {
        const res = await api.get(`/ordenes-fabricacion/${preId}`);
        const ord = res.data;
        if (ord?.id_orden_fabricacion) {
          setAsignarAOF(true);
          setOfSeleccionada({
            value: ord.id_orden_fabricacion,
            label: `OF #${ord.id_orden_fabricacion} — ${ord.nombre_cliente || 'Sin cliente'}`,
          });
        }
      } catch (e) {
        console.error('No se pudo pre-cargar la OF:', e);
      }
    })();
  }, [location.state]);

  // Cargador de opciones de OF filtrando por cliente
  const cargarOFs = async (inputValue) => {
    try {
      const params = { buscar: inputValue || '', page: 1, pageSize: 20, sortBy: 'id', sortDir: 'desc', estados: 'pendiente,en proceso' };
      const res = await api.get('/ordenes-fabricacion', { params });
      const rows = Array.isArray(res.data?.data) ? res.data.data : [];
      return rows.map((o) => ({
        value: o.id_orden_fabricacion,
        label: `OF #${o.id_orden_fabricacion} — ${o.nombre_cliente || 'Sin cliente'}`,
      }));
    } catch (e) {
      console.error('Error cargando OFs:', e);
      return [];
    }
  };

  // Calcular el valor total para materia prima (solo para mostrar en UI)
  const valorTotalMateriaPrima = (Number(cantidadMateriaPrima) * Number(precioUnitarioMateriaPrima)).toFixed(2);

  // Helpers COP
  const formatCOP = (number) => {
    const n = Number(number) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  };
  const cleanCOP = (s) => {
    if (s === null || s === undefined) return 0;
    const onlyNums = String(s).replace(/[^0-9]/g, '');
    return parseInt(onlyNums, 10) || 0;
  };
  const valorNumerico = cleanCOP(valor);

  // Limpiar sugerencias si cambian insumos clave (fecha, valor, driver)
  useEffect(() => {
    setSugerencias([]);
    setMostrarDetalle(false);
  }, [fecha, valor, driver]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fecha) {
      toast.error('Por favor, selecciona una fecha.');
      return;
    }

    if (esMateriaPrima) {
      // Validaciones para el formulario de materia prima
      if (!descripcionGastoMateriaPrima.trim() || !cantidadMateriaPrima || !precioUnitarioMateriaPrima) {
        toast.error('Por favor, completa todos los campos obligatorios para el costo de materia prima.');
        return;
      }
      if (Number(cantidadMateriaPrima) <= 0) {
        toast.error('La cantidad de materia prima debe ser un número positivo.');
        return;
      }
      if (Number(precioUnitarioMateriaPrima) < 0) {
        toast.error('El precio unitario de materia prima no puede ser negativo.');
        return;
      }

      const payload = {
        descripcion_gasto: descripcionGastoMateriaPrima.trim(),
        cantidad: Number(cantidadMateriaPrima),
        precio_unitario: Number(precioUnitarioMateriaPrima),
        fecha_compra: fecha,
        id_proveedor: idProveedorMateriaPrima,
        observaciones: observacionesMateriaPrima || null,
      };

      try {
        await api.post('/compras_materia_prima', payload);
        toast.success('Costo de materia prima registrado correctamente.');
        navigate('/costos_materia_prima');
      } catch (error) {
        console.error('Error al registrar costo de materia prima:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Error al registrar el costo de materia prima.');
      }
    } else {
      // Validaciones para el formulario de costo indirecto tradicional
      if (!tipoCosto || !valorNumerico) {
        toast.error('Por favor, completa todos los campos obligatorios para el costo indirecto.');
        return;
      }
      if (Number(valorNumerico) <= 0) {
        toast.error('El valor del costo indirecto debe ser mayor a cero.');
        return;
      }

      // Preparar payload con opciones de asignación
      const payload = {
        tipo_costo: tipoCosto,
        fecha,
        valor: Number(valorNumerico),
        observaciones: observaciones || null,
        ...(asignarAOF && !asignacionMultiple && ofSeleccionada?.value
          ? { id_orden_fabricacion: ofSeleccionada.value }
          : {}),
        ...(asignarAOF && asignacionMultiple
          ? {
              asignaciones: ofsSeleccionadas
                .map((opt) => ({
                  id_orden_fabricacion: opt.value,
                  valor_asignado: Number(montosAsignados[opt.value] || 0),
                }))
                .filter((a) => a.valor_asignado > 0),
            }
          : {}),
      };

      if (asignarAOF && asignacionMultiple) {
        const suma = (payload.asignaciones || []).reduce((acc, a) => acc + Number(a.valor_asignado || 0), 0);
        if (suma !== valorNumerico) {
          toast.error('La suma de los valores asignados debe ser exactamente igual al valor del costo.');
          return;
        }
        if (!payload.asignaciones || payload.asignaciones.length === 0) {
          toast.error('Selecciona al menos una OF y define sus valores.');
          return;
        }
      }

      try {
        await api.post('/costos-indirectos', payload);
        toast.success('Costo indirecto registrado correctamente');
        navigate('/costos_indirectos');
      } catch (error) {
        console.error('Error al registrar el costo indirecto:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Error al registrar el costo indirecto.');
      }
    }
  };

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-4">
          Registrar nuevo costo
        </h2>

        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            id="esMateriaPrima"
            checked={esMateriaPrima}
            onChange={(e) => {
              setEsMateriaPrima(e.target.checked);
              // Limpiar estados al cambiar de tipo de costo
              setTipoCosto('');
              setValor('');
              setObservaciones('');
              setDescripcionGastoMateriaPrima('');
              setCantidadMateriaPrima('');
              setPrecioUnitarioMateriaPrima('');
              setIdProveedorMateriaPrima(null);
              setObservacionesMateriaPrima('');
            }}
            className="h-5 w-5 text-slate-600 rounded focus:ring-slate-500"
          />
          <label htmlFor="esMateriaPrima" className="ml-2 block text-lg font-medium text-gray-700">
            Registrar Costo de Materia Prima
          </label>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo de Fecha (siempre visible) */}
          <div>
            <label className="block font-medium mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
            />
          </div>

          {!esMateriaPrima ? (
            <>
              {/* Formulario de Costo Indirecto Tradicional */}
              <div className="md:col-span-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={asignarAOF}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setAsignarAOF(checked);
                      if (!checked) {
                        // limpiar selección y montos si se desactiva
                        setAsignacionMultiple(false);
                        setOfSeleccionada(null);
                        setOfsSeleccionadas([]);
                        setMontosAsignados({});
                      }
                    }}
                    className="h-5 w-5 text-slate-600 rounded focus:ring-slate-500"
                  />
                  <span className="block font-medium">Asignar a una Orden de Fabricación ahora</span>
                </label>
              </div>
              {asignarAOF && (
                <div className="md:col-span-2 flex items-center gap-6">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="modo_asignacion"
                      checked={!asignacionMultiple}
                      onChange={() => {
                        setAsignacionMultiple(false);
                        // limpiar múltiples si veníamos de múltiple
                        setOfsSeleccionadas([]);
                        setMontosAsignados({});
                      }}
                    />
                    <span>Una sola OF</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="modo_asignacion"
                      checked={asignacionMultiple}
                      onChange={() => {
                        setAsignacionMultiple(true);
                        // limpiar selección única si veníamos de única
                        setOfSeleccionada(null);
                      }}
                    />
                    <span>Varias OF</span>
                  </label>
                </div>
              )}
              <div>
                <label className="block font-medium mb-1">
                  Tipo de costo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tipoCosto}
                  onChange={(e) => setTipoCosto(e.target.value)}
                  required={!esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Valor <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={valor}
                  onChange={(e) => {
                    const num = cleanCOP(e.target.value);
                    setValor(num ? formatCOP(num) : '');
                  }}
                  placeholder="$ 0"
                  inputMode="numeric"
                  required={!esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              {asignarAOF && !asignacionMultiple && (
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">
                    Orden de Fabricación
                  </label>
                  <AsyncSelect
                    cacheOptions
                    defaultOptions
                    loadOptions={cargarOFs}
                    value={ofSeleccionada}
                    onChange={(opt) => setOfSeleccionada(opt)}
                    isClearable
                    placeholder="Escribe el nombre del cliente para buscar…"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#d1d5db',
                        boxShadow: 'none',
                        '&:hover': { borderColor: '#64748b' },
                        borderRadius: '0.375rem',
                      }),
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Tip: también puedes llegar aquí desde la OF y se prellenará automáticamente.</p>
                </div>
              )}

              {asignarAOF && asignacionMultiple && (
                <div className="md:col-span-2">
                  <label className="block font-medium mb-1">Órdenes de Fabricación</label>
                  <AsyncSelect
                    isMulti
                    cacheOptions
                    defaultOptions
                    loadOptions={cargarOFs}
                    value={ofsSeleccionadas}
                    onChange={(opts) => {
                      setOfsSeleccionadas(opts || []);
                      const allowed = new Set((opts || []).map((o) => o.value));
                      setMontosAsignados((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => allowed.has(Number(k)))));
                    }}
                    placeholder="Escribe el nombre del cliente para buscar…"
                    classNamePrefix="react-select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#d1d5db',
                        boxShadow: 'none',
                        '&:hover': { borderColor: '#64748b' },
                        borderRadius: '0.375rem',
                      }),
                    }}
                  />
                  {/* Barra de auto-distribución por driver */}
                  <div className="mt-3 flex items-center gap-3">
                    <label className="text-sm text-gray-700">Driver</label>
                    <select
                      className="border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-slate-600"
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                    >
                      <option value="cantidad">Cantidad</option>
                      <option value="avances"># Avances</option>
                      <option value="costo">Costo de fabricación</option>
                    </select>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!fecha) {
                            toast.error('Selecciona primero la fecha del costo.');
                            return;
                          }
                          const total = valorNumerico;
                          if (!total || total <= 0) {
                            toast.error('Define el valor total del costo para poder distribuir.');
                            return;
                          }
                          const d = new Date(fecha);
                          const anio = d.getFullYear();
                          const mes = d.getMonth() + 1;
                          const params = { anio, mes, driver, total, estados: 'pendiente,en proceso' };
                          const resp = await api.get('/costos-indirectos-asignados/sugerencias', { params });
                          const sugerencias = Array.isArray(resp.data) ? resp.data : [];
                          if (sugerencias.length === 0) {
                            toast('No hay avances en ese mes para sugerir distribución.');
                            return;
                          }
                          setSugerencias(sugerencias);
                          setMostrarDetalle(true);
                          toast.success('Sugerencias calculadas. Revisa el detalle antes de aplicar.');
                        } catch (err) {
                          console.error('Error obteniendo sugerencias:', err);
                          toast.error('No fue posible obtener las sugerencias.');
                        }
                      }}
                      className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Auto-distribuir
                    </button>
                  </div>
                  {mostrarDetalle && sugerencias.length > 0 && (
                    <div className="mt-3 border border-slate-200 rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between">
                        <div className="text-sm font-medium text-slate-700">Detalle de distribución por driver ({driver})</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              // Aplicar sugerencias a selección y montos
                              const nuevasSeleccionadas = sugerencias
                                .filter((s) => Number(s.valor_asignado || 0) > 0)
                                .map((s) => ({ value: s.id_orden_fabricacion, label: `OF #${s.id_orden_fabricacion}` }));
                              const nuevosMontos = Object.fromEntries(
                                sugerencias.map((s) => [s.id_orden_fabricacion, Number(s.valor_asignado || 0)])
                              );
                              setOfsSeleccionadas(nuevasSeleccionadas);
                              setMontosAsignados(nuevosMontos);
                              setMostrarDetalle(false);
                              toast.success('Sugerencias aplicadas.');
                            }}
                            className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded-md text-xs"
                          >
                            Aplicar sugerencias
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSugerencias([]);
                              setMostrarDetalle(false);
                            }}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-xs"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-white border-b">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-slate-700">OF</th>
                              <th className="text-right px-3 py-2 font-medium text-slate-700">Driver</th>
                              <th className="text-right px-3 py-2 font-medium text-slate-700">%</th>
                              <th className="text-right px-3 py-2 font-medium text-slate-700">Sugerido</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sugerencias.map((s) => {
                              const driverVal = Number(s.driver_valor || 0);
                              const peso = Number(s.peso || 0);
                              const sugerido = Number(s.valor_asignado ?? Math.floor(peso * valorNumerico));
                              const fmtDriver = driver === 'costo'
                                ? formatCOP(driverVal)
                                : new Intl.NumberFormat('es-CO').format(driverVal);
                              return (
                                <tr key={s.id_orden_fabricacion} className="border-t">
                                  <td className="px-3 py-2">OF #{s.id_orden_fabricacion}</td>
                                  <td className="px-3 py-2 text-right">{fmtDriver}</td>
                                  <td className="px-3 py-2 text-right">{(peso * 100).toFixed(2)}%</td>
                                  <td className="px-3 py-2 text-right">{formatCOP(sugerido)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-3 py-2 bg-slate-50 flex items-center justify-end gap-4 text-xs text-slate-700">
                        <div>
                          Total sugerido: <strong>{formatCOP(sugerencias.reduce((acc, s) => acc + Number(s.valor_asignado || 0), 0))}</strong>
                        </div>
                        <div>
                          Total costo: <strong>{formatCOP(valorNumerico)}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  {ofsSeleccionadas.length > 0 && !mostrarDetalle && (
                    <div className="mt-4 border rounded-md border-slate-200 divide-y">
                      {ofsSeleccionadas.map((opt) => {
                        const id = opt.value;
                        const val = montosAsignados[id] || 0;
                        return (
                          <div key={id} className="flex items-center justify-between gap-4 p-3">
                            <div className="text-sm text-gray-700">{opt.label}</div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Valor</span>
                              <input
                                type="text"
                                value={val ? formatCOP(val) : ''}
                                onChange={(e) => {
                                  const num = cleanCOP(e.target.value);
                                  setMontosAsignados((prev) => ({ ...prev, [id]: num }));
                                }}
                                placeholder="$ 0"
                                inputMode="numeric"
                                className="w-40 border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-slate-600"
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex items-center justify-end p-3 bg-slate-50">
                        <div className="text-sm">
                          <span className="text-gray-600 mr-2">Asignado:</span>
                          <strong>{formatCOP(Object.values(montosAsignados).reduce((a, b) => a + (Number(b) || 0), 0))}</strong>
                          <span className="text-gray-600 mx-2">/</span>
                          <span className="text-gray-800">{formatCOP(valorNumerico)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Observaciones</label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  placeholder="Opcional"
                />
              </div>
            </>
          ) : (
            <>
              {/* Formulario de Costo de Materia Prima */}
              <div className="md:col-span-2">
                <h3 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                  Detalles de Materia Prima
                </h3>
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Descripción del Gasto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={descripcionGastoMateriaPrima}
                  onChange={(e) => setDescripcionGastoMateriaPrima(e.target.value)}
                  required={esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  placeholder="Ej: Tornillería, Pintura acrílica, Madera de pino"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Cantidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={cantidadMateriaPrima}
                  onChange={(e) => setCantidadMateriaPrima(e.target.value)}
                  min="1"
                  required={esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Precio Unitario <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={precioUnitarioMateriaPrima}
                  onChange={(e) => setPrecioUnitarioMateriaPrima(e.target.value)}
                  min="0"
                  step="0.01"
                  required={esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">
                  Proveedor (Opcional)
                </label>
                <Select
                  options={proveedores}
                  value={proveedores.find(opt => opt.value === idProveedorMateriaPrima)}
                  onChange={(selectedOption) => setIdProveedorMateriaPrima(selectedOption ? selectedOption.value : null)}
                  placeholder="Selecciona un proveedor"
                  isClearable
                  className="w-full"
                  styles={{
                    control: (base) => ({
                      ...base,
                      borderColor: '#d1d5db',
                      boxShadow: 'none',
                      '&:hover': { borderColor: '#64748b' },
                      borderRadius: '0.375rem',
                    }),
                  }}
                />
              </div>

              {/* Campo Valor Total (solo lectura para MP) */}
              <div>
                <label className="block font-medium mb-1">
                  Valor Total Estimado
                </label>
                <input
                  type="text"
                  value={Number(valorTotalMateriaPrima).toLocaleString()}
                  readOnly
                  className="w-full border border-gray-300 rounded-md px-4 py-2 bg-gray-100 text-gray-700"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block font-medium mb-1">Observaciones</label>
                <textarea
                  value={observacionesMateriaPrima}
                  onChange={(e) => setObservacionesMateriaPrima(e.target.value)}
                  rows="3"
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                  placeholder="Opcional"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2 flex justify-end gap-4 pt-4">
            <button
              type="submit"
              className="bg-slate-800 hover:bg-slate-600 text-white px-6 py-2 rounded-md font-semibold cursor-pointer"
            >
              Registrar Costo
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md font-medium cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CostosIndirectosNuevo;
