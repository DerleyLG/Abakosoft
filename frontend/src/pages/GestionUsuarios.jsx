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
 const navigate = useNavigate();

 const fetchUsuarios = async () => {
  try {
   const res = await api.get('/usuarios');
   setUsuarios(res.data);
  } catch (error) {
   console.error('Error cargando usuarios', error);
   toast.error('Error al cargar la lista de usuarios.');
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
  <div className="w-full px-4 md:px-12 lg:px-20 py-10">
   <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
    <h2 className="text-4xl font-bold text-gray-800 w-full md:w-auto">Gestión de Usuarios</h2>
    <div className="flex w-full md:w-200 items-center gap-4">
     <div className="relative flex-grow">
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
      <input
       type="text"
       placeholder="Buscar por nombre, email o rol..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="flex-grow border border-gray-500 rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-slate-600 h-[42px]"
      />
     </div>
     <button
      onClick={handleCrearClick}
      className="h-[42px] flex items-center gap-2 bg-slate-800 hover:bg-slate-600 text-white px-4 py-2 rounded-md font-semibold transition cursor-pointer"
      title="Crear nuevo usuario"
     >
      <FiPlus size={20} />
      Crear usuario
     </button>
    </div>
   </div>

   <div className="bg-white p-6 rounded-xl shadow-lg overflow-x-auto">
    <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
     <thead className="bg-slate-200 text-gray-700 uppercase font-semibold select-none">
      <tr>
       <th className="px-4 py-3">Nombre</th>
       <th className="px-4 py-3">Rol</th>
       <th className="px-4 py-3 text-center">Acciones</th>
      </tr>
     </thead>
     <tbody>
      {filteredUsuarios.length > 0 ? (
       filteredUsuarios.map((user) => (
        <tr
         key={user.id_usuario}
         onDoubleClick={() => handleRowDoubleClick(user.id_usuario)}
         className="hover:bg-slate-300 cursor-pointer transition select-none"
        >
         <td className="px-4 py-3">{user.nombre_usuario}</td>
         \
         <td className="px-4 py-3">{user.nombre_rol}</td>
         <td className="px-4 py-3 text-center">
          <button
           onClick={(e) => {
            e.stopPropagation();
            handleDelete(user.id_usuario, user.nombre_usuario);
           }}
           className="text-red-600 hover:text-red-400 transition cursor-pointer"
           title="Eliminar usuario"
          >
           <FiTrash2 size={18} />
          </button>
         </td>
        </tr>
       ))
      ) : (
       <tr>
        <td colSpan="4" className="text-center py-6 text-gray-500">
         No se encontraron usuarios.
        </td>
       </tr>
      )}
     </tbody>
    </table>
   </div>
  </div>
 );
};

export default ListaUsuarios;