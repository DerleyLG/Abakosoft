import React, { useEffect } from "react";
import Layout from "./pages/Layout";
import { Routes, Route, Navigate } from "react-router-dom";
import Articulos from "./pages/Articulos";
import Categorias from "./pages/Categorias";
import Dashboard from "./pages/Dashboard";
import ArticuloForm from "./pages/ArticulosForm";
import { Toaster } from 'react-hot-toast';
import EditarArticulo from './pages/EditarArticulo'
import CategoriasForm from './pages/CategoriasForm'
import EditarCategoria from './pages/EditarCategoria'
import Proveedores from './pages/Proveedores'
import ProveedoresForm from './pages/ProveedoresForm'
import EditarProveedor from './pages/EditarProveedor'
import Clientes from './pages/Clientes'
import ClientesForm from './pages/ClientesForm'
import EditarCliente from './pages/EditarCliente'
import Trabajadores from './pages/Trabajadores'
import TrabajadoresForm from './pages/TrabajadoresForm'
import EditarTrabajador from "./pages/EditarTrabajador";
import PagosTrabajadores from './pages/PagosTrabajadores'
import Inventario from './pages/Inventario'
import PagosForm from './pages/PagosForm'
import InventarioForm from "./pages/InventarioForm";
import Ordenes from "./pages/Ordenes";
import OrdenesCompra from "./pages/OrdenesCompra";
import OrdenesCompraForm from "./pages/OrdenesCompraForm";
import OrdenesFabricacion from "./pages/OrdenesFabricacion";
import OrdenFabricacionForm from "./pages/OrdenFabricacionForm";
import OrdenesVenta from "./pages/OrdenesVenta";
import OrdenVentaForm from "./pages/OrdenVentaForm"
import KanbanBoard from "./pages/KanbanBoard";
import OrdenesPedido from "./pages/OrdenesPedido";
import OrdenPedidoForm from './pages/OrdenPedidoForm'
import CrearEtapa from "./pages/EtapasProduccionForm";
import ListaLotesFabricacion from "./pages/LotesFabricados"
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
import { AuthProvider, useAuth } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
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

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();
    if (loading) {
        return <div>Cargando...</div>;
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};


const AppLogic = () => {
   
    return (
        <Routes>
            <Route path="/login" element={<Login/>} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="articulos" element={<Articulos />} />
                <Route path="articulos/nuevo" element={<ArticuloForm />} />
                <Route path="articulos/editar/:id" element={<EditarArticulo />} />
                <Route path="categorias" element={<Categorias />} />
                <Route path="categorias/nuevo" element={<CategoriasForm />} />
                <Route path="categorias/editar/:id" element={<EditarCategoria />} />
                <Route path="proveedores" element={<Proveedores />} />
                <Route path="proveedores/nuevo" element={<ProveedoresForm />} /> 
                <Route path="proveedores/editar/:id" element={<EditarProveedor />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="clientes/nuevo" element={<ClientesForm />} /> 
                <Route path="clientes/editar/:id" element={<EditarCliente />} />
                <Route path="trabajadores" element={<RequirePermission action={ACTIONS.WORKERS_VIEW}><Trabajadores /></RequirePermission>} />
                <Route path="trabajadores/nuevo" element={<RequirePermission action={ACTIONS.WORKERS_VIEW}><TrabajadoresForm /></RequirePermission>} /> 
                <Route path="trabajadores/editar/:id" element={<RequirePermission action={ACTIONS.WORKERS_VIEW}><EditarTrabajador /></RequirePermission>} />
                <Route path="trabajadores/pagos" element={<RequirePermission action={ACTIONS.PAYMENTS_VIEW}><PagosTrabajadores /></RequirePermission>} />
                <Route path="pagos/nuevo" element={<RequirePermission action={ACTIONS.PAYMENTS_VIEW}><PagosForm /></RequirePermission>} /> 
                <Route path="inventario" element={<Inventario />} />
                <Route path="inventario/nuevo" element={<InventarioForm />} />
                <Route path="ordenes" element={<Ordenes />} />
                <Route path="ordenes_compra" element={<OrdenesCompra />} />
                <Route path="ordenes_compra/nuevo" element={<RequirePermission action={ACTIONS.PURCHASES_CREATE}><OrdenesCompraForm /></RequirePermission>} />
                <Route path="ordenes_fabricacion" element={<OrdenesFabricacion/>} />
                <Route path="ordenes_fabricacion/nuevo" element={<RequirePermission action={ACTIONS.FABRICATION_CREATE}><OrdenFabricacionForm/></RequirePermission>} />
                <Route path="kanban" element={<KanbanBoard/>} />
                <Route path="ordenes_venta" element={<OrdenesVenta/>} />
                <Route path="ordenes_venta/nuevo" element={<RequirePermission action={ACTIONS.SALES_CREATE}><OrdenVentaForm/></RequirePermission>} />
                <Route path="ordenes_pedido" element={<OrdenesPedido/>} />
                <Route path="ordenes_pedido/nuevo" element={<RequirePermission action={ACTIONS.SALES_CREATE}><OrdenPedidoForm/></RequirePermission>} />
                <Route path="etapas_produccion" element={<CrearEtapa/>} />
                <Route path="lotes_fabricados" element={<ListaLotesFabricacion/>} />
                <Route path="avances_fabricacion" element={<RequirePermission action={ACTIONS.PAYMENTS_VIEW}><ListaAvances/></RequirePermission>} />
                <Route path="costos_indirectos" element={<CostosIndirectos/>} />
                <Route path="costos_indirectos/nuevo" element={<CostosIndirectosNuevo/>} />
                <Route path="reportes" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><VistaReportes/></RequirePermission>} />
                <Route path="reportes/inventario" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteInventario/></RequirePermission>} />
                <Route path="pagos_anticipados" element={<ListaAnticipos/>} />
                <Route path="costos_materia_prima" element={<CostosMateriaPrima/>} />
                <Route path="reportes/avances_fabricacion" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteAvanceFabricacion/></RequirePermission>} />
                <Route path="reportes/ventas_por_periodo" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteVentasPorPeriodo/></RequirePermission>} />
                <Route path="reportes/ordenes_compra" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteOrdenesCompra/></RequirePermission>} />
                <Route path="reportes/pagos_trabajadores" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReportePagosTrabajadores/></RequirePermission>} />
                <Route path="reportes/pagos_trabajadores_dia" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReportePagoTrabajadorPorDia/></RequirePermission>} />
                <Route path="reportes/costos_fabricacion" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteCostosProduccion/></RequirePermission>} />
                <Route path="reportes/utilidad_por_orden" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteUtilidadPorOrden/></RequirePermission>} />
                <Route path="reportes/movimientos_inventario" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteMovimientosInventario/></RequirePermission>} />
                <Route path="reportes/tesoreria_ventas" element={<RequirePermission action={ACTIONS.REPORTS_VIEW}><ReporteTesoreriaVentas/></RequirePermission>} />
                <Route path="tesoreria" element={<Tesoreria/>} />
                <Route path="gestionUsuarios" element={<GestionUsuarios/>} />
              
                <Route path="usuarios/nuevo" element={<UsuarioForm/>} />
                <Route path="usuarios/editar/:id" element={<EditarUsuario/>} />
                <Route path="ordenes_pedido/editar/:id" element={<RequirePermission action={ACTIONS.SALES_EDIT}><EditarPedido/></RequirePermission>} />
                <Route path="ordenes_compra/editar/:id" element={<RequirePermission action={ACTIONS.PURCHASES_EDIT}><EditarOrdenCompra /></RequirePermission>} />
                <Route path="ordenes_venta/editar/:id" element={<RequirePermission action={ACTIONS.SALES_EDIT}><OrdenesVentaEdit/></RequirePermission>} />
                <Route path="ventas_credito" element={<VentasCredito/>} />
                
                {/* Cierres de Caja */}
                <Route path="cierres-caja" element={<CierresCajaList/>} />
                <Route path="cierres-caja/crear" element={<CierresCajaForm/>} />
                <Route path="cierres-caja/:id" element={<CierresCajaDetalle/>} />
                <Route path="cierres-caja/:id/cerrar" element={<CierresCajaCerrar/>} />
            </Route>
        </Routes>
    );
};

export default function App() {
    return(
        <AuthProvider>
            <SidebarProvider>
                <Toaster position="top-right" reverseOrder={false} /> 
                <AppLogic />
            </SidebarProvider>
        </AuthProvider>
    );
}