import { UserCircle, Menu } from 'lucide-react';
import { Link} from 'react-router-dom';


const Header = ({ toggleSidebar }) => {

  return (
    
    <header className="flex justify-between items-center p-4 bg-white border-b shadow-sm">
      {/* IZQUIERDA: Botón hamburguesa + logo */}
    
        <button
          className="text-slate-700 cursor-pointer" // ← eliminado md:hidden
          onClick={toggleSidebar}
          
        >
          <Menu size={24} />
        </button>
        <div className="flex-grow flex justify-center"> 
          <span className="text-3xl font-bold tracking-wide text-slate-800 cursor-pointer " >
            <Link to="/dashboard" className="">
          ABAKOSOFT
            </Link>
        </span>
        </div>



    </header>
  );
};

export default Header;
