import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';


export const AuthContext = createContext();


export const useAuth = () => {
 return useContext(AuthContext);
};


export const AuthProvider = ({ children }) => {

 const [user, setUser] = useState(null);

 const [loading, setLoading] = useState(true);


 useEffect(() => {
  const checkUser = async () => {
   const token = localStorage.getItem('token');
   if (token) {
    try {
   
  
     const response = await api.get('/auth/me');
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

 
 const login = async (nombre_usuario, pin) => {
  try {
  
   const response = await api.post('/auth/login', {
    nombre_usuario,
    pin,
   });

   const { token } = response.data;
   localStorage.setItem('token', token);


   const userResponse = await api.get('/auth/me');
   
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
   {children}
  </AuthContext.Provider>
 );
};
