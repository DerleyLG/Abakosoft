import React from 'react';
import { useAuth } from '../context/AuthContext';
import { can } from '../utils/permissions';
import { FiLock, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

export default function RequirePermission({ action, children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div className="p-6">Cargando…</div>;

  const role = user?.rol;
  const allowed = can(role, action);

  if (!allowed) {
    return (
      <div className="w-full max-w-xl mx-auto mt-16 bg-white shadow rounded-xl p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <FiLock className="text-red-500" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acceso denegado</h2>
        <p className="text-slate-600 mb-6">No tienes permisos para ver esta sección. Si crees que es un error, consulta con un administrador.</p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-slate-800 rounded-md font-semibold cursor-pointer"
        >
          <FiArrowLeft /> Volver
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
