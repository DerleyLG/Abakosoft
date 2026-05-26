const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const masterPool = require("../database/masterDb");
const { getTenantPool, releaseTenantPool } = require("../database/tenantDb");

const SAAS_ACCESS_COOKIE = "saas_access";
const SAAS_REFRESH_COOKIE = "saas_refresh";
const SAAS_CSRF_COOKIE = "saas_csrf";
const SAAS_ACCESS_TTL_MS = 15 * 60 * 1000;
const SAAS_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SAAS_AUTH_LOG_ACTIONS = [
  "login_admin_exitoso",
  "login_admin_fallido",
  "login_admin_lockout",
  "refresh_admin_exitoso",
  "refresh_admin_fallido",
  "logout_admin",
  "cambio_password_admin",
];

const getSaasAccessSecret = () =>
  process.env.SAAS_JWT_SECRET || process.env.JWT_SECRET;

const getSaasRefreshSecret = () => {
  if (process.env.SAAS_REFRESH_JWT_SECRET) {
    return process.env.SAAS_REFRESH_JWT_SECRET;
  }
  // En desarrollo permitimos fallback para no bloquear pruebas locales.
  // En producción debe existir un secreto independiente para refresh.
  if (process.env.NODE_ENV === "production") {
    throw new Error("SAAS_REFRESH_JWT_SECRET es requerido en producción");
  }
  return getSaasAccessSecret();
};

const buildAccessToken = (admin) => {
  const secret = getSaasAccessSecret();
  return jwt.sign(
    {
      id_admin: admin.id_admin,
      nombre: admin.nombre,
      nombre_usuario: admin.nombre_usuario,
      rol: admin.rol,
      token_version: admin.token_version || 0,
      is_saas_admin: true,
      token_type: "access",
    },
    secret,
    { expiresIn: "15m" },
  );
};

const buildRefreshToken = (admin, sessionId) => {
  const secret = getSaasRefreshSecret();
  return jwt.sign(
    {
      id_admin: admin.id_admin,
      jti: sessionId,
      is_saas_admin: true,
      token_type: "refresh",
    },
    secret,
    { expiresIn: "7d" },
  );
};

const cookieOpts = (req, maxAgeMs) => {
  const isProd = process.env.NODE_ENV === "production";
  const configuredSameSite = (process.env.SAAS_COOKIE_SAMESITE || "lax")
    .toLowerCase()
    .trim();
  const sameSite = ["lax", "strict", "none"].includes(configuredSameSite)
    ? configuredSameSite
    : "lax";
  let secure =
    process.env.SAAS_COOKIE_SECURE !== undefined
      ? process.env.SAAS_COOKIE_SECURE === "true"
      : isProd;

  // SameSite=None exige Secure=true en navegadores modernos.
  if (sameSite === "none") secure = true;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    maxAge: maxAgeMs,
    ...(process.env.SAAS_COOKIE_DOMAIN
      ? { domain: process.env.SAAS_COOKIE_DOMAIN }
      : {}),
  };
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim().slice(0, 255);
  }
  return (req.ip || req.socket?.remoteAddress || "").slice(0, 255) || null;
};

const getUserAgent = (req) =>
  (req.headers["user-agent"] || "").slice(0, 500) || null;

const auditSaasAuth = async (req, tipoAccion, detalle, idAdmin = null) => {
  try {
    const meta = [
      detalle,
      getClientIp(req) ? `IP: ${getClientIp(req)}` : null,
      getUserAgent(req) ? `UA: ${getUserAgent(req)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    await masterPool.query(
      `INSERT INTO log_actividad (id_admin, tipo_accion, detalle)
       VALUES (?, ?, ?)`,
      [idAdmin, tipoAccion, meta],
    );
  } catch (error) {
    console.error("Error al auditar evento SaaS:", error);
  }
};

const csrfCookieOpts = (req, maxAgeMs) => {
  const base = cookieOpts(req, maxAgeMs);
  return {
    ...base,
    httpOnly: false,
  };
};

const persistRefreshSession = async (req, admin, sessionId, refreshToken) => {
  const expiresAt = new Date(Date.now() + SAAS_REFRESH_TTL_MS);
  await masterPool.query(
    `INSERT INTO saas_refresh_sessions
       (id_sesion, id_admin, token_hash, user_agent, ip_address, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sessionId,
      admin.id_admin,
      hashToken(refreshToken),
      getUserAgent(req),
      getClientIp(req),
      expiresAt,
    ],
  );
};

const revokeRefreshSession = async (sessionId, motivo = "revocada") => {
  if (!sessionId) return;
  await masterPool.query(
    `UPDATE saas_refresh_sessions
     SET revoked_at = CURRENT_TIMESTAMP,
         motivo_revocacion = COALESCE(motivo_revocacion, ?)
     WHERE id_sesion = ? AND revoked_at IS NULL`,
    [motivo, sessionId],
  );
};

const revokeAllRefreshSessionsForAdmin = async (
  adminId,
  motivo = "revocada_por_admin",
) => {
  if (!adminId) return 0;

  const [result] = await masterPool.query(
    `UPDATE saas_refresh_sessions
     SET revoked_at = CURRENT_TIMESTAMP,
         motivo_revocacion = COALESCE(motivo_revocacion, ?)
     WHERE id_admin = ? AND revoked_at IS NULL`,
    [motivo, adminId],
  );

  return result?.affectedRows || 0;
};

const purgeStaleRefreshSessions = async () => {
  const [result] = await masterPool.query(
    `DELETE FROM saas_refresh_sessions
     WHERE expires_at < NOW()
        OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`,
  );
  return result?.affectedRows || 0;
};

const ensureSaasAuthSchema = async () => {
  const schemaName = process.env.MASTER_DB_NAME || "abakosoft_master";
  const [columns] = await masterPool.query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'admins_saas'
       AND COLUMN_NAME IN ('primer_login', 'token_version', 'nombre_usuario', 'email')`,
    [schemaName],
  );

  const available = new Set(columns.map((c) => c.COLUMN_NAME));

  if (!available.has("primer_login")) {
    await masterPool.query(
      `ALTER TABLE admins_saas
       ADD COLUMN primer_login TINYINT(1) NOT NULL DEFAULT 1 AFTER activo`,
    );
    await masterPool.query(`UPDATE admins_saas SET primer_login = 0`);
    console.log("[saas] Columna primer_login agregada a admins_saas");
  }

  if (!available.has("token_version")) {
    await masterPool.query(
      `ALTER TABLE admins_saas
       ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER primer_login`,
    );
    console.log("[saas] Columna token_version agregada a admins_saas");
  }

  // Migración email → nombre_usuario para instalaciones existentes
  if (available.has("email") && !available.has("nombre_usuario")) {
    await masterPool.query(
      `ALTER TABLE admins_saas ADD COLUMN nombre_usuario VARCHAR(100) UNIQUE AFTER nombre`,
    );
    await masterPool.query(
      `UPDATE admins_saas SET nombre_usuario = SUBSTRING_INDEX(email, '@', 1)
       WHERE nombre_usuario IS NULL`,
    );
    await masterPool.query(
      `ALTER TABLE admins_saas MODIFY COLUMN nombre_usuario VARCHAR(100) NOT NULL`,
    );
    await masterPool.query(`ALTER TABLE admins_saas DROP COLUMN email`);
    console.log(
      "[saas] Migración email → nombre_usuario completada en admins_saas",
    );
  }

  const [refreshSessionTables] = await masterPool.query(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'saas_refresh_sessions'`,
    [schemaName],
  );

  if (refreshSessionTables.length === 0) {
    await masterPool.query(
      `CREATE TABLE saas_refresh_sessions (
        id_sesion CHAR(36) PRIMARY KEY,
        id_admin INT UNSIGNED NOT NULL,
        token_hash CHAR(64) NOT NULL,
        user_agent VARCHAR(500) DEFAULT NULL,
        ip_address VARCHAR(255) DEFAULT NULL,
        expires_at DATETIME NOT NULL,
        revoked_at DATETIME DEFAULT NULL,
        motivo_revocacion VARCHAR(100) DEFAULT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT fk_saas_refresh_admin
          FOREIGN KEY (id_admin) REFERENCES admins_saas(id_admin) ON DELETE CASCADE,

        INDEX idx_saas_refresh_admin (id_admin),
        INDEX idx_saas_refresh_expires (expires_at),
        INDEX idx_saas_refresh_revoked (revoked_at)
      )`,
    );
    console.log("[saas] Tabla saas_refresh_sessions creada");
  }

  // Generar init token en memoria si no hay admins registrados
  await initSetupToken();
};

const issueSaasSession = async (req, res, admin, previousSessionId = null) => {
  const accessToken = buildAccessToken(admin);
  const sessionId = crypto.randomUUID();
  const refreshToken = buildRefreshToken(admin, sessionId);
  const csrfToken = crypto.randomBytes(32).toString("hex");

  if (previousSessionId) {
    await revokeRefreshSession(previousSessionId, "rotada");
  }

  await persistRefreshSession(req, admin, sessionId, refreshToken);

  res.cookie(
    SAAS_ACCESS_COOKIE,
    accessToken,
    cookieOpts(req, SAAS_ACCESS_TTL_MS),
  );
  res.cookie(
    SAAS_REFRESH_COOKIE,
    refreshToken,
    cookieOpts(req, SAAS_REFRESH_TTL_MS),
  );
  res.cookie(
    SAAS_CSRF_COOKIE,
    csrfToken,
    csrfCookieOpts(req, SAAS_REFRESH_TTL_MS),
  );
};

const clearSaasAuthCookies = (req, res) => {
  res.clearCookie(SAAS_ACCESS_COOKIE, cookieOpts(req, 0));
  res.clearCookie(SAAS_REFRESH_COOKIE, cookieOpts(req, 0));
  res.clearCookie(SAAS_CSRF_COOKIE, csrfCookieOpts(req, 0));
};

// ----------------------------------------------------------
// SETUP — Init token en memoria
// ----------------------------------------------------------

let _initToken = null; // solo vive en proceso; null = sistema ya inicializado

const initSetupToken = async () => {
  const [rows] = await masterPool.query(
    `SELECT COUNT(*) AS n FROM admins_saas`,
  );
  if (rows[0].n > 0) {
    _initToken = null; // hay admins → setup deshabilitado para siempre
    return;
  }

  if (_initToken) return; // ya generado en este arranque

  _initToken = crypto.randomBytes(16).toString("hex");

  console.log("");
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  SETUP REQUERIDO — Sistema sin SuperAdmin            ║");
  console.log(`║  Token de inicialización: ${_initToken}  ║`);
  console.log("║  Navega a /saas/setup para crear la cuenta           ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");
};

async function setupStatus(req, res) {
  try {
    const [rows] = await masterPool.query(
      `SELECT COUNT(*) AS n FROM admins_saas`,
    );
    const available = rows[0].n === 0;
    return res.json({ available });
  } catch (error) {
    console.error("Error en setupStatus:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function setupAdmin(req, res) {
  const { init_token, nombre_usuario, password, confirmar_password } = req.body;

  // Validar que el sistema todavía no esté inicializado
  try {
    const [rows] = await masterPool.query(
      `SELECT COUNT(*) AS n FROM admins_saas`,
    );
    if (rows[0].n > 0) {
      return res.status(410).json({
        error: "El sistema ya está inicializado. Setup no disponible.",
      });
    }
  } catch (error) {
    console.error("Error verificando admins en setup:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }

  // Validar token de inicialización
  if (!_initToken || !init_token || init_token !== _initToken) {
    return res.status(403).json({ error: "Token de inicialización inválido." });
  }

  // Validar campos
  if (!nombre_usuario || !password || !confirmar_password) {
    return res.status(400).json({ error: "Todos los campos son requeridos." });
  }

  const usuarioLimpio = nombre_usuario.trim().toLowerCase();

  if (!/^[a-z0-9_]{4,30}$/.test(usuarioLimpio)) {
    return res.status(400).json({
      error:
        "El nombre de usuario debe tener entre 4 y 30 caracteres (letras, números o guion bajo).",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: "La contraseña debe tener al menos 8 caracteres.",
    });
  }

  if (password !== confirmar_password) {
    return res.status(400).json({ error: "Las contraseñas no coinciden." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await masterPool.query(
      `INSERT INTO admins_saas (nombre, nombre_usuario, password_hash, rol, activo, primer_login)
       VALUES (?, ?, ?, 'superadmin', 1, 0)`,
      ["SuperAdmin", usuarioLimpio, passwordHash],
    );

    // Invalidar el token de inicialización
    _initToken = null;

    console.log(`[saas] SuperAdmin creado: ${usuarioLimpio}`);
    return res
      .status(201)
      .json({ message: "SuperAdmin creado correctamente." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Ese nombre de usuario ya está en uso." });
    }
    console.error("Error en setupAdmin:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

// ----------------------------------------------------------
// AUTENTICACIÓN DEL PANEL SAAS
// ----------------------------------------------------------

async function loginAdmin(req, res) {
  const { nombre_usuario, password } = req.body;
  if (!nombre_usuario || !password) {
    return res
      .status(400)
      .json({ error: "nombre_usuario y password son requeridos" });
  }

  const MAX_ATTEMPTS = 5;
  const LOCK_MINUTES = 30;

  try {
    await purgeStaleRefreshSessions();

    const [rows] = await masterPool.query(
      `SELECT * FROM admins_saas WHERE nombre_usuario = ? AND activo = 1 LIMIT 1`,
      [nombre_usuario.trim().toLowerCase()],
    );

    if (rows.length === 0) {
      await auditSaasAuth(
        req,
        "login_admin_fallido",
        `Intento con usuario no encontrado: ${nombre_usuario}`,
      );
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const admin = rows[0];

    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      const minutosRestantes = Math.ceil(
        (new Date(admin.locked_until) - new Date()) / 60000,
      );
      await auditSaasAuth(
        req,
        "login_admin_lockout",
        `Acceso denegado por lockout para ${admin.nombre_usuario}. Restan ${minutosRestantes} minuto${minutosRestantes === 1 ? "" : "s"}.`,
        admin.id_admin,
      );
      return res.status(429).json({
        error: `Cuenta bloqueada por demasiados intentos fallidos. Inténtalo en ${minutosRestantes} minuto${minutosRestantes === 1 ? "" : "s"}.`,
        locked: true,
      });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);

    if (!valid) {
      const newAttempts = (admin.failed_attempts || 0) + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await masterPool.query(
          `UPDATE admins_saas SET failed_attempts = ?, locked_until = ? WHERE id_admin = ?`,
          [newAttempts, lockedUntil, admin.id_admin],
        );
        await auditSaasAuth(
          req,
          "login_admin_lockout",
          `Cuenta bloqueada tras ${MAX_ATTEMPTS} intentos fallidos para ${admin.nombre_usuario}.`,
          admin.id_admin,
        );
        return res.status(429).json({
          error: `Cuenta bloqueada por ${LOCK_MINUTES} minutos tras ${MAX_ATTEMPTS} intentos fallidos.`,
          locked: true,
        });
      }
      await masterPool.query(
        `UPDATE admins_saas SET failed_attempts = ? WHERE id_admin = ?`,
        [newAttempts, admin.id_admin],
      );
      await auditSaasAuth(
        req,
        "login_admin_fallido",
        `Contraseña incorrecta para ${admin.nombre_usuario}.`,
        admin.id_admin,
      );
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Login correcto — resetear contadores
    await masterPool.query(
      `UPDATE admins_saas SET failed_attempts = 0, locked_until = NULL WHERE id_admin = ?`,
      [admin.id_admin],
    );

    await issueSaasSession(req, res, admin);
    await auditSaasAuth(
      req,
      "login_admin_exitoso",
      `Inicio de sesión exitoso para ${admin.nombre_usuario}.`,
      admin.id_admin,
    );

    res.json({
      primer_login: admin.primer_login === 1,
      admin: {
        id_admin: admin.id_admin,
        nombre: admin.nombre,
        nombre_usuario: admin.nombre_usuario,
        rol: admin.rol,
      },
    });
  } catch (error) {
    console.error("Error en loginAdmin:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function meAdmin(req, res) {
  const id_admin = req.admin?.id_admin;
  if (!id_admin) {
    return res.status(401).json({ error: "Token de admin inválido" });
  }

  try {
    const [rows] = await masterPool.query(
      `SELECT id_admin, nombre, nombre_usuario, rol, primer_login
       FROM admins_saas
       WHERE id_admin = ? AND activo = 1
       LIMIT 1`,
      [id_admin],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Admin no autorizado" });
    }

    const admin = rows[0];
    return res.json({
      admin: {
        id_admin: admin.id_admin,
        nombre: admin.nombre,
        nombre_usuario: admin.nombre_usuario,
        rol: admin.rol,
      },
      primer_login: !!admin.primer_login,
    });
  } catch (error) {
    console.error("Error en meAdmin:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function refreshAdmin(req, res) {
  const refreshToken = req.cookies?.[SAAS_REFRESH_COOKIE];
  if (!refreshToken) {
    await auditSaasAuth(req, "refresh_admin_fallido", "Refresh token ausente.");
    return res.status(401).json({ error: "Refresh token no proporcionado" });
  }

  const secret = getSaasRefreshSecret();

  try {
    await purgeStaleRefreshSessions();

    const decoded = jwt.verify(refreshToken, secret);
    if (
      !decoded?.is_saas_admin ||
      decoded?.token_type !== "refresh" ||
      !decoded?.jti
    ) {
      await auditSaasAuth(
        req,
        "refresh_admin_fallido",
        "Refresh token inválido en payload.",
        decoded?.id_admin || null,
      );
      return res.status(401).json({ error: "Refresh token inválido" });
    }

    const [sessions] = await masterPool.query(
      `SELECT id_sesion, id_admin, token_hash, expires_at, revoked_at
       FROM saas_refresh_sessions
       WHERE id_sesion = ?
       LIMIT 1`,
      [decoded.jti],
    );

    if (
      sessions.length === 0 ||
      sessions[0].revoked_at ||
      hashToken(refreshToken) !== sessions[0].token_hash ||
      new Date(sessions[0].expires_at) <= new Date()
    ) {
      clearSaasAuthCookies(req, res);
      await auditSaasAuth(
        req,
        "refresh_admin_fallido",
        `Refresh token inválido, expirado o revocado para la sesión ${decoded.jti}.`,
        decoded.id_admin,
      );
      return res
        .status(401)
        .json({ error: "Refresh token inválido o revocado" });
    }

    const [rows] = await masterPool.query(
      `SELECT id_admin, nombre, email, rol, activo, token_version
       FROM admins_saas
       WHERE id_admin = ?
       LIMIT 1`,
      [decoded.id_admin],
    );

    if (rows.length === 0 || !rows[0].activo) {
      clearSaasAuthCookies(req, res);
      await auditSaasAuth(
        req,
        "refresh_admin_fallido",
        `Admin no autorizado durante refresh para id ${decoded.id_admin}.`,
        decoded.id_admin,
      );
      return res.status(401).json({ error: "Admin no autorizado" });
    }

    const admin = rows[0];
    await issueSaasSession(req, res, admin, decoded.jti);
    await auditSaasAuth(
      req,
      "refresh_admin_exitoso",
      `Refresh de sesión exitoso para ${admin.email}.`,
      admin.id_admin,
    );

    return res.json({ ok: true });
  } catch (_) {
    clearSaasAuthCookies(req, res);
    await auditSaasAuth(
      req,
      "refresh_admin_fallido",
      "Refresh token inválido o expirado.",
    );
    return res.status(401).json({ error: "Refresh token inválido o expirado" });
  }
}

async function logoutAdmin(req, res) {
  const refreshToken = req.cookies?.[SAAS_REFRESH_COOKIE];
  let adminId = null;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getSaasRefreshSecret());
      adminId = decoded?.id_admin || null;
      if (decoded?.jti) {
        await revokeRefreshSession(decoded.jti, "logout");
      }
    } catch (_) {
      // Si el refresh ya expiró o está corrupto, solo limpiamos cookies.
    }
  }

  clearSaasAuthCookies(req, res);
  await auditSaasAuth(req, "logout_admin", "Cierre de sesión SaaS.", adminId);
  return res.json({ ok: true });
}

// ----------------------------------------------------------
// GESTIÓN DE EMPRESAS
// ----------------------------------------------------------

async function listarEmpresas(req, res) {
  try {
    // Auto-expirar suscripciones vencidas
    await masterPool.query(
      `UPDATE suscripciones SET estado = 'suspendida'
       WHERE fecha_fin < CURDATE() AND estado IN ('activa', 'prueba')`,
    );

    const [empresas] = await masterPool.query(
      `SELECT e.id_empresa, e.nombre, e.codigo, e.email_contacto,
              e.db_name, e.estado, e.fecha_creacion,
              s.id_suscripcion, s.estado AS estado_suscripcion,
              s.fecha_inicio, s.fecha_fin, s.es_prueba,
              p.id_plan, p.nombre AS plan
       FROM empresas e
       LEFT JOIN suscripciones s ON s.id_suscripcion = (
         SELECT s2.id_suscripcion FROM suscripciones s2
         WHERE s2.id_empresa = e.id_empresa
         ORDER BY s2.fecha_inicio DESC LIMIT 1
       )
       LEFT JOIN planes p ON p.id_plan = s.id_plan
       ORDER BY e.fecha_creacion DESC`,
    );
    res.json(empresas);
  } catch (error) {
    console.error("Error al listar empresas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function obtenerEmpresa(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await masterPool.query(
      `SELECT e.*, s.estado AS estado_suscripcion, s.fecha_inicio,
              s.fecha_fin, s.es_prueba, p.nombre AS plan, p.max_usuarios
       FROM empresas e
       LEFT JOIN suscripciones s ON s.id_empresa = e.id_empresa
         AND s.estado IN ('activa','prueba')
       LEFT JOIN planes p ON p.id_plan = s.id_plan
       WHERE e.id_empresa = ?
       LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error al obtener empresa:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function crearEmpresa(req, res) {
  const {
    nombre,
    codigo,
    email_contacto,
    id_plan,
    es_prueba = true,
    dias_prueba = 15,
    nombre_usuario_admin,
    pin_admin,
  } = req.body;

  // Plan es obligatorio solo si NO es prueba
  if (!nombre || !codigo || !email_contacto) {
    return res.status(400).json({
      error: "nombre, codigo y email_contacto son requeridos",
    });
  }
  if (!nombre_usuario_admin || !pin_admin) {
    return res.status(400).json({
      error:
        "nombre_usuario_admin y pin_admin son requeridos para el usuario administrador",
    });
  }
  if (!es_prueba && !id_plan) {
    return res.status(400).json({
      error: "id_plan es requerido cuando no es período de prueba",
    });
  }

  // Sanitizar codigo: solo letras, números y guiones
  const codigoLimpio = codigo
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 30);

  const dbName = `gestion_${codigoLimpio}`;

  const conn = await masterPool.getConnection();
  try {
    await conn.beginTransaction();

    // Verificar unicidad de codigo y email
    const [existing] = await conn.query(
      `SELECT id_empresa FROM empresas WHERE codigo = ? OR email_contacto = ? LIMIT 1`,
      [codigoLimpio, email_contacto],
    );
    if (existing.length > 0) {
      await conn.rollback();
      return res
        .status(409)
        .json({ error: "El código o email ya está en uso" });
    }

    // Verificar si db_name ya está registrado en master
    const [dbRegistrada] = await conn.query(
      `SELECT id_empresa, nombre FROM empresas WHERE db_name = ? LIMIT 1`,
      [dbName],
    );
    if (dbRegistrada.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: `La base de datos '${dbName}' ya está registrada para la empresa '${dbRegistrada[0].nombre}'`,
        tipo: "db_ya_registrada",
      });
    }

    // Verificar si la BD física ya existe en MySQL
    const mysql = require("mysql2/promise");
    const rootCheck = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
    });
    let bdFisicaExiste = false;
    try {
      const [dbRows] = await rootCheck.query(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1`,
        [dbName],
      );
      bdFisicaExiste = dbRows.length > 0;
    } finally {
      await rootCheck.end();
    }

    if (bdFisicaExiste) {
      // La BD existe en MySQL pero no está registrada en master → caso "huérfana"
      // Solo registrar si el cliente envía adoptar_bd = true
      if (!req.body.adoptar_bd) {
        await conn.rollback();
        return res.status(409).json({
          error: `La base de datos '${dbName}' ya existe en el servidor pero no está registrada como empresa.`,
          tipo: "bd_huerfana",
          db_name: dbName,
          sugerencia:
            "Envía adoptar_bd: true para registrar la empresa adoptando la BD existente sin sobreescribirla.",
        });
      }
      // Si adoptar_bd = true: registrar sin provisionar
    }

    // Verificar/resolver plan
    let planInfo = null;
    let planId = id_plan;
    if (planId) {
      const [planes] = await conn.query(
        `SELECT id_plan, max_usuarios, nombre FROM planes WHERE id_plan = ? AND activo = 1`,
        [planId],
      );
      if (planes.length === 0) {
        await conn.rollback();
        return res.status(404).json({ error: "Plan no encontrado" });
      }
      planInfo = planes[0];
    } else {
      // Si no se envió plan (ej: prueba), asignar el primer plan activo (Básico)
      const [planes] = await conn.query(
        `SELECT id_plan, max_usuarios, nombre FROM planes WHERE activo = 1 ORDER BY id_plan ASC LIMIT 1`,
      );
      if (planes.length > 0) {
        planInfo = planes[0];
        planId = planInfo.id_plan;
      }
    }

    // Verificar que el nombre de usuario admin no existe en ningún otro tenant
    const [empresasActivas] = await masterPool.query(
      `SELECT db_name FROM empresas WHERE estado = 'activa'`,
    );
    for (const empresa of empresasActivas) {
      try {
        const pool = getTenantPool(empresa.db_name);
        const [dup] = await pool.query(
          `SELECT 1 FROM usuarios WHERE nombre_usuario = ? LIMIT 1`,
          [nombre_usuario_admin],
        );
        if (dup.length > 0) {
          await conn.rollback();
          return res.status(409).json({
            error: `El nombre de usuario '${nombre_usuario_admin}' no está disponible. Prueba con otro nombre de usuario.`,
          });
        }
      } catch (_) {
        // BD inaccesible, ignorar
      }
    }

    // Insertar empresa en BD maestra
    const [result] = await conn.query(
      `INSERT INTO empresas (nombre, codigo, email_contacto, db_name, estado)
       VALUES (?, ?, ?, ?, 'activa')`,
      [nombre, codigoLimpio, email_contacto, dbName],
    );
    const id_empresa = result.insertId;

    // Crear suscripción
    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setDate(fechaFin.getDate() + (es_prueba ? dias_prueba : 30));

    await conn.query(
      `INSERT INTO suscripciones
         (id_empresa, id_plan, es_prueba, estado, fecha_inicio, fecha_fin)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id_empresa,
        planId || null,
        es_prueba ? 1 : 0,
        es_prueba ? "prueba" : "activa",
        fechaInicio.toISOString().slice(0, 10),
        fechaFin.toISOString().slice(0, 10),
      ],
    );

    // Registrar log
    await conn.query(
      `INSERT INTO log_actividad (id_admin, id_empresa, tipo_accion, detalle)
       VALUES (?, ?, 'crear_empresa', ?)`,
      [
        req.admin.id_admin,
        id_empresa,
        `Empresa creada: ${nombre} (${codigoLimpio}) → BD: ${dbName}`,
      ],
    );

    await conn.commit();

    // Provisionar solo si la BD no existe ya (modo adoptar_bd la omite)
    if (!bdFisicaExiste) {
      await provisionarBdTenant(dbName);
    }

    // Crear admin inicial en la BD del tenant
    const tenantPool = getTenantPool(dbName);

    // Si el plan es básico, eliminar etapas de producción
    const planNombre = (planInfo?.nombre || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    if (
      planNombre.includes("basico") ||
      planNombre.includes("básico") ||
      planNombre === "basico" ||
      planNombre === ""
    ) {
      await tenantPool.query(`DELETE FROM etapas_produccion`).catch(() => {});
    }

    // Crear usuario admin (hash del PIN)
    const hashedPin = await bcrypt.hash(pin_admin, 10);
    await tenantPool.query(
      `INSERT INTO usuarios (nombre_usuario, pin, id_rol) VALUES (?, ?, 1)`,
      [nombre_usuario_admin, hashedPin],
    );

    res.status(201).json({
      adoptada: bdFisicaExiste,
      id_empresa,
      nombre,
      codigo: codigoLimpio,
      db_name: dbName,
      estado: "activa",
      admin_creado: nombre_usuario_admin,
      mensaje: bdFisicaExiste
        ? `Empresa registrada adoptando la base de datos existente: ${dbName}`
        : `Empresa creada y base de datos ${dbName} aprovisionada correctamente`,
    });
  } catch (error) {
    await conn.rollback();
    console.error("Error al crear empresa:", error);
    // Si ya se creó la BD pero falló algo, intentar limpiar
    if (error.code !== "ER_DB_CREATE_EXISTS") {
      await dropBdTenantSiVacia(dbName).catch(() => {});
    }
    res
      .status(500)
      .json({ error: "Error al crear la empresa: " + error.message });
  } finally {
    conn.release();
  }
}

async function actualizarEstadoEmpresa(req, res) {
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ["activa", "suspendida", "cancelada"];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: "Estado inválido" });
  }

  try {
    const [rows] = await masterPool.query(
      `SELECT db_name FROM empresas WHERE id_empresa = ?`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    // Actualizar estado de la empresa
    await masterPool.query(
      `UPDATE empresas SET estado = ? WHERE id_empresa = ?`,
      [estado, id],
    );

    // Sincronizar estado de la suscripción activa para que verifyToken lo detecte
    const estadoSub = estado === "activa" ? "activa" : estado;
    await masterPool.query(
      `UPDATE suscripciones SET estado = ?
       WHERE id_empresa = ?
       ORDER BY id_suscripcion DESC LIMIT 1`,
      [estadoSub, id],
    );

    // Si se suspende/cancela, liberar el pool de conexiones
    if (estado === "suspendida" || estado === "cancelada") {
      await releaseTenantPool(rows[0].db_name);
    }

    await masterPool.query(
      `INSERT INTO log_actividad (id_admin, id_empresa, tipo_accion, detalle)
       VALUES (?, ?, 'cambio_estado', ?)`,
      [req.admin.id_admin, id, `Estado cambiado a: ${estado}`],
    );

    res.json({ mensaje: `Estado actualizado a '${estado}'` });
  } catch (error) {
    console.error("Error al actualizar estado:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function listarPlanes(req, res) {
  try {
    const [planes] = await masterPool.query(
      `SELECT * FROM planes WHERE activo = 1 ORDER BY precio_mensual`,
    );
    res.json(planes);
  } catch (error) {
    console.error("Error al listar planes:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function listarLogs(req, res) {
  const { id_empresa, categoria, tipo_accion, rango, q, tipo_auth } = req.query;
  try {
    let query = `SELECT l.*, a.nombre AS admin_nombre,
                        DATE_FORMAT(l.fecha, '%d/%m/%Y %H:%i') AS fecha_bogota
                 FROM log_actividad l
                 LEFT JOIN admins_saas a ON a.id_admin = l.id_admin`;
    const params = [];
    const conditions = [];

    if (id_empresa) {
      conditions.push(`l.id_empresa = ?`);
      params.push(id_empresa);
    }

    if (categoria === "auth") {
      conditions.push(
        `l.tipo_accion IN (${SAAS_AUTH_LOG_ACTIONS.map(() => "?").join(", ")})`,
      );
      params.push(...SAAS_AUTH_LOG_ACTIONS);
    }

    if (tipo_accion) {
      conditions.push(`l.tipo_accion = ?`);
      params.push(tipo_accion);
    }

    if (categoria === "auth" && tipo_auth) {
      conditions.push(`l.tipo_accion = ?`);
      params.push(tipo_auth);
    }

    if (rango === "24h") {
      conditions.push(`l.fecha >= DATE_SUB(NOW(), INTERVAL 1 DAY)`);
    } else if (rango === "7d") {
      conditions.push(`l.fecha >= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
    } else if (rango === "30d") {
      conditions.push(`l.fecha >= DATE_SUB(NOW(), INTERVAL 30 DAY)`);
    }

    if (q && q.trim()) {
      conditions.push(`(
        l.tipo_accion LIKE ? OR
        l.detalle LIKE ? OR
        a.nombre LIKE ?
      )`);
      const search = `%${q.trim()}%`;
      params.push(search, search, search);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY l.fecha DESC LIMIT 200`;
    const [logs] = await masterPool.query(query, params);
    res.json(logs);
  } catch (error) {
    console.error("Error al listar logs:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// ----------------------------------------------------------
// PROVISIONING INTERNO
// ----------------------------------------------------------

async function provisionarBdTenant(dbName) {
  // Leer el template SQL de la BD operativa
  const templatePath = path.join(
    __dirname,
    "../../database/tenant_templates.sql",
  );

  if (!fs.existsSync(templatePath)) {
    throw new Error(
      `Template SQL no encontrado en: ${templatePath}. ` +
        `Asegúrate de que database/tenant_template.sql existe.`,
    );
  }

  const sql = fs.readFileSync(templatePath, "utf8");

  // Conectar sin base de datos especificada para crear la nueva BD
  const mysql = require("mysql2/promise");
  const rootConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  });

  try {
    // Crear la base de datos si no existe
    await rootConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\`
       CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );

    // Seleccionar la BD recién creada
    await rootConn.query(`USE \`${dbName}\``);

    // Ejecutar el template completo
    await rootConn.query(sql);
  } finally {
    await rootConn.end();
  }
}

async function eliminarEmpresa(req, res) {
  const { id } = req.params;
  try {
    const [rows] = await masterPool.query(
      `SELECT db_name, nombre FROM empresas WHERE id_empresa = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }
    const { db_name: dbName, nombre } = rows[0];

    // Liberar pool de conexiones activo
    await releaseTenantPool(dbName).catch(() => {});

    // Eliminar la base de datos física
    const mysql = require("mysql2/promise");
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
    });
    try {
      await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    } finally {
      await conn.end();
    }

    // Eliminar registros en la base master
    await masterPool.query(`DELETE FROM suscripciones WHERE id_empresa = ?`, [
      id,
    ]);
    await masterPool.query(`DELETE FROM log_actividad WHERE id_empresa = ?`, [
      id,
    ]);
    await masterPool.query(`DELETE FROM empresas WHERE id_empresa = ?`, [id]);

    // Registrar la acción (sin id_empresa ya que fue eliminada)
    await masterPool.query(
      `INSERT INTO log_actividad (id_admin, tipo_accion, detalle)
       VALUES (?, 'eliminar_empresa', ?)`,
      [req.admin.id_admin, `Empresa eliminada: ${nombre} (BD: ${dbName})`],
    );

    res.json({
      mensaje: `Empresa '${nombre}' y su base de datos han sido eliminadas.`,
    });
  } catch (error) {
    console.error("Error al eliminar empresa:", error);
    res
      .status(500)
      .json({ error: "Error al eliminar la empresa: " + error.message });
  }
}

async function dropBdTenantSiVacia(dbName) {
  const mysql = require("mysql2/promise");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 3306,
  });
  try {
    const [tables] = await conn.query(
      `SELECT COUNT(*) AS total
       FROM information_schema.tables
       WHERE table_schema = ?`,
      [dbName],
    );
    // Solo eliminar si la BD existe pero está completamente vacía
    if (tables[0].total === 0) {
      await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }
  } finally {
    await conn.end();
  }
}

// ----------------------------------------------------------
// CAMBIAR CONTRASEÑA ADMIN SAAS
// ----------------------------------------------------------

async function cambiarPasswordAdmin(req, res) {
  const { password_actual, password_nuevo } = req.body;
  const id_admin = req.admin.id_admin;

  if (!password_actual || !password_nuevo) {
    return res
      .status(400)
      .json({ error: "password_actual y password_nuevo son requeridos" });
  }
  if (password_nuevo.length < 8) {
    return res
      .status(400)
      .json({ error: "La nueva contraseña debe tener al menos 8 caracteres" });
  }

  try {
    const [rows] = await masterPool.query(
      `SELECT password_hash FROM admins_saas WHERE id_admin = ? AND activo = 1 LIMIT 1`,
      [id_admin],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Admin no encontrado" });
    }

    const valid = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!valid) {
      return res
        .status(401)
        .json({ error: "La contraseña actual es incorrecta" });
    }

    const nuevoHash = await bcrypt.hash(password_nuevo, 10);
    await masterPool.query(
      `UPDATE admins_saas
       SET password_hash = ?,
           primer_login = 0,
           token_version = token_version + 1
       WHERE id_admin = ?`,
      [nuevoHash, id_admin],
    );

    const sesionesRevocadas = await revokeAllRefreshSessionsForAdmin(
      id_admin,
      "password_changed",
    );

    clearSaasAuthCookies(req, res);

    await auditSaasAuth(
      req,
      "cambio_password_admin",
      `Cambio de contraseña del admin SaaS. Refresh sessions revocadas: ${sesionesRevocadas}.`,
      id_admin,
    );

    res.json({
      mensaje: "Contraseña actualizada correctamente. Inicia sesión de nuevo.",
      reauthRequired: true,
      sesiones_revocadas: sesionesRevocadas,
    });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

// Crear admin inicial en la BD del tenant
async function crearAdminInicial(req, res) {
  const { id } = req.params;
  const { nombre_usuario, pin } = req.body;
  if (!nombre_usuario || !pin) {
    return res
      .status(400)
      .json({ error: "nombre_usuario y pin son requeridos" });
  }
  try {
    // Buscar empresa y obtener db_name
    const [rows] = await masterPool.query(
      `SELECT db_name FROM empresas WHERE id_empresa = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }
    const dbName = rows[0].db_name;
    // Conectar a la BD del tenant
    const { getTenantPool } = require("../database/tenantDb");
    const pool = getTenantPool(dbName);
    // Verificar si ya existe un usuario admin
    const [usuarios] = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE id_rol = 1 LIMIT 1`,
    );
    if (usuarios.length > 0) {
      return res
        .status(409)
        .json({ error: "Ya existe un usuario admin en esta empresa" });
    }
    // Insertar usuario admin (id_rol=1)
    const hashedPin = await bcrypt.hash(pin, 10);
    await pool.query(
      `INSERT INTO usuarios (nombre_usuario, pin, id_rol) VALUES (?, ?, 1)`,
      [nombre_usuario, hashedPin],
    );
    res.json({ ok: true, mensaje: "Usuario admin creado correctamente" });
  } catch (error) {
    console.error("Error al crear admin inicial:", error);
    res
      .status(500)
      .json({ error: "Error al crear el usuario admin: " + error.message });
  }
}

// ----------------------------------------------------------
// VERIFICAR SI UNA BD EXISTE
// ----------------------------------------------------------

async function verificarBdExistente(req, res) {
  const { db_name } = req.query;
  if (!db_name) {
    return res.status(400).json({ error: "db_name es requerido" });
  }

  // Sanitizar
  const dbNameLimpio = db_name.replace(/[^a-z0-9_]/gi, "").slice(0, 64);

  try {
    // 1. ¿Está registrada en master?
    const [enMaster] = await masterPool.query(
      `SELECT e.id_empresa, e.nombre, e.codigo, e.estado
       FROM empresas e WHERE e.db_name = ? LIMIT 1`,
      [dbNameLimpio],
    );

    // 2. ¿Existe físicamente en MySQL?
    const mysql = require("mysql2/promise");
    const rootCheck = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
    });
    let bdFisicaExiste = false;
    let tablas = 0;
    try {
      const [dbRows] = await rootCheck.query(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1`,
        [dbNameLimpio],
      );
      bdFisicaExiste = dbRows.length > 0;
      if (bdFisicaExiste) {
        const [tRows] = await rootCheck.query(
          `SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?`,
          [dbNameLimpio],
        );
        tablas = tRows[0].n;
      }
    } finally {
      await rootCheck.end();
    }

    // Determinar estado
    let estado;
    if (!bdFisicaExiste && enMaster.length === 0) estado = "libre";
    else if (bdFisicaExiste && enMaster.length === 0) estado = "bd_huerfana";
    else if (!bdFisicaExiste && enMaster.length > 0)
      estado = "registrada_sin_bd";
    else estado = "completa";

    res.json({
      db_name: dbNameLimpio,
      bd_fisica_existe: bdFisicaExiste,
      tablas_en_bd: tablas,
      registrada_en_master: enMaster.length > 0,
      empresa: enMaster.length > 0 ? enMaster[0] : null,
      estado,
      descripcion: {
        libre: "La BD no existe ni está registrada. Lista para crear.",
        bd_huerfana:
          "La BD existe en MySQL pero no tiene empresa registrada. Puedes registrarla con adoptar_bd: true.",
        registrada_sin_bd:
          "La empresa está registrada pero la BD aún no fue aprovisionada.",
        completa: "La BD existe y la empresa está registrada correctamente.",
      }[estado],
    });
  } catch (error) {
    console.error("Error en verificarBdExistente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function editarSuscripcion(req, res) {
  const { id } = req.params;
  const { id_plan, es_prueba, dias, estado_suscripcion } = req.body;

  try {
    const [subs] = await masterPool.query(
      `SELECT id_suscripcion FROM suscripciones WHERE id_empresa = ? ORDER BY fecha_inicio DESC LIMIT 1`,
      [id],
    );
    if (subs.length === 0) {
      return res
        .status(404)
        .json({ error: "No hay suscripción para esta empresa" });
    }
    const id_suscripcion = subs[0].id_suscripcion;

    const updates = [];
    const values = [];

    if (id_plan !== undefined && id_plan !== "") {
      updates.push("id_plan = ?");
      values.push(id_plan);
    }
    if (estado_suscripcion) {
      updates.push("estado = ?");
      values.push(estado_suscripcion);
    }
    if (es_prueba !== undefined) {
      updates.push("es_prueba = ?");
      values.push(es_prueba ? 1 : 0);
    }
    if (dias) {
      const fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + parseInt(dias));
      updates.push("fecha_fin = ?");
      values.push(fechaFin.toISOString().slice(0, 10));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "Nada que actualizar" });
    }

    values.push(id_suscripcion);
    await masterPool.query(
      `UPDATE suscripciones SET ${updates.join(", ")} WHERE id_suscripcion = ?`,
      values,
    );

    await masterPool.query(
      `INSERT INTO log_actividad (id_admin, id_empresa, tipo_accion, detalle) VALUES (?, ?, 'editar_suscripcion', ?)`,
      [
        req.admin.id_admin,
        id,
        `Suscripción actualizada: ${updates.join(", ")}`,
      ],
    );

    res.json({ mensaje: "Suscripción actualizada correctamente" });
  } catch (error) {
    console.error("Error al editar suscripción:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

async function cambiarCredencialesAdmin(req, res) {
  const { id } = req.params;
  const { nombre_usuario, pin } = req.body;

  if (!nombre_usuario && !pin) {
    return res.status(400).json({ error: "Se requiere nombre_usuario o pin" });
  }

  try {
    const [rows] = await masterPool.query(
      `SELECT db_name FROM empresas WHERE id_empresa = ? LIMIT 1`,
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    const dbName = rows[0].db_name;
    const pool = getTenantPool(dbName);

    const [admins] = await pool.query(
      `SELECT id_usuario FROM usuarios WHERE id_rol = 1 LIMIT 1`,
    );
    if (admins.length === 0) {
      return res
        .status(404)
        .json({ error: "No se encontró usuario admin en esta empresa" });
    }

    const id_usuario = admins[0].id_usuario;
    const updates = [];
    const values = [];

    if (nombre_usuario) {
      updates.push("nombre_usuario = ?");
      values.push(nombre_usuario);
    }
    if (pin) {
      updates.push("pin = ?");
      values.push(await bcrypt.hash(pin, 10));
    }

    values.push(id_usuario);
    await pool.query(
      `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = ?`,
      values,
    );

    await masterPool.query(
      `INSERT INTO log_actividad (id_admin, id_empresa, tipo_accion, detalle) VALUES (?, ?, 'cambiar_credenciales_admin', ?)`,
      [
        req.admin.id_admin,
        id,
        `Credenciales admin actualizadas:${nombre_usuario ? " usuario=" + nombre_usuario : ""}${pin ? " + PIN" : ""}`,
      ],
    );

    res.json({ mensaje: "Credenciales actualizadas correctamente" });
  } catch (error) {
    console.error("Error al cambiar credenciales:", error);
    res
      .status(500)
      .json({ error: "Error al cambiar credenciales: " + error.message });
  }
}

async function verificarUsuarioDisponible(req, res) {
  const { nombre_usuario } = req.query;
  if (!nombre_usuario || nombre_usuario.trim().length < 1) {
    return res.status(400).json({ error: "nombre_usuario es requerido" });
  }
  try {
    const [empresas] = await masterPool.query(
      `SELECT db_name FROM empresas WHERE estado = 'activa'`,
    );
    for (const empresa of empresas) {
      try {
        const pool = getTenantPool(empresa.db_name);
        const [rows] = await pool.query(
          `SELECT 1 FROM usuarios WHERE nombre_usuario = ? LIMIT 1`,
          [nombre_usuario.trim()],
        );
        if (rows.length > 0) {
          return res.json({
            disponible: false,
            error: `El usuario '${nombre_usuario.trim()}' no está disponible, intenta con otro.`,
          });
        }
      } catch (_) {
        // BD inaccesible, ignorar
      }
    }
    return res.json({ disponible: true });
  } catch (error) {
    console.error("Error en verificarUsuarioDisponible:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

module.exports = {
  ensureSaasAuthSchema,
  setupStatus,
  setupAdmin,
  loginAdmin,
  meAdmin,
  refreshAdmin,
  logoutAdmin,
  purgeStaleRefreshSessions,
  cambiarPasswordAdmin,
  verificarBdExistente,
  verificarUsuarioDisponible,
  listarEmpresas,
  obtenerEmpresa,
  crearEmpresa,
  actualizarEstadoEmpresa,
  eliminarEmpresa,
  editarSuscripcion,
  cambiarCredencialesAdmin,
  listarPlanes,
  listarLogs,
  crearAdminInicial,
};
