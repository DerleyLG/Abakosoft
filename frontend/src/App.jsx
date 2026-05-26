import React, { useEffect } from "react";
import Layout from "./pages/Layout";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import NoPermisoPlan from "./pages/NoPermisoPlan";
import Articulos from "./pages/Articulos";
import Categorias from "./pages/Categorias";
import Dashboard from "./pages/Dashboard";
import ArticuloForm from "./pages/ArticulosForm";
import { Toaster } from "react-hot-toast";
import EditarArticulo from "./pages/EditarArticulo";
import CategoriasForm from "./pages/CategoriasForm";
import EditarCategoria from "./pages/EditarCategoria";
import Proveedores from "./pages/Proveedores";
import ProveedoresForm from "./pages/ProveedoresForm";
import EditarProveedor from "./pages/EditarProveedor";
import Clientes from "./pages/Clientes";
import ClientesForm from "./pages/ClientesForm";
import EditarCliente from "./pages/EditarCliente";
import Trabajadores from "./pages/Trabajadores";
import TrabajadoresForm from "./pages/TrabajadoresForm";
import EditarTrabajador from "./pages/EditarTrabajador";
import PagosTrabajadores from "./pages/PagosTrabajadores";
import Inventario from "./pages/Inventario";
import PagosForm from "./pages/PagosForm";
import InventarioForm from "./pages/InventarioForm";
import Ordenes from "./pages/Ordenes";
import OrdenesCompra from "./pages/OrdenesCompra";
import OrdenesCompraForm from "./pages/OrdenesCompraForm";
import OrdenesFabricacion from "./pages/OrdenesFabricacion";
import OrdenFabricacionForm from "./pages/OrdenFabricacionForm";
import OrdenesVenta from "./pages/OrdenesVenta";
import OrdenVentaForm from "./pages/OrdenVentaForm";
import KanbanBoard from "./pages/KanbanBoard";
import OrdenesPedido from "./pages/OrdenesPedido";
import OrdenPedidoForm from "./pages/OrdenPedidoForm";
import CrearEtapa from "./pages/EtapasProduccionForm";
import ListaLotesFabricacion from "./pages/LotesFabricados";
import ListaAvances from "./pages/Avances";
import CostosIndirectos from "./pages/CostosIndirectos";
import CostosIndirectosNuevo from "./pages/CostosIndirectosForm";
import VistaReportes from "./pages/Reportes";
import ReporteInventario from "./pages/ReporteInventario";
import ListaAnticipos from "./pages/Anticipos";
import CostosMateriaPrima from "./pages/costosMateriaPrima";
import ReporteAvanceFabricacion from "./pages/ReporteAvanceFabricacion";
import ReporteVentasPorPeriodo from "./pages/ReporteVentasPorPeriodo";
import ReporteOrdenesCompra from "./pages/ReporteOrdenesCompra";
import ReportePagosTrabajadores from "./pages/ReportePagosTrabajadores";
import ReportePagoTrabajadorPorDia from "./pages/ReportePagoTrabajadorPordia";
import ReporteCostosProduccion from "./pages/ReporteCostosFabricacion";
import ReporteUtilidadPorOrden from "./pages/ReporteUtilidadPorOrden";
import ReporteTesoreriaVentas from "./pages/ReporteTesoreriaVentas";
import Login from "./pages/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SidebarProvider } from "./context/SidebarContext";
import ReporteMovimientosInventario from "./pages/ReporteMovimientosInventario";
import Tesoreria from "./pages/Tesoreria";
import GestionUsuarios from "./pages/GestionUsuarios";
import UsuarioForm from "./pages/UsuarioForm";
import EditarUsuario from "./pages/EditarUsuario";
import EditarPedido from "./pages/EditarOrdenesPedido";
import EditarOrdenCompra from "./pages/EditarOrdenesCompra";
import OrdenesVentaEdit from "./pages/EditarOrdenesVenta";
import VentasCredito from "./pages/VentasCredito";
import RequirePermission from "./components/RequirePermission";
import { ACTIONS } from "./utils/permissions";
import CierresCajaList from "./pages/CierresCajaList";
import CierresCajaDetalle from "./pages/CierresCajaDetalle";
import CierresCajaForm from "./pages/CierresCajaForm";
import CierresCajaCerrar from "./pages/CierresCajaCerrar";
import ProgresoFabricacion from "./pages/ProgresoFabricacion";
import MovimientosArticuloPage from "./pages/MovimientosArticuloPage";
import SeguimientoInventarioPage from "./pages/SeguimientoInventarioPage";
import HistorialConsumoMP from "./pages/HistorialConsumoMP";
import GestionRoles from "./pages/GestionRoles";
import Configuracion from "./pages/Configuracion";
import PlanGuard from "./components/PlanGuard";
import SaasLogin from "./pages/saas/SaasLogin";
import SaasSetup from "./pages/saas/SaasSetup";
import SaasDashboard from "./pages/saas/SaasDashboard";
import SaasCrearEmpresa from "./pages/saas/SaasCrearEmpresa";
import CambiarPasswordAdmin from "./pages/saas/CambiarPasswordAdmin";
import { SaasAuthProvider, useSaasAuth } from "./context/SaasAuthContext";
import LandingPage from "./pages/LandingPage";
import Planes from "./pages/Planes";
import SuscripcionSuspendida from "./pages/SuscripcionSuspendida";

const ProtectedSaasRoute = ({ children }) => {
  const { admin, loading } = useSaasAuth();
  if (loading) return <div>Cargando...</div>;
  if (!admin) return <Navigate to="/saas/login" replace />;
  return children;
};

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, subscriptionBlocked } = useAuth();
  if (loading) {
    return <div>Cargando...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (subscriptionBlocked) {
    return <SuscripcionSuspendida es_prueba={subscriptionBlocked.es_prueba} />;
  }
  return children;
};

const AppLogic = () => {
  const navigate = useNavigate();

  // Redirigir via React Router cuando el backend bloquea por plan
  useEffect(() => {
    const handler = () => navigate("/no-permiso-plan");
    window.addEventListener("plan-restricted", handler);
    return () => window.removeEventListener("plan-restricted", handler);
  }, [navigate]);

  return (
    <Routes>
      <Route path="/no-permiso-plan" element={<NoPermisoPlan />} />
      <Route path="/" element={<LandingPage />} />
      <Route path="/planes" element={<Planes />} />
      <Route path="/login" element={<Login />} />

      <Route path="/saas/login" element={<SaasLogin />} />
      <Route path="/saas/setup" element={<SaasSetup />} />
      <Route
        path="/saas/cambiar-password"
        element={
          <ProtectedSaasRoute>
            <CambiarPasswordAdmin />
          </ProtectedSaasRoute>
        }
      />
      <Route
        path="/saas/empresas"
        element={
          <ProtectedSaasRoute>
            <SaasDashboard />
          </ProtectedSaasRoute>
        }
      />
      <Route
        path="/saas/empresas/nueva"
        element={
          <ProtectedSaasRoute>
            <SaasCrearEmpresa />
          </ProtectedSaasRoute>
        }
      />
      <Route path="/saas" element={<Navigate to="/saas/login" replace />} />
      {/* ─────────────────────────────────────────────── */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />

        {/* Artículos */}
        <Route
          path="articulos"
          element={
            <RequirePermission action={ACTIONS.ARTICLES_VIEW}>
              <Articulos />
            </RequirePermission>
          }
        />
        <Route
          path="articulos/nuevo"
          element={
            <RequirePermission action={ACTIONS.ARTICLES_CREATE}>
              <ArticuloForm />
            </RequirePermission>
          }
        />
        <Route
          path="articulos/editar/:id"
          element={
            <RequirePermission action={ACTIONS.ARTICLES_EDIT}>
              <EditarArticulo />
            </RequirePermission>
          }
        />

        {/* Categorías */}
        <Route
          path="categorias"
          element={
            <RequirePermission action={ACTIONS.CATEGORIES_VIEW}>
              <Categorias />
            </RequirePermission>
          }
        />
        <Route
          path="categorias/nuevo"
          element={
            <RequirePermission action={ACTIONS.CATEGORIES_CREATE}>
              <CategoriasForm />
            </RequirePermission>
          }
        />
        <Route
          path="categorias/editar/:id"
          element={
            <RequirePermission action={ACTIONS.CATEGORIES_EDIT}>
              <EditarCategoria />
            </RequirePermission>
          }
        />

        {/* Proveedores */}
        <Route
          path="proveedores"
          element={
            <RequirePermission action={ACTIONS.SUPPLIERS_VIEW}>
              <Proveedores />
            </RequirePermission>
          }
        />
        <Route
          path="proveedores/nuevo"
          element={
            <RequirePermission action={ACTIONS.SUPPLIERS_CREATE}>
              <ProveedoresForm />
            </RequirePermission>
          }
        />
        <Route
          path="proveedores/editar/:id"
          element={
            <RequirePermission action={ACTIONS.SUPPLIERS_EDIT}>
              <EditarProveedor />
            </RequirePermission>
          }
        />

        {/* Clientes */}
        <Route
          path="clientes"
          element={
            <RequirePermission action={ACTIONS.CLIENTS_VIEW}>
              <Clientes />
            </RequirePermission>
          }
        />
        <Route
          path="clientes/nuevo"
          element={
            <RequirePermission action={ACTIONS.CLIENTS_CREATE}>
              <ClientesForm />
            </RequirePermission>
          }
        />
        <Route
          path="clientes/editar/:id"
          element={
            <RequirePermission action={ACTIONS.CLIENTS_EDIT}>
              <EditarCliente />
            </RequirePermission>
          }
        />

        {/* Trabajadores */}
        <Route
          path="trabajadores"
          element={
            <RequirePermission action={ACTIONS.WORKERS_VIEW}>
              <Trabajadores />
            </RequirePermission>
          }
        />
        <Route
          path="trabajadores/nuevo"
          element={
            <RequirePermission action={ACTIONS.WORKERS_CREATE}>
              <TrabajadoresForm />
            </RequirePermission>
          }
        />
        <Route
          path="trabajadores/editar/:id"
          element={
            <RequirePermission action={ACTIONS.WORKERS_EDIT}>
              <EditarTrabajador />
            </RequirePermission>
          }
        />

        {/* Pagos */}
        <Route
          path="trabajadores/pagos"
          element={
            <RequirePermission
              action={[ACTIONS.PAYMENTS_VIEW, ACTIONS.PAYMENTS_CREATE]}
            >
              <PlanGuard feature="pagos">
                <PagosTrabajadores />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="pagos/nuevo"
          element={
            <RequirePermission action={ACTIONS.PAYMENTS_CREATE}>
              <PlanGuard feature="pagos">
                <PagosForm />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Inventario */}
        <Route
          path="inventario"
          element={
            <RequirePermission action={ACTIONS.INVENTORY_VIEW}>
              <Inventario />
            </RequirePermission>
          }
        />
        <Route
          path="inventario/nuevo"
          element={
            <RequirePermission action={ACTIONS.INVENTORY_CREATE}>
              <InventarioForm />
            </RequirePermission>
          }
        />
        <Route
          path="inventario/seguimiento"
          element={
            <RequirePermission action={ACTIONS.INVENTORY_TRACKING}>
              <SeguimientoInventarioPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventario/movimientos/:id"
          element={
            <RequirePermission action={ACTIONS.MOVEMENTS_VIEW}>
              <MovimientosArticuloPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventario/consumo-mp"
          element={
            <RequirePermission action={ACTIONS.INVENTORY_CONSUME}>
              <PlanGuard feature="costos_materia_prima">
                <HistorialConsumoMP />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Órdenes */}
        <Route path="ordenes" element={<Ordenes />} />
        <Route
          path="ordenes_compra"
          element={
            <RequirePermission action={ACTIONS.PURCHASES_VIEW}>
              <OrdenesCompra />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_compra/nuevo"
          element={
            <RequirePermission action={ACTIONS.PURCHASES_CREATE}>
              <OrdenesCompraForm />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_compra/editar/:id"
          element={
            <RequirePermission action={ACTIONS.PURCHASES_EDIT}>
              <EditarOrdenCompra />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_fabricacion"
          element={
            <RequirePermission action={ACTIONS.FABRICATION_VIEW}>
              <PlanGuard feature="fabricacion">
                <OrdenesFabricacion />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_fabricacion/nuevo"
          element={
            <RequirePermission action={ACTIONS.FABRICATION_CREATE}>
              <PlanGuard feature="fabricacion">
                <OrdenFabricacionForm />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_fabricacion/editar/:id"
          element={
            <RequirePermission action={ACTIONS.FABRICATION_EDIT}>
              <PlanGuard feature="fabricacion">
                <OrdenFabricacionForm />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="kanban"
          element={
            <RequirePermission action={ACTIONS.KANBAN_VIEW}>
              <PlanGuard feature="kanban">
                <KanbanBoard />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="progreso-fabricacion"
          element={
            <RequirePermission action={ACTIONS.PROGRESS_VIEW}>
              <PlanGuard feature="progreso">
                <ProgresoFabricacion />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_venta"
          element={
            <RequirePermission action={ACTIONS.SALES_VIEW}>
              <OrdenesVenta />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_venta/nuevo"
          element={
            <RequirePermission action={ACTIONS.SALES_CREATE}>
              <OrdenVentaForm />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_venta/editar/:id"
          element={
            <RequirePermission action={ACTIONS.SALES_EDIT}>
              <OrdenesVentaEdit />
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_pedido"
          element={
            <RequirePermission action={ACTIONS.ORDERS_VIEW}>
              <PlanGuard feature="ordenes">
                <OrdenesPedido />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_pedido/nuevo"
          element={
            <RequirePermission action={ACTIONS.ORDERS_CREATE}>
              <PlanGuard feature="ordenes">
                <OrdenPedidoForm />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ordenes_pedido/editar/:id"
          element={
            <RequirePermission action={ACTIONS.ORDERS_EDIT}>
              <PlanGuard feature="ordenes">
                <EditarPedido />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="etapas_produccion"
          element={
            <RequirePermission action={ACTIONS.FABRICATION_EDIT}>
              <PlanGuard feature="etapas">
                <CrearEtapa />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="lotes_fabricados"
          element={
            <RequirePermission action={ACTIONS.FABRICATION_VIEW}>
              <PlanGuard feature="lotes">
                <ListaLotesFabricacion />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="avances_fabricacion"
          element={
            <RequirePermission action={ACTIONS.ADVANCES_VIEW}>
              <PlanGuard feature="avances">
                <ListaAvances />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="ventas_credito"
          element={
            <RequirePermission action={ACTIONS.CREDITS_VIEW}>
              <PlanGuard feature="creditos">
                <VentasCredito />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Costos */}
        <Route
          path="costos_indirectos"
          element={
            <RequirePermission action={ACTIONS.INDIRECT_COSTS_VIEW}>
              <PlanGuard feature="costos">
                <CostosIndirectos />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="costos_indirectos/nuevo"
          element={
            <RequirePermission action={ACTIONS.INDIRECT_COSTS_CREATE}>
              <PlanGuard feature="costos">
                <CostosIndirectosNuevo />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="pagos_anticipados"
          element={
            <RequirePermission action={ACTIONS.ANTICIPOS_VIEW}>
              <PlanGuard feature="anticipos">
                <ListaAnticipos />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="costos_materia_prima"
          element={
            <RequirePermission action={ACTIONS.INDIRECT_COSTS_VIEW}>
              <PlanGuard feature="costos_materia_prima">
                <CostosMateriaPrima />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Tesorería */}
        <Route
          path="tesoreria"
          element={
            <RequirePermission action={ACTIONS.TREASURY_VIEW}>
              <PlanGuard feature="tesoreria">
                <Tesoreria />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Cierres de Caja */}
        <Route
          path="cierres-caja"
          element={
            <RequirePermission action={ACTIONS.CASH_CLOSINGS_VIEW}>
              <PlanGuard feature="cierres_caja">
                <CierresCajaList />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="cierres-caja/crear"
          element={
            <RequirePermission action={ACTIONS.CASH_CLOSINGS_CREATE}>
              <PlanGuard feature="cierres_caja">
                <CierresCajaForm />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="cierres-caja/:id"
          element={
            <RequirePermission action={ACTIONS.CASH_CLOSINGS_VIEW}>
              <PlanGuard feature="cierres_caja">
                <CierresCajaDetalle />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="cierres-caja/:id/cerrar"
          element={
            <RequirePermission action={ACTIONS.CASH_CLOSINGS_CLOSE}>
              <PlanGuard feature="cierres_caja">
                <CierresCajaCerrar />
              </PlanGuard>
            </RequirePermission>
          }
        />

        {/* Reportes */}
        <Route
          path="reportes"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <VistaReportes />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/inventario"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteInventario />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/avances_fabricacion"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteAvanceFabricacion />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/ventas_por_periodo"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteVentasPorPeriodo />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/ordenes_compra"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteOrdenesCompra />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/pagos_trabajadores"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReportePagosTrabajadores />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/pagos_trabajadores_dia"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReportePagoTrabajadorPorDia />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/costos_fabricacion"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteCostosProduccion />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/utilidad_por_orden"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteUtilidadPorOrden />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/movimientos_inventario"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <PlanGuard feature="reportes">
                <ReporteMovimientosInventario />
              </PlanGuard>
            </RequirePermission>
          }
        />
        <Route
          path="reportes/tesoreria_ventas"
          element={
            <RequirePermission action={ACTIONS.REPORTS_VIEW}>
              <ReporteTesoreriaVentas />
            </RequirePermission>
          }
        />

        {/* Gestión de Usuarios */}
        <Route
          path="gestionUsuarios"
          element={
            <RequirePermission action={ACTIONS.USERS_MANAGE}>
              <GestionUsuarios />
            </RequirePermission>
          }
        />
        <Route
          path="gestionRoles"
          element={
            <RequirePermission action={ACTIONS.USERS_MANAGE}>
              <GestionRoles />
            </RequirePermission>
          }
        />
        <Route
          path="configuracion"
          element={
            <RequirePermission action={ACTIONS.PAYMENT_METHODS_MANAGE}>
              <Configuracion />
            </RequirePermission>
          }
        />
        <Route
          path="usuarios/nuevo"
          element={
            <RequirePermission action={ACTIONS.USERS_MANAGE}>
              <UsuarioForm />
            </RequirePermission>
          }
        />
        <Route
          path="usuarios/editar/:id"
          element={
            <RequirePermission action={ACTIONS.USERS_MANAGE}>
              <EditarUsuario />
            </RequirePermission>
          }
        />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <SaasAuthProvider>
        <SidebarProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <AppLogic />
        </SidebarProvider>
      </SaasAuthProvider>
    </AuthProvider>
  );
}
