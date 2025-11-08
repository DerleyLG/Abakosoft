const cierresCajaModel = require("../models/cierresCajaModel");

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
      const id_usuario_cierre = req.user.id_usuario;

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

      res.json({
        message: "Período cerrado exitosamente",
        ...result,
      });
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
};

module.exports = cierresCajaController;
