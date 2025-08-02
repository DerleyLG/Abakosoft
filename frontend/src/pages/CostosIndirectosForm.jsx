import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import Select from 'react-select';

const CostosIndirectosNuevo = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Inicializa esMateriaPrima, pero el useEffect lo ajustará si hay estado de navegación
  const [esMateriaPrima, setEsMateriaPrima] = useState(false);

  const [tipoCosto, setTipoCosto] = useState('');
  const [fecha, setFecha] = useState('');
  const [valor, setValor] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // ESTADOS para el formulario de materia prima
  const [descripcionGastoMateriaPrima, setDescripcionGastoMateriaPrima] = useState('');
  const [cantidadMateriaPrima, setCantidadMateriaPrima] = useState('');
  const [precioUnitarioMateriaPrima, setPrecioUnitarioMateriaPrima] = useState('');
  const [idProveedorMateriaPrima, setIdProveedorMateriaPrima] = useState(null);
  const [observacionesMateriaPrima, setObservacionesMateriaPrima] = useState('');

  const [proveedores, setProveedores] = useState([]);

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

  // Calcular el valor total para materia prima (solo para mostrar en UI)
  const valorTotalMateriaPrima = (Number(cantidadMateriaPrima) * Number(precioUnitarioMateriaPrima)).toFixed(2);

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
      if (!tipoCosto || !valor) {
        toast.error('Por favor, completa todos los campos obligatorios para el costo indirecto.');
        return;
      }
      if (Number(valor) <= 0) {
        toast.error('El valor del costo indirecto debe ser mayor a cero.');
        return;
      }

      const payload = {
        tipo_costo: tipoCosto,
        fecha,
        valor: Number(valor),
        observaciones: observaciones || null,
      };

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
                  type="number"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  min="1"
                  required={!esMateriaPrima}
                  className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                />
              </div>

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
