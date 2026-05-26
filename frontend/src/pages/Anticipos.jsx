import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const ListaAnticipos = () => {
  const [anticipos, setAnticipos] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnticipos = async () => {
      setLoading(true);
      try {
        const res = await api.get("/anticipos", {
          params: {
            page,
            pageSize,
            sortBy: "fecha",
            sortDir: "desc",
          },
        });
        const payload = res.data || {};
        setAnticipos(Array.isArray(payload.data) ? payload.data : []);
        setTotalPages(Number(payload.totalPages) || 1);
        setTotal(Number(payload.total) || 0);
        setHasNext(Boolean(payload.hasNext));
        setHasPrev(Boolean(payload.hasPrev));
      } catch (error) {
        console.error("Error al cargar anticipos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnticipos();
  }, [page, pageSize]);

  return (
    <div className="px-20 py-8 max-w-8xl mx-auto">
      <div className="flex justify-between items-center mb-8 border-b border-slate-300 p-5">
        <h2 className="text-4xl font-bold text-slate-700">Anticipos</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
          >
            <FiArrowLeft />
            <span>Volver</span>
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow-md overflow-x-auto border border-slate-200">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-700 uppercase text-xs font-semibold">
            <tr>
              <th className="px-4 py-2">Trabajador</th>
              <th className="px-4 py-2">Orden</th>
              <th className="px-4 py-2">Cliente</th>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Monto</th>
              <th className="px-4 py-2">Usado</th>
              <th className="px-4 py-2">Estado</th>
              <th className="px-4 py-2">Observaciones</th>
            </tr>
          </thead>
          <tbody className="text-slate-600">
            {loading && (
              <tr>
                <td colSpan="8" className="text-center py-6 text-slate-500">
                  Cargando...
                </td>
              </tr>
            )}
            {!loading && anticipos.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center py-6 text-slate-500">
                  No hay anticipos registrados.
                </td>
              </tr>
            )}
            {!loading &&
              anticipos.length > 0 &&
              anticipos.map((a) => (
                <tr
                  key={a.id_anticipo}
                  className="hover:bg-slate-50 border-t border-slate-100"
                >
                  <td className="px-4 py-2">{a.trabajador}</td>
                  <td className="px-4 py-2 font-mono">
                    #{a.id_orden_fabricacion}
                  </td>
                  <td className="px-4 py-2">{a.cliente || "N/D"}</td>
                  <td className="px-4 py-2">
                    {a.fecha
                      ? (() => {
                          // Evitar parseo con Date para no introducir desplazamientos por zona horaria.
                          const raw = String(a.fecha).split("T")[0];
                          const parts = raw.split("-");
                          if (parts.length === 3) {
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          return raw;
                        })()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    ${Number(a.monto).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    ${Number(a.monto_usado).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        a.estado === "pendiente"
                          ? "bg-yellow-100 text-yellow-800"
                          : a.estado === "parcial"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                      }`}
                    >
                      {a.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2">{a.observaciones || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {/* Paginación */}
        <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-600 font-medium">
              Página <span className="font-semibold text-gray-800">{page}</span>{" "}
              de{" "}
              <span className="font-semibold text-gray-800">{totalPages}</span>
              {total ? " — " : ""}
              <span className="font-semibold text-gray-800">{total || ""}</span>
              {total ? " anticipos" : ""}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => hasPrev && setPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                ← Anterior
              </button>
              <button
                onClick={() => hasNext && setPage((p) => p + 1)}
                disabled={!hasNext || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer"
              >
                Siguiente →
              </button>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              >
                <option value={10}>10 / página</option>
                <option value={20}>20 / página</option>
                <option value={50}>50 / página</option>
                <option value={100}>100 / página</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaAnticipos;
