/**
 * GET /api/consumos-materia-prima/costos-por-articulo/:id_orden_fabricacion
 * Devuelve el prorrateo y costo total por artículo avanzado en la orden
 */

const consumoMateriaPrimaModel = require("../models/consumoMateriaPrimaModel");
const db = require("../database/db");

const consumoMateriaPrimaController = {
  /**
   * POST /api/consumos-materia-prima
   * Registrar un nuevo consumo
   */
  getCostosPorArticulo: async (req, res) => {
    try {
      const { id_orden_fabricacion } = req.params;
      if (!id_orden_fabricacion) {
        return res.status(400).json({
          success: false,
          error: "Falta el id de la orden de fabricación",
        });
      }
      const resultado =
        await consumoMateriaPrimaModel.calcularCostosPorArticulo(
          id_orden_fabricacion,
        );
      res.json({ success: true, data: resultado });
    } catch (error) {
      console.error("Error obteniendo costos por artículo:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener los costos por artículo",
      });
    }
  },

  registrarConsumo: async (req, res) => {
    try {
      const { fecha, id_articulo, cantidad, notas, id_orden_fabricacion } =
        req.body;
      const id_usuario = req.user?.id_usuario || null;

      if (!fecha || !id_articulo || !cantidad) {
        return res.status(400).json({
          success: false,
          error: "Fecha, artículo y cantidad son requeridos",
        });
      }

      if (cantidad <= 0) {
        return res.status(400).json({
          success: false,
          error: "La cantidad debe ser mayor a 0",
        });
      }

      // Obtener el precio de costo y la etapa del artículo
      const [articulo] = await db.query(
        "SELECT precio_costo, descripcion, id_etapa FROM articulos WHERE id_articulo = ?",
        [id_articulo],
      );

      if (articulo.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Artículo no encontrado",
        });
      }

      if (articulo[0].id_etapa == null) {
        return res.status(400).json({
          success: false,
          error:
            "El artículo no tiene una etapa de consumo asignada. Por favor, seleccione la etapa antes de registrar el consumo.",
        });
      }

      const costo_unitario = articulo[0].precio_costo || 0;

      // Verificar stock disponible en inventario
      const [inventario] = await db.query(
        "SELECT stock FROM inventario WHERE id_articulo = ?",
        [id_articulo],
      );

      if (inventario.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Artículo no está en inventario",
        });
      }

      const stockActual = Number(inventario[0].stock) || 0;
      if (stockActual < cantidad) {
        return res.status(400).json({
          success: false,
          error: `Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`,
        });
      }

      // Registrar el consumo
      const id_consumo = await consumoMateriaPrimaModel.registrarConsumo({
        fecha,
        id_articulo,
        cantidad,
        costo_unitario,
        notas,
        id_usuario,
        id_orden_fabricacion,
      });

      // Descontar del inventario
      await db.query(
        `UPDATE inventario 
         SET stock = stock - ? 
         WHERE id_articulo = ?`,
        [cantidad, id_articulo],
      );

      // Registrar movimiento de inventario
      await db.query(
        `INSERT INTO movimientos_inventario 
         (id_articulo, tipo_movimiento, cantidad_movida, tipo_origen_movimiento, observaciones)
         VALUES (?, 'salida', ?, 'ajuste_manual', ?)`,
        [
          id_articulo,
          cantidad,
          `Consumo de materia prima: ${notas || "Sin notas"}`,
        ],
      );

      res.status(201).json({
        success: true,
        message: "Consumo registrado correctamente",
        data: {
          id_consumo,
          articulo: articulo[0].descripcion,
          cantidad,
          costo_total: cantidad * costo_unitario,
          stock_anterior: stockActual,
          stock_nuevo: stockActual - cantidad,
        },
      });
    } catch (error) {
      console.error("Error registrando consumo:", error);
      res.status(500).json({
        success: false,
        error: "Error al registrar el consumo",
      });
    }
  },

  /**
   * GET /api/consumos-materia-prima/articulo/:id
   * Obtener consumos de un artículo específico
   */
  getConsumosPorArticulo: async (req, res) => {
    try {
      const { id } = req.params;
      const { limite = 10 } = req.query;

      const consumos = await consumoMateriaPrimaModel.getConsumosPorArticulo(
        id,
        parseInt(limite),
      );

      res.json({
        success: true,
        data: consumos,
      });
    } catch (error) {
      console.error("Error obteniendo consumos:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener los consumos",
      });
    }
  },

  /**
   * GET /api/consumos-materia-prima/resumen-semanal
   * Obtener resumen de consumos de la semana actual o período especificado
   */
  getResumenSemanal: async (req, res) => {
    try {
      let { fechaInicio, fechaFin } = req.query;

      // Si no se especifican fechas, usar la semana actual (lunes a domingo)
      if (!fechaInicio || !fechaFin) {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + diffLunes);
        lunes.setHours(0, 0, 0, 0);

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999);

        fechaInicio = lunes.toISOString().split("T")[0];
        fechaFin = domingo.toISOString().split("T")[0];
      }

      const resumen = await consumoMateriaPrimaModel.getResumenSemanal(
        fechaInicio,
        fechaFin,
      );

      res.json({
        success: true,
        periodo: { fechaInicio, fechaFin },
        data: resumen,
        totales: {
          total_consumido: resumen.reduce(
            (sum, r) => sum + Number(r.total_consumido || 0),
            0,
          ),
          costo_total: resumen.reduce(
            (sum, r) => sum + Number(r.costo_total || 0),
            0,
          ),
        },
      });
    } catch (error) {
      console.error("Error obteniendo resumen semanal:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el resumen semanal",
      });
    }
  },

  /**
   * GET /api/consumos-materia-prima/prorrateo
   * Obtener prorrateo de consumos entre órdenes de fabricación
   */
  getProrrateo: async (req, res) => {
    try {
      let { fechaInicio, fechaFin } = req.query;

      // Si no se especifican fechas, usar la semana actual
      if (!fechaInicio || !fechaFin) {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + diffLunes);
        lunes.setHours(0, 0, 0, 0);

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999);

        fechaInicio = lunes.toISOString().split("T")[0];
        fechaFin = domingo.toISOString().split("T")[0];
      }

      const resultado = await consumoMateriaPrimaModel.calcularProrrateo(
        fechaInicio,
        fechaFin,
      );

      res.json({
        success: true,
        periodo: { fechaInicio, fechaFin },
        ...resultado,
      });
    } catch (error) {
      console.error("Error calculando prorrateo:", error);
      res.status(500).json({
        success: false,
        error: "Error al calcular el prorrateo",
      });
    }
  },

  /**
   * DELETE /api/consumos-materia-prima/:id
   * Eliminar un consumo y restaurar inventario
   */
  eliminarConsumo: async (req, res) => {
    try {
      const { id } = req.params;

      // Obtener datos del consumo antes de eliminar
      const consumo = await consumoMateriaPrimaModel.eliminarConsumo(id);

      // Restaurar el inventario
      await db.query(
        `UPDATE inventario 
         SET stock_disponible = stock_disponible + ?, 
             ultima_actualizacion = NOW() 
         WHERE id_articulo = ?`,
        [consumo.cantidad, consumo.id_articulo],
      );

      // Registrar movimiento de inventario (reversión)
      const [inventario] = await db.query(
        "SELECT stock_disponible FROM inventario WHERE id_articulo = ?",
        [consumo.id_articulo],
      );

      await db.query(
        `INSERT INTO movimientos_inventario 
         (id_articulo, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, descripcion, fecha_movimiento)
         VALUES (?, 'entrada', ?, ?, ?, ?, NOW())`,
        [
          consumo.id_articulo,
          consumo.cantidad,
          inventario[0].stock_disponible - consumo.cantidad,
          inventario[0].stock_disponible,
          `Reversión de consumo #${id}`,
        ],
      );

      res.json({
        success: true,
        message: "Consumo eliminado y stock restaurado",
      });
    } catch (error) {
      console.error("Error eliminando consumo:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Error al eliminar el consumo",
      });
    }
  },

  /**
   * Inicializar tabla (se llama al iniciar la app)
   */
  inicializarTabla: async () => {
    try {
      await consumoMateriaPrimaModel.createTableIfNotExists();
      console.log("Tabla consumos_materia_prima verificada/creada");
    } catch (error) {
      console.error("Error inicializando tabla de consumos:", error);
    }
  },

  /**
   * GET /api/consumos-materia-prima/recientes
   * Obtener los últimos registros de consumo con sus notas
   */
  getConsumosRecientes: async (req, res) => {
    try {
      const { limite = 10 } = req.query;

      // Obtener los últimos N consumos incluyendo la unidad
      const query = `
        SELECT 
          c.id_consumo,
          c.fecha,
          c.cantidad,
          c.costo_unitario,
          c.costo_total,
          c.notas,
          c.fecha_registro,
          a.id_articulo,
          a.referencia,
          a.descripcion,
          u.nombre_usuario,
          un.abreviatura AS abreviatura_unidad,
          un.nombre AS unidad,
          e.nombre AS nombre_etapa
        FROM consumos_materia_prima c
        JOIN articulos a ON c.id_articulo = a.id_articulo
        LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
        LEFT JOIN unidades un ON a.id_unidad = un.id_unidad
        LEFT JOIN etapas_produccion e ON a.id_etapa = e.id_etapa
        ORDER BY c.fecha_registro DESC
        LIMIT ?
      `;

      const [consumos] = await db.query(query, [parseInt(limite)]);

      res.json({
        success: true,
        data: consumos,
        total: consumos.length,
      });
    } catch (error) {
      console.error("Error obteniendo consumos recientes:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener los consumos recientes",
      });
    }
  },

  /**
   * GET /api/consumos-materia-prima/resumen-cierre
   * Obtener resumen de consumos para cierre de caja
   */
  getResumenParaCierre: async (req, res) => {
    try {
      let { fechaInicio, fechaFin } = req.query;

      // Si no se especifican fechas, usar la semana actual
      if (!fechaInicio || !fechaFin) {
        const hoy = new Date();
        const diaSemana = hoy.getDay();
        const diffLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() + diffLunes);
        lunes.setHours(0, 0, 0, 0);

        const domingo = new Date(lunes);
        domingo.setDate(lunes.getDate() + 6);
        domingo.setHours(23, 59, 59, 999);

        fechaInicio = lunes.toISOString().split("T")[0];
        fechaFin = domingo.toISOString().split("T")[0];
      }

      const resultado = await consumoMateriaPrimaModel.getResumenParaCierre(
        fechaInicio,
        fechaFin,
      );

      res.json({
        success: true,
        periodo: { fechaInicio, fechaFin },
        ...resultado,
      });
    } catch (error) {
      console.error("Error obteniendo resumen para cierre:", error);
      res.status(500).json({
        success: false,
        error: "Error al obtener el resumen de consumo para cierre",
      });
    }
  },
};

module.exports = consumoMateriaPrimaController;
