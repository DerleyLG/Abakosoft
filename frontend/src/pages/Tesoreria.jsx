import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { FiDollarSign, FiCreditCard, FiArrowLeft, FiArrowRight } from 'react-icons/fi';

const TesoreriaDashboard = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [ingresosSummary, setIngresosSummary] = useState({ total30Dias: 0, ventasHoy: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  const [filtroTipo, setFiltroTipo] = useState('abono_credito');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [cacheCreditos, setCacheCreditos] = useState({});
 

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
   
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const efectivoId = metodos.find(m => m.nombre.toLowerCase().includes('efectivo'))?.id_metodo_pago;
    const transferenciaId = metodos.find(m => m.nombre.toLowerCase().includes('transferencia'))?.id_metodo_pago;

    movs.forEach(mov => {
      
      const fecha = mov.fecha_movimiento ? new Date(mov.fecha_movimiento) : null;
      if (!fecha) return;
      if (fecha.getMonth() !== currentMonth || fecha.getFullYear() !== currentYear) return;

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

  const navigate = useNavigate();

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


  const movimientosFiltrados = movimientos.filter(mov => {
    const tipo = getTipoMovimiento(mov);



   
    if (filtroTipo && filtroTipo !== 'todos' && tipo !== filtroTipo) {
      return false;
    }

   
    if (filtroMetodo && mov.id_metodo_pago.toString() !== filtroMetodo) {
      return false;
    }

   

    return true;
  });

  
  useEffect(() => {
    let mounted = true;
    const creditosIds = Array.from(new Set(
      movimientosFiltrados
        .filter(m => getTipoMovimiento(m) === 'abono_credito' && m.id_documento)
        .map(m => m.id_documento)
    ));

    if (creditosIds.length === 0) return;

    const fetchAll = async () => {
      try {
        
        await Promise.all(creditosIds.map(async (id) => {
          if (!mounted) return;
          if (cacheCreditos[id]) return;
          try {
            const res = await api.get(`/creditos/${id}`);
            if (mounted) {
              setCacheCreditos(prev => ({ ...prev, [id]: res.data }));
            }
          } catch (e) {
           
            console.error('Error fetching credito', id, e);
          }
        }));
      } catch (e) {
        console.error('Error preloading creditos', e);
      }
    };
    fetchAll();
    return () => { mounted = false; };
  }, [movimientosFiltrados]);

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Cargando datos de tesorería...</div>;
  }

  if (error) {
    return <div className="text-center py-10 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-4xl font-bold text-gray-800">Panel de Tesorería</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 cursor-pointer">
            <FiArrowLeft />
            Volver
          </button>
          <button onClick={() => navigate('/ventas_credito')} className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 cursor-pointer">
            Ir a Créditos
            <FiArrowRight />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Balance Efectivo</h3>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(resumenFinanciero.ventasEfectivo - resumenFinanciero.comprasEfectivo)}
            </span>
            <div className="text-sm text-gray-500 mt-1">Ventas: {formatCurrency(resumenFinanciero.ventasEfectivo)} · Compras: {formatCurrency(resumenFinanciero.comprasEfectivo)}</div>
          </div>
          <FiDollarSign size={40} className="text-gray-400" />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-700">Balance Transferencia</h3>
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(resumenFinanciero.ventasTransferencia - resumenFinanciero.comprasTransferencia)}
            </span>
            <div className="text-sm text-gray-500 mt-1">Ventas: {formatCurrency(resumenFinanciero.ventasTransferencia)} · Compras: {formatCurrency(resumenFinanciero.comprasTransferencia)}</div>
          </div>
          <FiCreditCard size={40} className="text-gray-400 cursor-pointer" />
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
                <option value="todos">Todos</option>
              <option value="venta">Venta</option>
              <option value="compra">Compra</option>
              <option value="pago_trabajadores">Pagos</option>
              <option value="abono_credito">Abonos Crédito</option>
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
                <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.length > 0 ? (
              movimientosFiltrados.map((mov) => {
                const tipo = getTipoMovimiento(mov);
                const idRef = getIdReferencia(mov);
                const montoColor = tipo === 'compra' ? 'text-red-700' : 'text-green-700';
                const creditoInfo = mov.id_documento ? cacheCreditos[mov.id_documento] : null;
                const clienteNombre = creditoInfo ? creditoInfo.cliente_nombre : null;
                return (
                  <tr key={mov.id_movimiento} className="hover:bg-slate-100 transition">
                    <td className="px-4 py-3 font-medium">{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</td>
                    <td className="px-4 py-3">#{idRef}{clienteNombre ? ` · ${clienteNombre}` : ''}</td>
                    <td className="px-4 py-3">{formatDate(mov.fecha_movimiento)}</td>
                    <td className={`px-4 py-3 font-semibold ${montoColor}`}>
                      {formatCurrency(mov.monto)}
                    </td>
                    <td className="px-4 py-3">{getMetodoNombre(mov.id_metodo_pago)}</td>
                    <td className="px-4 py-3">{mov.referencia || '-'}</td>
                    <td className="px-4 py-3">{mov.observaciones || '-'}</td>
                    <td className="px-4 py-3">
                      {tipo === 'abono_credito' && mov.id_documento && (
                        <button
                          onClick={() => navigate('/ventas_credito', { state: { openCreditId: mov.id_documento } })}
                          className="p-2 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                          title="Ver crédito"
                        >
                          <FiCreditCard />
                        </button>
                      )}
                    </td>
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