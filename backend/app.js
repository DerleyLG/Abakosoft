const express = require('express');
const cors = require('cors');

require('dotenv').config();


const clientesRoutes = require('./src/routes/clientesRoutes');
const proveedoresRoutes = require ('./src/routes/proveedoresRoutes');
const articulosRoutes = require('./src/routes/articulosRoutes');
const categoriasRoutes = require('./src/routes/categoriasRoutes');
const movimientosInventarioRoutes = require('./src/routes/movimientosInventarioRoutes.js');
const ordenesCompraRoutes = require('./src/routes/ordenesCompraRoutes');
const costosIndirectosRoutes = require('./src/routes/costosIndirectosRoutes');
const costosIndirectosAsignadosRoutes = require('./src/routes/costosIndirectosAsignadosRoutes');
const avanceEtapaRoutes = require('./src/routes/avanceEtapasRoutes');
const ordenesFabricacionRoutes = require('./src/routes/ordenesFabricacionRoutes.js');
const detalleordenFabricacionRoutes = require('./src/routes/detalleOrdenFabricacionRoutes');
const ordenesVentaRoutes = require('./src/routes/ordenesVentaRoutes');
const pagosTrabajadoresRoutes = require('./src/routes/pagosTrabajadoresRoutes.js');
const trabajadoresRoutes = require('./src/routes/trabajadoresRoutes.js');
const usuariosRoutes = require('./src/routes/usuariosRoutes.js');
const historialCostosRoutes = require('./src/routes/historialCostosRoutes.js');
const etapasProduccionRoutes = require('./src/routes/etapasProduccionRoutes');
const serviciosTercerizadosRoutes = require('./src/routes/serviciosTercerizadosRoutes');
const authRoutes = require('./src/routes/authRoutes');
const serviciosTercerizadosAsignadosRoutes = require('./src/routes/serviciosTercerizadosAsignadosRoutes.js');
const reportesRoutes = require('./src/routes/reportesRoutes.js');
const detallePagoRoutes = require('./src/routes/detallepagoTrabajadorRoutes.js');
const dashboardRouter = require('./src/routes/dashboardRoutes.js');
const inventarioRoutes = require('./src/routes/inventarioRoutes.js');
const ordenesRoutes = require('./src/routes/ordenesResumenRoutes.js');
const detalleOrdenVentaRoutes = require('./src/routes/detalleOrdenVentaRoutes.js');
const ordenPedidosRoutes = require('./src/routes/ordenPedidosRoutes.js');
const detalleOrdenPedidoRoutes = require('./src/routes/detalleOrdenPedidoRoutes.js');
const lotesFabricadosRoutes = require('./src/routes/lotesFabricadosRoutes.js');
const anticiposRoutes = require('./src/routes/anticiposRoutes.js');
const detalleOrdenCompraRoutes = require('./src/routes/detalleOrdenCompraRoutes');
const compraMateriaPrimaRoutes = require('./src/routes/compraMateriaPrimaRoutes.js');





const app = express();
app.use(cors());
app.use(express.json());


// Montaje del módulo Clientes
app.use('/api/clientes', clientesRoutes);

// Montaje del módulo proveedores
app.use('/api/proveedores', proveedoresRoutes);

// Montaje del módulo articulos
app.use('/api/articulos', articulosRoutes);

// Montaje del módulo categorias
app.use('/api/categorias', categoriasRoutes);

// Montaje del módulo inventario
app.use('/api/movimientos-inventario', movimientosInventarioRoutes);

// Montaje del módulo ordenesCompra
app.use('/api/ordenes-compra', ordenesCompraRoutes);

// Montaje del modulo de costosIndirectos
app.use('/api/costos-indirectos', costosIndirectosRoutes);

// Montaje del modulo de costosIndirectosAsignados
app.use('/api/costos-indirectos-asignados', costosIndirectosAsignadosRoutes);

// Montaje del modulo avanceEtapasDeProduccion
app.use('/api/avances-etapa', avanceEtapaRoutes);

// Montaje del modulo OrdenesFabricacion
app.use('/api/ordenes-fabricacion', ordenesFabricacionRoutes);

// Montaje del modulo detalleOrdenFabricacion
app.use('/api/detalle-ordenF', detalleordenFabricacionRoutes);

// Montaje del modulo ordenesVenta
app.use('/api/ordenes-venta', ordenesVentaRoutes);

// Montaje del modulo pagosTrabajadores
app.use('/api/pagos', pagosTrabajadoresRoutes);

// Montaje del modulo trabajadores
app.use('/api/trabajadores', trabajadoresRoutes);

// Montaje del modulo Usuarios
app.use('/api/usuarios', usuariosRoutes);

// Montaje del modulo historialCostos
app.use('/api/historial-costos', historialCostosRoutes);

// Montaje del modulo etapasProduccion
app.use('/api/etapas-produccion', etapasProduccionRoutes);

// Montaje del modulo serviciosTercerizados
app.use('/api/servicios-tercerizados', serviciosTercerizadosRoutes);

// Montaje del modulo serviciosTercerizadosAsignados
app.use('/api/servicios-tercerizados-asignados', serviciosTercerizadosAsignadosRoutes);

//Montaje del modulo reportes
app.use('/api/reportes', reportesRoutes);

//autenticacion
app.use('/api/auth', authRoutes);

app.use('/api/detalle-pago-trabajador', detallePagoRoutes);

app.use('/api/dashboard', dashboardRouter);

app.use('/api/inventario', inventarioRoutes);

app.use('/api/ordenes', ordenesRoutes);


app.use('/api/detalle-orden-venta', detalleOrdenVentaRoutes);


app.use('/api/pedidos', ordenPedidosRoutes);

app.use('/api/detalle-orden-pedido', detalleOrdenPedidoRoutes);

app.use('/api/lotes-fabricados', lotesFabricadosRoutes);

app.use('/api/anticipos', anticiposRoutes);

app.use('/api/detalles-orden-compra', detalleOrdenCompraRoutes);

app.use('/api/compras_materia_prima', compraMateriaPrimaRoutes);



const PORT = process.env.PORT;
app.listen(PORT, '0.0.0.0' ,() => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});


