const cierresCajaModel = require("../models/cierresCajaModel");
const migracionService = require("../services/migracionCierresService");

const cierresCajaController = {
  /**
   * GET /api/cierres-caja
   * Obtener histórico de cierres
   */
  getAll: async (req, res) => {
    try {
      const cierres = await cierresCajaModel.getAll();
      res.json(cierres);
    } catch (error) {
      console.error("Error obteniendo cierres:", error);
      res.status(500).json({ error: "Error al obtener los cierres de caja" });
    }
  },

  /**
   * GET /api/cierres-caja/abierto
   * Obtener cierre actual (abierto)
   */
  getCierreAbierto: async (req, res) => {
    try {
      const cierre = await cierresCajaModel.getCierreAbierto();

      if (!cierre) {
        return res.status(404).json({ error: "No hay período abierto" });
      }

      res.json(cierre);
    } catch (error) {
      console.error("Error obteniendo cierre abierto:", error);
      res.status(500).json({ error: "Error al obtener el cierre abierto" });
    }
  },

  /**
   * GET /api/cierres-caja/:id
   * Obtener detalle completo de un cierre
   */
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const cierre = await cierresCajaModel.getById(id);

      if (!cierre) {
        return res.status(404).json({ error: "Cierre no encontrado" });
      }

      res.json(cierre);
    } catch (error) {
      console.error("Error obteniendo cierre:", error);
      res.status(500).json({ error: "Error al obtener el cierre" });
    }
  },

  /**
   * GET /api/cierres-caja/:id/movimientos
   * Obtener movimientos detallados del período
   */
  getMovimientos: async (req, res) => {
    try {
      const { id } = req.params;
      const movimientos = await cierresCajaModel.getMovimientosPeriodo(id);

      res.json(movimientos);
    } catch (error) {
      console.error("Error obteniendo movimientos:", error);
      res
        .status(500)
        .json({ error: "Error al obtener los movimientos del período" });
    }
  },

  /**
   * POST /api/cierres-caja
   * Crear nuevo período (apertura inicial)
   */
  create: async (req, res) => {
    try {
      const { fecha_inicio, saldos_iniciales } = req.body;

      // Validar que no haya otro período abierto
      const cierreAbierto = await cierresCajaModel.getCierreAbierto();
      if (cierreAbierto) {
        return res.status(400).json({
          error:
            "Ya existe un período abierto. Debe cerrarlo antes de abrir uno nuevo.",
        });
      }

      // Validar datos
      if (!fecha_inicio) {
        return res
          .status(400)
          .json({ error: "La fecha de inicio es requerida" });
      }

      if (
        !saldos_iniciales ||
        !Array.isArray(saldos_iniciales) ||
        saldos_iniciales.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "Los saldos iniciales son requeridos" });
      }

      const id_cierre = await cierresCajaModel.create(
        fecha_inicio,
        saldos_iniciales
      );

      res.status(201).json({
        message: "Período creado exitosamente",
        id_cierre,
      });
    } catch (error) {
      console.error("Error creando período:", error);
      res.status(500).json({ error: "Error al crear el período" });
    }
  },

  /**
   * POST /api/cierres-caja/:id/cerrar
   * Cerrar un período
   */
  cerrar: async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha_fin, observaciones } = req.body;

      // Intentar obtener id_usuario de diferentes campos posibles en el token
      const id_usuario_cierre =
        req.user?.id_usuario || req.user?.userId || req.user?.id || null;

      // Log detallado para debugging
      console.log("=== DEBUGGING CIERRE DE PERÍODO ===");
      console.log("req.user completo:", JSON.stringify(req.user, null, 2));
      console.log("id_usuario_cierre extraído:", id_usuario_cierre);
      console.log("tipo de id_usuario_cierre:", typeof id_usuario_cierre);
      console.log("===================================");

      if (!id_usuario_cierre) {
        console.error(
          "Token no tiene id_usuario. Campos disponibles:",
          Object.keys(req.user || {})
        );
        return res.status(401).json({
          error:
            "Usuario no autenticado correctamente. Token no contiene identificador de usuario válido.",
          debug: Object.keys(req.user || {}),
        });
      }

      // Validar que el cierre exista y esté abierto
      const cierre = await cierresCajaModel.getById(id);
      if (!cierre) {
        return res.status(404).json({ error: "Cierre no encontrado" });
      }

      if (cierre.estado === "cerrado") {
        return res.status(400).json({ error: "Este período ya está cerrado" });
      }

      // Validar fecha de cierre
      if (!fecha_fin) {
        return res.status(400).json({ error: "La fecha de fin es requerida" });
      }

      // Validar que la fecha_fin sea >= fecha_inicio
      if (new Date(fecha_fin) < new Date(cierre.fecha_inicio)) {
        return res.status(400).json({
          error: "La fecha de fin no puede ser anterior a la fecha de inicio",
        });
      }

      // Ejecutar validaciones del período
      const validaciones = await cierresCajaModel.validarCierrePeriodo(
        id,
        fecha_fin
      );

      // Si hay validaciones críticas (errores), no permitir cerrar
      if (validaciones.errores && validaciones.errores.length > 0) {
        return res.status(400).json({
          error: "No se puede cerrar el período debido a errores de validación",
          validaciones,
        });
      }

      // Calcular totales del período
      const totales = await cierresCajaModel.calcularTotalesPeriodo(id);

      // Cerrar el período y crear el siguiente
      const result = await cierresCajaModel.cerrar(
        id,
        fecha_fin,
        id_usuario_cierre,
        observaciones,
        totales
      );

      // Incluir warnings en la respuesta (si los hay)
      const response = {
        message: "Período cerrado exitosamente",
        ...result,
      };

      if (validaciones.warnings && validaciones.warnings.length > 0) {
        response.warnings = validaciones.warnings;
      }

      res.json(response);
    } catch (error) {
      console.error("Error cerrando período:", error);
      res.status(500).json({ error: "Error al cerrar el período" });
    }
  },

  /**
   * POST /api/cierres-caja/validar-fecha
   * Validar si una fecha está en un período cerrado
   */
  validarFecha: async (req, res) => {
    try {
      const { fecha } = req.body;

      if (!fecha) {
        return res.status(400).json({ error: "La fecha es requerida" });
      }

      const estaCerrada = await cierresCajaModel.validarFechaCerrada(fecha);

      res.json({
        fecha_cerrada: estaCerrada,
        mensaje: estaCerrada
          ? "Esta fecha pertenece a un período cerrado"
          : "Fecha disponible para movimientos",
      });
    } catch (error) {
      console.error("Error validando fecha:", error);
      res.status(500).json({ error: "Error al validar la fecha" });
    }
  },

  /**
   * POST /api/cierres-caja/:id/validar
   * Validar un período antes de cerrarlo
   */
  validarPeriodo: async (req, res) => {
    try {
      const { id } = req.params;
      const { fecha_fin } = req.body;

      if (!fecha_fin) {
        return res.status(400).json({ error: "La fecha de fin es requerida" });
      }

      const cierre = await cierresCajaModel.getById(id);
      if (!cierre) {
        return res.status(404).json({ error: "Cierre no encontrado" });
      }

      if (cierre.estado === "cerrado") {
        return res.status(400).json({ error: "Este período ya está cerrado" });
      }

      const validaciones = await cierresCajaModel.validarCierrePeriodo(
        id,
        fecha_fin
      );

      res.json({
        valido: validaciones.errores.length === 0,
        ...validaciones,
      });
    } catch (error) {
      console.error("Error validando período:", error);
      res.status(500).json({ error: "Error al validar el período" });
    }
  },

  /**
   * PUT /api/cierres-caja/:id/saldos-iniciales
   * Actualizar saldos iniciales de un período abierto
   */
  actualizarSaldosIniciales: async (req, res) => {
    try {
      const { id } = req.params;
      const { saldos_iniciales } = req.body;

      // Validar que el cierre exista y esté abierto
      const cierre = await cierresCajaModel.getById(id);
      if (!cierre) {
        return res.status(404).json({ error: "Cierre no encontrado" });
      }

      if (cierre.estado === "cerrado") {
        return res.status(400).json({
          error:
            "No se pueden modificar los saldos iniciales de un período cerrado",
        });
      }

      if (!saldos_iniciales || !Array.isArray(saldos_iniciales)) {
        return res.status(400).json({
          error: "Los saldos iniciales deben ser un array",
        });
      }

      // Actualizar saldos iniciales
      await cierresCajaModel.actualizarSaldosIniciales(id, saldos_iniciales);

      res.json({
        message: "Saldos iniciales actualizados exitosamente",
      });
    } catch (error) {
      console.error("Error actualizando saldos iniciales:", error);
      res
        .status(500)
        .json({ error: "Error al actualizar los saldos iniciales" });
    }
  },

  /**
   * GET /api/cierres-caja/estado-sistema
   * Verificar si el sistema necesita migración de períodos históricos
   */
  verificarEstadoSistema: async (req, res) => {
    try {
      const estado = await migracionService.necesitaMigracion();

      res.json(estado);
    } catch (error) {
      console.error("[verificarEstadoSistema] Error:", error);
      res.status(500).json({ error: "Error al verificar estado del sistema" });
    }
  },

  /**
   * POST /api/cierres-caja/migrar-historicos
   * Crear períodos históricos basados en movimientos existentes
   */
  migrarPeriodosHistoricos: async (req, res) => {
    try {
      // Verificar permisos (solo admin)
      if (req.user && req.user.rol !== "admin") {
        return res.status(403).json({
          error: "Solo administradores pueden ejecutar migraciones",
        });
      }

      const resultado = await migracionService.migrarPeriodosHistoricos();
      res.json(resultado);
    } catch (error) {
      console.error("Error en migración:", error);
      res.status(500).json({
        error: error.message || "Error durante la migración de períodos",
      });
    }
  },

  /**
   * POST /api/cierres-caja/limpiar-datos
   * Limpiar todos los registros de control de caja (TRUNCATE)
   */
  limpiarDatos: async (req, res) => {
    try {
      // Verificar permisos (solo admin)
      if (req.user && req.user.rol !== "admin") {
        return res.status(403).json({
          error: "Solo administradores pueden limpiar datos",
        });
      }

      // Ejecutar truncate en las tablas relacionadas
      await cierresCajaModel.limpiarDatos();

      res.json({
        success: true,
        message: "Todos los registros de control de caja han sido eliminados",
      });
    } catch (error) {
      console.error("Error limpiando datos:", error);
      res.status(500).json({
        error: error.message || "Error al limpiar los datos",
      });
    }
  },
};

module.exports = cierresCajaController;
