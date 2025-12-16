const db = require("../database/db");

/**
 * Valida que una fecha no pertenezca a un período cerrado
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<{valido: boolean, error: string|null, cierre: object|null}>}
 */
const validarFechaNoEnPeriodoCerrado = async (fecha) => {
  try {
    const [cierresCerrados] = await db.query(
      `SELECT id_cierre, fecha_inicio, fecha_fin 
       FROM cierres_caja 
       WHERE estado = 'cerrado' 
       AND ? >= fecha_inicio 
       AND ? <= fecha_fin
       LIMIT 1`,
      [fecha, fecha]
    );

    if (cierresCerrados.length > 0) {
      const cierre = cierresCerrados[0];

      // Formatear fechas a DD/MM/YYYY
      const formatearFecha = (fecha) => {
        if (!fecha) return "";
        const [year, month, day] = fecha.split("T")[0].split("-");
        return `${day}/${month}/${year}`;
      };

      return {
        valido: false,
        error: `No se puede registrar un movimiento con fecha ${formatearFecha(
          fecha
        )} porque pertenece a un período ya cerrado.`,
        cierre,
      };
    }

    return {
      valido: true,
      error: null,
      cierre: null,
    };
  } catch (err) {
    throw new Error("Error al validar períodos cerrados: " + err.message);
  }
};

module.exports = {
  validarFechaNoEnPeriodoCerrado,
};
