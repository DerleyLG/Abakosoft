import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// Crea el contexto de autenticación
export const AuthContext = createContext();

// Hook personalizado para simplificar el uso del contexto de autenticación
export const useAuth = () => {
    return useContext(AuthContext);
};

// Obtiene la URL base de la API desde la variable de entorno
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
    // Estado para almacenar los datos del usuario autenticado
    const [user, setUser] = useState(null);
    // Estado para saber si el proceso de carga inicial ha terminado
    const [loading, setLoading] = useState(true);

    // Intenta obtener el usuario a partir de un token existente
    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Usa la variable de entorno para la URL de la API
                    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    setUser(response.data);
                } catch (error) {
                    console.error('Error al verificar el token:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                    toast.error('Sesión caducada. Por favor, vuelve a iniciar sesión.');
                }
            }
            setLoading(false);
        };
        checkUser();
    }, []);

    // Función para manejar el inicio de sesión
    const login = async (nombre_usuario, pin) => {
        try {
            // Usa la variable de entorno para la URL de la API
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                nombre_usuario,
                pin,
            });

            const { token } = response.data;
            localStorage.setItem('token', token);

            const userResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            setUser(userResponse.data);
            return true; 
        } catch (error) {
            console.error('Error en el login:', error);
            return false; 
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        toast.success('Sesión cerrada.');
    };

    const value = {
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user, 
    };

    return (
        <AuthContext.Provider value={value}>
            <Toaster position="top-right" />
            {!loading && children}
        </AuthContext.Provider>
    );
};