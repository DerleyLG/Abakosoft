import { UserCircle, Menu, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const Header = ({ toggleSidebar }) => {
  const { logout, loading, user } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (

    <header className="flex items-center p-4 bg-white border-b border-gray-300 shadow-sm">

      <div className="flex items-center">
        <button
          className="text-slate-700 cursor-pointer"
          onClick={toggleSidebar}
        >
          <Menu size={24} />
        </button>
      </div>

  
      <div className="flex-1 flex justify-center"> 
        <span className="text-3xl font-bold tracking-wide text-slate-800 cursor-pointer " >
          <Link to="/dashboard" className="">ABAKOSOFT</Link>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {loading ? (
          <div className="text-sm text-gray-500">Cargando...</div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <UserCircle />
            <span>{user?.nombre_usuario || 'Usuario'}</span>
          </div>
        )}
        <button onClick={handleLogout} className="cursor-pointer ml-2 text-sm flex items-center gap-2 text-slate-700 hover:text-red-600">
          <LogOut /> Cerrar
        </button>
      </div>



    </header>
  );
};

export default Header;
