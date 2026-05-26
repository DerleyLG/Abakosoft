import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { FiTrash2, FiPlus, FiSearch, FiUsers } from "react-icons/fi";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const ListaClientes = () => {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarClientes = async () => {
    setLoading(true);
    try {
      const res = await api.get("/clientes");
      setClientes(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error cargando clientes", error);
      toast.error("Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  const handleDelete = (id_cliente) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Deseas eliminar este cliente?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/clientes/${id_cliente}`);
              toast.success("Cliente eliminado correctamente");
              setClientes((prev) =>
                prev.filter((c) => c.id_cliente !== id_cliente),
              );
            } catch (error) {
              const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message;
              toast.error(msg || "No se pudo eliminar el cliente");
            }
          },
        },
        { label: "No" },
      ],
    });
  };

  const handleRowDoubleClick = (id) => navigate(`/clientes/editar/${id}`);
  const handleCrearClick = () => navigate("/clientes/nuevo");

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Clientes
          </h1>
          {clientes.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {clientes.length}
            </span>
          )}
        </div>
        <button
          onClick={handleCrearClick}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <FiPlus size={16} />
          Crear cliente
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
                <th className="px-4 py-3 w-16">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((cli) => (
                  <tr
                    key={cli.id_cliente}
                    onDoubleClick={() => handleRowDoubleClick(cli.id_cliente)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors select-none group"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {cli.nombre}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {cli.identificacion
                        ? Number(cli.identificacion).toLocaleString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cli.telefono || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cli.ciudad || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {cli.departamento || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(cli.id_cliente);
                        }}
                        className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                        title="Eliminar cliente"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <FiUsers size={32} className="opacity-40" />
                      <p className="text-sm font-medium">
                        No se encontraron clientes
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

export default ListaClientes;
