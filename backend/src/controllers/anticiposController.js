const AnticiposModel = require("../models/anticiposModel");
const db = require("../database/db");

module.exports = {
  getAllAnticipos: async (req, res) => {
    try {
      const { page, pageSize, sortBy, sortDir, buscar, estado, trabajadorId } =
        req.query;
      const pg = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));

      const { data, total, resumen } = await AnticiposModel.getAllPaginated({
        page: pg,
        pageSize: ps,
        sortBy,
        sortDir,
        buscar,
        estado,
        trabajadorId,
      });

      const totalPages = Math.ceil(total / ps) || 1;

      res.json({
        data,
        page: pg,
        pageSize: ps,
        total,
        totalPages,
        hasNext: pg < totalPages,
        hasPrev: pg > 1,
        resumen,
      });
    } catch (error) {
      console.error("Error al listar anticipos:", error);
      res.status(500).json({ error: "Error al obtener anticipos" });
    }
  },

  crearAnticipo: async (req, res) => {
    try {
      const {
        id_trabajador,
        id_orden_fabricacion,
        monto,
        observaciones,
        fecha,
      } = req.body;

      if (!id_trabajador || !monto || !fecha) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }

      const id = await AnticiposModel.create({
        id_trabajador,
        id_orden_fabricacion: id_orden_fabricacion || null,
        monto,
        observaciones,
        fecha,
      });

      res.status(201).json({ id });
    } catch (error) {
      console.error("Error al crear anticipo:", error);
      res.status(500).json({ error: "Error al crear anticipo" });
    }
  },

  getAnticipoActivo: async (req, res) => {
    try {
      const { trab, ord } = req.params;
      const anticipo = await AnticiposModel.getActivo(trab, ord);
      res.json(anticipo || null);
    } catch (error) {
      console.error("Error al obtener anticipo:", error);
      res.status(500).json({ error: "Error al obtener anticipo" });
    }
  },

  getAnticipoById: async (req, res) => {
    try {
      const { id } = req.params;
      const anticipo = await AnticiposModel.getById(id);
      if (!anticipo) {
        return res.status(404).json({ error: "Anticipo no encontrado" });
      }
      // El método de pago y la referencia se guardan en el movimiento de
      // tesorería asociado (tipo_documento = 'anticipo'). Se devuelven junto
      // al anticipo para que el formulario de edición los precargue.
      const [mov] = await db.query(
        `SELECT id_metodo_pago, referencia
         FROM movimientos_tesoreria
         WHERE id_documento = ? AND tipo_documento = 'anticipo'
         ORDER BY id_movimiento DESC
         LIMIT 1`,
        [id],
      );
      res.json({
        ...anticipo,
        id_metodo_pago: mov[0]?.id_metodo_pago ?? null,
        referencia: mov[0]?.referencia ?? null,
      });
    } catch (error) {
      console.error("Error al obtener anticipo:", error);
      res.status(500).json({ error: "Error al obtener anticipo" });
    }
  },

  getPendientes: async (req, res) => {
    try {
      const trabajadorId =
        req.query.trabajadorId || req.query.trab || req.query.id_trabajador;
      if (!trabajadorId) {
        return res.status(400).json({ error: "Falta parámetro trabajadorId" });
      }
      const anticipos =
        await AnticiposModel.getDisponiblesByTrabajador(trabajadorId);
      const totalDisponible = anticipos.reduce(
        (s, a) => s + (Number(a.monto) - Number(a.monto_usado || 0)),
        0,
      );
      res.json({
        hasPendiente: totalDisponible > 0,
        totalDisponible,
        count: anticipos.length,
      });
    } catch (error) {
      console.error("Error al obtener anticipos pendientes:", error);
      res.status(500).json({ error: "Error al obtener anticipos pendientes" });
    }
  },

  // Devuelve la lista de anticipos disponibles para un trabajador
  getPorTrabajador: async (req, res) => {
    try {
      const trabajadorId =
        req.query.trabajadorId || req.query.trab || req.query.id_trabajador;
      if (!trabajadorId)
        return res.status(400).json({ error: "Falta parámetro trabajadorId" });
      const anticipos =
        await AnticiposModel.getDisponiblesByTrabajador(trabajadorId);
      res.json(anticipos || []);
    } catch (error) {
      console.error("Error al obtener anticipos por trabajador:", error);
      res
        .status(500)
        .json({ error: "Error al obtener anticipos por trabajador" });
    }
  },

  // Aplicaciones de un anticipo (drill-down: qué pagos lo descontaron)
  getAplicaciones: async (req, res) => {
    try {
      const { id } = req.params;
      const aplicaciones = await AnticiposModel.getAplicaciones(id);
      res.json(aplicaciones || []);
    } catch (error) {
      console.error("Error al obtener aplicaciones del anticipo:", error);
      res
        .status(500)
        .json({ error: "Error al obtener aplicaciones del anticipo" });
    }
  },

  descontarAnticipo: async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id_anticipo, montoAplicado, id_detalle_pago } = req.body;
      if (!id_anticipo || !montoAplicado || Number(montoAplicado) <= 0) {
        return res.status(400).json({
          error: "Debe indicar id_anticipo y un montoAplicado mayor a 0.",
        });
      }
      await connection.beginTransaction();
      await AnticiposModel.descontar(id_anticipo, montoAplicado, connection);
      // Registrar la aplicación para poder revertirla si el pago se edita/elimina
      if (id_detalle_pago) {
        await AnticiposModel.registrarAplicacion(
          {
            id_detalle_pago,
            id_anticipo,
            monto_aplicado: Number(montoAplicado),
          },
          connection,
        );
      }
      await connection.commit();
      res.status(200).json({ message: "Anticipo actualizado correctamente" });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al descontar anticipo:", error);
      // El modelo lanza error cuando el anticipo no existe o el saldo no alcanza
      if (
        error.message?.includes("no existe") ||
        error.message?.includes("saldo suficiente")
      ) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Error al actualizar anticipo" });
    } finally {
      if (connection) connection.release();
    }
  },

  // Actualiza un anticipo (monto, observaciones, fecha, OF) y su movimiento de tesorería
  updateAnticipo: async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;
      const {
        id_orden_fabricacion,
        monto,
        observaciones,
        fecha,
        id_metodo_pago,
        referencia,
      } = req.body;

      const anticipo = await AnticiposModel.getById(id);
      if (!anticipo) {
        return res.status(404).json({ error: "Anticipo no encontrado" });
      }

      if (monto !== undefined && (isNaN(monto) || Number(monto) <= 0)) {
        return res
          .status(400)
          .json({ error: "El monto debe ser mayor a cero." });
      }

      await connection.beginTransaction();

      // Si cambia el monto, ajustar el movimiento de tesorería
      if (monto !== undefined && Number(monto) !== Number(anticipo.monto)) {
        const tesoreriaModel = require("../models/tesoreriaModel");
        await tesoreriaModel.actualizarMovimientoPorDocumento(
          {
            id_documento: Number(id),
            tipo_documento: "anticipo",
            monto: -Math.abs(Number(monto)),
            id_metodo_pago,
            referencia,
          },
          connection,
        );
      } else if (id_metodo_pago !== undefined || referencia !== undefined) {
        // Aunque el monto no cambie, actualizar método de pago / referencia
        const tesoreriaModel = require("../models/tesoreriaModel");
        await tesoreriaModel.actualizarMovimientoPorDocumento(
          {
            id_documento: Number(id),
            tipo_documento: "anticipo",
            monto: -Math.abs(Number(anticipo.monto)),
            id_metodo_pago,
            referencia,
          },
          connection,
        );
      }

      await AnticiposModel.update(
        id,
        { id_orden_fabricacion, monto, observaciones, fecha },
        connection,
      );

      await connection.commit();
      res.json({ message: "Anticipo actualizado correctamente" });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al actualizar anticipo:", error);
      res.status(500).json({ error: "Error al actualizar anticipo" });
    } finally {
      if (connection) connection.release();
    }
  },

  // Elimina un anticipo, revierte sus aplicaciones y su movimiento de tesorería
  deleteAnticipo: async (req, res) => {
    const connection = await db.getConnection();
    try {
      const { id } = req.params;

      const anticipo = await AnticiposModel.getById(id);
      if (!anticipo) {
        return res.status(404).json({ error: "Anticipo no encontrado" });
      }

      await connection.beginTransaction();

      // Revertir aplicaciones y eliminar el anticipo
      await AnticiposModel.delete(id, connection);

      // Eliminar movimiento de tesorería asociado
      const tesoreriaModel = require("../models/tesoreriaModel");
      await tesoreriaModel.deleteByDocumentoAndTipo(
        Number(id),
        "anticipo",
        connection,
      );

      await connection.commit();
      res.json({ message: "Anticipo eliminado correctamente" });
    } catch (error) {
      if (connection) await connection.rollback();
      console.error("Error al eliminar anticipo:", error);
      res.status(500).json({ error: "Error al eliminar anticipo" });
    } finally {
      if (connection) connection.release();
    }
  },
};
