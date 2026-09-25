import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { AuthContext } from "../context/AuthContext";
import { confirmAlert } from "react-confirm-alert";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiSearch,
  FiShield,
  FiUser,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiLock,
} from "react-icons/fi";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const ListaUsuarios = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const navigate = useNavigate();

  const fetchUsuarios = async () => {
    try {
      setLoading(true);
      const res = await api.get("/usuarios");
      setUsuarios(res.data);
    } catch (error) {
      console.error("Error cargando usuarios", error);
      toast.error("Error al cargar la lista de usuarios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsuarios();
    }
  }, [isAuthenticated]);

  const handleDelete = (id_usuario, nombre_usuario) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: `¿Estás seguro de que quieres eliminar al usuario ${nombre_usuario}?`,
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/usuarios/${id_usuario}`);
              toast.success("Usuario eliminado exitosamente.");
              fetchUsuarios();
            } catch (error) {
              console.error("Error eliminando usuario", error);
              const errorMessage =
                error.response?.data?.mensaje ||
                "Error al eliminar el usuario.";
              toast.error(errorMessage);
            }
          },
        },
        {
          label: "No",
          onClick: () => {},
        },
      ],
    });
  };

  const handleRowDoubleClick = (id) => {
    navigate(`/usuarios/editar/${id}`);
  };

  const handleCrearClick = () => {
    navigate("/usuarios/nuevo");
  };

  const filteredUsuarios = usuarios.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.nombre_usuario &&
        user.nombre_usuario.toLowerCase().includes(term)) ||
      (user.nombre_trabajador &&
        user.nombre_trabajador.toLowerCase().includes(term)) ||
      (user.nombre_rol && user.nombre_rol.toLowerCase().includes(term))
    );
  });

  const totalPages = Math.ceil(filteredUsuarios.length / pageSize) || 1;
  const startIndex = (page - 1) * pageSize;
  const usuariosPaginados = filteredUsuarios.slice(
    startIndex,
    startIndex + pageSize,
  );

  const ROLE_STYLES = {
    admin: {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
      label: "Administrador",
    },
    supervisor: {
      badge: "bg-teal-50 text-teal-700 border-teal-200",
      dot: "bg-teal-500",
      label: "Supervisor",
    },
    default: {
      badge: "bg-sky-50 text-sky-700 border-sky-200",
      dot: "bg-sky-500",
      label: "Operario",
    },
  };

  const getRoleStyle = (rol) => {
    const r = String(rol || "").toLowerCase();
    return ROLE_STYLES[r] || ROLE_STYLES.default;
  };

  const getInitials = (nombre) => {
    if (!nombre) return "?";
    return nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  };

  const puedeGestionar =
    (user && user.rol === "admin") ||
    (user && user.permisos && user.permisos.includes("users:manage"));

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-5">
      {/* ─── Encabezado ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center shadow-sm">
            <FiUsers size={22} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administración de
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight -mt-0.5">
              Gestión de usuarios
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/gestionRoles")}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <FiShield size={15} />
            Roles y permisos
          </button>
          {puedeGestionar && (
            <button
              onClick={handleCrearClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <FiPlus size={15} />
              Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* ─── Barra de búsqueda ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="relative max-w-md">
          <FiSearch
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar por usuario, trabajador o rol…"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition text-sm"
          />
        </div>
      </div>

      {/* ─── Tabla ─── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-3 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-500">Cargando usuarios…</p>
          </div>
        ) : usuariosPaginados.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuariosPaginados.map((u) => {
                    const roleStyle = getRoleStyle(u.nombre_rol);
                    return (
                      <tr
                        key={u.id_usuario}
                        onDoubleClick={() => handleRowDoubleClick(u.id_usuario)}
                        className="hover:bg-slate-50/70 transition-colors cursor-default"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                                roleStyle.dot === "bg-emerald-500"
                                  ? "bg-emerald-500"
                                  : roleStyle.dot === "bg-teal-500"
                                    ? "bg-teal-500"
                                    : "bg-sky-500"
                              }`}
                            >
                              {getInitials(u.nombre_usuario)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">
                                {u.nombre_usuario}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                #{u.id_usuario}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${roleStyle.badge}`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${roleStyle.dot}`}
                            />
                            {roleStyle.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                            <FiLock size={10} className="text-slate-400" />
                            {u.id_usuario}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/usuarios/editar/${u.id_usuario}`);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <FiEdit size={13} /> Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(u.id_usuario, u.nombre_usuario);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <FiTrash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ─── Paginación ─── */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                Mostrando{" "}
                <span className="font-semibold text-slate-700">
                  {startIndex + 1}–
                  {Math.min(startIndex + pageSize, filteredUsuarios.length)}
                </span>{" "}
                de{" "}
                <span className="font-semibold text-slate-700">
                  {filteredUsuarios.length}
                </span>{" "}
                usuarios
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <FiChevronLeft size={13} /> Anterior
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Siguiente <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FiUsers size={30} className="text-slate-400" />
            </div>
            <h3 className="text-slate-700 font-semibold text-lg mb-2">
              {searchTerm ? "No se encontraron usuarios" : "No hay usuarios"}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              {searchTerm
                ? "Intenta con otros términos de búsqueda"
                : "Comienza creando tu primer usuario"}
            </p>
            {puedeGestionar && (
              <button
                onClick={handleCrearClick}
                className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                <FiPlus size={16} /> Crear usuario
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaUsuarios;
