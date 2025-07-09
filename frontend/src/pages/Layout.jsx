// src/layout/Layout.jsx o src/pages/Layout.jsx
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useState } from "react";
import { Toaster } from 'react-hot-toast';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

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
