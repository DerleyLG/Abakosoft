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
} from 'lucide-react';
import { FiDollarSign } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const Sidebar = ({ isOpen }) => {
  const [ordenesOpen, setOrdenesOpen] = useState(false);

  return (
    <aside
      className="bg-slate-900 text-white h-screen w-64 fixed top-0 left-0 z-50 shadow-lg overflow-auto flex flex-col transition-transform duration-700 ease-in-out"
      style={{
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      }}
    >
      <nav className="p-4 space-y-4">
        <div className="py-3 text-center text-xl font-bold border-b border-slate-700 select-none">
          PANEL
        </div>

        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
              isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
            }`
          }
        >
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>

        <NavLink
          to="/articulos"
          className={({ isActive }) =>
            `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
              isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
            }`
          }
        >
          <Package size={20} /> Artículos
        </NavLink>

        <NavLink
          to="/proveedores"
          className={({ isActive }) =>
            `flex items-center gap-2 p-2 rounded transition-colors duration-200 ${
              isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
            }`
          }
        >
          <Users size={20} /> Proveedores
        </NavLink>

        <NavLink
          to="/categorias"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
          <Boxes size={20} /> Categorías
        </NavLink>

        <NavLink
          to="/clientes"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
          <Users size={20} /> Clientes
        </NavLink>

        <NavLink
          to="/trabajadores"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
          <Settings size={20} /> Trabajadores
        </NavLink>

        <NavLink
          to="/inventario"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
          <Warehouse size={20} /> Inventario
        </NavLink>

        {/* Órdenes con submenú */}
        <div>
          <button
            onClick={() => setOrdenesOpen(!ordenesOpen)}
            className="w-full flex items-center justify-between gap-2 p-2 rounded hover:bg-slate-700 text-gray-300"
          >
            <div className="flex items-center gap-2 cursor-pointer">
              <ClipboardList size={20} />
              Órdenes
            </div>
            {ordenesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          {ordenesOpen && (
            <div className="ml-6 mt-1 space-y-1">
              <NavLink
                to="/ordenes_venta"
                className={({ isActive }) =>
                  `block p-2 rounded text-sm transition-colors duration-200 ${
                    isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
                  }`
                }
              >
                Órdenes de Venta
              </NavLink>

               <NavLink
                to="/ordenes_pedido"
                className={({ isActive }) =>
                  `block p-2 rounded text-sm transition-colors duration-200 ${
                    isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
                  }`
                }
              >
                Órdenes de Pedido
              </NavLink>

              <NavLink
                to="/ordenes_fabricacion"
                className={({ isActive }) =>
                  `block p-2 rounded text-sm transition-colors duration-200 ${
                    isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
                  }`
                }
              >
                Órdenes de Fabricación
              </NavLink>
              <NavLink
                to="/ordenes_compra"
                className={({ isActive }) =>
                  `block p-2 rounded text-sm transition-colors duration-200 ${
                    isActive ? 'bg-slate-800 text-white' : 'text-gray-300 hover:bg-slate-700'
                  }`
                }
              >
                Órdenes de Compra
              </NavLink>
            </div>
          )}
        </div>
  <NavLink
          to="/costos_indirectos"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
           <FiDollarSign size={20} /> Costos
        </NavLink>
        <NavLink
          to="/reportes"
          className="flex items-center gap-2 p-2 rounded hover:bg-slate-800"
        >
          <FileText size={20} /> Reportes
        </NavLink>

       
      </nav>
    </aside>
  );
};

export default Sidebar;
