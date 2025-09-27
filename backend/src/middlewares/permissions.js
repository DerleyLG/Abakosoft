// Importaciones
const express = require('express');
const router = express.Router();


const verifyToken = require('../middleware/verifyToken');
const checkRole = require('../middleware/checkRole');

// Importa el modelo de usuario (asegúrate de que el nombre del modelo sea correcto)
const Usuario = require('../models/usuariosModel'); 

module.exports = (requiredRole) => {
  return (req, res, next) => {

    if (!req.user) {
      console.warn('[checkRole] Acceso denegado. El token no pudo ser verificado o no se proporcionó.');
      return res.status(403).json({ message: 'No tienes los permisos necesarios para acceder a este recurso.' });
    }

 
    if (req.user.rol !== requiredRole) {
      console.warn('[checkRole] Acceso denegado. Rol requerido:', requiredRole, 'Rol del usuario:', req.user.rol);
      return res.status(403).json({ message: 'No tienes los permisos necesarios para acceder a este recurso.' });
    }

  
    next();
  };
};


router.get('/usuarios', verifyToken, checkRole('admin'), async (req, res) => {
  try {

    const usuarios = await Usuario.getAll();
   
    return res.status(200).json(usuarios);
  } catch (error) {

    console.error('Error al obtener la lista de usuarios:', error);
    return res.status(500).json({ message: 'Error interno del servidor al obtener usuarios.' });
  }
});
