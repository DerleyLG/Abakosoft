import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const EditarTrabajador = () => {
  const idempotencyKey = useIdempotencyKey();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargo, setCargo] = useState("");
  const [activo, setActivo] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchTrabajador = async () => {
      try {
        const res = await api.get(`/trabajadores/${id}`);
        const trabajador = res.data;
        setNombre(trabajador.nombre);
        setTelefono(trabajador.telefono || "");
        setCargo(trabajador.cargo || "");
        setActivo(trabajador.activo === 1);
      } catch (error) {
        console.error("Error al obtener el trabajador", error);
        toast.error("No se pudo cargar el trabajador.");
      }
    };
    fetchTrabajador();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio.");
    try {
      const formData = {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        cargo: cargo.trim() || null,
        activo: activo ? 1 : 0,
      };
      await api.put(`/trabajadores/${id}`, formData, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
      toast.success("Trabajador actualizado correctamente");
      setTimeout(() => navigate("/trabajadores"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.mensaje ||
        error.response?.data?.message ||
        error.message;
      toast.error(msg || "Error interno al actualizar el trabajador");
    }
  };

  const handleCancelar = () => navigate("/trabajadores");

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls = "block text-sm font-semibold text-slate-600 mb-2";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancelar}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shadow-sm"
            >
              <FiArrowLeft size={17} />
            </button>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Trabajadores
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Editar trabajador
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancelar}
              className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="trabajador-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form
            id="trabajador-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
          >
            <div>
              <label htmlFor="nombre" className={labelCls}>
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
                className={inputCls}
                placeholder="Nombre completo"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="telefono" className={labelCls}>
                  Teléfono
                </label>
                <input
                  id="telefono"
                  type="text"
                  inputMode="numeric"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className={inputCls}
                  placeholder="Ej: 3001234567"
                />
              </div>

              <div>
                <label htmlFor="cargo" className={labelCls}>
                  Cargo
                </label>
                <input
                  id="cargo"
                  type="text"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className={inputCls}
                  placeholder="Ej: Carpintero"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <button
                type="button"
                role="switch"
                aria-checked={activo}
                onClick={() => setActivo((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                  activo ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    activo ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Trabajador activo
                </p>
                <p className="text-xs text-slate-400">
                  {activo
                    ? "Aparecerá disponible en el sistema"
                    : "No estará disponible en el sistema"}
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarTrabajador;
