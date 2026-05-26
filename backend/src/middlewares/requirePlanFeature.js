// Middleware para validar acceso a features según el plan de la empresa
const { PLAN_FEATURES } = require("../constants/plans");
const empresaModel = require("../models/empresaModel");

const normalize = (str) =>
  str
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function requirePlanFeature(feature) {
  return async function (req, res, next) {
    try {
      // Leer plan desde el JWT (sin query a BD)
      let rawPlan = req.user?.plan;

      // Fallback a BD si el token no trae plan (tokens antiguos)
      if (!rawPlan) {
        const empresaId = req.user?.empresa_id || req.empresaId;
        const dbName = req.user?.db_name;
        if (!empresaId && !dbName) {
          return res
            .status(403)
            .json({ error: "No se pudo determinar la empresa" });
        }
        const empresa = await empresaModel.getByIdOrDbName({
          id: empresaId,
          db_name: dbName,
        });
        rawPlan = empresa?.plan;
      }

      const plan = normalize(rawPlan || "basico");
      const allowed = PLAN_FEATURES[plan]?.includes(feature);

      if (!allowed) {
        return res.status(403).json({ error: "NO_PLAN_PERMISSION" });
      }
      next();
    } catch (err) {
      console.error("[requirePlanFeature] Error:", err);
      return res.status(500).json({ error: "Error validando plan" });
    }
  };
}

module.exports = requirePlanFeature;
