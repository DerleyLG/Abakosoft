import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { FiDollarSign, FiCreditCard, FiBarChart2, FiPlusCircle } from 'react-icons/fi';

const TesoreriaDashboard = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [ingresosSummary, setIngresosSummary] = useState({ total30Dias: 0, ventasHoy: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 👇 Estados para los filtros
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
 

  const [resumenFinanciero, setResumenFinanciero] = useState({
    totalCompras: 0,
    totalVentas: 0,
    ventasEfectivo: 0,
    ventasTransferencia: 0,
    comprasEfectivo: 0,
    comprasTransferencia: 0,
  });

  const [egresosSummary, setEgresosSummary] = useState({
    totalEgresos: 0,
    pagosTrabajadoresCount: 0,
    ordenesCompraCount: 0,
    costosCount: 0,
    materiaPrimaCount: 0,
  });

  const calcularResumenFinanciero = (movs, metodos) => {
    const resumen = {
      totalCompras: 0,
      totalVentas: 0,
      ventasEfectivo: 0,
      ventasTransferencia: 0,
      comprasEfectivo: 0,
      comprasTransferencia: 0,
    };

    const efectivoId = metodos.find(m => m.nombre.toLowerCase().includes('efectivo'))?.id_metodo_pago;
    const transferenciaId = metodos.find(m => m.nombre.toLowerCase().includes('transferencia'))?.id_metodo_pago;

    movs.forEach(mov => {
      const tipo = getTipoMovimiento(mov);
      const montoAbsoluto = Math.abs(mov.monto);

      if (tipo === 'venta') {
        resumen.totalVentas += montoAbsoluto;
        if (mov.id_metodo_pago === efectivoId) {
          resumen.ventasEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.ventasTransferencia += montoAbsoluto;
        }
      } else if (tipo === 'compra') {
        resumen.totalCompras += montoAbsoluto;
        if (mov.id_metodo_pago === efectivoId) {
          resumen.comprasEfectivo += montoAbsoluto;
        } else if (mov.id_metodo_pago === transferenciaId) {
          resumen.comprasTransferencia += montoAbsoluto;
        }
      }
    });
    return resumen;
  };

  useEffect(() => {
    const fetchTesoreriaData = async () => {
      try {
        setLoading(true);
        const [movimientosRes, metodosRes, ingresosRes, egresosRes, pagosCountRes, ordenesCountRes, costosCountRes, materiaPrimaCountRes] = await Promise.all([
          api.get('/tesoreria/movimientos-tesoreria'),
          api.get('/tesoreria/metodos-pago'),
          api.get('/tesoreria/ingresos-summary'),
          api.get('/tesoreria/egresos-summary'),
          api.get('/tesoreria/pagos-trabajadores/count'),
          api.get('/tesoreria/ordenes-compra/count'),
          api.get('/tesoreria/costos/count'),
          api.get('/tesoreria/materia-prima/count'),
        ]);

        const movimientosData = movimientosRes.data;
        const metodosData = metodosRes.data;
        setMovimientos(movimientosData);
        setMetodosPago(metodosData);
        setIngresosSummary(ingresosRes.data);

        const totalEgresos = egresosRes.data.totalPagosTrabajadores + egresosRes.data.totalOrdenesCompra + egresosRes.data.totalCostos + egresosRes.data.totalMateriaPrima;

        setEgresosSummary({
          totalEgresos: totalEgresos,
          pagosTrabajadoresCount: pagosCountRes.data.count,
          ordenesCompraCount: ordenesCountRes.data.count,
          costosCount: costosCountRes.data.count,
          materiaPrimaCount: materiaPrimaCountRes.data.count,
        });

        const resumenCalculado = calcularResumenFinanciero(movimientosData, metodosData);
        setResumenFinanciero(resumenCalculado);
      } catch (err) {
        setError("Error al cargar los datos de tesorería.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTesoreriaData();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMetodoNombre = (id) => {
    const metodo = metodosPago.find(m => m.id_metodo_pago === id);
    return metodo ? metodo.nombre : 'Desconocido';
  };

  const getTipoMovimiento = (mov) => {
    if (mov.tipo_documento) {
      if (mov.tipo_documento.toString().toLowerCase().includes('venta')) return 'venta';
      if (mov.tipo_documento.toString().toLowerCase().includes('compra')) return 'compra';
      return mov.tipo_documento;
    }
    if (mov.id_orden_venta) return 'venta';
    if (mov.id_orden_compra) return 'compra';
    if (mov.id_documento) return 'referencia';
    return 'otro';
  };

  const getIdReferencia = (mov) => {
    return mov.id_documento ?? mov.id_orden_venta ?? mov.id_orden_compra ?? '-';
  };

  // 👇 Lógica de filtrado
  const movimientosFiltrados = movimientos.filter(mov => {
    const tipo = getTipoMovimiento(mov);



    // Filtro por tipo
    if (filtroTipo && tipo !== filtroTipo) {
      return false;
    }

    // Filtro por método de pago
    if (filtroMetodo && mov.id_metodo_pago.toString() !== filtroMetodo) {
      return false;
    }

   

    return true;
  });

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Cargando datos de tesorería...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <h2 className="text-4xl font-bold text-gray-800 mb-6">Panel de Tesorería</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Ventas por Efectivo</h3>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(resumenFinanciero.ventasEfectivo)}
            </span>
          </div>
          <FiDollarSign size={40} className="text-green-400" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Ventas por Transferencia</h3>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(resumenFinanciero.ventasTransferencia)}
            </span>
          </div>
          <FiCreditCard size={40} className="text-green-400" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Compras por Efectivo</h3>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(resumenFinanciero.comprasEfectivo)}
            </span>
          </div>
          <FiBarChart2 size={40} className="text-red-400" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Compras por Transferencia</h3>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(resumenFinanciero.comprasTransferencia)}
            </span>
          </div>
          <FiCreditCard size={40} className="text-red-400" />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-lg flex-1">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Análisis de Ingresos (Mes)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-green-700">Total Ingresado </span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(ingresosSummary.totalMes)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="font-medium text-blue-700">Ventas Registradas</span>
              <span className="text-2xl font-bold text-blue-600">
                {ingresosSummary.ventasMensual}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg flex-1">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Análisis de Egresos (Mes)</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-red-700">Total de Egresos</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCurrency(egresosSummary.totalEgresos)}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <div className="flex flex-col p-1 bg-red-50 rounded-lg text-center flex-1">
                <span className="text-2xl font-bold text-red-600">{egresosSummary.ordenesCompraCount}</span>
                <span className="text-sm font-medium text-red-700">Compras registradas</span>
              </div>
              <div className="flex flex-col p-1 bg-red-50 rounded-lg text-center flex-1">
                <span className="text-2xl font-bold text-red-600">{egresosSummary.pagosTrabajadoresCount}</span>
                <span className="text-sm font-medium text-red-700">Pagos registrados</span>
              </div>
              <div className="flex flex-col p-1 bg-red-50 rounded-lg text-center flex-1">
                <span className="text-2xl font-bold text-red-600">{egresosSummary.costosCount}</span>
                <span className="text-sm font-medium text-red-700">Costos registrados</span>
              </div>
             
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <h3 className="text-xl font-semibold text-gray-700 mb-4">Movimientos Recientes</h3>
        <div className="mb-4 flex flex-wrap gap-8 items-end">
          <div className="flex-1 max-w-[200px]">
            <label htmlFor="filtroTipo" className="block text-sm font-medium text-gray-700">Filtrar por Tipo</label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
              <option value="pago_trabajadores">Pagos</option>
            </select>
          </div>
          <div className="flex-1 max-w-[200px]">
            <label htmlFor="filtroMetodo" className="block text-sm font-medium text-gray-700">Filtrar por Método</label>
            <select
              id="filtroMetodo"
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {metodosPago.map(metodo => (
                <option key={metodo.id_metodo_pago} value={metodo.id_metodo_pago}>
                  {metodo.nombre}
                </option>
              ))}
            </select>
          </div>
  
        </div>

        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">ID Referencia</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Monto</th>
              <th className="px-4 py-3">Método de Pago</th>
              <th className="px-4 py-3">Referencia</th>
              <th className="px-4 py-3">Observaciones</th>
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.map((mov) => {
                const tipo = getTipoMovimiento(mov);
                const idRef = getIdReferencia(mov);
                const montoColor = tipo === 'compra' ? 'text-red-700' : 'text-green-700';
                return (
                  <tr key={mov.id_movimiento} className="hover:bg-slate-100 transition">
                    <td className="px-4 py-3 font-medium">{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</td>
                    <td className="px-4 py-3">{idRef}</td>
                    <td className="px-4 py-3">{formatDate(mov.fecha_movimiento)}</td>
                    <td className={`px-4 py-3 font-semibold ${montoColor}`}>
                      {formatCurrency(mov.monto)}
                    </td>
                    <td className="px-4 py-3">{getMetodoNombre(mov.id_metodo_pago)}</td>
                    <td className="px-4 py-3">{mov.referencia || '-'}</td>
                    <td className="px-4 py-3">{mov.observaciones || '-'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="text-center py-6 text-gray-500">
                  No se encontraron movimientos de tesorería que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TesoreriaDashboard;