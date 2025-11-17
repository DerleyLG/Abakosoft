import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de SidebarProvider');
  }
  return context;
};

export const SidebarProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <SidebarContext.Provider value={{ sidebarOpen, toggleSidebar, openSidebar, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
};
