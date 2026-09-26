const TesoreriaModel = require("../models/tesoreriaModel");

const tesoreriaController = {
  getMetodosPago: async (req, res) => {
    try {
      const metodos = await TesoreriaModel.getMetodosPago();
      res.json(metodos);
    } catch (error) {
      console.error("Error al obtener métodos de pago:", error);
      res.status(500).json({
        error: "Error interno del servidor al obtener métodos de pago.",
      });
    }
  },
  async getVentasCobrosReport(req, res) {
    try {
      let { desde, hasta, id_cliente, tipo_documento, id_metodo_pago } =
        req.query;
      // Normalizar fechas: si vienen como YYYY-MM-DD en 'hasta', agregar fin de día
      if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
        hasta = `${hasta} 23:59:59`;
      }

      const data = await TesoreriaModel.getVentasCobrosReport({
        desde,
        hasta,
        id_cliente,
        tipo_documento,
        id_metodo_pago,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error en reporte de tesorería (movimientos):", error);
      res.status(500).json({
        success: false,
        message: "Error al generar el reporte de tesorería.",
      });
    }
  },

  getMovimientosTesoreria: async (req, res) => {
    try {
      const { tipo_documento } = req.query;
      const movimientos =
        await TesoreriaModel.getMovimientosTesoreria(tipo_documento);
      res.json(movimientos);
    } catch (error) {
      console.error("Error al obtener movimientos de tesorería:", error);
      res.status(500).json({
        error:
          "Error interno del servidor al obtener movimientos de tesorería.",
      });
    }
  },

  // Conciliación bancaria: lista movimientos con filtros y totales
  getConciliacion: async (req, res) => {
    try {
      const {
        desde,
        hasta,
        estado = "todos",
        page = 1,
        pageSize = 25,
      } = req.query;

      if (desde && hasta && String(desde) > String(hasta)) {
        return res.status(400).json({
          error: "La fecha 'desde' no puede ser mayor que 'hasta'.",
        });
      }

      const { data, total } = await TesoreriaModel.getMovimientosConciliacion({
        desde,
        hasta,
        estado,
        page,
        pageSize,
      });

      // Totales de la página actual: ingresos, egresos y conteo por estado
      const totales = data.reduce(
        (acc, m) => {
          const monto = Number(m.monto || 0);
          if (monto >= 0) acc.ingresos += monto;
          else acc.egresos += Math.abs(monto);
          if (Number(m.conciliado) === 1) acc.validados += 1;
          else acc.pendientes += 1;
          return acc;
        },
        { ingresos: 0, egresos: 0, pendientes: 0, validados: 0 },
      );

      const pg = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(200, Math.max(1, parseInt(pageSize) || 25));
      const totalPages = Math.ceil(total / ps) || 1;

      res.json({
        data,
        total,
        page: pg,
        pageSize: ps,
        totalPages,
        hasNext: pg < totalPages,
        hasPrev: pg > 1,
        totales,
      });
    } catch (error) {
      console.error("Error al obtener movimientos para conciliación:", error);
      res.status(500).json({
        error:
          "Error interno del servidor al obtener movimientos para conciliación.",
      });
    }
  },

  // Marca (o desmarca) un movimiento como conciliado/validado
  marcarConciliado: async (req, res) => {
    try {
      const { id } = req.params;
      const { conciliado } = req.body;

      if (typeof conciliado !== "boolean") {
        return res
          .status(400)
          .json({ error: "El campo 'conciliado' debe ser true o false." });
      }
      if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
        return res
          .status(400)
          .json({ error: "El id del movimiento debe ser un número válido." });
      }
      const id_usuario = req.user?.id_usuario;
      if (!id_usuario) {
        return res
          .status(401)
          .json({ error: "Usuario no autenticado para conciliar." });
      }

      const affected = await TesoreriaModel.marcarConciliado(
        id,
        id_usuario,
        conciliado,
      );

      if (affected === 0) {
        return res
          .status(404)
          .json({ error: "Movimiento de tesorería no encontrado." });
      }

      res.json({
        message: conciliado
          ? "Movimiento validado correctamente"
          : "Validación revertida correctamente",
      });
    } catch (error) {
      console.error("Error al marcar conciliación:", error);
      // Error de validación de negocio (movimiento no es venta por transferencia)
      if (error.message?.includes("no es una venta por transferencia")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({
        error: "Error interno del servidor al marcar la conciliación.",
      });
    }
  },
  getIngresosSummary: async (req, res) => {
    try {
      const summary = await TesoreriaModel.getIngresosSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error al obtener el resumen de ingresos:", error);
      res.status(500).json({
        error: "Error interno del servidor al obtener el resumen de ingresos.",
      });
    }
  },

  getEgresosSummary: async (req, res) => {
    try {
      const egresosSummary = await TesoreriaModel.getEgresosSummary();
      res.json(egresosSummary);
    } catch (error) {
      console.error("Error al obtener el resumen de egresos:", error);
      res.status(500).json({ error: "Error al obtener el resumen de egresos" });
    }
  },
  getPagosTrabajadoresCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getPagosTrabajadoresCount();
      res.json({ count });
    } catch (error) {
      console.error(
        "Error al obtener el conteo de pagos a trabajadores:",
        error,
      );
      res
        .status(500)
        .json({ error: "Error al obtener el conteo de pagos a trabajadores" });
    }
  },

  getOrdenesCompraCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getOrdenesCompraCount();
      res.json({ count });
    } catch (error) {
      console.error("Error al obtener el conteo de órdenes de compra:", error);
      res
        .status(500)
        .json({ error: "Error al obtener el conteo de órdenes de compra" });
    }
  },

  getCostosIndirectosCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getCostosIndirectosCount();
      res.json({ count });
    } catch (error) {
      console.error("Error al obtener el conteo de costos indirectos:", error);
      res
        .status(500)
        .json({ error: "Error al obtener el conteo de costos indirectos" });
    }
  },

  getMateriaPrimaCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getMateriaPrimaCount();
      res.json({ count });
    } catch (error) {
      console.error("Error al obtener el conteo de materia prima:", error);
      res
        .status(500)
        .json({ error: "Error al obtener el conteo de materia prima" });
    }
  },

  getAnticiposCount: async (req, res) => {
    try {
      const count = await TesoreriaModel.getAnticiposCount();
      res.json({ count });
    } catch (error) {
      console.error("Error al obtener el conteo de anticipos:", error);
      res
        .status(500)
        .json({ error: "Error al obtener el conteo de anticipos" });
    }
  },

  getResumenTarjetas: async (req, res) => {
    try {
      const resumen = await TesoreriaModel.getResumenTarjetasDesdeCierre();
      res.json(resumen);
    } catch (error) {
      console.error(
        "Error al obtener resumen de tarjetas de tesorería:",
        error,
      );
      res.status(500).json({
        error: "Error interno del servidor al obtener el resumen de tarjetas.",
      });
    }
  },

  getMovimientoByDocumento: async (req, res) => {
    try {
      const idDocumento = req.params.idDocumento;
      const tipoDocumento = req.query.tipo;

      if (!idDocumento || !tipoDocumento) {
        return res
          .status(400)
          .json({ message: "Faltan parámetros: idDocumento y tipo." });
      }

      const movimiento = await TesoreriaModel.getByDocumentoIdAndTipo(
        idDocumento,
        tipoDocumento,
      );

      if (!movimiento) {
        return res.status(200).json(null);
      }

      res.json(movimiento);
    } catch (error) {
      console.error(
        "Error al obtener movimiento de tesorería por documento:",
        error,
      );
      res.status(500).json({
        error: "Error interno del servidor al obtener movimiento de tesorería.",
      });
    }
  },
  createMovimiento: async (req, res) => {
    try {
      const {
        id_documento = null,
        tipo_documento,
        monto,
        id_metodo_pago = null,
        referencia = null,
        observaciones = null,
        fecha_movimiento = null,
      } = req.body;

      if (!tipo_documento)
        return res.status(400).json({ error: "tipo_documento es obligatorio" });
      if (typeof monto === "undefined" || monto === null)
        return res.status(400).json({ error: "monto es obligatorio" });

      const insertId = await TesoreriaModel.insertarMovimiento({
        id_documento,
        tipo_documento,
        monto,
        id_metodo_pago,
        referencia,
        observaciones,
        fecha_movimiento,
      });

      res.status(201).json({ id_movimiento: insertId });
    } catch (error) {
      console.error("Error creando movimiento de tesorería:", error);
      res
        .status(500)
        .json({ error: "Error interno al crear movimiento de tesorería" });
    }
  },

  transferirEntreMetodos: async (req, res) => {
    const db = require("../database/db");
    let connection;

    try {
      const {
        id_metodo_origen,
        id_metodo_destino,
        monto,
        observaciones,
        referencia,
      } = req.body;

      // Validaciones
      if (!id_metodo_origen || !id_metodo_destino) {
        return res
          .status(400)
          .json({ error: "Debe especificar método origen y destino" });
      }

      if (id_metodo_origen === id_metodo_destino) {
        return res
          .status(400)
          .json({ error: "No se puede transferir al mismo método" });
      }

      if (!monto || monto <= 0) {
        return res.status(400).json({ error: "El monto debe ser mayor a 0" });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const metodosModel = require("../models/tesoreriaModel");

      // Obtener nombres de métodos para observaciones
      const metodos = await metodosModel.getMetodosPago();
      const metodoOrigen = metodos.find(
        (m) => m.id_metodo_pago === parseInt(id_metodo_origen),
      );
      const metodoDestino = metodos.find(
        (m) => m.id_metodo_pago === parseInt(id_metodo_destino),
      );

      const observacionFinal =
        observaciones ||
        `Transferencia de ${metodoOrigen?.nombre || "N/A"} a ${
          metodoDestino?.nombre || "N/A"
        }`;

      // Referencias claras y cortas
      let referenciaOrigen = referencia;
      let referenciaDestino = referencia;
      // Solo generar referencias automáticas si no se recibió el campo `referencia`
      // Es decir: respetar '' (cadena vacía) si el frontend la envía explícitamente.
      if (referencia === undefined || referencia === null) {
        referenciaOrigen = metodoDestino?.nombre
          ?.toLowerCase()
          .includes("efectivo")
          ? "Transferencia a efectivo"
          : `Transferencia a ${metodoDestino?.nombre || "N/A"}`;
        referenciaDestino = metodoDestino?.nombre
          ?.toLowerCase()
          .includes("efectivo")
          ? "Ingreso por transferencia"
          : `Ingreso por transferencia desde ${metodoOrigen?.nombre || "N/A"}`;
      }

      // Registrar salida del método origen (negativo)
      await metodosModel.insertarMovimiento(
        {
          id_documento: null,
          tipo_documento: "transferencia_fondos",
          monto: -Math.abs(monto),
          id_metodo_pago: id_metodo_origen,
          referencia: referenciaOrigen,
          observaciones: observacionFinal,
          fecha_movimiento: new Date(),
        },
        connection,
      );

      // Registrar entrada al método destino (positivo)
      await metodosModel.insertarMovimiento(
        {
          id_documento: null,
          tipo_documento: "transferencia_fondos",
          monto: Math.abs(monto),
          id_metodo_pago: id_metodo_destino,
          referencia: referenciaDestino,
          observaciones: observacionFinal,
          fecha_movimiento: new Date(),
        },
        connection,
      );

      await connection.commit();
      connection.release();

      res.status(201).json({
        message: "Transferencia registrada exitosamente",
        monto,
        origen: metodoOrigen?.nombre,
        destino: metodoDestino?.nombre,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error en transferencia entre métodos:", error);
      res.status(500).json({ error: "Error al procesar la transferencia" });
    }
  },
};

module.exports = tesoreriaController;
