import React, { useState } from "react";
import {
  Boxes,
  ClipboardList,
  Package,
  Users,
  Warehouse,
  FileText,
  Settings,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { FiDollarSign, FiCreditCard, FiCalendar } from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can, ACTIONS } from "../utils/permissions";

const Sidebar = ({ isOpen }) => {
  const [ordenesOpen, setOrdenesOpen] = useState(false);
  const { user } = useAuth();
  return (
    <aside
      className="bg-slate-900 text-white h-screen w-64 fixed top-0 left-0 z-50 shadow-lg overflow-auto flex flex-col transition-transform duration-700 ease-in-out"
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
      }}
    >
        {" "}
      <div className="flex flex-col flex-grow">
           {" "}
        <nav className="p-4 space-y-4">
              {" "}
          <div className="py-3 text-center text-xl font-bold border-b border-slate-700 select-none">
                  PANEL     {" "}
          </div>
              {" "}
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <LayoutDashboard size={20} /> Dashboard     {" "}
          </NavLink>
              {" "}
          <NavLink
            to="/articulos"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <Package size={20} /> Artículos     {" "}
          </NavLink>
              {" "}
          <NavLink
            to="/proveedores"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <Users size={20} /> Proveedores     {" "}
          </NavLink>
              {" "}
          <NavLink
            to="/categorias"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <Boxes size={20} /> Categorías     {" "}
          </NavLink>
              {" "}
          <NavLink
            to="/clientes"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <Users size={20} /> Clientes     {" "}
          </NavLink>
              
          {can(user?.rol, ACTIONS.WORKERS_VIEW) && (
            <NavLink
              to="/trabajadores"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-700"
                }`
              }
            >
              <Settings size={20} /> Trabajadores
            </NavLink>
          )}
                   {" "}
          {can(user?.rol, ACTIONS.PAYMENTS_VIEW) && (
            <NavLink
              to="/trabajadores/pagos"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-700"
                }`
              }
            >
                     <FiCreditCard size={20} /> Pagos      {" "}
            </NavLink>
          )}
              {" "}
          <NavLink
            to="/inventario"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <Warehouse size={20} /> Inventario     {" "}
          </NavLink>
               {/* Órdenes con submenú */}    {" "}
          <div>
                 {" "}
            <button
              onClick={() => setOrdenesOpen(!ordenesOpen)}
              className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-700 text-gray-300 cursor-pointer"
            >
                    {" "}
              <div className="flex items-center gap-2 cursor-pointer">
                        <ClipboardList size={20} />       
                Órdenes       {" "}
              </div>
                    {" "}
              {ordenesOpen ? (
                <ChevronDown size={16} className="transition-transform duration-300" />
              ) : (
                <ChevronRight size={16} className="transition-transform duration-300" />
              )}
                   {" "}
            </button>

            <div
              className={`ml-7 border-l border-slate-700 pl-2 overflow-hidden transition-all duration-300 ease-in-out ${
                ordenesOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <NavLink
                to="/ordenes_venta"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
               Órdenes Ventas
              </NavLink>
              <NavLink
                to="/ordenes_pedido"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
                Órdenes Pedidos
              </NavLink>
              <NavLink
                to="/ordenes_fabricacion"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
                Órdenes Fabricación
              </NavLink>
              <NavLink
                to="/kanban"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
                Tablero Produccion
              </NavLink>
              <NavLink
                to="/progreso-fabricacion"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
                Progreso Fabricacion
              </NavLink>
              <NavLink
                to="/ordenes_compra"
                className={({ isActive }) =>
                  `block py-1.5 px-2 rounded text-sm transition-colors duration-200 ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-gray-400 hover:bg-slate-700"
                  }`
                }
              >
               Órdenes Compras
              </NavLink>
            </div>
          </div>

          <NavLink
            to="/costos_indirectos"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
                  <FiDollarSign size={20} /> Costos     {" "}
          </NavLink>
          <NavLink
            to="/tesoreria"
            className={({ isActive }) =>
              `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-700"
              }`
            }
          >
            <FiDollarSign size={20} /> Tesorería
          </NavLink>
          {can(user?.rol, ACTIONS.REPORTS_VIEW) && (
            <NavLink
              to="/cierres-caja"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-700"
                }`
              }
            >
              <FiCalendar size={20} /> Cierres de Caja
            </NavLink>
          )}

          {can(user?.rol, ACTIONS.REPORTS_VIEW) && (
            <NavLink
              to="/reportes"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-700"
                }`
              }
            >
              <FileText size={20} /> Reportes
            </NavLink>
          )}

          {user?.rol === "admin" && (
            <NavLink
              to="/gestionUsuarios"
              className={({ isActive }) =>
                `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "text-gray-300 hover:bg-slate-700"
                }`
              }
            >
              <Users size={20} /> Gestión de Usuarios
            </NavLink>
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-700 text-center text-xs text-gray-400">
        Abakosoft
      </div>
    </aside>
  );
};

export default Sidebar;
