import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import { FiTrash2, FiPlus, FiSearch, FiUsers } from "react-icons/fi";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const ListaTrabajadores = () => {
  const [trabajadores, setTrabajadores] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTrabajadores = async () => {
      setLoading(true);
      try {
        const res = await api.get("/trabajadores");
        setTrabajadores(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando trabajadores", error);
        toast.error("Error al cargar trabajadores");
      } finally {
        setLoading(false);
      }
    };
    fetchTrabajadores();
  }, []);

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar este trabajador?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/trabajadores/${id}`);
              toast.success("Trabajador eliminado");
              setTrabajadores((prev) =>
                prev.filter((t) => t.id_trabajador !== id),
              );
            } catch (error) {
              const msg =
                error.response?.data?.mensaje ||
                error.response?.data?.message ||
                error.message;
              toast.error(msg || "Error interno al eliminar el trabajador");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const handleRowDoubleClick = (id) => navigate(`/trabajadores/editar/${id}`);
  const handleCrearClick = () => navigate("/trabajadores/nuevo");

  const filteredTrabajadores = trabajadores.filter((trab) => {
    const term = searchTerm.toLowerCase();
    return (
      trab.nombre.toLowerCase().includes(term) ||
      (trab.cargo && trab.cargo.toLowerCase().includes(term))
    );
  });

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Trabajadores
          </h1>
          {trabajadores.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {trabajadores.length}
            </span>
          )}
        </div>
        <button
          onClick={handleCrearClick}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <FiPlus size={16} />
          Crear trabajador
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative max-w-sm">
        <FiSearch
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar por nombre o cargo…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent placeholder:text-slate-400 transition"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Cargo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Estado
                </th>
                <th className="px-4 py-3 w-16">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredTrabajadores.length > 0 ? (
                filteredTrabajadores.map((trab) => (
                  <tr
                    key={trab.id_trabajador}
                    onDoubleClick={() =>
                      handleRowDoubleClick(trab.id_trabajador)
                    }
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {trab.nombre}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {trab.telefono || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {trab.cargo || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {Number(trab.activo) === 1 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(trab.id_trabajador);
                        }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Eliminar trabajador"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiUsers size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron trabajadores
                      </p>
                      {searchTerm && (
                        <p className="text-xs">
                          Intenta con otro término de búsqueda
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ListaTrabajadores;
