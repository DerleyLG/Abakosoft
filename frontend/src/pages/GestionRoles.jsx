import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import { useIdempotencyKey } from "../hooks/useIdempotencyKey";
import { generateUUID } from "../utils/uuid";
import {
  FiPlus,
  FiTrash2,
  FiEdit,
  FiArrowLeft,
  FiSave,
  FiShield,
  FiSearch,
  FiCheck,
  FiLock,
  FiUsers,
  FiChevronDown,
  FiChevronRight,
  FiBox,
  FiTag,
  FiUserCheck,
  FiUser,
  FiClipboard,
  FiShoppingCart,
  FiFileText,
  FiSettings,
  FiBarChart2,
  FiCreditCard,
  FiDollarSign,
  FiCalendar,
  FiPackage,
  FiLayers,
  FiGrid,
  FiPieChart,
  FiLock as FiLockIcon,
} from "react-icons/fi";
import {
  Users,
  Warehouse,
  ClipboardList,
  Boxes,
  Package as LucidePackage,
  ShoppingCart,
  FileText,
  Settings as LucideSettings,
  BarChart2,
  CreditCard,
  DollarSign,
  Calendar,
  Tag,
  Shield,
  UserCheck,
  User as LucideUser,
  Layers,
  Grid,
  PieChart,
  Lock as LucideLock,
  Wrench,
  Ruler,
  TrendingDown,
  Banknote,
  CheckCircle2,
} from "lucide-react";
import {
  PERMISSION_GROUPS,
  ACTION_LABELS,
  PERMISSION_DEPENDENCIES,
  resolvePermissionDependencies,
} from "../utils/permissions";
import { usePlan } from "../hooks/usePlanApi";
import { PERMISSION_TO_FEATURE } from "../constants/planFeatures";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

// Iconos por grupo de permisos (lucide/react-icons)
const GROUP_ICONS = {
  Artículos: <Boxes size={20} className="text-slate-500" />,
  Categorías: <Tag size={20} className="text-slate-500" />,
  Proveedores: <UserCheck size={20} className="text-slate-500" />,
  Clientes: <Users size={20} className="text-slate-500" />,
  Trabajadores: <LucideUser size={20} className="text-slate-500" />,
  Inventario: <Warehouse size={20} className="text-slate-500" />,
  "Órdenes de Venta": <ShoppingCart size={20} className="text-slate-500" />,
  "Órdenes de Pedido": <ClipboardList size={20} className="text-slate-500" />,
  Fabricación: <LucidePackage size={20} className="text-slate-500" />,
  "Avances de Fabricación": <BarChart2 size={20} className="text-slate-500" />,
  "Kanban / Producción": <Grid size={20} className="text-slate-500" />,
  Compras: <FiShoppingCart size={20} className="text-slate-500" />,
  Pagos: <DollarSign size={20} className="text-slate-500" />,
  "Ventas a Crédito": <CreditCard size={20} className="text-slate-500" />,
  "Costos Indirectos": <TrendingDown size={20} className="text-slate-500" />,
  Tesorería: <Banknote size={20} className="text-slate-500" />,
  "Cierres de Caja": <LucideLock size={20} className="text-slate-500" />,
  "Etapas de Producción": (
    <LucideSettings size={20} className="text-slate-500" />
  ),
  "Historial de Costos": <FileText size={20} className="text-slate-500" />,
  "Métodos de Pago": <FiDollarSign size={20} className="text-slate-500" />,
  "Servicios Tercerizados": <Wrench size={20} className="text-slate-500" />,
  "Unidades de Medida": <Ruler size={20} className="text-slate-500" />,
  Reportes: <PieChart size={20} className="text-slate-500" />,
  "Gestión de Usuarios": <Shield size={20} className="text-slate-500" />,
};

// PermisosCheckboxes y FormLayout definidos FUERA de GestionRoles para evitar
// re-montaje en cada render (causaba pérdida de foco y colapso de grupos expandidos).
const PermisosCheckboxes = ({ permisos, onChange, isReadOnly = false }) => {
  const [busqueda, setBusqueda] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});

  // Acciones bloqueadas por plan — Set para O(1) lookup, estable mientras el plan no cambie
  const { features } = usePlan();
  const lockedActions = useMemo(() => {
    const locked = new Set();
    for (const [accion, feature] of Object.entries(PERMISSION_TO_FEATURE)) {
      if (!features.includes(feature)) locked.add(accion);
    }
    return locked;
  }, [features]);

  const totalPermisos = Object.values(PERMISSION_GROUPS).flat().length;
  const permisosActivos = permisos.length;

  const toggleGroup = (grupo) => {
    setExpandedGroups((prev) => ({ ...prev, [grupo]: !prev[grupo] }));
  };

  const expandAll = () => {
    const all = {};
    Object.keys(PERMISSION_GROUPS).forEach((g) => (all[g] = true));
    setExpandedGroups(all);
  };

  const collapseAll = () => setExpandedGroups({});

  const gruposFiltrados = useMemo(() => {
    if (!busqueda.trim()) return Object.entries(PERMISSION_GROUPS);
    const term = busqueda.toLowerCase();
    return Object.entries(PERMISSION_GROUPS)
      .map(([grupo, acciones]) => {
        if (grupo.toLowerCase().includes(term)) return [grupo, acciones];
        const filtered = acciones.filter((a) =>
          (ACTION_LABELS[a] || a).toLowerCase().includes(term),
        );
        return filtered.length > 0 ? [grupo, filtered] : null;
      })
      .filter(Boolean);
  }, [busqueda]);

  // Auto-expandir grupos cuando hay búsqueda
  useEffect(() => {
    if (busqueda.trim()) {
      const exp = {};
      gruposFiltrados.forEach(([g]) => (exp[g] = true));
      setExpandedGroups(exp);
    }
  }, [busqueda, gruposFiltrados]);

  const selectAll = () => {
    if (isReadOnly) return;
    const todas = Object.values(PERMISSION_GROUPS)
      .flat()
      .filter((a) => !lockedActions.has(a));
    onChange(resolvePermissionDependencies(todas));
  };

  const deselectAll = () => {
    if (!isReadOnly) onChange([]);
  };

  return (
    <div className="mt-5">
      {/* Barra de resumen y controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <FiShield size={14} className="text-slate-500" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {permisosActivos}
              </span>
              <span className="text-slate-400 mx-1">/</span>
              <span>{totalPermisos}</span>
            </span>
          </div>
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition cursor-pointer"
              >
                Todos
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition cursor-pointer"
              >
                Ninguno
              </button>
            </>
          )}
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={expandAll}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition cursor-pointer"
          >
            Expandir
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 transition cursor-pointer"
          >
            Colapsar
          </button>
        </div>
        <div className="relative w-full sm:w-64">
          <FiSearch
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Buscar permiso…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
          />
        </div>
      </div>

      {/* Acordeones de grupos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {gruposFiltrados.map(([grupo, acciones]) => {
          const allActions = PERMISSION_GROUPS[grupo];
          const todasActivas = allActions.every((a) => permisos.includes(a));
          const algunaActiva = allActions.some((a) => permisos.includes(a));
          const activas = allActions.filter((a) => permisos.includes(a)).length;
          const isExpanded = expandedGroups[grupo];
          const icon = GROUP_ICONS[grupo] || (
            <FiBox size={20} className="text-slate-400" />
          );

          // Cuántas acciones del grupo están bloqueadas por plan
          const grupoLockedCount = allActions.filter((a) =>
            lockedActions.has(a),
          ).length;
          const grupoAllLocked = grupoLockedCount === allActions.length;

          return (
            <div
              key={grupo}
              className={`rounded-xl border transition-all duration-200 ${
                grupoAllLocked
                  ? "border-violet-100 bg-violet-50/30"
                  : algunaActiva
                    ? "border-slate-300 bg-white shadow-sm"
                    : "border-slate-200 bg-slate-50/50"
              }`}
            >
              {/* Cabecera del grupo */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                onClick={() => toggleGroup(grupo)}
              >
                <span
                  className={`flex items-center justify-center w-8 h-8 rounded-lg border-2 mr-1 ${grupoAllLocked ? "bg-violet-50 border-violet-200" : "bg-slate-100 border-slate-200"}`}
                >
                  {icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`font-semibold text-sm truncate ${grupoAllLocked ? "text-slate-500" : "text-slate-800"}`}
                    >
                      {grupo}
                    </span>
                    {grupoAllLocked ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5 leading-none">
                        <FiLock size={9} /> Pro
                      </span>
                    ) : todasActivas ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-300 rounded-full px-2 py-0.5 leading-none">
                        <FiCheck size={10} className="font-bold" /> Todas
                      </span>
                    ) : null}
                  </div>
                  {/* Mini barra de progreso */}
                  <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        grupoAllLocked
                          ? "bg-violet-200"
                          : "bg-gradient-to-r from-slate-400 to-slate-600"
                      }`}
                      style={{
                        width: grupoAllLocked
                          ? "100%"
                          : `${(activas / allActions.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <span
                  className={`text-[11px] font-semibold tabular-nums whitespace-nowrap ${grupoAllLocked ? "text-violet-400" : "text-slate-400"}`}
                >
                  {grupoAllLocked ? "—" : `${activas}/${allActions.length}`}
                </span>
                {/* Toggle grupo */}
                <label
                  className={`relative inline-flex items-center ${grupoAllLocked || isReadOnly ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    disabled={grupoAllLocked || isReadOnly}
                    checked={todasActivas}
                    ref={(el) => {
                      if (el) el.indeterminate = algunaActiva && !todasActivas;
                    }}
                    onChange={() => {
                      if (grupoAllLocked) return;
                      if (todasActivas) {
                        onChange(
                          permisos.filter((p) => !allActions.includes(p)),
                        );
                      } else {
                        const nuevas = allActions.filter(
                          (a) => !permisos.includes(a) && !lockedActions.has(a),
                        );
                        onChange(
                          resolvePermissionDependencies([
                            ...permisos,
                            ...nuevas,
                          ]),
                        );
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-checked:bg-slate-700 rounded-full transition-colors duration-200 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-4 after:shadow-sm" />
                </label>
                <span className="text-slate-400 transition-transform duration-200">
                  {isExpanded ? (
                    <FiChevronDown size={18} />
                  ) : (
                    <FiChevronRight size={18} />
                  )}
                </span>
              </div>

              {/* Contenido expandido */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-slate-100">
                  <div className="pt-2 space-y-0.5">
                    {acciones.map((accion) => {
                      const isLocked = lockedActions.has(accion);
                      const esDependenciaRequerida =
                        !isLocked &&
                        permisos.some(
                          (p) =>
                            PERMISSION_DEPENDENCIES[p]?.includes(accion) &&
                            p !== accion,
                        );
                      const isChecked = permisos.includes(accion);
                      const isDisabled =
                        isLocked || esDependenciaRequerida || isReadOnly;

                      return (
                        <label
                          key={accion}
                          className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors duration-150 select-none ${
                            isLocked
                              ? "opacity-50 cursor-not-allowed"
                              : esDependenciaRequerida
                                ? "opacity-60 cursor-default"
                                : isChecked
                                  ? "bg-slate-100/70 cursor-pointer"
                                  : "hover:bg-slate-100/50 cursor-pointer"
                          }`}
                          title={
                            isLocked
                              ? "Requiere plan Pro"
                              : esDependenciaRequerida
                                ? "Requerido por otro permiso activo"
                                : ""
                          }
                        >
                          {/* Custom checkbox / lock icon */}
                          <div
                            className={`flex items-center justify-center w-4 h-4 rounded border transition-all duration-150 ${
                              isLocked
                                ? "border-violet-200 bg-violet-50"
                                : isChecked
                                  ? esDependenciaRequerida
                                    ? "bg-slate-400 border-slate-400"
                                    : "bg-slate-700 border-slate-700"
                                  : "border-slate-300 group-hover:border-slate-400"
                            }`}
                          >
                            {isLocked ? (
                              <FiLock size={8} className="text-violet-400" />
                            ) : isChecked ? (
                              <FiCheck
                                size={10}
                                className="text-white"
                                strokeWidth={3}
                              />
                            ) : null}
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={() => {
                              if (isDisabled) return;
                              if (isChecked) {
                                onChange(permisos.filter((p) => p !== accion));
                              } else {
                                onChange(
                                  resolvePermissionDependencies([
                                    ...permisos,
                                    accion,
                                  ]),
                                );
                              }
                            }}
                            className="sr-only"
                          />
                          <span
                            className={`text-sm flex-1 ${isLocked ? "text-slate-400" : "text-slate-700"}`}
                          >
                            {ACTION_LABELS[accion] || accion}
                          </span>
                          {isLocked && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-1.5 py-0.5 leading-none">
                              <FiLock size={8} /> Pro
                            </span>
                          )}
                          {!isLocked && esDependenciaRequerida && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">
                              <FiLock size={8} /> Requerido
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {gruposFiltrados.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm">
          No se encontraron permisos que coincidan con "{busqueda}"
        </div>
      )}
    </div>
  );
};

const FormLayout = ({ title, onBack, onSave, saveLabel, children }) => (
  <div className="w-full px-4 md:px-8 lg:px-12 py-8 animate-fade-in">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-slate-400 transition cursor-pointer"
          aria-label="Volver"
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configura nombre y permisos de acceso
          </p>
        </div>
      </div>
      {onSave && (
        <button
          onClick={onSave}
          className="cursor-pointer inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-sm focus:ring-2 focus:ring-slate-400 transition active:scale-[0.97]"
        >
          <FiSave size={16} /> {saveLabel}
        </button>
      )}
    </div>
    {children}
  </div>
);

const GestionRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingRol, setEditingRol] = useState(null);
  const [creando, setCreando] = useState(false);
  const [crearRolKey, setCrearRolKey] = useState(null);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevosPermisos, setNuevosPermisos] = useState([]);
  const inputNombreRef = React.useRef(null);
  const navigate = useNavigate();

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await api.get("/roles");
      setRoles(res.data);
    } catch (error) {
      console.error("Error cargando roles", error);
      toast.error("Error al cargar los roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleEditar = async (rol) => {
    try {
      const res = await api.get(`/roles/${rol.id_rol}`);
      setEditingRol(res.data);
      setCreando(false);
    } catch (error) {
      toast.error("Error al cargar permisos del rol.");
    }
  };

  const handleGuardarEdicion = async () => {
    try {
      await api.put(`/roles/${editingRol.id_rol}`, {
        nombre_rol: editingRol.nombre_rol,
        permisos: editingRol.permisos,
      });
      toast.success("Rol actualizado correctamente.");
      setEditingRol(null);
      fetchRoles();
    } catch (error) {
      const msg = error.response?.data?.error || "Error al actualizar el rol.";
      toast.error(msg);
    }
  };

  const handleCrear = async () => {
    if (!nuevoNombre.trim()) {
      toast.error("El nombre del rol es requerido.");
      if (inputNombreRef.current) inputNombreRef.current.focus();
      return;
    }
    try {
      await api.post(
        "/roles",
        {
          nombre_rol: nuevoNombre,
          permisos: nuevosPermisos,
        },
        { headers: { "X-Idempotency-Key": crearRolKey } },
      );
      toast.success("Rol creado correctamente.");
      setCreando(false);
      setNuevoNombre("");
      setNuevosPermisos([]);
      fetchRoles();
    } catch (error) {
      const msg = error.response?.data?.error || "Error al crear el rol.";
      toast.error(msg);
      if (inputNombreRef.current) inputNombreRef.current.focus();
    }
  };

  const handleEliminar = (rol) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: `¿Estás seguro de que quieres eliminar el rol "${rol.nombre_rol}"?`,
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              await api.delete(`/roles/${rol.id_rol}`);
              toast.success("Rol eliminado correctamente.");
              fetchRoles();
            } catch (error) {
              const msg =
                error.response?.data?.error || "Error al eliminar el rol.";
              toast.error(msg);
            }
          },
        },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  // Vista de edición de rol
  if (editingRol) {
    const isAdmin = editingRol.nombre_rol === "admin";
    return (
      <FormLayout
        title={`${isAdmin ? "Ver rol" : "Editar rol"} — ${editingRol.nombre_rol}`}
        onBack={() => setEditingRol(null)}
        onSave={isAdmin ? null : handleGuardarEdicion}
        saveLabel="Guardar cambios"
      >
        {isAdmin && (
          <div className="mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            <FiLock size={15} className="shrink-0 text-amber-600" />
            <span>
              El rol <strong>Administrador</strong> siempre tiene acceso
              completo al sistema. Sus permisos no pueden modificarse.
            </span>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Nombre del rol
            </label>
            <input
              type="text"
              value={editingRol.nombre_rol}
              disabled={isAdmin}
              onChange={(e) =>
                setEditingRol({ ...editingRol, nombre_rol: e.target.value })
              }
              className={`w-full max-w-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition ${isAdmin ? "bg-slate-50 text-slate-500 cursor-not-allowed" : ""}`}
            />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Permisos de acceso
            </h2>
            <PermisosCheckboxes
              permisos={editingRol.permisos}
              onChange={(nuevos) =>
                setEditingRol({ ...editingRol, permisos: nuevos })
              }
              isReadOnly={isAdmin}
            />
          </div>
        </div>
      </FormLayout>
    );
  }

  // Vista de creación de rol
  if (creando) {
    return (
      <FormLayout
        title="Nuevo rol"
        onBack={() => {
          setCreando(false);
          setNuevoNombre("");
          setNuevosPermisos([]);
        }}
        onSave={handleCrear}
        saveLabel="Crear rol"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="mb-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
              Nombre del rol
            </label>
            <input
              type="text"
              ref={inputNombreRef}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: vendedor, supervisor, bodeguero…"
              className="w-full max-w-sm border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
              autoFocus
            />
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Permisos de acceso
            </h2>
            <PermisosCheckboxes
              permisos={nuevosPermisos}
              onChange={setNuevosPermisos}
            />
          </div>
        </div>
      </FormLayout>
    );
  }

  // Vista principal: lista de roles como cards
  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-8 animate-fade-in">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-10">
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="cursor-pointer flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:ring-2 focus:ring-slate-400 transition"
            aria-label="Volver"
          >
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-0.5">
              Gestión de roles
            </h1>
            <p className="text-slate-600">
              Administra y personaliza roles con permisos granulares del sistema
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setCreando(true);
            setCrearRolKey(generateUUID());
          }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
        >
          <FiPlus size={14} /> Nuevo rol
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 border-3 border-slate-200 border-t-slate-700 rounded-full animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Cargando roles…</p>
        </div>
      ) : roles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((rol) => {
            const isSystem = [1, 2, 3].includes(rol.id_rol);
            const roleColors = {
              1: {
                icon: "bg-red-500",
                badge: "bg-red-50 border-red-200 text-red-700",
              }, // admin
              2: {
                icon: "bg-blue-500",
                badge: "bg-blue-50 border-blue-200 text-blue-700",
              }, // supervisor
              3: {
                icon: "bg-amber-500",
                badge: "bg-amber-50 border-amber-200 text-amber-700",
              }, // operario
              default: {
                icon: "bg-slate-400",
                badge: "bg-slate-50 border-slate-200 text-slate-700",
              },
            };
            const colors = roleColors[rol.id_rol] || roleColors.default;

            return (
              <div
                key={rol.id_rol}
                className="group relative bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 cursor-default overflow-hidden"
              >
                {/* Fondo decorativo */}
                <div
                  className={`absolute top-0 right-0 w-32 h-32 ${colors.icon} opacity-5 rounded-full -mr-16 -mt-16 blur-xl`}
                />

                <div className="relative space-y-4">
                  {/* Encabezado */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className={`flex items-center justify-center w-12 h-12 rounded-xl ${colors.icon} shadow-sm`}
                      >
                        <FiShield size={20} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 capitalize text-base">
                          {rol.nombre_rol}
                        </h3>
                        {isSystem && (
                          <span
                            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border mt-1.5 ${colors.badge}`}
                          >
                            Sistema
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-300 font-mono bg-slate-50 px-2 py-1 rounded-lg">
                      ID: {rol.id_rol}
                    </span>
                  </div>

                  {/* Info rápida */}
                  {rol.permisos && rol.permisos.length > 0 && (
                    <div className="pt-2 pb-2">
                      <div className="text-xs text-slate-600 mb-2">
                        <span className="font-semibold text-slate-900">
                          {rol.permisos.length}
                        </span>{" "}
                        permisos activos
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${colors.icon} rounded-full transition-all duration-300`}
                          style={{
                            width: `${Math.min((rol.permisos.length / 30) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleEditar(rol)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 py-2.5 rounded-lg transition cursor-pointer"
                      title={
                        rol.nombre_rol === "admin"
                          ? "Los permisos del administrador no pueden modificarse"
                          : undefined
                      }
                    >
                      {rol.nombre_rol === "admin" ? (
                        <FiLock size={14} />
                      ) : (
                        <FiEdit size={14} />
                      )}
                      {rol.nombre_rol === "admin" ? "Ver" : "Editar"}
                    </button>
                    {!isSystem && (
                      <>
                        <div className="w-px h-6 bg-slate-200" />
                        <button
                          onClick={() => handleEliminar(rol)}
                          className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 px-3 rounded-lg transition cursor-pointer"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <FiUsers size={32} className="text-slate-400" />
          </div>
          <h3 className="text-slate-700 font-semibold text-lg mb-2">
            No hay roles creados
          </h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">
            Los roles te permiten gestionar permisos y acceso granular para
            diferentes grupos de usuarios
          </p>
          <button
            onClick={() => {
              setCreando(true);
              setCrearRolKey(generateUUID());
            }}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold transition cursor-pointer"
          >
            <FiPlus size={18} /> Crear primer rol
          </button>
        </div>
      )}
    </div>
  );
};

export default GestionRoles;
