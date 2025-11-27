import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api"; // Usa tu instancia de API
import { FiEye, FiArrowLeft, FiPlusCircle, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";
import AbonoDrawer from "../components/AbonoDrawer";
import CrearCreditoManualModal from "../components/CrearCreditoManualModal";
import CreditoHistorialDrawer from "../components/CreditoHistorialDrawer";

const VentasCredito = () => {
    const [creditos, setCreditos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState('todos');
    const navigate = useNavigate();
    const [showAbonoModal, setShowAbonoModal] = useState(false);
    const [selectedCredito, setSelectedCredito] = useState(null);
    const [historialCreditoId, setHistorialCreditoId] = useState(null);
    const [montoAbono, setMontoAbono] = useState(0);
    const [metodosPago, setMetodosPago] = useState([]);
    const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
    const [referencia, setReferencia] = useState("");
    const [obsAbono, setObsAbono] = useState("");
    const [guardandoAbono, setGuardandoAbono] = useState(false);
    const [openCrearManual, setOpenCrearManual] = useState(false);

    const API_ENDPOINT = "/creditos"; 

    const location = useLocation();

    useEffect(() => {
        const fetchCreditos = async () => {
            setLoading(true);
            try {
                const res = await api.get(API_ENDPOINT);
                setCreditos(res.data);
             
                const openId = location.state?.openCreditId;
                const openOrderId = location.state?.openOrderId;
                if (openId || openOrderId) {
                    
                    let credito = (res.data || []).find(c => c.id_venta_credito === openId);
                  
                    if (!credito && openOrderId) {
                        credito = (res.data || []).find(c => c.id_orden_venta === openOrderId);
                    }
                    if (credito) {
                        setSelectedCredito(credito);
                        setMontoAbono(credito.saldo_pendiente || 0);
                        setMetodoSeleccionado('');
                        setReferencia('');
                        setObsAbono('');
                        setShowAbonoModal(true);
                    }
                   
                    try { navigate(location.pathname, { replace: true, state: {} }); } catch(e){}
                }
            } catch (error) {
                console.error("Error al cargar ventas a crédito:", error);
                toast.error("Error al cargar la lista de cuentas por cobrar.");
            } finally {
                setLoading(false);
            }
        };

        fetchCreditos();
       
        (async () => {
            try {
                const r = await api.get('/metodos-pago');
                setMetodosPago(r.data || []);
            } catch (e) {
                // Silenciar error
            }
        })();
    }, []);

    const handleAbonar = (id) => {
        const credito = creditos.find(c => c.id_venta_credito === id);
        if (!credito) return toast.error('Crédito no encontrado');
        setSelectedCredito(credito);
        setMontoAbono(credito.saldo_pendiente || 0);
        setMetodoSeleccionado('');
        setReferencia('');
        setObsAbono('');
        setShowAbonoModal(true);
    };
    
  

    const formatCurrency = (amount) => {
        return `$${Number(amount || 0).toLocaleString()}`;
    };

    const closeModal = () => {
        setShowAbonoModal(false);
        setSelectedCredito(null);
    };

 

    const filteredCreditos = creditos.filter((credito) => {
        const term = searchTerm.toLowerCase();
        const cliente = credito.cliente_nombre?.toLowerCase() || "";
        const idVenta = String(credito.id_orden_venta || "");
        const idCredito = String(credito.id_venta_credito || "");

        const montoTotal = Number(credito.monto_total || 0);
        const saldo = Number(credito.saldo_pendiente || 0);
        let estadoDerivado = 'pendiente';
        if (saldo === 0) estadoDerivado = 'pagado';
        else if (saldo < montoTotal) estadoDerivado = 'parcial';

       
        if (estadoFiltro !== 'todos' && estadoDerivado !== estadoFiltro) return false;

        return (
            cliente.includes(term) ||
            idVenta.includes(term) ||
            idCredito.includes(term) ||
            estadoDerivado.includes(term) ||
            (credito.estado || '').toLowerCase().includes(term)
        );
    });

    if (loading) {
        return (
            <div className="w-full px-4 md:px-12 lg:px-20 py-10 text-center">
                Cargando 
            </div>
        );
    }

    return (
        <div className="w-full px-4 md:px-12 lg:px-20 py-10 select-none">
            
            
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-800 w-full md:w-auto">
                    Ventas a Crédito
                </h2>

                <div className="flex w-full md:w-auto items-center gap-4">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            placeholder="cliente, ID de venta"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-grow border border-gray-500 rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px] w-full"
                        />
                        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 " size={18} />
                    </div>

                    <div>
                        <select
                            value={estadoFiltro}
                            onChange={(e) => setEstadoFiltro(e.target.value)}
                            className="h-[42px] border border-gray-500 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600"
                            title="Filtrar por estado"
                        >
                            <option value="todos">Todos</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="parcial">Parciales</option>
                            <option value="pagado">Pagados</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setOpenCrearManual(true)}
                        className="h-[42px] flex items-center bg-emerald-600 hover:bg-emerald-700 gap-2 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
                    >
                        <FiPlusCircle /> Registrar factura pendiente
                    </button>

                    <button
                        onClick={() => navigate(-1)}
                        className="h-[42px] flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 py-2 rounded-md font-semibold transition cursor-pointer"
                    >
                        <FiArrowLeft />
                        Volver
                    </button>
                </div>
            </div>

      
            <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
                <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
                    <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
                        <tr>
                            <th className="px-4 py-3">Documento</th>
                            <th className="px-4 py-3">Cliente</th>
                            <th className="px-4 py-3">Fecha Crédito</th>
                          
                            <th className="px-4 py-3 text-center">Total Crédito</th>
                            <th className="px-4 py-3 text-center">Monto Abonado</th>
                            <th className="px-4 py-3 text-center text-red-600">Saldo Pendiente</th>
                           
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCreditos.length > 0 ? (
                            filteredCreditos.map((credito) => {
                                
                                
                                const abonado = credito.monto_total - credito.saldo_pendiente;
                                const isPendiente = credito.saldo_pendiente > 0;
                                const montoTotal = Number(credito.monto_total || 0);
                                const saldo = Number(credito.saldo_pendiente || 0);
                                let estadoDerivado = 'pendiente';
                                if (saldo === 0) estadoDerivado = 'pagado';
                                else if (saldo < montoTotal) estadoDerivado = 'parcial';

                                return (
                                    <tr 
                                        key={credito.id_venta_credito} 
                                        className={`transition ${
                                            isPendiente 
                                                ? 'hover:bg-yellow-50' 
                                                : 'hover:bg-green-50'
                                        }`}
                                    >
                                     
                                        <td className="px-4 py-3">
                                            {credito.id_orden_venta ? (
                                                <span className="font-mono text-gray-700">OV #{credito.id_orden_venta}</span>
                                            ) : (
                                                <span className="font-mono text-slate-700">CR #{credito.id_venta_credito}</span>
                                            )}
                                        </td>

                                  
                                        <td className="px-4 py-3">{credito.cliente_nombre}</td>

                                 
                                        <td className="px-4 py-3">
                                            {credito.fecha
                                                ? new Date(credito.fecha).toLocaleDateString('es-CO')
                                                : ""}
                                        </td>

                                       
                                        <td className="px-4 py-3 text-center text-gray-800 font-medium">
                                            {formatCurrency(credito.monto_total)}
                                        </td>

                                       
                                        <td className="px-4 py-3 text-center text-green-600 font-medium">
                                            {formatCurrency(abonado)}
                                        </td>

                                        
                                        <td className={`px-4 py-3 text-center font-bold ${
                                            isPendiente ? 'text-red-600' : 'text-gray-500'
                                        }`}>
                                            {formatCurrency(credito.saldo_pendiente)}
                                        </td>

                                      
                                        <td className="px-4 py-3">
                                            <span
                                                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                    estadoDerivado === 'pendiente' ? 'bg-red-100 text-red-800' :
                                                    estadoDerivado === 'parcial' ? 'bg-slate-100 text-slate-800' :
                                                    'bg-green-100 text-green-800'
                                                }`}
                                            >
                                                {estadoDerivado.toUpperCase()}
                                            </span>
                                        </td>

                                    
                                        <td className="px-4 py-3 text-center flex gap-3 justify-center items-center">
                                            {isPendiente && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleAbonar(credito.id_venta_credito);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900 cursor-pointer p-1 rounded-full hover:bg-indigo-50 transition"
                                                    title="Registrar Abono"
                                                >
                                                    <FiPlusCircle size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                  
                                                    setHistorialCreditoId(credito.id_venta_credito);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 cursor-pointer p-1 rounded-full hover:bg-blue-50 transition"
                                                title="Ver Historial de Abonos"
                                            >
                                                <FiEye size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="8" className="text-center py-6 text-gray-500">
                                    No se encontraron cuentas por cobrar que coincidan con la búsqueda.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {showAbonoModal && selectedCredito && (
                <AbonoDrawer
                    credito={selectedCredito}
                    onClose={() => setShowAbonoModal(false)}
                    onSaved={async () => {
                        
                        setLoading(true);
                        try {
                            const res = await api.get(API_ENDPOINT);
                            setCreditos(res.data);
                            toast.success('Lista actualizada');
                        } catch (e) {
                            // Silenciar
                        } finally {
                            setLoading(false);
                        }
                    }}
                />
            )}
            {historialCreditoId && (
                <CreditoHistorialDrawer creditoId={historialCreditoId} onClose={() => setHistorialCreditoId(null)} />
            )}
                        {openCrearManual && (
                                <CrearCreditoManualModal
                                    open={openCrearManual}
                                    onClose={() => setOpenCrearManual(false)}
                                    onCreated={async () => {
                                        setLoading(true);
                                        try {
                                            const res = await api.get(API_ENDPOINT);
                                            setCreditos(res.data);
                                            toast.success('Lista actualizada');
                                        } catch (e) {
                                            // Silenciar
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                />
                        )}
        </div>
    );
};

export default VentasCredito;

