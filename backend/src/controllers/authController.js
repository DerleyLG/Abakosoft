const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const masterPool = require("../database/masterDb");
const { getTenantPool, runWithTenant } = require("../database/tenantDb");
const permisosRolModel = require("../models/permisosRolModel");
const { PLAN_FEATURES } = require("../constants/plans");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 30;
const GENERIC_ERROR = "Usuario o contraseña incorrectos";

// Rate limiter por IP (en memoria — se reinicia con el servidor)
const ipLimiter = new Map();

function getClientIp(req) {
  return (
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function checkIpLimit(ip) {
  const rec = ipLimiter.get(ip);
  if (!rec) return { blocked: false };
  if (rec.lockUntil && new Date(rec.lockUntil) > new Date()) {
    return {
      blocked: true,
      minutesLeft: Math.ceil((new Date(rec.lockUntil) - new Date()) / 60000),
    };
  }
  return { blocked: false };
}

function recordIpFailure(ip) {
  let rec = ipLimiter.get(ip) || { count: 0, lockUntil: null };
  if (rec.lockUntil && new Date(rec.lockUntil) <= new Date()) {
    rec = { count: 0, lockUntil: null };
  }
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
  }
  ipLimiter.set(ip, rec);
  return rec;
}

function resetIpLimit(ip) {
  ipLimiter.delete(ip);
}

module.exports = {
  async login(req, res) {
    const { nombre_usuario, pin } = req.body;

    if (!nombre_usuario || !pin) {
      return res
        .status(400)
        .json({ error: "nombre_usuario y PIN son requeridos" });
    }

    const ip = getClientIp(req);

    // 1. Verificar límite por IP antes de cualquier consulta
    const ipCheck = checkIpLimit(ip);
    if (ipCheck.blocked) {
      return res.status(429).json({
        error: `Demasiados intentos fallidos. Inténtalo en ${ipCheck.minutesLeft} minuto${ipCheck.minutesLeft === 1 ? "" : "s"}.`,
        locked: true,
      });
    }

    try {
      // 2. Obtener empresas (activas Y suspendidas/canceladas para dar error adecuado)
      const [empresas] = await masterPool.query(
        `SELECT e.id_empresa, e.nombre, e.codigo, e.db_name, e.estado AS estado_empresa,
                p.nombre AS plan_nombre, p.max_usuarios,
                s.estado AS estado_suscripcion, s.es_prueba, s.fecha_fin
         FROM empresas e
         LEFT JOIN suscripciones s
           ON s.id_suscripcion = (
             SELECT id_suscripcion FROM suscripciones
             WHERE id_empresa = e.id_empresa
             ORDER BY id_suscripcion DESC LIMIT 1
           )
         LEFT JOIN planes p ON p.id_plan = s.id_plan`,
      );

      if (empresas.length === 0) {
        return res.status(401).json({ error: "No hay empresas registradas" });
      }

      // 3. Buscar usuario en cada BD tenant
      let foundEmpresa = null;
      let foundUsuario = null;
      for (const empresa of empresas) {
        try {
          const tenantPool = getTenantPool(empresa.db_name);
          const [usuarios] = await tenantPool.query(
            `SELECT u.*, r.nombre_rol
             FROM usuarios u
             JOIN roles r ON u.id_rol = r.id_rol
             WHERE u.nombre_usuario = ?
             LIMIT 1`,
            [nombre_usuario],
          );
          if (usuarios.length > 0) {
            foundEmpresa = empresa;
            foundUsuario = usuarios[0];
            break;
          }
        } catch (_) {}
      }

      // 4. Verificar lockout del usuario (sin revelar si existe)
      if (
        foundUsuario &&
        foundUsuario.locked_until &&
        new Date(foundUsuario.locked_until) > new Date()
      ) {
        const minutosRestantes = Math.ceil(
          (new Date(foundUsuario.locked_until) - new Date()) / 60000,
        );
        // Registrar también en IP para que el límite aplique igual
        recordIpFailure(ip);
        return res.status(429).json({
          error: `Demasiados intentos fallidos. Inténtalo en ${minutosRestantes} minuto${minutosRestantes === 1 ? "" : "s"}.`,
          locked: true,
        });
      }

      // 5. Validar PIN — tratamos "usuario no existe" igual que "PIN incorrecto"
      const validPin =
        foundUsuario && (await bcrypt.compare(pin, foundUsuario.pin));

      if (!validPin) {
        const ipRec = recordIpFailure(ip);

        if (foundUsuario) {
          const tenantPool = getTenantPool(foundEmpresa.db_name);
          const newAttempts = (foundUsuario.failed_attempts || 0) + 1;
          if (newAttempts >= MAX_ATTEMPTS) {
            const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
            await tenantPool.query(
              `UPDATE usuarios SET failed_attempts = ?, locked_until = ? WHERE id_usuario = ?`,
              [newAttempts, lockedUntil, foundUsuario.id_usuario],
            );
          } else {
            await tenantPool.query(
              `UPDATE usuarios SET failed_attempts = ? WHERE id_usuario = ?`,
              [newAttempts, foundUsuario.id_usuario],
            );
          }
        }

        // Si el IP acaba de alcanzar el límite, informar del bloqueo
        if (ipRec.lockUntil) {
          return res.status(429).json({
            error: `Demasiados intentos fallidos. Inténtalo en ${LOCK_MINUTES} minuto${LOCK_MINUTES === 1 ? "" : "s"}.`,
            locked: true,
          });
        }

        return res.status(401).json({ error: GENERIC_ERROR });
      }

      // 6. Credenciales correctas — resetear contadores
      resetIpLimit(ip);
      const tenantPool = getTenantPool(foundEmpresa.db_name);
      await tenantPool.query(
        `UPDATE usuarios SET failed_attempts = 0, locked_until = NULL WHERE id_usuario = ?`,
        [foundUsuario.id_usuario],
      );

      const empresa = foundEmpresa;
      const usuario = foundUsuario;

      // 7. Bloquear si la empresa o suscripción está suspendida o cancelada
      const estadoEmpresa = empresa.estado_empresa;
      const estadoSub = empresa.estado_suscripcion;
      const bloqueada =
        estadoEmpresa === "suspendida" ||
        estadoEmpresa === "cancelada" ||
        estadoSub === "suspendida" ||
        estadoSub === "cancelada";
      if (bloqueada) {
        const esPrueba = !!empresa.es_prueba;
        const cancelada =
          estadoEmpresa === "cancelada" || estadoSub === "cancelada";
        return res.status(403).json({
          error: esPrueba
            ? "Tu período de prueba ha finalizado. Contáctanos para activar tu plan."
            : cancelada
              ? "Tu suscripción ha sido cancelada. Contáctanos para reactivarla."
              : "Tu suscripción está suspendida. Contáctanos para reactivarla.",
          suspended: true,
          es_prueba: esPrueba,
          empresa_nombre: empresa.nombre,
        });
      }

      const planKey = (empresa.plan_nombre || "basico").toLowerCase();
      const features = PLAN_FEATURES[planKey] || PLAN_FEATURES["basico"];

      // 8. Construir JWT
      const payload = {
        id_usuario: usuario.id_usuario,
        nombre_usuario: usuario.nombre_usuario,
        id_rol: usuario.id_rol,
        rol: usuario.nombre_rol,
        id_trabajador: usuario.id_trabajador,
        empresa_id: empresa.id_empresa,
        empresa_codigo: empresa.codigo,
        empresa_nombre: empresa.nombre,
        db_name: empresa.db_name,
        plan: empresa.plan_nombre || "prueba",
        features,
        max_usuarios: empresa.max_usuarios || null,
        estado_suscripcion: empresa.estado_suscripcion || "activa",
        es_prueba: !!empresa.es_prueba,
        fecha_fin: empresa.fecha_fin || null,
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
    try {
      let idRol = req.user.id_rol;
      if (!idRol) {
        const db = require("../database/db");
        let lookupField, lookupValue;
        if (req.user.id_usuario) {
          lookupField = "id_usuario";
          lookupValue = req.user.id_usuario;
        } else if (req.user.nombre_usuario) {
          lookupField = "nombre_usuario";
          lookupValue = req.user.nombre_usuario;
        }
        if (lookupField) {
          const [rows] = await db.query(
            `SELECT id_rol FROM usuarios WHERE ${lookupField} = ?`,
            [lookupValue],
          );
          if (rows.length > 0) idRol = rows[0].id_rol;
        }
      }
      const permisos = idRol ? await permisosRolModel.getByRolId(idRol) : [];
      res.json({ ...req.user, id_rol: idRol, permisos });
    } catch (error) {
      console.error("Error en /auth/me:", error);
      res.json({ ...req.user, permisos: [] });
    }
  },
};
