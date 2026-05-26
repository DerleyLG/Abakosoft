const db = require("../database/db");

const TTL_HOURS = 1;

// Limpieza periódica de keys expiradas (cada hora)
setInterval(
  async () => {
    try {
      await db.query("DELETE FROM idempotency_keys WHERE expires_at < NOW()");
    } catch (_) {}
  },
  60 * 60 * 1000,
);

async function checkIdempotency(req, res, next) {
  console.log("[IDEMPOTENCY][DEBUG] Headers:", req.headers);
  console.log("[IDEMPOTENCY][DEBUG] req.user:", req.user);
  const key = req.headers["x-idempotency-key"];
  const userId = req.user?.id_usuario;
  console.log(
    "[IDEMPOTENCY] Middleware ejecutado, key:",
    key,
    "user:",
    userId,
    "path:",
    req.path,
    "method:",
    req.method,
  );

  // Si no viene el header, pasar sin protección
  if (!key || typeof key !== "string" || key.length > 64) return next();
  if (!userId) return next();

  try {
    const [rows] = await db.query(
      "SELECT status_code, response_body FROM idempotency_keys WHERE key_value = ? AND expires_at > NOW() LIMIT 1",
      [key],
    );

    if (rows.length > 0) {
      return res.status(rows[0].status_code).json(rows[0].response_body);
    }

    // Interceptar res.json para guardar la respuesta exitosa
    const origJson = res.json.bind(res);
    res.json = async (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
        try {
          console.log("[IDEMPOTENCY] Intentando guardar:", {
            key,
            userId,
            status: res.statusCode,
            path: req.path,
            expiresAt,
            body,
          });
          await db.query(
            "INSERT IGNORE INTO idempotency_keys (key_value, path, user_id, status_code, response_body, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
            [
              key,
              req.path,
              userId,
              res.statusCode,
              JSON.stringify(body),
              expiresAt,
            ],
          );
        } catch (e) {
          console.error("[IDEMPOTENCY] Error al guardar:", e);
        }
      }
      return origJson(body);
    };

    next();
  } catch (err) {
    // Si falla la consulta de idempotencia, dejar pasar el request (no bloquear)
    next();
  }
}

module.exports = { checkIdempotency };
