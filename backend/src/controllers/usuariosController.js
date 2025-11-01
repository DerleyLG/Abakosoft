const usuariosModel = require("../models/usuariosModel");
const trabajadoresModel = require("../models/trabajadoresModel");
const rolesModel = require("../models/rolesModel");
const bcrypt = require("bcrypt");

module.exports = {
  getAll: async (req, res) => {
    try {
      const users = await usuariosModel.getAll();
      res.status(200).json(users);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      res
        .status(500)
        .json({ error: "Error interno del servidor al obtener usuarios" });
    }
  },

  getById: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    try {
      const user = await usuariosModel.getById(id);
      if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.status(200).json(user);
    } catch (err) {
      console.error("Error al obtener usuario por ID:", err);
      res
        .status(500)
        .json({ error: "Error interno del servidor al obtener usuario" });
    }
  },

  create: async (req, res) => {
    try {
      const { nombre_usuario, pin, id_trabajador, id_rol } = req.body;
      // id_trabajador es opcional: sólo validar si viene definido (no null/undefined)
      if (!nombre_usuario || !pin || !id_rol) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }

      if (id_trabajador !== null && id_trabajador !== undefined) {
        const trabajadorExiste = await trabajadoresModel.getById(id_trabajador);
        if (!trabajadorExiste) {
          return res.status(400).json({ error: "Trabajador no existe" });
        }
      }
      const rolExiste = await rolesModel.getById(id_rol);
      if (!rolExiste) {
        return res.status(400).json({ error: "El rol no existe" });
      }

      const usuarioExistente = await usuariosModel.getByUsername(
        nombre_usuario
      );
      if (usuarioExistente) {
        return res
          .status(400)
          .json({ error: "El nombre de usuario ya existe" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      const id_usuario = await usuariosModel.create({
        nombre_usuario,
        pin: hashedPin,
        id_trabajador: id_trabajador ?? null,
        id_rol,
      });

      res
        .status(201)
        .json({ message: "Usuario creado exitosamente", id_usuario });
    } catch (err) {
      console.error("Error al crear usuario:", err);
      res
        .status(500)
        .json({ error: "Error interno del servidor al crear usuario" });
    }
  },

  update: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    try {
      const existing = await usuariosModel.getById(id);
      if (!existing) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const updateData = {};
      const { nombre_usuario, pin, id_trabajador, id_rol } = req.body;
      if (nombre_usuario) updateData.nombre_usuario = nombre_usuario;
      // Permitir desasignar trabajador enviando null explícito
      if (Object.prototype.hasOwnProperty.call(req.body, "id_trabajador")) {
        updateData.id_trabajador = id_trabajador ?? null;
      }
      if (id_rol) updateData.id_rol = id_rol;
      if (pin) updateData.pin = await bcrypt.hash(pin, 10);

      const filasAfectadas = await usuariosModel.update(id, updateData);

      if (filasAfectadas === 0) {
        return res
          .status(404)
          .json({ error: "Usuario no encontrado o no se hicieron cambios" });
      }

      res.status(200).json({ message: "Usuario actualizado exitosamente" });
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      res
        .status(500)
        .json({ error: "Error interno del servidor al actualizar usuario" });
    }
  },

  delete: async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    try {
      const existing = await usuariosModel.getById(id);
      if (!existing) {
        return res.status(404).json({ error: "El registro no existe" });
      }

      await usuariosModel.delete(id);
      res.status(200).json({ message: "Usuario eliminado exitosamente" });
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      res
        .status(500)
        .json({ error: "Error interno del servidor al eliminar usuario" });
    }
  },
};
