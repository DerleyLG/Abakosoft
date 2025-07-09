const usuariosModel = require('../models/usuariosModel');
const trabajadoresModel = require('../models/trabajadoresModel');
const rolesModel = require('../models/rolesModel');
const bcrypt = require('bcrypt');

module.exports = {
  getAll: async (req, res) => {
    try {
      const users = await usuariosModel.getAll();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
  },

  getById: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    const user = await usuariosModel.getById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  },

  create: async (req, res) => {
    try {
      const { nombre_usuario, pin,  id_trabajador, id_rol } = req.body;
      if (!nombre_usuario || !pin || !id_trabajador || !id_rol) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
      }
      // Verificar trabajador existe
      const t = await trabajadoresModel.getById(id_trabajador);
      if (!t) return res.status(400).json({ error: 'Trabajador no existe' });

      // Verificar nombre_usuario único
      if (await usuariosModel.getByUsername(nombre_usuario)) {
        return res.status(400).json({ error: 'Usuario ya existe' });
      }
      const result = await rolesModel.getById(id_rol)
      if (!result) {
        return res.status(400).json({ error: 'rol no existe existe' });
      }
      const pass = await bcrypt.hash(pin, 10);
      const id_usuario = await usuariosModel.create({ nombre_usuario, pin:pass, id_trabajador, id_rol });
      res.status(201).json({ message: 'Usuario creado', id_usuario });
    } catch (err) {
      console.error('Error al crear usuario:', err);
      res.status(500).json({ error: 'Error creando usuario' });
    }
  },

  update: async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const { nombre_usuario, pin, rol } = req.body;
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

      const existing = await usuariosModel.getById(id);
      if (!existing) return res.status(404).json({ error: 'Usuario no encontrado' });

      let pass;
      if (pin) pass = await bcrypt.hash(pin, 10);

      await usuariosModel.update(id, { nombre_usuario, pin:pass, rol });
      res.json({ message: 'Usuario actualizado' });
    } catch (err) {
      res.status(500).json({ error: 'Error actualizando usuario' });
    }
  },

  delete: async (req, res) => {
     const id = parseInt(req.params.id, 10);
     
    const existing = await usuariosModel.getById(id);
      if (!existing) return res.status(404).json({ error: 'el registro no existe' });

   
    if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    await usuariosModel.delete(id);
    res.json({ message: 'Usuario eliminado' });
  }
};
