const AnticiposModel = require("../models/anticiposModel");

module.exports = {
  getAllAnticipos: async (req, res) => {
    try {
      const anticipos = await AnticiposModel.getAll();
      res.json(anticipos);
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

      if (!id_trabajador || !id_orden_fabricacion || !monto || !fecha) {
        return res.status(400).json({ error: "Faltan campos obligatorios" });
      }

      const id = await AnticiposModel.crear({
        id_trabajador,
        id_orden_fabricacion,
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

  descontarAnticipo: async (req, res) => {
    try {
      const { id_anticipo, montoAplicado } = req.body;
      await AnticiposModel.descontar(id_anticipo, montoAplicado);
      res.status(200).json({ message: "Anticipo actualizado correctamente" });
    } catch (error) {
      console.error("Error al descontar anticipo:", error);
      res.status(500).json({ error: "Error al actualizar anticipo" });
    }
  },
};
