import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiArrowLeft } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const CrearCliente = () => {
  const idempotencyKey = useIdempotencyKey();
  const [nombre, setNombre] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [departamento, setDepartamento] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio.");
    try {
      const formData = {
        nombre: nombre.trim(),
        identificacion: identificacion.trim() || null,
        telefono: telefono.trim(),
        direccion: direccion.trim() || null,
        ciudad: ciudad.trim() || null,
        departamento: departamento.trim() || null,
      };
      await api.post("/clientes", formData, { headers: { "X-Idempotency-Key": idempotencyKey } });
      toast.success("Cliente creado correctamente");
      setTimeout(() => navigate("/clientes"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.mensaje ||
        error.response?.data?.message ||
        error.message;
      toast.error(msg || "Error interno al crear el cliente");
    }
  };

  const handleCancelar = () => navigate("/clientes");

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
                Clientes
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Nuevo cliente
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
              form="cliente-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar cliente
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form
            id="cliente-form"
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
                className={inputCls}
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <label htmlFor="identificacion" className={labelCls}>
                Identificación
              </label>
              <input
                id="identificacion"
                type="text"
                inputMode="numeric"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className={inputCls}
                placeholder="DNI / Cédula / RUC"
              />
            </div>

            <div>
              <label htmlFor="telefono" className={labelCls}>
                Teléfono <span className="text-red-400">*</span>
              </label>
              <input
                id="telefono"
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
              <label htmlFor="ciudad" className={labelCls}>
                Ciudad
              </label>
              <input
                id="ciudad"
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className={inputCls}
                placeholder="Ej: Medellín"
              />
            </div>

            <div>
              <label htmlFor="departamento" className={labelCls}>
                Departamento
              </label>
              <input
                id="departamento"
                type="text"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
                className={inputCls}
                placeholder="Ej: Antioquia"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="direccion" className={labelCls}>
                Dirección
              </label>
              <textarea
                id="direccion"
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

export default CrearCliente;
