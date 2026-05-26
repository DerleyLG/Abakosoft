import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiPackage, FiBox, FiTool, FiArrowLeft } from "react-icons/fi";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";

const TIPO_OPTIONS = [
  {
    value: "articulo_fabricable",
    label: "Artículo Fabricable",
    desc: "Productos terminados",
    icon: FiPackage,
    active: "border-blue-500 bg-blue-50 ring-1 ring-blue-500",
    iconColor: "text-blue-600",
    textColor: "text-blue-700",
  },
  {
    value: "materia_prima",
    label: "Materia Prima",
    desc: "Insumos y materiales",
    icon: FiBox,
    active: "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500",
    iconColor: "text-emerald-600",
    textColor: "text-emerald-700",
  },
  {
    value: "costo_produccion",
    label: "Costo de Producción",
    desc: "Servicios y gastos",
    icon: FiTool,
    active: "border-amber-500 bg-amber-50 ring-1 ring-amber-500",
    iconColor: "text-amber-600",
    textColor: "text-amber-700",
  },
];

const EditarCategoria = () => {
  const idempotencyKey = useIdempotencyKey();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("articulo_fabricable");
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchCategoria = async () => {
      try {
        const res = await api.get(`/categorias/${id}`);
        setNombre(res.data.nombre);
        setTipo(res.data.tipo || "articulo_fabricable");
      } catch (error) {
        console.error("Error al obtener la categoría", error);
        toast.error("No se pudo cargar la categoría.");
        navigate("/categorias");
      }
    };
    fetchCategoria();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error("El nombre es obligatorio.");
    try {
      await api.put(
        `/categorias/${id}`,
        { nombre: nombre.trim(), tipo },
        { headers: { "X-Idempotency-Key": idempotencyKey } },
      );
      toast.success("Categoría actualizada correctamente");
      setTimeout(() => navigate("/categorias"), 500);
    } catch (error) {
      const msg =
        error.response?.data?.mensaje ||
        error.response?.data?.message ||
        error.message;
      toast.error(msg || "Error interno al actualizar la categoría");
    }
  };

  const handleCancelar = () => navigate("/categorias");

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition";
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
                Categorías
              </p>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                Editar categoría
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
              form="categoria-form"
              className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              Guardar cambios
            </button>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
          <form
            id="categoria-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-8"
          >
            <div>
              <label htmlFor="nombre" className={labelCls}>
                Nombre de la categoría <span className="text-red-400">*</span>
              </label>
              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                autoFocus
                className={inputCls}
                placeholder="Ej: Muebles de sala"
              />
            </div>

            <div>
              <p className={labelCls}>
                Tipo de categoría <span className="text-red-400">*</span>
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1">
                {TIPO_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = tipo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTipo(opt.value)}
                      className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition text-left ${
                        isActive
                          ? opt.active
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <Icon
                        size={22}
                        className={isActive ? opt.iconColor : "text-slate-400"}
                      />
                      <div>
                        <div
                          className={`text-sm font-semibold ${
                            isActive ? opt.textColor : "text-slate-700"
                          }`}
                        >
                          {opt.label}
                        </div>
                        <div className="text-xs text-slate-500">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditarCategoria;
