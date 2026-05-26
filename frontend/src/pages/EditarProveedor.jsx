import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const EditarProveedor = () => {
  const idempotencyKey = useIdempotencyKey();
  const [nombre, setNombre] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");

  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchProveedor = async () => {
      try {
        const res = await api.get(`/proveedores/${id}`);
        const proveedor = res.data;
        setNombre(proveedor.nombre);
        setIdentificacion(proveedor.identificacion || "");
        setTelefono(proveedor.telefono);
        setDireccion(proveedor.direccion || "");
        setCiudad(proveedor.ciudad || "");
        setDepartamento(proveedor.departamento || "");
      } catch (error) {
        console.error("Error al obtener el proveedor", error);
        toast.error("No se pudo cargar el proveedor.");
      }
    };

    fetchProveedor();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = {
        nombre: String(nombre || "").trim(),
        identificacion: String(identificacion || "").trim(),
        telefono: String(telefono || "").trim(),
        direccion: String(direccion || "").trim(),
        ciudad: String(ciudad || "").trim(),
        departamento: String(departamento || "").trim(),
      };

      await api.put(`/proveedores/${id}`, formData, {
        headers: { "X-Idempotency-Key": idempotencyKey },
      });
      toast.success("✅ Proveedor actualizado correctamente", {
        duration: 4000,
        style: {
          borderRadius: "8px",
          background: "#1e293b",
          color: "#fff",
          fontWeight: "bold",
          padding: "14px 20px",
          fontSize: "16px",
        },
        iconTheme: {
          primary: "#10b981",
          secondary: "#f0fdf4",
        },
      });

      setTimeout(() => {
        navigate("/proveedores");
      }, 500);
    } catch (error) {
      console.error("Error actualizando proveedor", error);
      toast.error(
        error.response?.data?.mensaje ||
          "Error interno al actualizar el proveedor",
      );
    }
  };

  const handleCancelar = () => navigate("/proveedores");

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
  const labelCls = "block text-sm font-semibold text-slate-600 mb-2";

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-8">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
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
                Proveedores
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Editar proveedor
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
              form="proveedor-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form
            id="proveedor-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className={labelCls}>
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
                className={inputCls}
                placeholder="Ej: Maderas del Norte"
              />
            </div>

            <div>
              <label className={labelCls}>Identificación</label>
              <input
                type="text"
                inputMode="numeric"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className={inputCls}
                placeholder="NIT o cédula"
              />
            </div>

            <div>
              <label className={labelCls}>
                Teléfono <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                required
                className={inputCls}
                placeholder="Ej: 3001234567"
              />
            </div>

            <div>
              <label className={labelCls}>Ciudad</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className={inputCls}
                placeholder="Ej: Medellín"
              />
            </div>

            <div>
              <label className={labelCls}>Departamento</label>
              <input
                type="text"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className={inputCls}
                placeholder="Ej: Antioquia"
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Dirección</label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={3}
                className={`${inputCls} resize-none`}
                placeholder="Dirección completa"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarProveedor;
