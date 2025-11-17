
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Toaster } from 'react-hot-toast';
import { useSidebar } from '../context/SidebarContext';

const Layout = () => {
  const { sidebarOpen, toggleSidebar } = useSidebar();

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={`flex flex-col flex-1 min-h-0 overflow-auto transition-all duration-600 ease-in-out
          ${sidebarOpen ? 'ml-64' : 'ml-0'}
        `}
      >
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-grow p-6">
          <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
          },
        }}
      />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
