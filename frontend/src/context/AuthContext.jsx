import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast'; 

// Crea el contexto de autenticación
export const AuthContext = createContext();

// Hook personalizado para simplificar el uso del contexto de autenticación
export const useAuth = () => {
    return useContext(AuthContext);
};


export const AuthProvider = ({ children }) => {
    // Estado para almacenar los datos del usuario autenticado
    const [user, setUser] = useState(null);
    // Estado para saber si el proceso de carga inicial ha terminado
    const [loading, setLoading] = useState(true);

    // 
    // Intenta obtener el usuario a partir de un token existente
    useEffect(() => {
        const checkUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Verificamos el token en el backend
                    const response = await axios.get('http://localhost:3002/api/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });
                    // Si el token es válido, establecemos los datos del usuario
                    setUser(response.data);
                } catch (error) {
                    // Si el token es inválido o la ruta falla, limpiamos el token
                    console.error('Error al verificar el token:', error);
                    localStorage.removeItem('token');
                    setUser(null);
                    // Usamos toast.error para mostrar una notificación
                    toast.error('Sesión caducada. Por favor, vuelve a iniciar sesión.');
                }
            }
            // Una vez que la verificación termina, detenemos el estado de carga
            setLoading(false);
        };
        checkUser();
    }, []);

    // Función para manejar el inicio de sesión
    const login = async (nombre_usuario, pin) => {
        try {
            // Hacemos la llamada al endpoint de login para obtener el token
            const response = await axios.post('http://localhost:3002/api/auth/login', {
                nombre_usuario,
                pin,
            });

            const { token } = response.data;
            // Guardamos el token en el almacenamiento local
            localStorage.setItem('token', token);

            // Después de un login exitoso, obtenemos los datos del usuario
            const userResponse = await axios.get('http://localhost:3002/api/auth/me', {
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
