const SeguimientoArticuloModel = require("../models/seguimientoArticuloModel");

module.exports = {
  // Obtener seguimiento completo de un artículo
  getSeguimiento: async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 10, mes, anio } = req.query;

      const articulo = await SeguimientoArticuloModel.getArticuloInfo(id);
      if (!articulo) {
        return res.status(404).json({ error: "Artículo no encontrado" });
      }

      const [
        ordenesVenta,
        ordenesPedido,
        ordenesFabricacion,
        ordenesCompra,
        movimientos,
        resumen,
      ] = await Promise.all([
        SeguimientoArticuloModel.getOrdenesVenta(
          id,
          parseInt(limit),
          mes,
          anio
        ),
        SeguimientoArticuloModel.getOrdenesPedido(
          id,
          parseInt(limit),
          mes,
          anio
        ),
        SeguimientoArticuloModel.getOrdenesFabricacion(
          id,
          parseInt(limit),
          mes,
          anio
        ),
        SeguimientoArticuloModel.getOrdenesCompra(
          id,
          parseInt(limit),
          mes,
          anio
        ),
        SeguimientoArticuloModel.getMovimientosInventario(
          id,
          parseInt(limit),
          mes,
          anio
        ),
        SeguimientoArticuloModel.getResumen(id, mes, anio),
      ]);

      res.json({
        articulo,
        ordenesVenta,
        ordenesPedido,
        ordenesFabricacion,
        ordenesCompra,
        movimientos,
        resumen,
        filtro:
          mes && anio ? { mes: parseInt(mes), anio: parseInt(anio) } : null,
      });
    } catch (error) {
      console.error("Error al obtener seguimiento del artículo:", error);
      res
        .status(500)
        .json({ error: "Error al obtener seguimiento del artículo" });
    }
  },

  // Obtener solo órdenes de venta
  getOrdenesVenta: async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 20, mes, anio } = req.query;
      const data = await SeguimientoArticuloModel.getOrdenesVenta(
        id,
        parseInt(limit),
        mes,
        anio
      );
      res.json(data);
    } catch (error) {
      console.error("Error al obtener órdenes de venta:", error);
      res.status(500).json({ error: "Error al obtener órdenes de venta" });
    }
  },

  // Obtener solo órdenes de pedido
  getOrdenesPedido: async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      const data = await SeguimientoArticuloModel.getOrdenesPedido(
        id,
        parseInt(limit)
      );
      res.json(data);
    } catch (error) {
      console.error("Error al obtener órdenes de pedido:", error);
      res.status(500).json({ error: "Error al obtener órdenes de pedido" });
    }
  },

  // Obtener solo órdenes de fabricación
  getOrdenesFabricacion: async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      const data = await SeguimientoArticuloModel.getOrdenesFabricacion(
        id,
        parseInt(limit)
      );
      res.json(data);
    } catch (error) {
      console.error("Error al obtener órdenes de fabricación:", error);
      res
        .status(500)
        .json({ error: "Error al obtener órdenes de fabricación" });
    }
  },

  // Obtener solo órdenes de compra
  getOrdenesCompra: async (req, res) => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      const data = await SeguimientoArticuloModel.getOrdenesCompra(
        id,
        parseInt(limit)
      );
      res.json(data);
    } catch (error) {
      console.error("Error al obtener órdenes de compra:", error);
      res.status(500).json({ error: "Error al obtener órdenes de compra" });
    }
  },
};
