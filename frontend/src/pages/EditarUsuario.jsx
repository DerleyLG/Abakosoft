import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import {
  FiArrowLeft,
  FiSave,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiCheck,
  FiAlertCircle,
} from "react-icons/fi";

const EditarUsuario = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
        const [resUser, resRoles, resTrab] = await Promise.all([
          api.get(`/usuarios/${id}`),
          api.get("/roles"),
          api.get("/trabajadores"),
        ]);
        const u = resUser.data;
        setNombreUsuario(u?.nombre_usuario || "");
        setIdRol(u?.id_rol ? String(u.id_rol) : "");
        setIdTrabajador(u?.id_trabajador ? String(u.id_trabajador) : "");
        setRoles(resRoles.data || []);
        setTrabajadores(resTrab.data || []);
      } catch (err) {
        console.error("Error cargando datos de usuario", err);
        const msg = err.response?.data?.error || "Error al cargar datos";
        toast.error(msg);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [id]);

  const validate = () => {
    const newErrors = {};
    if (!nombre_usuario.trim())
      newErrors.nombre_usuario = "El nombre de usuario es obligatorio";
    if (pin || pinConfirm) {
      if (!pin)
        newErrors.pin = "Ingrese el nuevo PIN o deje ambos campos vacíos";
      if (!pinConfirm)
        newErrors.pinConfirm = "Confirme el PIN si desea cambiarlo";
      if (pin && pinConfirm && pin !== pinConfirm)
        newErrors.pinConfirm = "El PIN y su confirmación no coinciden";
    }
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
      const body = {
        nombre_usuario,
        id_trabajador: id_trabajador ? Number(id_trabajador) : null,
        id_rol: Number(id_rol),
      };
      if (pin) body.pin = pin;
      await api.put(`/usuarios/${id}`, body, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
      toast.success("Usuario actualizado");
      navigate("/gestionUsuarios");
    } catch (err) {
      console.error("Error actualizando usuario", err);
      const msg = err.response?.data?.error || "Error al actualizar usuario";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full px-4 md:px-8 lg:px-12 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Encabezado */}
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-white focus:ring-2 focus:ring-slate-400 transition"
              aria-label="Volver"
            >
              <FiArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Editar usuario
              </h1>
              <p className="text-slate-600 mt-1">
                Actualiza credenciales, rol y asignación del trabajador
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {loadingData ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-white rounded-2xl h-32 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form
                  onSubmit={handleSubmit}
                  className="lg:col-span-2 space-y-6"
                >
                  {/* Credenciales */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FiSave size={20} className="text-slate-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">
                          Credenciales
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Nombre de usuario y PIN
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {/* nombre_usuario */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
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
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition ${
                            touched.nombre_usuario && errors.nombre_usuario
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          }`}
                          placeholder="usuario_ejemplo"
                        />
                        {touched.nombre_usuario && errors.nombre_usuario && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <FiAlertCircle size={14} /> {errors.nombre_usuario}
                          </p>
                        )}
                      </div>

                      {/* PIN actual */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          PIN actual
                        </label>
                        <input
                          type="password"
                          disabled
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-500 font-mono text-sm"
                          placeholder="••••••"
                        />
                      </div>

                      {/* Nuevo PIN */}
                      <div>
                        <label className="flex text-xs font-semibold text-slate-700 mb-2 items-center gap-2">
                          Nuevo PIN
                          <span className="text-slate-400 font-normal">
                            (opcional)
                          </span>
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type={showPin ? "text" : "password"}
                            value={pin}
                            onChange={(e) => {
                              setPin(e.target.value);
                              if (touched.pin || touched.pinConfirm) validate();
                            }}
                            onBlur={() => onBlur("pin")}
                            className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none transition font-mono ${
                              touched.pin && errors.pin
                                ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                                : pin && pin.length >= 4
                                  ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                  : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                            }`}
                            placeholder="Mínimo 4 dígitos"
                            minLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="cursor-pointer flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            {showPin ? (
                              <FiEyeOff size={18} />
                            ) : (
                              <FiEye size={18} />
                            )}
                          </button>
                        </div>
                        {touched.pin && errors.pin && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <FiAlertCircle size={14} /> {errors.pin}
                          </p>
                        )}
                      </div>

                      {/* Confirmar PIN */}
                      {pin && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-2">
                            Confirmar nuevo PIN
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type={showPinConfirm ? "text" : "password"}
                              value={pinConfirm}
                              onChange={(e) => {
                                setPinConfirm(e.target.value);
                                if (touched.pinConfirm) validate();
                              }}
                              onBlur={() => onBlur("pinConfirm")}
                              className={`flex-1 px-4 py-3 border-2 rounded-xl focus:outline-none transition font-mono ${
                                touched.pinConfirm && errors.pinConfirm
                                  ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                                  : pin && pinConfirm && pin === pinConfirm
                                    ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                                    : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                              }`}
                              placeholder="Repite el PIN"
                              minLength={4}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPinConfirm(!showPinConfirm)}
                              className="cursor-pointer flex items-center justify-center w-10 h-10 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              {showPinConfirm ? (
                                <FiEyeOff size={18} />
                              ) : (
                                <FiEye size={18} />
                              )}
                            </button>
                          </div>
                          {touched.pinConfirm &&
                            pin === pinConfirm &&
                            !errors.pinConfirm && (
                              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                                <FiCheck size={14} /> Los PINs coinciden
                              </p>
                            )}
                          {touched.pinConfirm && errors.pinConfirm && (
                            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                              <FiAlertCircle size={14} /> {errors.pinConfirm}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Asignación */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FiInfo size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h2 className="font-bold text-slate-900">Asignación</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Trabajador y rol del usuario
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* trabajador */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Trabajador
                          <span className="text-slate-400 font-normal">
                            (opcional)
                          </span>
                        </label>
                        <select
                          value={id_trabajador}
                          onChange={(e) => {
                            setIdTrabajador(e.target.value);
                            if (touched.id_trabajador) validate();
                          }}
                          onBlur={() => onBlur("id_trabajador")}
                          className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 text-slate-900"
                        >
                          <option value="">Sin asignar</option>
                          {trabajadores.map((t) => (
                            <option
                              key={t.id_trabajador}
                              value={t.id_trabajador}
                            >
                              {t.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* rol */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-2">
                          Rol
                          <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={id_rol}
                          onChange={(e) => {
                            setIdRol(e.target.value);
                            if (touched.id_rol) validate();
                          }}
                          onBlur={() => onBlur("id_rol")}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition ${
                            touched.id_rol && errors.id_rol
                              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
                              : "border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                          }`}
                        >
                          <option value="">Selecciona un rol</option>
                          {roles.map((r) => (
                            <option key={r.id_rol} value={r.id_rol}>
                              {r.nombre_rol}
                            </option>
                          ))}
                        </select>
                        {touched.id_rol && errors.id_rol && (
                          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <FiAlertCircle size={14} /> {errors.id_rol}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-slate-700 bg-white border-2 border-slate-200 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 focus:ring-2 focus:ring-slate-400 transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="cursor-pointer flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl font-semibold hover:from-slate-900 hover:to-slate-950 disabled:opacity-50 focus:ring-2 focus:ring-slate-400 transition active:scale-95"
                    >
                      <FiSave size={18} />{" "}
                      {loading ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </form>

                {/* Sidebar */}
                <aside className="space-y-5">
                  {/* Info actual */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-4">
                    <h3 className="font-bold text-slate-900 mb-4">
                      Información actual
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">
                          Rol actual
                        </p>
                        <p className="text-slate-700 capitalize">
                          {roles.find(
                            (r) => String(r.id_rol) === String(id_rol),
                          )?.nombre_rol || "No asignado"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 font-semibold mb-1">
                          Trabajador actual
                        </p>
                        <p className="text-slate-700">
                          {trabajadores.find(
                            (t) =>
                              String(t.id_trabajador) === String(id_trabajador),
                          )?.nombre || "Sin asignar"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recomendaciones */}
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl shadow-sm border border-amber-200 p-6">
                    <h3 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
                      <FiInfo size={16} /> Recomendaciones
                    </h3>
                    <ul className="text-xs text-amber-800 space-y-2 list-disc list-inside">
                      <li>Cambia el PIN solo si es necesario</li>
                      <li>Verifica el rol antes de guardar</li>
                      <li>Confirma la asignación del trabajador</li>
                    </ul>
                  </div>
                </aside>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditarUsuario;
