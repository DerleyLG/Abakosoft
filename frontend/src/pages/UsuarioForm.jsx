import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiUserPlus, FiEye, FiEyeOff, FiInfo } from 'react-icons/fi';

const UsuarioForm = () => {
  const navigate = useNavigate();
  const [nombre_usuario, setNombreUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [id_trabajador, setIdTrabajador] = useState('');
  const [id_rol, setIdRol] = useState('');
  const [roles, setRoles] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [loading, setLoading] = useState(false); 
  const [loadingData, setLoadingData] = useState(true); 
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPin, setShowPin] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  
  useEffect(() => {
    if (touched.pin || touched.pinConfirm) {
      validate();
    }
   
  }, [pin, pinConfirm]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        const [resRoles, resTrab] = await Promise.all([
          api.get('/roles'),
          api.get('/trabajadores'),
        ]);
        setRoles(resRoles.data || []);
        setTrabajadores(resTrab.data || []);
      } catch (err) {
        console.error('Error cargando datos para el formulario de usuario', err);
        const msg = err.response?.data?.error || 'Error al cargar roles/trabajadores';
        toast.error(msg);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!nombre_usuario.trim()) newErrors.nombre_usuario = 'El nombre de usuario es obligatorio';
    if (!pin) newErrors.pin = 'El PIN es obligatorio';
    if (!pinConfirm) newErrors.pinConfirm = 'Confirma el PIN';
    if (pin && pinConfirm && pin !== pinConfirm) newErrors.pinConfirm = 'El PIN y su confirmación no coinciden';
    if (!id_rol) newErrors.id_rol = 'Seleccione un rol';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const errorClass = (field) => (touched[field] && errors[field] ? 'border-red-400 focus:ring-red-500' : 'border-slate-300 focus:ring-slate-600');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post('/usuarios', {
        nombre_usuario,
        pin,
        id_trabajador: id_trabajador ? Number(id_trabajador) : null,
        id_rol: Number(id_rol),
      });
      toast.success('Usuario creado');
      navigate('/gestionUsuarios');
    } catch (err) {
      console.error('Error creando usuario', err);
      const msg = err.response?.data?.error || 'Error al crear usuario';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
  <div className="w-full px-4 md:px-8 lg:px-12 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-start md:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Nuevo usuario</h1>
           <p className="text-sm text-slate-500">Crea usuarios, asigna rol y establece el PIN.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/gestionUsuarios')}
            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-slate-800 rounded-md"
          >
            <FiArrowLeft /> Volver
          </button>
        </div>

  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
        {loadingData ? (
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="h-10 bg-slate-200 rounded"></div>
              <div className="h-10 bg-slate-200 rounded"></div>
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-8">
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Datos de acceso</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Nombre de usuario</label>
              <input
                type="text"
                value={nombre_usuario}
                onChange={(e) => { setNombreUsuario(e.target.value); if (touched.nombre_usuario) validate(); }}
                onBlur={() => onBlur('nombre_usuario')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errorClass('nombre_usuario')}`}
                required
              />
              {touched.nombre_usuario && errors.nombre_usuario && (
                <p className="mt-1 text-xs text-red-600">{errors.nombre_usuario}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">PIN</label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); if (touched.pin || touched.pinConfirm) validate(); }}
                  onBlur={() => onBlur('pin')}
                  className={`mt-1 block w-full pr-10 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errorClass('pin')}`}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((v) => !v)}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  {showPin ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {touched.pin && errors.pin && (
                <p className="mt-1 text-xs text-red-600">{errors.pin}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Mínimo 4 caracteres. No reutilices credenciales.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirmar PIN</label>
              <div className="relative">
                <input
                  type={showPinConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pinConfirm}
                  onChange={(e) => { setPinConfirm(e.target.value); if (touched.pinConfirm) validate(); }}
                  onBlur={() => onBlur('pinConfirm')}
                  className={`mt-1 block w-full pr-10 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errorClass('pinConfirm')}`}
                  required
                  minLength={4}
                />
                <button
                  type="button"
                  onClick={() => setShowPinConfirm((v) => !v)}
                  className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  aria-label={showPinConfirm ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  {showPinConfirm ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
              {touched.pinConfirm && errors.pinConfirm && (
                <p className="mt-1 text-xs text-red-600">{errors.pinConfirm}</p>
              )}
              {/* Mensaje positivo si coinciden */}
              {touched.pinConfirm && pin && pinConfirm && pin === pinConfirm && !errors.pinConfirm && (
                <p className="mt-1 text-xs text-emerald-600">Los PINs coinciden</p>
              )}
            </div>
            </div>
          </div>

          <div className="pt-2">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Asignación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Trabajador</label>
              <select
                value={id_trabajador}
                onChange={(e) => { setIdTrabajador(e.target.value); if (touched.id_trabajador) validate(); }}
                onBlur={() => onBlur('id_trabajador')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errorClass('id_trabajador')}`}
              >
                <option value="">Seleccione trabajador</option>
                {trabajadores.map((t) => (
                  <option key={t.id_trabajador} value={t.id_trabajador}>{t.nombre}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">Opcional. Puedes asignarlo más tarde.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Rol</label>
              <select
                value={id_rol}
                onChange={(e) => { setIdRol(e.target.value); if (touched.id_rol) validate(); }}
                onBlur={() => onBlur('id_rol')}
                className={`mt-1 block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${errorClass('id_rol')}`}
                required
              >
                <option value="">Seleccione rol</option>
                {roles.map((r) => (
                  <option key={r.id_rol} value={r.id_rol}>{r.nombre_rol}</option>
                ))}
              </select>
              {touched.id_rol && errors.id_rol && (
                <p className="mt-1 text-xs text-red-600">{errors.id_rol}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">El rol controla permisos y acceso en la plataforma.</p>
            </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              type="button"
              onClick={() => navigate('/gestionUsuarios')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition shadow-sm cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2 bg-slate-700 text-white rounded-md hover:bg-slate-800 transition shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiUserPlus /> {loading ? 'Guardando…' : 'Crear usuario'}
            </button>
          </div>
        </form>

        {/* Aside informativo */}
        <aside className="lg:col-span-1 space-y-5">
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-700 font-medium">
              <FiInfo /> Sugerencias
            </div>
            <ul className="mt-3 text-sm text-slate-600 list-disc pl-5 space-y-1">
              <li>Usa un PIN único y fácil de recordar para el usuario</li>
              <li>Asegurate de que el rol seleccionado tenga los permisos adecuados</li>
              <li>No reutilices credenciales de otros usuarios</li>
              <li>El rol “admin” tiene acceso completo.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="text-sm text-slate-500">Rol seleccionado</div>
            <div className="mt-1 text-slate-900 font-semibold">
              {(roles.find(r => String(r.id_rol) === String(id_rol))?.nombre_rol) || '—'}
            </div>
            <p className="mt-2 text-xs text-slate-600">
              {(() => {
                const nombre = roles.find(r => String(r.id_rol) === String(id_rol))?.nombre_rol;
                if (nombre === 'admin') return 'Acceso total a configuración, usuarios y datos.';
                if (nombre === 'supervisor') return 'Puede revisar reportes y supervisar operaciones.';
                if (nombre === 'operario') return 'Orientado a operaciones del día a día.';
                return 'Selecciona un rol para ver su descripción.';
              })()}
            </p>
          </div>
        </aside>
        </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default UsuarioForm;
