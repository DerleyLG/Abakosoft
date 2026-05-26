// Modelo mínimo para obtener el plan de la empresa
const masterPool = require("../database/masterDb");

// Obtiene el plan real de la empresa según la suscripción más reciente
async function getByIdOrDbName({ id, db_name }) {
  let where, param;
  if (id) {
    where = "e.id_empresa = ?";
    param = id;
  } else if (db_name) {
    where = "e.db_name = ?";
    param = db_name;
  } else {
    return null;
  }
  const [rows] = await masterPool.query(
    `
    SELECT 
      e.id_empresa as id,
      e.db_name,
      p.nombre as plan
    FROM empresas e
    LEFT JOIN suscripciones s ON s.id_empresa = e.id_empresa
    LEFT JOIN planes p ON p.id_plan = s.id_plan
    WHERE ${where}
      AND s.id_suscripcion = (
        SELECT id_suscripcion FROM suscripciones WHERE id_empresa = e.id_empresa ORDER BY id_suscripcion DESC LIMIT 1
      )
    LIMIT 1
  `,
    [param],
  );
  return rows[0] || null;
}

module.exports = { getByIdOrDbName };
module.exports = { getByIdOrDbName };
