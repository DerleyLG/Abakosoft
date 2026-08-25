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

// Tiempo máximo que una key puede quedar "en procesamiento" (status_code = 0)
// antes de considerarse huérfana (p. ej. el servidor se reinició a mitad del request).
const STALE_PROCESSING_MS = 60 * 1000;

async function checkIdempotency(req, res, next) {
  const key = req.headers["x-idempotency-key"];
  const userId = req.user?.id_usuario;

  // Si no viene el header, pasar sin protección
  if (!key || typeof key !== "string" || key.length > 64) return next();
  if (!userId) return next();

  try {
    const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);

    // Reserva atómica de la key: si ya existe, el INSERT IGNORE no inserta nada.
    // Esto cierra la condición de carrera entre el SELECT y el INSERT del
    // enfoque anterior (dos requests simultáneos con la misma key podían
    // pasar ambos y duplicar el registro).
    const [insertResult] = await db.query(
      `INSERT IGNORE INTO idempotency_keys
         (key_value, path, user_id, status_code, response_body, expires_at)
       VALUES (?, ?, ?, 0, '{}', ?)`,
      [key, req.path, userId, expiresAt],
    );

    if (insertResult.affectedRows === 0) {
      // La key ya fue usada: o ya se procesó, o está en procesamiento
      const [rows] = await db.query(
        "SELECT status_code, response_body, created_at FROM idempotency_keys WHERE key_value = ? LIMIT 1",
        [key],
      );

      if (rows.length > 0) {
        if (rows[0].status_code > 0) {
          // Ya procesada: devolver la respuesta guardada sin reprocesar
          return res.status(rows[0].status_code).json(rows[0].response_body);
        }

        // Aún en procesamiento: si es reciente, avisar al cliente para que
        // reintente; si es huérfana (request anterior se cayó), liberarla.
        const creada = new Date(rows[0].created_at).getTime();
        if (Date.now() - creada < STALE_PROCESSING_MS) {
          return res
            .status(409)
            .json({ error: "La solicitud ya está en procesamiento." });
        }
        await db.query("DELETE FROM idempotency_keys WHERE key_value = ?", [
          key,
        ]);
        // Re-reservar la key para que el UPDATE posterior registre la respuesta.
        // Si otro request la tomó justo en este instante, no inserta nada.
        const [reinsert] = await db.query(
          `INSERT IGNORE INTO idempotency_keys
             (key_value, path, user_id, status_code, response_body, expires_at)
           VALUES (?, ?, ?, 0, '{}', ?)`,
          [key, req.path, userId, expiresAt],
        );
        if (reinsert.affectedRows === 0) {
          return res
            .status(409)
            .json({ error: "La solicitud ya está en procesamiento." });
        }
      }
    }

    // Interceptar res.json para registrar el resultado real de la operación
    const origJson = res.json.bind(res);
    res.json = async (body) => {
      const status = res.statusCode;
      try {
        if (status >= 200 && status < 300) {
          // Éxito: actualizar la key reservada con la respuesta real
          await db.query(
            `UPDATE idempotency_keys
             SET status_code = ?, response_body = ?, expires_at = ?
             WHERE key_value = ?`,
            [status, JSON.stringify(body), expiresAt, key],
          );
        } else {
          // Error: liberar la key para permitir reintentar la operación
          await db.query("DELETE FROM idempotency_keys WHERE key_value = ?", [
            key,
          ]);
        }
      } catch (e) {
        console.error("[IDEMPOTENCY] Error al guardar:", e);
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
