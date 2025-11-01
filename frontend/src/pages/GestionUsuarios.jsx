import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { confirmAlert } from 'react-confirm-alert';
import { FiPlus, FiTrash2, FiEdit, FiSearch } from 'react-icons/fi';
import 'react-confirm-alert/src/react-confirm-alert.css';
import '../styles/confirmAlert.css';

const ListaUsuarios = () => {
 const { isAuthenticated } = useContext(AuthContext);
 const [usuarios, setUsuarios] = useState([]);
 const [searchTerm, setSearchTerm] = useState('');
 const [loading, setLoading] = useState(false);
 const navigate = useNavigate();

 const fetchUsuarios = async () => {
    try {
     setLoading(true);
     const res = await api.get('/usuarios');
     setUsuarios(res.data);
    } catch (error) {
     console.error('Error cargando usuarios', error);
     toast.error('Error al cargar la lista de usuarios.');
    } finally {
     setLoading(false);
    }
 };

 // Este es el único useEffect que necesitas.
 useEffect(() => {
  if (isAuthenticated) {
   fetchUsuarios();
  }
 }, [isAuthenticated]);

 // Función para manejar la eliminación de un usuario
 const handleDelete = (id_usuario, nombre_usuario) => {
  confirmAlert({
   title: 'Confirmar eliminación',
   message: `¿Estás seguro de que quieres eliminar al usuario ${nombre_usuario}?`,
   buttons: [
    {
     label: 'Sí',
     onClick: async () => {
      try {
       await api.delete(`/usuarios/${id_usuario}`);
       toast.success('Usuario eliminado exitosamente.');
       fetchUsuarios(); // Recargar la lista
      } catch (error) {
       console.error('Error eliminando usuario', error);
       const errorMessage = error.response?.data?.mensaje || 'Error al eliminar el usuario.';
       toast.error(errorMessage);
      }
     },
    },
    {
     label: 'No',
     onClick: () => {},
    },
   ],
  });
 };

 const handleRowDoubleClick = (id) => {
  navigate(`/usuarios/editar/${id}`);
 };

 const handleCrearClick = () => {
  navigate('/usuarios/nuevo');
 };

 const filteredUsuarios = usuarios.filter((user) => {
  const term = searchTerm.toLowerCase();
  return (
   (user.nombre_usuario && user.nombre_usuario.toLowerCase().includes(term)) ||
   (user.nombre_trabajador && user.nombre_trabajador.toLowerCase().includes(term)) ||
   (user.nombre_rol && user.nombre_rol.toLowerCase().includes(term))
  );
 });

 return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-8">
     {/* Encabezado y acciones */}
     <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
         <div>
             <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Gestión de usuarios</h1>
            
         </div>
         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <div className="relative flex-1 sm:flex-initial sm:w-80">
                 <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                 <input
                     type="text"
                     placeholder="Buscar por rol"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full border border-slate-300 rounded-lg pl-10 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent"
                 />
             </div>
             <button
                 onClick={handleCrearClick}
                 className="cursor-pointer inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
             >
                 <FiPlus size={18} /> Nuevo usuario
             </button>
         </div>
     </div>

     {/* Contenedor tabla */}
     <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
             <table className="min-w-full text-sm text-slate-700">
                 <thead className="bg-slate-200 text-slate-600 uppercase text-xs tracking-wide">
                     <tr>
                         <th className="px-5 py-3 text-left">Usuario</th>
                         <th className="px-5 py-3 text-left">Rol</th>
                         <th className="px-5 py-3 text-center w-32">Acciones</th>
                     </tr>
                 </thead>
                 <tbody>
                     {loading ? (
                         <tr>
                             <td colSpan="3" className="px-5 py-6 text-center text-slate-500">Cargando usuarios…</td>
                         </tr>
                     ) : filteredUsuarios.length > 0 ? (
                         filteredUsuarios.map((user) => (
                             <tr
                                 key={user.id_usuario}
                                 onDoubleClick={() => handleRowDoubleClick(user.id_usuario)}
                                 className="hover:bg-slate-100 cursor-pointer transition-colors"
                             >
                                 <td className="px-5 py-3 font-medium text-slate-900">{user.nombre_usuario}</td>
                                 <td className="px-5 py-3">
                                     <span
                                         className={
                                             `inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ` +
                                             (user.nombre_rol === 'admin'
                                                 ? 'bg-slate-100 text-slate-800 border-slate-300'
                                                 : user.nombre_rol === 'supervisor'
                                                 ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                 : 'bg-amber-50 text-amber-700 border-amber-200')
                                         }
                                     >
                                         {user.nombre_rol}
                                     </span>
                                 </td>
                                 <td className="px-5 py-3">
                                     <div className="flex items-center justify-center gap-3">
                                         <button
                                             onClick={(e) => { e.stopPropagation(); navigate(`/usuarios/editar/${user.id_usuario}`); }}
                                             className="text-slate-600 hover:text-slate-900 transition cursor-pointer"
                                             title="Editar"
                                         >
                                             <FiEdit size={18} />
                                         </button>
                                         <button
                                             onClick={(e) => { e.stopPropagation(); handleDelete(user.id_usuario, user.nombre_usuario); }}
                                             className="text-red-600 hover:text-red-700 transition cursor-pointer"
                                             title="Eliminar"
                                         >
                                             <FiTrash2 size={18} />
                                         </button>
                                     </div>
                                 </td>
                             </tr>
                         ))
                     ) : (
                         <tr>
                             <td colSpan="3" className="px-5 py-10">
                                 <div className="flex flex-col items-center justify-center text-center">
                                     <div className="text-slate-400 mb-2">No se encontraron usuarios</div>
                                     <button
                                         onClick={handleCrearClick}
                                         className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition"
                                     >
                                         <FiPlus size={18} /> Crear el primero
                                     </button>
                                 </div>
                             </td>
                         </tr>
                     )}
                 </tbody>
             </table>
         </div>
     </div>
    </div>
 );
};

export default ListaUsuarios;