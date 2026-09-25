import React, { useState, useRef, useEffect } from "react";
import {
  Boxes,
  ClipboardList,
  Package,
  Users,
  Warehouse,
  FileText,
  Settings,
  LayoutDashboard,
  ShoppingCart,
  RotateCcw,
  Wrench,
  FilePlus2,
  Factory,
  Kanban,
  TrendingUp,
  Truck,
  ChevronDown,
  ChevronRight,
  LogOut,
} from "lucide-react";
import {
  FiDollarSign,
  FiCreditCard,
  FiCalendar,
  FiCheckCircle,
} from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";
import { usePlan } from "../hooks/usePlanApi";

// Clases reutilizables para cada NavLink
const navLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
    isActive
      ? "bg-slate-700 text-white"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`;

const subLinkClass = ({ isActive }) =>
  `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
    isActive
      ? "bg-slate-700 text-white font-medium"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
  }`;

const MiniLabel = ({ children }) => (
  <p className="px-3 pt-3 pb-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600 select-none">
    {children}
  </p>
);

// Etiqueta de sección
const SectionLabel = ({ children }) => (
  <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
    {children}
  </p>
);

const Sidebar = ({ isOpen }) => {
  const [ordenesOpen, setOrdenesOpen] = useState(false);
  const navRef = useRef(null);
  const { user, logout } = useAuth();
  const { features } = usePlan();
  const navigate = useNavigate();

  // Scroll suave al desplegar Órdenes
  useEffect(() => {
    if (ordenesOpen && navRef.current) {
      // Pequeña pausa para que el DOM se expanda, luego scroll suave al fondo
      const timer = setTimeout(() => {
        navRef.current.scrollTo({
          top: navRef.current.scrollHeight,
          behavior: "smooth",
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [ordenesOpen]);

  const hasAnyPermission = (...actions) => actions.some((a) => can(user, a));

  const showOrdenes = hasAnyPermission(
    ACTIONS.SALES_VIEW,
    ACTIONS.ORDERS_VIEW,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.KANBAN_VIEW,
    ACTIONS.PROGRESS_VIEW,
    ACTIONS.RETURNS_VIEW,
    ACTIONS.REPAIRS_VIEW,
  );

  const showCatalogo = hasAnyPermission(
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.WORKERS_VIEW,
  );

  const showOperaciones = hasAnyPermission(
    ACTIONS.PAYMENTS_VIEW,
    ACTIONS.PAYMENTS_CREATE,
    ACTIONS.ANTICIPOS_VIEW,
    ACTIONS.INVENTORY_VIEW,
  );

  const showFinanzas = hasAnyPermission(
    ACTIONS.INDIRECT_COSTS_VIEW,
    ACTIONS.TREASURY_VIEW,
    ACTIONS.CASH_CLOSINGS_VIEW,
  );

  const showSistema = hasAnyPermission(
    ACTIONS.REPORTS_VIEW,
    ACTIONS.USERS_MANAGE,
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = user?.nombre_usuario?.charAt(0)?.toUpperCase() || "U";

  return (
    <aside
      className="bg-slate-900 text-white h-screen w-64 fixed top-0 left-0 z-50 shadow-xl flex flex-col transition-transform duration-300 ease-in-out"
      style={{ transform: isOpen ? "translateX(0)" : "translateX(-100%)" }}
    >
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-800 shrink-0">
        <span className="text-base font-bold tracking-[0.2em] text-white select-none justify-center flex">
          PANEL
        </span>
      </div>

      {/* Navegación scrollable */}
      <nav
        ref={navRef}
        className="flex-1 overflow-y-auto px-2 pb-4 sidebar-scroll"
      >
        {/* ── Principal ───────────────────────────── */}
        <SectionLabel>Principal</SectionLabel>
        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard size={17} /> Dashboard
        </NavLink>

        {/* ── Catálogo ────────────────────────────── */}
        {showCatalogo && features.includes("inventario") && (
          <>
            <SectionLabel>Catálogo</SectionLabel>
            {can(user, ACTIONS.ARTICLES_VIEW) && (
              <NavLink to="/articulos" className={navLinkClass}>
                <Package size={17} /> Artículos
              </NavLink>
            )}
            {can(user, ACTIONS.CATEGORIES_VIEW) && (
              <NavLink to="/categorias" className={navLinkClass}>
                <Boxes size={17} /> Categorías
              </NavLink>
            )}
            {can(user, ACTIONS.SUPPLIERS_VIEW) && (
              <NavLink to="/proveedores" className={navLinkClass}>
                <Users size={17} /> Proveedores
              </NavLink>
            )}
            {can(user, ACTIONS.CLIENTS_VIEW) && (
              <NavLink to="/clientes" className={navLinkClass}>
                <Users size={17} /> Clientes
              </NavLink>
            )}
            {can(user, ACTIONS.WORKERS_VIEW) &&
              features.includes("trabajadores") && (
                <NavLink to="/trabajadores" end className={navLinkClass}>
                  <Settings size={17} /> Trabajadores
                </NavLink>
              )}
          </>
        )}

        {/* ── Operaciones ─────────────────────────── */}
        {showOperaciones &&
          (features.includes("trabajadores") ||
            features.includes("inventario") ||
            features.includes("anticipos")) && (
            <>
              <SectionLabel>Operaciones</SectionLabel>
              {(can(user, ACTIONS.PAYMENTS_VIEW) ||
                can(user, ACTIONS.PAYMENTS_CREATE)) &&
                features.includes("pagos") && (
                  <NavLink to="/trabajadores/pagos" className={navLinkClass}>
                    <FiCreditCard size={17} /> Pagos
                  </NavLink>
                )}
              {can(user, ACTIONS.ANTICIPOS_VIEW) &&
                features.includes("anticipos") && (
                  <NavLink to="/pagos_anticipados" className={navLinkClass}>
                    <FiDollarSign size={17} /> Anticipos
                  </NavLink>
                )}
              {can(user, ACTIONS.INVENTORY_VIEW) &&
                features.includes("inventario") && (
                  <NavLink to="/inventario" className={navLinkClass}>
                    <Warehouse size={17} /> Inventario
                  </NavLink>
                )}
            </>
          )}

        {/* ── Órdenes (colapsable con grupos) ────── */}
        {showOrdenes &&
          (features.includes("ventas") ||
            features.includes("devoluciones") ||
            features.includes("compras") ||
            features.includes("fabricacion") ||
            features.includes("kanban") ||
            features.includes("progreso") ||
            features.includes("ordenes_pedido") ||
            features.includes("pedidos") ||
            can(user, ACTIONS.REPAIRS_VIEW)) && (
            <>
              <SectionLabel>Órdenes</SectionLabel>
              <button
                onClick={() => setOrdenesOpen(!ordenesOpen)}
                className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList size={17} />
                  Órdenes
                </div>
                {ordenesOpen ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {/* Animación suave con grid-template-rows: se ajusta a la altura
                  real del contenido (el max-h fijo se ve brusco) */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  ordenesOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="ml-3 border-l border-slate-700 pl-3 pb-1 space-y-0.5">
                    {/* ── Ventas ── */}
                    {(can(user, ACTIONS.SALES_VIEW) ||
                      can(user, ACTIONS.RETURNS_VIEW) ||
                      can(user, ACTIONS.REPAIRS_VIEW) ||
                      can(user, ACTIONS.ORDERS_VIEW)) && (
                      <>
                        <MiniLabel>Comercial</MiniLabel>
                        {can(user, ACTIONS.SALES_VIEW) &&
                          features.includes("ventas") && (
                            <NavLink
                              to="/ordenes_venta"
                              className={subLinkClass}
                            >
                              <ShoppingCart size={14} /> Ventas
                            </NavLink>
                          )}
                        {can(user, ACTIONS.RETURNS_VIEW) &&
                          features.includes("devoluciones") && (
                            <NavLink
                              to="/devoluciones"
                              className={subLinkClass}
                            >
                              <RotateCcw size={14} /> Devoluciones
                            </NavLink>
                          )}
                        {can(user, ACTIONS.REPAIRS_VIEW) && (
                          <NavLink to="/reparaciones" className={subLinkClass}>
                            <Wrench size={14} /> Reparaciones
                          </NavLink>
                        )}
                        {can(user, ACTIONS.ORDERS_VIEW) &&
                          (features.includes("ordenes_pedido") ||
                            features.includes("pedidos")) && (
                            <NavLink
                              to="/ordenes_pedido"
                              className={subLinkClass}
                            >
                              <FilePlus2 size={14} /> Pedidos
                            </NavLink>
                          )}
                      </>
                    )}

                    {/* ── Compras ── */}
                    {can(user, ACTIONS.PURCHASES_VIEW) &&
                      features.includes("compras") && (
                        <>
                          <MiniLabel>Abastecimiento</MiniLabel>
                          <NavLink
                            to="/ordenes_compra"
                            className={subLinkClass}
                          >
                            <Truck size={14} /> Compras
                          </NavLink>
                        </>
                      )}

                    {/* ── Producción ── */}
                    {can(user, ACTIONS.FABRICATION_VIEW) &&
                      features.includes("fabricacion") && (
                        <>
                          <MiniLabel>Producción</MiniLabel>
                          {can(user, ACTIONS.FABRICATION_VIEW) && (
                            <NavLink
                              to="/ordenes_fabricacion"
                              className={subLinkClass}
                            >
                              <Factory size={14} /> Fabricación
                            </NavLink>
                          )}
                          {can(user, ACTIONS.KANBAN_VIEW) &&
                            features.includes("kanban") && (
                              <NavLink to="/kanban" className={subLinkClass}>
                                <Kanban size={14} /> Tablero
                              </NavLink>
                            )}
                          {can(user, ACTIONS.PROGRESS_VIEW) &&
                            features.includes("progreso") && (
                              <NavLink
                                to="/progreso-fabricacion"
                                className={subLinkClass}
                              >
                                <TrendingUp size={14} /> Progreso
                              </NavLink>
                            )}
                        </>
                      )}
                  </div>
                </div>
              </div>
            </>
          )}

        {/* ── Finanzas ────────────────────────────── */}
        {showFinanzas &&
          (features.includes("costos") || features.includes("tesoreria")) && (
            <>
              <SectionLabel>Finanzas</SectionLabel>
              {can(user, ACTIONS.INDIRECT_COSTS_VIEW) &&
                features.includes("costos") && (
                  <NavLink to="/costos_indirectos" className={navLinkClass}>
                    <FiDollarSign size={17} /> Costos Indirectos
                  </NavLink>
                )}
              {can(user, ACTIONS.TREASURY_VIEW) && (
                <NavLink to="/tesoreria" className={navLinkClass}>
                  <FiDollarSign size={17} /> Tesorería
                </NavLink>
              )}
              {can(user, ACTIONS.TREASURY_VIEW) && (
                <NavLink to="/conciliacion-bancaria" className={navLinkClass}>
                  <FiCheckCircle size={17} /> Conciliación Bancaria
                </NavLink>
              )}
              {can(user, ACTIONS.CASH_CLOSINGS_VIEW) &&
                features.includes("cierres_caja") && (
                  <NavLink to="/cierres-caja" className={navLinkClass}>
                    <FiCalendar size={17} /> Cierres de Caja
                  </NavLink>
                )}
            </>
          )}

        {/* ── Sistema ─────────────────────────────── */}
        {showSistema && (
          <>
            <SectionLabel>Sistema</SectionLabel>
            {can(user, ACTIONS.REPORTS_VIEW) &&
              features.includes("reportes") && (
                <NavLink to="/reportes" className={navLinkClass}>
                  <FileText size={17} /> Reportes
                </NavLink>
              )}
            {can(user, ACTIONS.USERS_MANAGE) && (
              <NavLink
                to="/gestionUsuarios"
                className={({ isActive }) =>
                  navLinkClass({
                    isActive:
                      isActive ||
                      window.location.pathname.startsWith("/gestionRoles"),
                  })
                }
              >
                <Users size={17} /> Gestión de Usuarios
              </NavLink>
            )}
            {can(user, ACTIONS.PAYMENT_METHODS_MANAGE) && (
              <NavLink to="/configuracion" className={navLinkClass}>
                <Settings size={17} /> Configuración
              </NavLink>
            )}
          </>
        )}
      </nav>

      {/* ── Perfil de usuario ───────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 p-3">
        <div className="flex items-center gap-3 px-1 py-1">
          {/* Avatar con inicial */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0 select-none shadow-inner">
            {initial}
          </div>

          {/* Nombre y empresa */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {user?.nombre_usuario || "Usuario"}
            </p>
            {user?.empresa_nombre && (
              <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
                {user.empresa_nombre}
              </p>
            )}
          </div>

          {/* Botón cerrar sesión */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-slate-500 hover:bg-red-500/15 hover:text-red-400 transition-all duration-200 cursor-pointer shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
