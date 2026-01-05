const usuariosModel = require("../models/usuariosModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

module.exports = {
  async login(req, res) {
    const { nombre_usuario, pin } = req.body;

    if (!nombre_usuario || !pin) {
      return res
        .status(400)
        .json({ error: "Nombre de usuario y PIN son requeridos" });
    }

    try {
      const usuario = await usuariosModel.getByUsername(nombre_usuario);
      if (!usuario) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      const validPin = await bcrypt.compare(pin, usuario.pin);
      if (!validPin) {
        return res.status(401).json({ error: "Credenciales incorrectas" });
      }

      // Crear payload para JWT
      const payload = {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        id_rol: usuario.id_rol,
        rol: usuario.nombre_rol,
        id_trabajador: usuario.id_trabajador,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "8h",
      });

      res.json({ token });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  async me(req, res) {
    // Retorna info del usuario desde req.user (llenado por verifyToken)
    res.json(req.user);
  },
};
