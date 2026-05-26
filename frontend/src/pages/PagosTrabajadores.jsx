import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { FiPlus, FiTrash2, FiChevronDown } from "react-icons/fi";
import React from "react";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";

const PagosTrabajadores = () => {
  const [pagos, setPagos] = useState([]);
  const [trabajadores, setTrabajadores] = useState([]);
  const [trabajadorFiltro, setTrabajadorFiltro] = useState("");
  const [expandedPago, setExpandedPago] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const resTrabajadores = await api.get("/trabajadores");
        setTrabajadores(resTrabajadores.data || []);
      } catch (error) {
        console.error("Error cargando trabajadores:", error);
      }
    };
    fetchInit();
  }, []);

  useEffect(() => {
    const fetchPagos = async () => {
      setLoading(true);
      try {
        const resPagos = await api.get("/pagos", {
          params: {
            page,
            pageSize,
            sortBy: "fecha_pago",
            sortDir: "desc",
            trabajadorId: trabajadorFiltro || undefined,
          },
        });
        const payload = resPagos.data || {};
        setPagos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
      } catch (error) {
        console.error("Error cargando pagos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, [page, pageSize, trabajadorFiltro]);

  const toggleExpand = async (id_pago) => {
    if (expandedPago === id_pago) {
      setExpandedPago(null);
      return;
    }

    const pago = pagos.find((p) => p.id_pago === id_pago);
    if (!pago.detalles) {
      try {
        const res = await api.get(`/detalle-pago-trabajador/${id_pago}`);

        setPagos((prev) =>
          prev.map((p) =>
            p.id_pago === id_pago ? { ...p, detalles: res.data } : p,
          ),
        );
      } catch (error) {
        console.error("Error al cargar detalles:", error);
        return;
      }
    }
    setExpandedPago(id_pago);
  };

  const handleDeletePago = (id_pago, trabajador) => {
    confirmAlert({
      title: "Eliminar pago",
      message: `¿Seguro que quieres eliminar el pago de ${trabajador}? Los avances volverán a estado "pendiente de pago".`,
      buttons: [
        {
          label: "Sí, eliminar",
          onClick: async () => {
            try {
              const { data } = await api.delete(`/pagos/${id_pago}`);
              toast.success("Pago eliminado correctamente");
              if (data.tesoreriaEliminada) {
                toast.success("Movimiento de tesorería asociado eliminado");
              }
              const resPagos = await api.get("/pagos", {
                params: {
                  page,
                  pageSize,
                  sortBy: "fecha_pago",
                  sortDir: "desc",
                  trabajadorId: trabajadorFiltro || undefined,
                },
              });
              const payload = resPagos.data || {};
              setPagos(Array.isArray(payload.data) ? payload.data : []);
              setTotalPages(Number(payload.totalPages) || 1);
              setTotal(Number(payload.total) || 0);
              setHasNext(Boolean(payload.hasNext));
              setHasPrev(Boolean(payload.hasPrev));
            } catch (error) {
              console.error("Error eliminando pago:", error);
              toast.error("Error al eliminar el pago");
            }
          },
        },
        {
          label: "Cancelar",
          onClick: () => {},
        },
      ],
    });
  };

  const onTrabajadorChange = (e) => {
    setTrabajadorFiltro(e.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Pagos
          </h1>
          {total > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
              {total}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate("/avances_fabricacion")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Avances de fabricación
          </button>
          <button
            onClick={() => navigate("/pagos_anticipados")}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            Anticipos
          </button>
          <button
            onClick={() => navigate("/pagos/nuevo")}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <FiPlus size={16} />
            Registrar pago
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-slate-600 whitespace-nowrap">
          Filtrar por trabajador:
        </label>
        <select
          className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent cursor-pointer min-w-[160px]"
          value={trabajadorFiltro}
          onChange={onTrabajadorChange}
        >
          <option value="">Todos</option>
          {trabajadores.map((t) => (
            <option key={t.id_trabajador} value={t.id_trabajador}>
              {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Trabajador
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Monto total
                </th>
                <th className="px-4 py-3 w-24">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-slate-100 rounded w-full animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pagos.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-16">
                    <p className="text-sm font-medium text-slate-400">
                      No se encontraron pagos.
                    </p>
                  </td>
                </tr>
              ) : (
                pagos.map((pago) => (
                  <React.Fragment key={pago.id_pago}>
                    <tr
                      onClick={() => toggleExpand(pago.id_pago)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors select-none group ${
                        expandedPago === pago.id_pago
                          ? "bg-slate-50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {pago.trabajador}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {pago.fecha_pago
                          ? (() => {
                              // Extraer solo la parte de fecha YYYY-MM-DD del string
                              const fechaStr = String(pago.fecha_pago)
                                .split("T")[0]
                                .split(" ")[0];
                              const [year, month, day] = fechaStr.split("-");
                              return `${day}/${month}/${year}`;
                            })()
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        ${Number(pago.total).toLocaleString("es-CO") || "0.00"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`text-slate-400 transition-transform duration-200 ${
                              expandedPago === pago.id_pago ? "rotate-180" : ""
                            }`}
                          >
                            <FiChevronDown size={15} />
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePago(pago.id_pago, pago.trabajador);
                            }}
                            className="opacity-0 group-hover:opacity-100 inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                            title="Eliminar pago"
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPago === pago.id_pago && (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-6 py-4 bg-slate-50/60 border-b border-slate-100"
                        >
                          {pago.observaciones && (
                            <p className="text-xs text-slate-500 mb-3">
                              <span className="font-semibold text-slate-600">
                                Observaciones:
                              </span>{" "}
                              {pago.observaciones}
                            </p>
                          )}
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Orden / Etapa
                                  </th>
                                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Cantidad
                                  </th>
                                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Pago unitario
                                  </th>
                                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                    Subtotal
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {pago.detalles && pago.detalles.length > 0 ? (
                                  pago.detalles.map((d, index) => (
                                    <tr
                                      key={index}
                                      className="border-b border-slate-100 last:border-0"
                                    >
                                      <td className="px-3 py-2 text-slate-700">
                                        {parseInt(d.es_descuento) === 1
                                          ? "Descuento por anticipo"
                                          : `#${d.id_orden_fabricacion} — ${d.nombre_cliente} · ${d.nombre_etapa}`}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">
                                        {d.cantidad}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600">
                                        $
                                        {Number(
                                          d.pago_unitario,
                                        ).toLocaleString()}
                                      </td>
                                      <td className="px-3 py-2 text-right font-semibold text-slate-700">
                                        ${Number(d.subtotal).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan="4"
                                      className="text-center py-4 text-slate-400 text-xs"
                                    >
                                      No hay detalles disponibles.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Página{" "}
              <span className="font-semibold text-slate-700">{page}</span> de{" "}
              <span className="font-semibold text-slate-700">{totalPages}</span>
              {total > 0 && (
                <>
                  {" "}
                  —{" "}
                  <span className="font-semibold text-slate-700">
                    {total}
                  </span>{" "}
                  pagos en total
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => hasNext && setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value={10}>10 / pág.</option>
                <option value={20}>20 / pág.</option>
                <option value={50}>50 / pág.</option>
                <option value={100}>100 / pág.</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PagosTrabajadores;
