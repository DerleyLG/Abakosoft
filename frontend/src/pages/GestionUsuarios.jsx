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
  FiArrowRight,
  FiAlertCircle,
  FiCheck,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const ListaUsuarios = () => {
  const { isAuthenticated, user } = useContext(AuthContext);
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
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

  // Este es el único useEffect que necesitas.
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsuarios();
    }
  }, [isAuthenticated]);

  // Función para manejar la eliminación de un usuario
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
              fetchUsuarios(); // Recargar la lista
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

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-8">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            Gestión de usuarios
          </h1>
          <p className="text-slate-600">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate("/gestionRoles")}
            className="cursor-pointer inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-200 transition active:scale-95"
          >
            <FiShield size={18} /> Gestionar roles
          </button>
          {/* Mostrar siempre para admin */}
          {((user && user.rol === "admin") ||
            (user &&
              user.permisos &&
              user.permisos.includes("users:manage"))) && (
            <button
              onClick={handleCrearClick}
              className="cursor-pointer inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transition active:scale-95"
            >
              <FiPlus size={18} /> Nuevo usuario
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-8">
        <div className="relative max-w-md">
          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por usuario, trabajador o rol…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition text-sm"
          />
        </div>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin mb-3" />
          <p className="text-slate-500">Cargando usuarios…</p>
        </div>
      ) : filteredUsuarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsuarios.map((user) => {
            const ROLE_COLORS = {
              admin: {
                badge: "bg-red-100 text-red-700 border-red-200",
                icon: "bg-red-600 text-white",
              },
              supervisor: {
                badge: "bg-blue-100 text-blue-700 border-blue-200",
                icon: "bg-blue-600 text-white",
              },
              default: {
                badge: "bg-amber-100 text-amber-700 border-amber-200",
                icon: "bg-slate-400 text-white",
              },
            };
            const colors = ROLE_COLORS[user.nombre_rol] || ROLE_COLORS.default;

            return (
              <div
                key={user.id_usuario}
                className={
                  `group relative rounded-2xl border border-slate-200 bg-white shadow transition-all duration-300 cursor-pointer overflow-hidden ` +
                  `hover:shadow-xl hover:scale-[1.025]`
                }
              >
                {/* Fondo decorativo */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-100 opacity-10 rounded-full -mr-10 -mt-10 pointer-events-none" />

                <div className="relative p-6">
                  {/* Encabezado */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`flex items-center justify-center w-11 h-11 rounded-xl shadow ${colors.icon}`}
                      >
                        <FiUser
                          size={22}
                          className={colors.icon.split(" ")[1]}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 text-base truncate">
                          {user.nombre_usuario}
                        </h3>
                        {user.nombre_trabajador && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {user.nombre_trabajador}
                          </p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${colors.badge}`}
                    >
                      <FiCheck size={12} className="mr-1" />
                      {user.nombre_rol}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-xs text-slate-600">
                      <p className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">ID:</span>
                        <span className="font-semibold text-slate-900">
                          #{user.id_usuario}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/usuarios/editar/${user.id_usuario}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-lg text-slate-700 bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <FiEdit size={14} /> Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(user.id_usuario, user.nombre_usuario);
                      }}
                      className="flex items-center justify-center text-xs font-semibold py-2 px-3 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-100 transition cursor-pointer"
                      title="Eliminar"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FiUsers size={32} className="text-slate-400" />
          </div>
          <h3 className="text-slate-600 font-semibold text-lg mb-2">
            {searchTerm ? "No se encontraron usuarios" : "No hay usuarios"}
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            {searchTerm
              ? "Intenta con otros términos de búsqueda"
              : "Comienza creando tu primer usuario"}
          </p>
          <button
            onClick={handleCrearClick}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold transition cursor-pointer"
          >
            <FiPlus size={18} /> Crear usuario
          </button>
        </div>
      )}
    </div>
  );
};

export default ListaUsuarios;
