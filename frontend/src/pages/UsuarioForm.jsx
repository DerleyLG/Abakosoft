import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import {
  FiArrowLeft,
  FiUserPlus,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";

const UsuarioForm = () => {
  const navigate = useNavigate();
  const idempotencyKey = useIdempotencyKey();
  const [nombre_usuario, setNombreUsuario] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [id_trabajador, setIdTrabajador] = useState("");
  const [id_rol, setIdRol] = useState("");
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
          api.get("/roles"),
          api.get("/trabajadores"),
        ]);
        setRoles(resRoles.data || []);
        setTrabajadores(resTrab.data || []);
      } catch (err) {
        console.error(
          "Error cargando datos para el formulario de usuario",
          err,
        );
        const msg =
          err.response?.data?.error || "Error al cargar roles/trabajadores";
        toast.error(msg);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!nombre_usuario.trim())
      newErrors.nombre_usuario = "El nombre de usuario es obligatorio";
    if (!pin) newErrors.pin = "El PIN es obligatorio";
    if (!pinConfirm) newErrors.pinConfirm = "Confirma el PIN";
    if (pin && pinConfirm && pin !== pinConfirm)
      newErrors.pinConfirm = "El PIN y su confirmación no coinciden";
    if (!id_rol) newErrors.id_rol = "Seleccione un rol";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onBlur = (field) => setTouched((t) => ({ ...t, [field]: true }));
  const errorClass = (field) =>
    touched[field] && errors[field]
      ? "border-red-400 focus:ring-red-500"
      : "border-slate-300 focus:ring-slate-600";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.post(
        "/usuarios",
        {
          nombre_usuario,
          pin,
          id_trabajador: id_trabajador ? Number(id_trabajador) : null,
          id_rol: Number(id_rol),
        },
        { headers: { "X-Idempotency-Key": idempotencyKey } },
      );
      toast.success("Usuario creado");
      navigate("/gestionUsuarios");
    } catch (err) {
      console.error("Error creando usuario", err);
      const msg = err.response?.data?.error || "Error al crear usuario";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6">
      <div className="w-full">
        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => navigate("/gestionUsuarios")}
            className="cursor-pointer flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-white transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administración de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Crear nuevo usuario
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configura credenciales, rol y asignación de trabajador
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          {loadingData ? (
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-white rounded-2xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario principal */}
              <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
                {/* Sección: Credenciales */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                      <FiUserPlus size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Credenciales de acceso
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Información de login para el usuario
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Nombre de usuario */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Nombre de usuario
                      </label>
                      <input
                        type="text"
                        value={nombre_usuario}
                        onChange={(e) => {
                          setNombreUsuario(e.target.value);
                          if (touched.nombre_usuario) validate();
                        }}
                        onBlur={() => onBlur("nombre_usuario")}
                        placeholder="p.ej. jgarcia, ana.torres"
                        className={`w-full px-3.5 py-2 border rounded-lg focus:outline-none transition text-sm ${
                          touched.nombre_usuario && errors.nombre_usuario
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        }`}
                        required
                      />
                      {touched.nombre_usuario && errors.nombre_usuario && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle size={14} /> {errors.nombre_usuario}
                        </p>
                      )}
                    </div>
                    {/* PIN */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        PIN de acceso
                      </label>
                      <div className="relative">
                        <input
                          type={showPin ? "text" : "password"}
                          autoComplete="new-password"
                          value={pin}
                          onChange={(e) => {
                            setPin(e.target.value);
                            if (touched.pin || touched.pinConfirm) validate();
                          }}
                          onBlur={() => onBlur("pin")}
                          placeholder="Mínimo 4 dígitos"
                          className={`w-full px-3.5 py-2 pr-10 border rounded-lg focus:outline-none transition text-sm ${
                            touched.pin && errors.pin
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          }`}
                          required
                          minLength={4}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin((v) => !v)}
                          className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showPin ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {touched.pin && errors.pin && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle size={14} /> {errors.pin}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        Mínimo 4 caracteres. No reutilices PINs de otros
                        usuarios.
                      </p>
                    </div>
                    {/* Confirmar PIN */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Confirmar PIN
                      </label>
                      <div className="relative">
                        <input
                          type={showPinConfirm ? "text" : "password"}
                          autoComplete="new-password"
                          value={pinConfirm}
                          onChange={(e) => {
                            setPinConfirm(e.target.value);
                            if (touched.pinConfirm) validate();
                          }}
                          onBlur={() => onBlur("pinConfirm")}
                          className={`w-full px-3.5 py-2 pr-10 border rounded-lg focus:outline-none transition text-sm ${
                            touched.pinConfirm && errors.pinConfirm
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : touched.pinConfirm &&
                                  pin &&
                                  pinConfirm &&
                                  pin === pinConfirm
                                ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          }`}
                          required
                          minLength={4}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPinConfirm((v) => !v)}
                          className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                        >
                          {showPinConfirm ? <FiEyeOff /> : <FiEye />}
                        </button>
                      </div>
                      {touched.pinConfirm && errors.pinConfirm && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle size={14} /> {errors.pinConfirm}
                        </p>
                      )}
                      {touched.pinConfirm &&
                        pin &&
                        pinConfirm &&
                        pin === pinConfirm &&
                        !errors.pinConfirm && (
                          <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                            <FiCheck size={14} /> Los PINs coinciden
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                {/* Sección: Asignación */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                      <FiInfo size={18} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Asignación
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Trabajador y rol del usuario
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Trabajador */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Trabajador asociado
                      </label>
                      <select
                        value={id_trabajador}
                        onChange={(e) => {
                          setIdTrabajador(e.target.value);
                          if (touched.id_trabajador) validate();
                        }}
                        onBlur={() => onBlur("id_trabajador")}
                        className="w-full px-3.5 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition text-sm text-slate-900 bg-white"
                      >
                        <option value="">Sin asignar (opcional)</option>
                        {trabajadores.map((t) => (
                          <option key={t.id_trabajador} value={t.id_trabajador}>
                            {t.nombre}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        Vincula este usuario con un trabajador de la empresa.
                        Puedes dejarlo vacío.
                      </p>
                    </div>

                    {/* Rol */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Rol
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={id_rol}
                        onChange={(e) => {
                          setIdRol(e.target.value);
                          if (touched.id_rol) validate();
                        }}
                        onBlur={() => onBlur("id_rol")}
                        className={`w-full px-3.5 py-2 border rounded-lg focus:outline-none transition text-sm text-slate-900 bg-white ${
                          touched.id_rol && errors.id_rol
                            ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                            : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        }`}
                        required
                      >
                        <option value="">Selecciona un rol</option>
                        {roles.map((r) => (
                          <option key={r.id_rol} value={r.id_rol}>
                            {r.nombre_rol}
                          </option>
                        ))}
                      </select>
                      {touched.id_rol && errors.id_rol && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <FiAlertCircle size={14} /> {errors.id_rol}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-slate-500">
                        El rol determina los permisos y acceso del usuario.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/gestionUsuarios")}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiUserPlus size={15} />{" "}
                    {loading ? "Guardando…" : "Crear usuario"}
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
                    <li>
                      Usa un PIN único y fácil de recordar para el usuario
                    </li>
                    <li>
                      Asegurate de que el rol seleccionado tenga los permisos
                      adecuados
                    </li>
                    <li>No reutilices credenciales de otros usuarios</li>
                    <li>El rol "admin" tiene acceso completo.</li>
                  </ul>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="text-sm text-slate-500">Rol seleccionado</div>
                  <div className="mt-1 text-slate-900 font-semibold">
                    {roles.find((r) => String(r.id_rol) === String(id_rol))
                      ?.nombre_rol || "—"}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">
                    {(() => {
                      if (!id_rol)
                        return "Selecciona un rol para ver su descripción.";
                      const nombre = roles.find(
                        (r) => String(r.id_rol) === String(id_rol),
                      )?.nombre_rol;
                      if (nombre === "admin")
                        return "Acceso total a configuración, usuarios y datos.";
                      if (nombre === "supervisor")
                        return "Puede revisar reportes y supervisar operaciones.";
                      if (nombre === "operario")
                        return "Orientado a operaciones del día a día.";
                      return "Rol con permisos personalizados.";
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
