const jwt = require("jsonwebtoken");
const { runWithTenant, releaseTenantPool } = require("../database/tenantDb");
const masterPool = require("../database/masterDb");
const { checkIdempotency } = require("./idempotency");

module.exports = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Token mal formado" });
  }

  const token = parts[1];

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Token inválido o expirado" });
    }

    // Si el token tiene db_name (usuario de empresa), verificar suscripción vigente en tiempo real
    if (decoded.db_name) {
      try {
        const [rows] = await masterPool.query(
          `SELECT s.estado AS estado_sub, s.es_prueba, s.fecha_fin, s.id_suscripcion,
                  e.estado AS estado_empresa, e.id_empresa
           FROM suscripciones s
           INNER JOIN empresas e ON e.id_empresa = s.id_empresa
           WHERE e.db_name = ?
           ORDER BY s.id_suscripcion DESC LIMIT 1`,
          [decoded.db_name],
        );
        if (rows.length > 0) {
          let {
            estado_sub,
            es_prueba,
            fecha_fin,
            id_suscripcion,
            estado_empresa,
            id_empresa,
          } = rows[0];
          const ahora = new Date();

          // Si la empresa está suspendida/cancelada directamente, bloquear de inmediato
          if (
            estado_empresa === "suspendida" ||
            estado_empresa === "cancelada"
          ) {
            return res.status(403).json({
              error:
                estado_empresa === "cancelada"
                  ? "Tu suscripción ha sido cancelada."
                  : "Tu suscripción está suspendida.",
              suspended: true,
              es_prueba: !!es_prueba,
            });
          }

          // Auto-transición basada en fecha: activa → gracia cuando fecha_fin ha vencido
          if (
            estado_sub === "activa" &&
            fecha_fin &&
            ahora > new Date(fecha_fin)
          ) {
            await masterPool.query(
              `UPDATE suscripciones SET estado = 'gracia' WHERE id_suscripcion = ?`,
              [id_suscripcion],
            );
            estado_sub = "gracia";
          }

          // Auto-transición: gracia → suspendida después de 3 días de gracia
          if (estado_sub === "gracia" && fecha_fin) {
            const finGracia = new Date(
              new Date(fecha_fin).getTime() + 3 * 24 * 60 * 60 * 1000,
            );
            if (ahora > finGracia) {
              await masterPool.query(
                `UPDATE suscripciones SET estado = 'suspendida' WHERE id_suscripcion = ?`,
                [id_suscripcion],
              );
              await masterPool.query(
                `UPDATE empresas SET estado = 'suspendida' WHERE id_empresa = ?`,
                [id_empresa],
              );
              await releaseTenantPool(decoded.db_name).catch(() => {});
              estado_sub = "suspendida";
            }
          }

          if (estado_sub === "suspendida" || estado_sub === "cancelada") {
            return res.status(403).json({
              error: es_prueba
                ? "Tu período de prueba ha finalizado. Contáctanos para activar tu plan."
                : estado_sub === "cancelada"
                  ? "Tu suscripción ha sido cancelada."
                  : "Tu suscripción está suspendida.",
              suspended: true,
              es_prueba: !!es_prueba,
            });
          }

          // En período de gracia: permitir acceso pero actualizar el payload en tiempo real
          if (estado_sub === "gracia") {
            decoded.estado_suscripcion = "gracia";
          }
        }
      } catch (_) {
        // Si falla la consulta, dejamos pasar (evitar bloqueos por error de BD)
      }
    }

    req.user = decoded;
    const proceed = () => {
      next();
    };

    if (decoded.db_name) {
      runWithTenant(decoded.db_name, () => proceed());
    } else {
      proceed();
    }
  });
};
