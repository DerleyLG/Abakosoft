import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlan } from "../hooks/usePlanApi";

const Header = ({ toggleSidebar }) => {
  const { plan, esPrueba } = usePlan();
  return (
    <header className="flex items-center px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      <button
        className="text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        onClick={toggleSidebar}
        aria-label="Abrir menú"
      >
        <Menu size={22} />
      </button>

      <div className="flex-1 flex justify-center">
        <span className="text-3xl font-bold tracking-widest text-slate-800 select-none cursor-pointer">
          <Link to="/dashboard">ABAKOSOFT</Link>
        </span>
      </div>

      {/* Plan activo y estado de prueba */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
          Plan: {plan?.charAt(0).toUpperCase() + plan?.slice(1)}
        </span>
        {esPrueba && (
          <span className="text-xs font-semibold px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 animate-pulse">
            Periodo de prueba
          </span>
        )}
      </div>
    </header>
  );
};

export default Header;
