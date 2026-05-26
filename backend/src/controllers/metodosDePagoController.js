const metodosDePagoModel = require("../models/metodosDePagoModel");

module.exports = {
  getMetodosPago: async (req, res) => {
    try {
      const metodos = await metodosDePagoModel.getAll();
      res.json(metodos);
    } catch (error) {
      console.error("Error al obtener los metodos de pago:", error);
      res.status(500).json({ error: "Error al obtener los metodos de pago" });
    }
  },
  create: async (req, res) => {
    try {
      const { nombre, tipo } = req.body;
      if (!nombre || !nombre.trim()) {
        return res
          .status(400)
          .json({ error: "El nombre del método de pago es obligatorio." });
      }
      if (tipo && !["contado", "credito"].includes(tipo)) {
        return res
          .status(400)
          .json({ error: "Tipo inválido. Debe ser 'contado' o 'credito'." });
      }
      const result = await metodosDePagoModel.create({
        nombre: nombre.trim(),
        tipo,
      });
      res
        .status(201)
        .json({ message: "Método de pago creado con éxito.", ...result });
    } catch (error) {
      console.error("Error al crear metodo de pago:", error);
      res.status(500).json({ error: "Error al crear metodo de pago" });
    }
  },
  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { nombre, tipo } = req.body;
      if (!nombre || !nombre.trim()) {
        return res
          .status(400)
          .json({ error: "El nombre del método de pago es obligatorio." });
      }
      if (tipo && !["contado", "credito"].includes(tipo)) {
        return res
          .status(400)
          .json({ error: "Tipo inválido. Debe ser 'contado' o 'credito'." });
      }
      const result = await metodosDePagoModel.update(id, {
        nombre: nombre.trim(),
        tipo,
      });
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Método de pago no encontrado." });
      }
      res.json({ message: "Método de pago actualizado con éxito." });
    } catch (error) {
      console.error("Error al actualizar metodo de pago:", error);
      res.status(500).json({ error: "Error al actualizar metodo de pago" });
    }
  },
  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await metodosDePagoModel.delete(id);
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Método de pago no encontrado." });
      }
      res.json({ message: "Método de pago eliminado con éxito." });
    } catch (error) {
      console.error("Error al eliminar metodo de pago:", error);
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          error:
            "No se puede eliminar: está siendo usado en registros existentes.",
        });
      }
      res.status(500).json({ error: "Error al eliminar metodo de pago" });
    }
  },
};
