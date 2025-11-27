// src/pages/ListaLotesFabricacion.jsx
import React, { useEffect, useState } from "react";
import api from "../services/api";
import { FiTrash2, FiPlus, FiArrowLeft, FiSearch } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { confirmAlert } from 'react-confirm-alert';

const ListaLotesFabricacion = () => {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [buscar, setBuscar] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const navigate = useNavigate();

  const fetchLotes = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        sortBy: 'fecha',
        sortDir: 'desc',
      };
      
      if (buscar && buscar.trim()) {
        params.buscar = buscar.trim();
      }

      const res = await api.get("/lotes-fabricados", { params });
      const payload = res.data || {};
      
      setLotes(payload.data || []);
      setTotal(payload.total || 0);
      setTotalPages(payload.totalPages || 1);
      setHasNext(!!payload.hasNext);
      setHasPrev(!!payload.hasPrev);
    } catch (error) {
      toast.error("Error al cargar lotes");
      console.error(error);
      setLotes([]);
      setTotal(0);
      setTotalPages(1);
      setHasNext(false);
      setHasPrev(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLotes();
  }, [page, pageSize, buscar]);

  const handleDelete = (id) => {
    confirmAlert({
      title: 'Confirmar eliminación',
      message: '¿Seguro que quieres eliminar este lote?',
      buttons: [
        {
          label: 'Sí',
          onClick: async () => {
            try {
              await api.delete(`/lotes-fabricados/${id}`);
              toast.success('Lote eliminado');
              fetchLotes();
            } catch (error) {
              console.error('Error eliminando Lote', error);
              toast.error('Error al eliminar el Lote');
            }
          },
        },
        { label: 'No', onClick: () => {} },
      ],
    });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-4xl font-bold text-gray-800">
          Lotes Fabricados
        </h2>
      
        <button
          onClick={() => navigate("/ordenes_fabricacion")}
          className="bg-gray-300 hover:bg-gray-400 text-slate-800 px-4 py-2 rounded-md font-semibold h-[42px] flex items-center gap-2 cursor-pointer"
        >
          <FiArrowLeft />
          Volver
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por artículo, trabajador, cliente..."
            value={buscar}
            onChange={(e) => {
              setBuscar(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-600"
          />
        </div>
      </div>

      <div className="overflow-x-auto shadow rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-slate-200 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Orden</th>
              <th className="px-4 py-3 text-left font-semibold">Artículo</th>
              <th className="px-4 py-3 text-left font-semibold">Trabajador</th>
              <th className="px-4 py-3 text-left font-semibold">Cantidad</th>
              <th className="px-4 py-3 text-left font-semibold">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold">Observaciones</th>
              <th className="px-4 py-3 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Cargando lotes...
                </td>
              </tr>
            )}
            {!loading && lotes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No hay lotes fabricados registrados.
                </td>
              </tr>
            )}
            {!loading && lotes.map((lote) => (
              <tr key={lote.id_lote} className="border-t border-gray-200 hover:bg-slate-50 transition">
                <td className="px-4 py-3">
                  #{lote.id_orden_fabricacion} - {lote.nombre_cliente || "Sin cliente"}
                </td>
                <td className="px-4 py-3">{lote.descripcion_articulo || "N/A"}</td>
                <td className="px-4 py-3">{lote.nombre_trabajador || "N/A"}</td>
                <td className="px-4 py-3">{lote.cantidad}</td>
                <td className="px-4 py-3">
                  {new Date(lote.fecha).toLocaleDateString('es-CO')}
                </td>
                <td className="px-4 py-3">{lote.observaciones || "-"}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(lote.id_lote);
                    }}
                    className="text-red-600 hover:text-red-800 transition cursor-pointer"
                    title="Eliminar lote"
                  >
                    <FiTrash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación moderna */}
      <div className="mt-4 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-gray-600 font-medium">
            Página <span className="font-semibold text-gray-800">{page}</span> de{' '}
            <span className="font-semibold text-gray-800">{totalPages}</span> — {total} lotes
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!hasPrev || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              ← Anterior
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!hasNext || loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Siguiente →
            </button>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-600 cursor-pointer"
            >
              <option value={10}>10 / página</option>
              <option value={25}>25 / página</option>
              <option value={50}>50 / página</option>
              <option value={100}>100 / página</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListaLotesFabricacion;
