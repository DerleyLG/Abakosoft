import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiTrash2, FiPlus, FiSearch, FiTruck } from "react-icons/fi";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import { confirmAlert } from "react-confirm-alert";

const ListaProveedores = () => {
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarProveedores = async () => {
    setLoading(true);
    try {
      const res = await api.get("/proveedores");
      setProveedores(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando proveedores", error);
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleDelete = (id_proveedor) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Estás seguro de que deseas eliminar este proveedor?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/proveedores/${id_proveedor}`);
              toast.success("Proveedor eliminado correctamente");
              setProveedores((prev) =>
                prev.filter((p) => p.id_proveedor !== id_proveedor),
              );
            } catch (error) {
              const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;
              toast.error(msg || "No se pudo eliminar el proveedor");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const handleRowDoubleClick = (id) => navigate(`/proveedores/editar/${id}`);
  const handleCrearClick = () => navigate("/proveedores/nuevo");

  const proveedoresFiltrados = proveedores.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Catálogo de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Proveedores
            </h1>
          </div>
          {proveedores.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {proveedores.length}
            </span>
          )}
        </div>
        <button
          onClick={handleCrearClick}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <FiPlus size={16} />
          Crear proveedor
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
          placeholder="Buscar por nombre…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
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
                  Identificación
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Ciudad
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Departamento
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Dirección
                </th>
                <th className="px-4 py-3 w-16">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : proveedoresFiltrados.length > 0 ? (
                proveedoresFiltrados.map((prov) => (
                  <tr
                    key={prov.id_proveedor}
                    onDoubleClick={() =>
                      handleRowDoubleClick(prov.id_proveedor)
                    }
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {prov.nombre}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {prov.identificacion
                        ? Number(prov.identificacion).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {prov.telefono || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {prov.ciudad || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {prov.departamento || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                      {prov.direccion || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(prov.id_proveedor);
                        }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Eliminar proveedor"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiTruck size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron proveedores
                      </p>
                      {busqueda && (
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

export default ListaProveedores;
