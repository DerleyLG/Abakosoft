import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [nombre_usuario, setNombreUsuario] = useState('');
    const [pin, setPin] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth(); // Usamos el hook para obtener la función de login

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // La función login del contexto ahora se encarga de todo el proceso de la API
        const success = await login(nombre_usuario, pin);

        if (success) {
            toast.success('¡Inicio de sesión exitoso!');
            navigate('/dashboard'); 
        } else {
            toast.error('Credenciales incorrectas. Inténtalo de nuevo.');
        }
    };

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md">
                <h2 className="text-center text-2xl font-bold">Iniciar Sesión</h2>
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
                        <button
                            type="submit"
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                        >
                            Ingresar
                        </button>
                    </div>
                </form>
                {/*
                <div className="text-center">
                    <p className="text-sm text-gray-600"><span onClick={() => navigate('/register')} className="text-slate-600 hover:text-slate-800 font-medium cursor-pointer">Registrate</span></p>
                </div>
                */}
            </div>
        </div>
    );
};

export default Login;
