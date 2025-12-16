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
  FiChevronRight,
} from "react-icons/fi";

const CostosIndirectos = () => {
  const [costos, setCostos] = useState([]);
  const [resumenAsignado, setResumenAsignado] = useState({});
  const [expandidos, setExpandidos] = useState({});
  const [asignacionesDetalle, setAsignacionesDetalle] = useState({});
  const [filterMode, setFilterMode] = useState("registrados"); // 'registrados' | 'asignados' | 'todos'
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

      // Cargar resumen asignado
      const ids = rows.map((r) => r.id_costo_indirecto).filter(Boolean);
      if (ids.length > 0) {
        const chunkSize = 60; // evitar URLs enormes
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
      // Colapsar
      setExpandidos((prev) => ({ ...prev, [idCosto]: false }));
    } else {
      // Expandir y cargar detalles si no están cargados
      setExpandidos((prev) => ({ ...prev, [idCosto]: true }));

      if (!asignacionesDetalle[idCosto]) {
        try {
          const res = await api.get(
            `/costos-indirectos-asignados/costo/${idCosto}`
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
              await api.delete(`/costos-indirectos/${id}`);
              toast.success("Costo indirecto eliminado");
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

  return (
    <div className="w-full px-4 md:px-12 lg:px-20 py-10">
      {/* Título */}
      <div className="mb-2">
        <h2 className="text-4xl font-bold text-gray-800">Costos Indirectos</h2>
      </div>

      {/* Barra de controles en una sola línea horizontal (scroll horizontal en pantallas pequeñas) */}
      <div className="my-5 w-full overflow-x-auto">
        <div className="flex items-center gap-3 whitespace-nowrap">
          {/* Filtros en línea */}
          <div className="inline-flex items-center gap-3">
            <input
              type="text"
              placeholder="Buscar tipo de costo…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-500 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[44px] w-[240px]"
              aria-label="Buscar costos indirectos"
            />
            <div
              className="flex items-center rounded-md border border-slate-300 overflow-hidden h-[44px]"
              role="group"
              aria-label="Filtrar estado"
            >
              <button
                type="button"
                onClick={() => setFilterMode("registrados")}
                className={`cursor-pointer px-3 h-full text-sm ${
                  filterMode === "registrados"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-700"
                }`}
                title="Registrados"
              >
                Registrados
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("asignados")}
                className={`cursor-pointer px-3 h-full text-sm border-l ${
                  filterMode === "asignados"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-700"
                }`}
                title="Asignados"
              >
                Asignados
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("todos")}
                className={`cursor-pointer px-3 h-full text-sm border-l ${
                  filterMode === "todos"
                    ? "bg-slate-800 text-white"
                    : "bg-white text-slate-700"
                }`}
                title="Todos"
              >
                Todos
              </button>
            </div>
          </div>

          {/* Botones alineados a la derecha en la misma línea */}
          <div className="ml-auto inline-flex items-center gap-2">
            <button
              onClick={() => navigate("/costos_indirectos/nuevo")}
              className="h-[44px] inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 rounded-md font-semibold transition cursor-pointer text-base"
            >
              <FiPlus size={20} />
              Registrar
            </button>

            <button
              onClick={() => navigate(-1)}
              className="h-[44px] inline-flex items-center bg-gray-300 hover:bg-gray-400 gap-2 text-bg-slate-800 px-4 rounded-md font-semibold transition cursor-pointer text-base"
            >
              <FiArrowLeft size={20} />
              Volver
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
          <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
            <tr>
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Tipo de Costo</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Período Vigencia</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Observaciones</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCostos.length > 0 ? (
              filteredCostos.map((costo) => {
                const asignado = resumenAsignado[costo.id_costo_indirecto] || 0;
                const tieneAsignaciones = asignado > 0;
                const expandido = expandidos[costo.id_costo_indirecto];
                const detalles =
                  asignacionesDetalle[costo.id_costo_indirecto] || [];

                return (
                  <React.Fragment key={costo.id_costo_indirecto}>
                    <tr
                      onClick={() =>
                        tieneAsignaciones &&
                        toggleExpand(costo.id_costo_indirecto)
                      }
                      className={`transition select-none ${
                        tieneAsignaciones
                          ? "hover:bg-slate-200 cursor-pointer"
                          : "hover:bg-slate-100"
                      }`}
                    >
                      <td className="px-4 py-3">
                        {tieneAsignaciones && (
                          <button
                            onClick={(e) =>
                              toggleExpand(costo.id_costo_indirecto, e)
                            }
                            className="text-slate-600 hover:text-slate-800 transition"
                            title={expandido ? "Colapsar" : "Expandir"}
                          >
                            {expandido ? (
                              <FiChevronDown size={18} />
                            ) : (
                              <FiChevronRight size={18} />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-600">
                        #{costo.id_costo_indirecto}
                      </td>
                      <td className="px-4 py-3 capitalize">
                        {costo.tipo_costo}
                      </td>
                      <td className="px-4 py-3">
                        {costo.fecha_inicio && costo.fecha_fin ? (
                          <span className="text-gray-400 text-xs">-</span>
                        ) : costo.fecha ? (
                          new Date(
                            costo.fecha.split("T")[0] + "T00:00:00"
                          ).toLocaleDateString("es-CO")
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {costo.fecha_inicio && costo.fecha_fin ? (
                          <span className="text-sm">
                            {new Date(
                              costo.fecha_inicio.split("T")[0] + "T00:00:00"
                            ).toLocaleDateString("es-CO")}{" "}
                            -{" "}
                            {new Date(
                              costo.fecha_fin.split("T")[0] + "T00:00:00"
                            ).toLocaleDateString("es-CO")}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {new Intl.NumberFormat("es-CO", {
                          style: "currency",
                          currency: "COP",
                          maximumFractionDigits: 0,
                        }).format(Number(costo.valor) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        {costo.observaciones || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const total = Number(costo.valor || 0);
                          if (!total || asignado <= 0) {
                            return (
                              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-800">
                                Registrado
                              </span>
                            );
                          }
                          if (asignado >= total) {
                            return (
                              <span className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-800">
                                Asignado 100%
                              </span>
                            );
                          }
                          const pct = Math.round((asignado / total) * 100);
                          return (
                            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-800">
                              Asignado {pct}%
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(costo.id_costo_indirecto);
                          }}
                          className="text-red-600 hover:text-red-400 transition cursor-pointer"
                          title="Eliminar"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </td>
                    </tr>

                    {/* Fila expandida con detalles de asignaciones */}
                    {expandido && tieneAsignaciones && (
                      <tr className="bg-slate-50">
                        <td colSpan="8" className="px-4 py-3">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                              Asignaciones:
                            </h4>
                            {detalles.length > 0 ? (
                              <div className="space-y-2">
                                {detalles.map((asig, idx) => {
                                  const nombreCompleto =
                                    asig.nombre_cliente && asig.apellido_cliente
                                      ? `${asig.nombre_cliente} ${asig.apellido_cliente}`
                                      : asig.nombre_cliente || "Sin cliente";

                                  return (
                                    <div
                                      key={idx}
                                      className="border border-slate-200 rounded-md p-3 bg-white"
                                    >
                                      <div className="flex items-start gap-4 flex-wrap">
                                        <div className="flex-shrink-0">
                                          <span className="font-bold text-slate-700">
                                            OF #{asig.id_orden_fabricacion}
                                          </span>
                                          <span
                                            className={`ml-2 px-2 py-0.5 text-xs rounded ${
                                              asig.estado === "completada"
                                                ? "bg-green-100 text-green-800"
                                                : asig.estado === "en proceso"
                                                ? "bg-blue-100 text-blue-800"
                                                : asig.estado === "pendiente"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : "bg-gray-100 text-gray-800"
                                            }`}
                                          >
                                            {asig.estado}
                                          </span>
                                        </div>

                                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                          <div>
                                            <span className="text-slate-500">
                                              Cliente:
                                            </span>
                                            <span className="ml-1 font-medium text-slate-700">
                                              {nombreCompleto}
                                            </span>
                                          </div>

                                          {asig.cantidad && (
                                            <div>
                                              <span className="text-slate-500">
                                                Cantidad:
                                              </span>
                                              <span className="ml-1 font-medium text-slate-700">
                                                {asig.cantidad}
                                              </span>
                                            </div>
                                          )}

                                          {asig.fecha_inicio && (
                                            <div>
                                              <span className="text-slate-500">
                                                Fecha inicio:
                                              </span>
                                              <span className="ml-1 font-medium text-slate-700">
                                                {new Date(
                                                  asig.fecha_inicio.split(
                                                    "T"
                                                  )[0] + "T00:00:00"
                                                ).toLocaleDateString("es-CO")}
                                              </span>
                                            </div>
                                          )}

                                          {(asig.fecha_entrega ||
                                            asig.fecha_fin_estimada) && (
                                            <div>
                                              <span className="text-slate-500">
                                                Fecha de entrega estimada:
                                              </span>
                                              <span className="ml-1 font-medium text-slate-700">
                                                {new Date(
                                                  (
                                                    asig.fecha_entrega ||
                                                    asig.fecha_fin_estimada
                                                  ).split("T")[0] + "T00:00:00"
                                                ).toLocaleDateString("es-CO")}
                                              </span>
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex-shrink-0">
                                          <span className="text-slate-500 text-xs">
                                            Valor asignado:
                                          </span>
                                          <span className="ml-1 font-bold text-slate-800">
                                            {new Intl.NumberFormat("es-CO", {
                                              style: "currency",
                                              currency: "COP",
                                              maximumFractionDigits: 0,
                                            }).format(
                                              Number(asig.valor_asignado) || 0
                                            )}
                                          </span>
                                        </div>
                                      </div>

                                      {asig.observaciones && (
                                        <div className="mt-2 pt-2 border-t border-slate-200">
                                          <span className="text-xs text-slate-500">
                                            Observaciones:{" "}
                                          </span>
                                          <span className="text-xs text-slate-700 italic">
                                            {asig.observaciones}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">
                                Cargando detalles...
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center py-6 text-gray-500">
                  No se encontraron costos indirectos registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-6 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 font-medium">
            Mostrando{" "}
            <span className="font-semibold text-gray-800">
              {costos.length > 0 ? (page - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-gray-800">
              {Math.min(page * pageSize, total)}
            </span>{" "}
            de <span className="font-semibold text-gray-800">{total}</span>{" "}
            costos
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
            >
              ← Anterior
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`min-w-[40px] px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                        page === pageNum
                          ? "bg-slate-700 text-white shadow-sm"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={pageNum} className="px-2 text-gray-500">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
            >
              Siguiente →
            </button>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
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
