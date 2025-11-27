import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL;
const Register = () => {
    // Estado para los campos del formulario de registro
    const [nombre_usuario, setNombreUsuario] = useState('');
    const [pin, setPin] = useState('');
    // El estado 'rol' ahora almacenará el nombre del rol seleccionado
    const [rol, setRol] = useState('');
    const navigate = useNavigate();

    // Mapeo de nombres de rol a IDs de tu base de datos
    // Estos IDs son ejemplos. Debes asegurarte de que coincidan con los de tu tabla de roles.
    const roleIdMap = {
        administrador: 1,
        supervisor: 2,
        empleado: 3,
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Obtener el ID del rol a partir del nombre seleccionado
            const id_rol = roleIdMap[rol];
            // ID de trabajador por defecto. En un caso real, esto se manejaría en el backend.
            const id_trabajador = 1; 

            if (!id_rol) {
                toast.error('Por favor, selecciona un rol válido.');
                return;
            }

            // Llama al endpoint de registro para crear un nuevo usuario
          const response = await axios.post(`${API_BASE_URL}/auth/register`, {
                nombre_usuario,
                pin,
                id_trabajador,
                id_rol,
            });

            toast.success('¡Registro exitoso! Ya puedes iniciar sesión.');
         
            navigate('/login'); // Redirige al usuario a la página de inicio de sesión

        } catch (error) {
            console.error('Error al registrar el usuario:', error);
            // Muestra un mensaje de error al usuario
            const errorMessage = error.response?.data?.message || 'Error al registrar. Inténtalo de nuevo.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-center text-2xl font-bold">Registrar Usuario</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="nombre_usuario" className="block text-sm font-medium text-gray-700">
                            Nombre de usuario
                        </label>
                        <input
                            type="text"
                            id="nombre_usuario"
                            value={nombre_usuario}
                            onChange={(e) => setNombreUsuario(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                            PIN
                        </label>
                        <input
                            type="password"
                            id="pin"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="rol" className="block text-sm font-medium text-gray-700">
                            Rol
                        </label>
                        <select
                            id="rol"
                            value={rol}
                            onChange={(e) => setRol(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500"
                            required
                        >
                            <option value="">Selecciona un rol</option>
                            <option value="administrador">Administrador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="empleado">Empleado</option>
                        </select>
                    </div>
                    <div>
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            Registrarse
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <p className="text-sm text-gray-600">¿Ya tienes una cuenta? <span onClick={() => navigate('/login')} className="text-slate-600 hover:text-slate-800 font-medium cursor-pointer">Inicia sesión aquí</span></p>
                </div>
            </div>
        </div>
    );
};

export default Register;
