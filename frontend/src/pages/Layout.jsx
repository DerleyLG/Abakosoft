import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { Toaster } from "react-hot-toast";
import { useSidebar } from "../context/SidebarContext";
import OnboardingWizard from "../components/OnboardingWizard";
import { useAuth } from "../context/AuthContext";
import { WHATSAPP_URL } from "../constants/contact";

const Layout = () => {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const enGracia = user?.estado_suscripcion === "gracia";

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} />

      <div
        className={`flex flex-col flex-1 min-h-0 overflow-auto transition-all duration-600 ease-in-out
          ${sidebarOpen ? "ml-64" : "ml-0"}
        `}
      >
        <Header toggleSidebar={toggleSidebar} />
        {enGracia && (
          <div className="bg-orange-50 border-b border-orange-200 px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-orange-800">
            <span>⚠️</span>
            <span>
              <strong>Período de gracia:</strong> Tu plan venció. Tienes hasta 3
              días para renovar antes de que se suspenda el acceso.
            </span>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-2 font-semibold underline hover:text-orange-900"
            >
              Contáctanos
            </a>
          </div>
        )}
        <main className="flex-grow p-6">
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#fff",
              },
            }}
          />
          <Outlet />
        </main>
      </div>

      <OnboardingWizard />
    </div>
  );
};

export default Layout;
