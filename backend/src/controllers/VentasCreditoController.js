const AbonosCreditoModel = require("../models/AbonosCredito");
const VentasCreditoModel = require("../models/ventasCredito");

const VentasCreditoController = {
  getAll: async (req, res) => {
    try {
      const creditos = await VentasCreditoModel.obtenerVentasCredito();
      res.status(200).json(creditos);
    } catch (error) {
      console.error("Error al obtener créditos:", error);
      res.status(500).json({ error: "Error interno al obtener créditos" });
    }
  },
  registrarAbono: async (req, res) => {
    try {
      const { id } = req.params;
      const id_abono = await AbonosCreditoModel.registrarAbono(id, req.body);
      res.status(201).json({ message: "Abono registrado", id_abono });
    } catch (error) {
      console.error("Error al registrar abono:", error);
      res.status(500).json({ error: "Error interno al registrar abono" });
    }
  },

  getAbonos: async (req, res) => {
    try {
      const { id } = req.params;
      const abonos = await AbonosCreditoModel.obtenerAbonosPorVenta(id);
      res.status(200).json(abonos);
    } catch (error) {
      console.error("Error al obtener abonos:", error);
      res.status(500).json({ error: "Error interno al obtener abonos" });
    }
  },
  getResumenCredito: async (req, res) => {
    try {
      const { id } = req.params;
      const resumen = await AbonosCreditoModel.obtenerResumenCredito(id);

      if (!resumen) {
        return res.status(404).json({ message: "Crédito no encontrado" });
      }

      res.status(200).json(resumen);
    } catch (error) {
      console.error("Error al obtener resumen crédito:", error);
      res
        .status(500)
        .json({ error: "Error interno al obtener resumen crédito" });
    }
  },
  // Obtener un crédito por su id (incluye nombre del cliente)
  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const credito = await VentasCreditoModel.obtenerVentaCreditoPorId(id);
      if (!credito) {
        return res.status(404).json({ message: "Crédito no encontrado" });
      }
      res.status(200).json(credito);
    } catch (error) {
      console.error("Error al obtener crédito por id:", error);
      res.status(500).json({ error: "Error interno al obtener crédito" });
    }
  },
};

module.exports = VentasCreditoController;
