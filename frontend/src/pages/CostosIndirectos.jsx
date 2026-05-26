import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import toast from "react-hot-toast";
import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import "../styles/confirmAlert.css";
import {
  FiTrash2,
  FiPlus,
  FiArrowLeft,
  FiChevronDown,
  FiDollarSign,
} from "react-icons/fi";

const CostosIndirectos = () => {
  const [costos, setCostos] = useState([]);
  const [resumenAsignado, setResumenAsignado] = useState({});
  const [expandidos, setExpandidos] = useState({});
  const [asignacionesDetalle, setAsignacionesDetalle] = useState({});
  const [filterMode, setFilterMode] = useState("registrados");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  const fetchCostos = async () => {
    try {
      const res = await api.get("/costos-indirectos", {
        params: {
          page,
          pageSize,
          sortBy: "fecha",
          sortDir: "desc",
        },
      });
      const rows = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setCostos(rows);
      setTotal(res.data?.total || rows.length);
      setTotalPages(res.data?.totalPages || 1);

      const ids = rows.map((r) => r.id_costo_indirecto).filter(Boolean);
      if (ids.length > 0) {
        const chunkSize = 60;
        const map = {};
        for (let i = 0; i < ids.length; i += chunkSize) {
          const sub = ids.slice(i, i + chunkSize);
          const rr = await api.get("/costos-indirectos-asignados/resumen", {
            params: { ids: sub.join(",") },
          });
          (Array.isArray(rr.data) ? rr.data : []).forEach((row) => {
            map[row.id_costo_indirecto] = Number(row.total_asignado) || 0;
          });
        }
        setResumenAsignado(map);
      } else {
        setResumenAsignado({});
      }
    } catch (error) {
      console.error("Error cargando costos indirectos", error);
    }
  };

  useEffect(() => {
    fetchCostos();
  }, [page, pageSize]);

  const toggleExpand = async (idCosto, e) => {
    if (e) e.stopPropagation();

    const yaExpandido = expandidos[idCosto];

    if (yaExpandido) {
      setExpandidos((prev) => ({ ...prev, [idCosto]: false }));
    } else {
      setExpandidos((prev) => ({ ...prev, [idCosto]: true }));

      if (!asignacionesDetalle[idCosto]) {
        try {
          const res = await api.get(
            `/costos-indirectos-asignados/costo/${idCosto}`,
          );
          const asignaciones = Array.isArray(res.data) ? res.data : [];
          setAsignacionesDetalle((prev) => ({
            ...prev,
            [idCosto]: asignaciones,
          }));
        } catch (error) {
          console.error("Error cargando asignaciones:", error);
          toast.error("Error al cargar los detalles de asignación");
          setExpandidos((prev) => ({ ...prev, [idCosto]: false }));
        }
      }
    }
  };

  const handleDelete = (id) => {
    confirmAlert({
      title: "Confirmar eliminación",
      message: "¿Seguro que quieres eliminar este costo indirecto?",
      buttons: [
        {
          label: "Sí",
          onClick: async () => {
            try {
              const { data } = await api.delete(`/costos-indirectos/${id}`);
              toast.success("Costo indirecto eliminado");
              if (data.tesoreriaEliminada) {
                toast.success("Movimiento de tesorería asociado eliminado");
              }
              fetchCostos();
              setCostos((prev) => prev.filter((c) => c.id !== id));
            } catch (error) {
              console.error("Error eliminando costo indirecto", error);
              toast.error("Error al eliminar el costo");
            }
          },
        },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  const filteredCostos = costos.filter((costo) => {
    const match = (costo.tipo_costo || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    if (!match) return false;
    const asignado = resumenAsignado[costo.id_costo_indirecto] || 0;
    const total = Number(costo.valor || 0);
    if (filterMode === "registrados") return asignado < total;
    if (filterMode === "asignados") return asignado >= total && total > 0;
    return true;
  });

  const fmtCOP = (n) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  return (
    <div className="min-h-[calc(100vh-68px)] bg-slate-50 px-4 md:px-8 xl:px-12 py-6 flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Costos indirectos
          </h1>
          {total > 0 && (
            <p className="text-xs text-slate-400 mt-0.5">{total} registros</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate("/costos_indirectos/nuevo")}
            className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white shadow-sm transition-colors cursor-pointer"
          >
            <FiPlus size={14} /> Registrar
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm transition-colors cursor-pointer"
          >
            <FiArrowLeft size={14} /> Volver
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Tipo de costo…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400 transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Estado
            </label>
            <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden">
              {[
                { key: "registrados", label: "Registrados" },
                { key: "asignados", label: "Asignados" },
                { key: "todos", label: "Todos" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilterMode(key)}
                  className={`px-3 py-2 text-xs font-medium transition cursor-pointer border-r border-slate-200 last:border-r-0 ${
                    filterMode === key
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-8 px-3 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                 ID
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Tipo de costo
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Período
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Observaciones
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCostos.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-16">
                    <FiDollarSign
                      size={32}
                      className="mx-auto text-slate-300 mb-2"
                    />
                    <p className="text-sm font-semibold text-slate-500">
                      Sin costos
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {searchTerm
                        ? "No hay resultados para esa búsqueda"
                        : "No hay costos indirectos registrados"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCostos.map((costo) => {
                  const asignado =
                    resumenAsignado[costo.id_costo_indirecto] || 0;
                  const tieneAsignaciones = asignado > 0;
                  const expandido = expandidos[costo.id_costo_indirecto];
                  const detalles =
                    asignacionesDetalle[costo.id_costo_indirecto] || [];
                  const totalVal = Number(costo.valor || 0);
                  const pct =
                    totalVal > 0 ? Math.round((asignado / totalVal) * 100) : 0;

                  return (
                    <React.Fragment key={costo.id_costo_indirecto}>
                      <tr
                        onClick={() =>
                          tieneAsignaciones &&
                          toggleExpand(costo.id_costo_indirecto)
                        }
                        className={`group transition-colors ${tieneAsignaciones ? "cursor-pointer" : ""} ${
                          expandido
                            ? "bg-indigo-50 border-l-2 border-l-indigo-400"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-3 py-3 text-center">
                          {tieneAsignaciones && (
                            <FiChevronDown
                              size={14}
                              className={`text-slate-400 transition-transform duration-150 mx-auto ${expandido ? "rotate-180" : ""}`}
                            />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">
                          #{costo.id_costo_indirecto}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 capitalize">
                          {costo.tipo_costo}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {costo.fecha_inicio && costo.fecha_fin ? (
                            <span className="text-slate-300">—</span>
                          ) : costo.fecha ? (
                            new Date(
                              costo.fecha.split("T")[0] + "T00:00:00",
                            ).toLocaleDateString("es-CO")
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {costo.fecha_inicio && costo.fecha_fin ? (
                            `${new Date(costo.fecha_inicio.split("T")[0] + "T00:00:00").toLocaleDateString("es-CO")} – ${new Date(costo.fecha_fin.split("T")[0] + "T00:00:00").toLocaleDateString("es-CO")}`
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">
                          {fmtCOP(costo.valor)}
                        </td>
                        <td
                          className="px-4 py-3 max-w-[180px] truncate text-xs text-slate-500"
                          title={costo.observaciones || ""}
                        >
                          {costo.observaciones || (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {(() => {
                            if (!totalVal || asignado <= 0)
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                  REGISTRADO
                                </span>
                              );
                            if (asignado >= totalVal)
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  ASIGNADO 100%
                                </span>
                              );
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                ASIGNADO {pct}%
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(costo.id_costo_indirecto);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Eliminar"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>

                      {expandido && tieneAsignaciones && (
                        <tr>
                          <td
                            colSpan="9"
                            className="p-0 bg-indigo-50/60 border-b border-indigo-100"
                          >
                            <div className="px-8 py-4">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                Asignaciones
                              </p>
                              {detalles.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  Cargando detalles…
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {detalles.map((asig, idx) => {
                                    const nombreCompleto =
                                      asig.nombre_cliente &&
                                      asig.apellido_cliente
                                        ? `${asig.nombre_cliente} ${asig.apellido_cliente}`
                                        : asig.nombre_cliente || "Sin cliente";
                                    const ESTADO_CLS = {
                                      completada:
                                        "bg-emerald-50 text-emerald-700 border border-emerald-200",
                                      "en proceso":
                                        "bg-indigo-50 text-indigo-700 border border-indigo-200",
                                      pendiente:
                                        "bg-amber-50 text-amber-700 border border-amber-200",
                                    };
                                    return (
                                      <div
                                        key={idx}
                                        className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
                                      >
                                        <div className="flex items-start gap-4 flex-wrap">
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <span className="font-bold text-slate-800 text-sm">
                                              OF #{asig.id_orden_fabricacion}
                                            </span>
                                            {asig.estado && (
                                              <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${ESTADO_CLS[asig.estado] || "bg-slate-50 text-slate-600 border border-slate-200"}`}
                                              >
                                                {asig.estado.toUpperCase()}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                            <div>
                                              <span className="text-slate-400">
                                                Cliente:{" "}
                                              </span>
                                              <span className="font-medium text-slate-700">
                                                {nombreCompleto}
                                              </span>
                                            </div>
                                            {asig.cantidad && (
                                              <div>
                                                <span className="text-slate-400">
                                                  Cantidad:{" "}
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                  {asig.cantidad}
                                                </span>
                                              </div>
                                            )}
                                            {asig.fecha_inicio && (
                                              <div>
                                                <span className="text-slate-400">
                                                  Inicio:{" "}
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                  {new Date(
                                                    asig.fecha_inicio.split(
                                                      "T",
                                                    )[0] + "T00:00:00",
                                                  ).toLocaleDateString("es-CO")}
                                                </span>
                                              </div>
                                            )}
                                            {(asig.fecha_entrega ||
                                              asig.fecha_fin_estimada) && (
                                              <div>
                                                <span className="text-slate-400">
                                                  Entrega:{" "}
                                                </span>
                                                <span className="font-medium text-slate-700">
                                                  {new Date(
                                                    (
                                                      asig.fecha_entrega ||
                                                      asig.fecha_fin_estimada
                                                    ).split("T")[0] +
                                                      "T00:00:00",
                                                  ).toLocaleDateString("es-CO")}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex-shrink-0 text-right">
                                            <span className="text-xs text-slate-400">
                                              Asignado
                                            </span>
                                            <p className="font-bold text-slate-900 text-sm">
                                              {fmtCOP(asig.valor_asignado)}
                                            </p>
                                          </div>
                                        </div>
                                        {asig.observaciones && (
                                          <p className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 italic">
                                            {asig.observaciones}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm px-4 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {costos.length > 0 ? (page - 1) * pageSize + 1 : 0}–
            {Math.min(page * pageSize, total)} de{" "}
            <span className="font-semibold text-slate-700">{total}</span>{" "}
            registros
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            {[...Array(totalPages)].map((_, idx) => {
              const n = idx + 1;
              if (
                n === 1 ||
                n === totalPages ||
                (n >= page - 1 && n <= page + 1)
              ) {
                return (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition cursor-pointer ${n === page ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
                  >
                    {n}
                  </button>
                );
              } else if (n === page - 2 || n === page + 2) {
                return (
                  <span key={n} className="text-slate-400 text-xs">
                    …
                  </span>
                );
              }
              return null;
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 transition cursor-pointer"
            >
              <option value="5">5 / página</option>
              <option value="10">10 / página</option>
              <option value="20">20 / página</option>
              <option value="50">50 / página</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostosIndirectos;
