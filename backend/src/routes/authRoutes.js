// Importamos express y creamos un router
const express = require('express');
const router = express.Router();

// Importamos las librerías necesarias
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Importamos el modelo de Usuario que usa SQL
// Asegúrate de que la ruta y el nombre del modelo sean correctos en tu proyecto
const Usuario = require('../models/usuariosModel'); 

// Clave secreta para firmar los tokens JWT
// ¡Esta clave debe ser la misma que la que se usa para verificar el token!
const JWT_SECRET = 'Ab4k05ofT.@'; 

// Ruta para registrar un nuevo usuario en la base de datos
// URL completa: POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { nombre_usuario, pin, id_trabajador, id_rol } = req.body;

        if (!nombre_usuario || !pin || !id_trabajador || !id_rol) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        const existingUser = await Usuario.getByUsername(nombre_usuario);
        if (existingUser) {
            return res.status(409).json({ message: 'El nombre de usuario ya está en uso.' });
        }

        const saltRounds = 10;
        const hashedPin = await bcrypt.hash(pin, saltRounds);

        const newUserId = await Usuario.create({
            nombre_usuario,
            pin: hashedPin,
            id_trabajador,
            id_rol,
        });

        console.log('Nuevo usuario registrado con ID:', newUserId);
        return res.status(201).json({ message: 'Usuario registrado exitosamente.', id: newUserId });
    } catch (error) {
        console.error('Error en el registro:', error);
        return res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para iniciar sesión buscando en la base de datos

router.post('/login', async (req, res) => {
    try {
        const { nombre_usuario, pin } = req.body;

        const user = await Usuario.getByUsername(nombre_usuario);
        if (!user) {
            return res.status(400).json({ message: 'Credenciales incorrectas.' });
        }

        const isMatch = await bcrypt.compare(pin, user.pin);
        if (!isMatch) {
            return res.status(400).json({ message: 'Credenciales incorrectas.' });
        }

        const token = jwt.sign({ id: user.id_usuario, rol: user.nombre_rol, nombre_usuario: user.nombre_usuario }, JWT_SECRET, { expiresIn: '7d' });

        return res.status(200).json({ token });
    } catch (error) {
        console.error('Error en el login:', error);
        return res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta para obtener los datos del usuario a partir del token, buscando en la base de datos
router.get('/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Token no proporcionado.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'Formato de token inválido.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        const user = await Usuario.getById(decoded.id);

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }

        return res.status(200).json({
            id: user.id_usuario,
            nombre_usuario: user.nombre_usuario,
            rol: user.nombre_rol
        });
    } catch (error) {
        console.error('Error al obtener datos del usuario:', error);
        return res.status(401).json({ message: 'Token inválido.' });
    }
});

module.exports = router;
