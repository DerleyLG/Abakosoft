const jwt = require("jsonwebtoken");
const masterPool = require("../database/masterDb");

// Protege rutas del panel de administración SaaS.
// Solo admins_saas con JWT firmado por SAAS_JWT_SECRET pueden acceder.
module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const cookieToken = req.cookies?.saas_access;

  let token = cookieToken;
  if (!token && authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const secret = process.env.SAAS_JWT_SECRET || process.env.JWT_SECRET;

  try {
    const decoded = jwt.verify(token, secret);

    if (!decoded.is_saas_admin) {
      return res
        .status(403)
        .json({ error: "Acceso denegado: se requiere admin SaaS" });
    }

    const [rows] = await masterPool.query(
      `SELECT id_admin, activo, token_version
       FROM admins_saas
       WHERE id_admin = ?
       LIMIT 1`,
      [decoded.id_admin],
    );

    if (rows.length === 0 || !rows[0].activo) {
      return res.status(401).json({ error: "Admin no autorizado" });
    }

    const currentTokenVersion = rows[0].token_version || 0;
    const tokenVersion = decoded.token_version || 0;

    if (tokenVersion !== currentTokenVersion) {
      return res
        .status(401)
        .json({ error: "La sesión fue invalidada. Inicia sesión nuevamente." });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Token de admin inválido o expirado" });
  }
};
