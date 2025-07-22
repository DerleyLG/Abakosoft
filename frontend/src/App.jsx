import React from "react";
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
import PagosForm  from './pages/PagosForm'
import InventarioForm from "./pages/InventarioForm";
import Ordenes from "./pages/Ordenes";
import OrdenesCompra from "./pages/OrdenesCompra";
import OrdenesCompraForm from "./pages/OrdenesCompraForm";
import OrdenesFabricacion from "./pages/OrdenesFabricacion";
import OrdenFabricacionForm from "./pages/OrdenFabricacionForm";
import OrdenesVenta from "./pages/OrdenesVenta";
import OrdenVentaForm from "./pages/OrdenVentaForm"
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


export default function App() {
  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Layout />}>
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
          <Route path="trabajadores" element={<Trabajadores />} />
          <Route path="trabajadores/nuevo" element={<TrabajadoresForm />} /> 
          <Route path="trabajadores/editar/:id" element={<EditarTrabajador />} />
          <Route path="trabajadores/pagos" element={<PagosTrabajadores />} />
          <Route path="pagos/nuevo" element={<PagosForm />} /> 
          <Route path="inventario" element={<Inventario />} />
          <Route path="inventario/nuevo" element={<InventarioForm />} />
          <Route path="ordenes" element={<Ordenes />} />
          <Route path="ordenes_compra" element={<OrdenesCompra />} />
          <Route path="ordenes_compra/nuevo" element={<OrdenesCompraForm />} />
          <Route path="ordenes_fabricacion" element={<OrdenesFabricacion/>} />
          <Route path="ordenes_fabricacion/nuevo" element={<OrdenFabricacionForm/>} />
          <Route path="ordenes_venta" element={<OrdenesVenta/>} />
          <Route path="ordenes_venta/nuevo" element={<OrdenVentaForm/>} />
          <Route path="ordenes_pedido" element={<OrdenesPedido/>} />
          <Route path="ordenes_pedido/nuevo" element={<OrdenPedidoForm/>} />
          <Route path="etapas_produccion" element={<CrearEtapa/>} />
          <Route path="lotes_fabricados" element={<ListaLotesFabricacion/>} />
          <Route path="avances_fabricacion" element={<ListaAvances/>} />
          <Route path="costos_indirectos" element={<CostosIndirectos/>} />
          <Route path="costos_indirectos/nuevo" element={<CostosIndirectosNuevo/>} />
          <Route path="reportes" element={<VistaReportes/>} />
          <Route path="reportes/inventario" element={<ReporteInventario/>} />
          <Route path="pagos_anticipados" element={<ListaAnticipos/>} />



        </Route>
      </Routes>
    </>
  );
}
