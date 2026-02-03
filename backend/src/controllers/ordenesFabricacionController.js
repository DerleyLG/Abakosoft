const ordenesFabricacionModel = require("../models/ordenesFabricacionModel");
const detalleOrdenFabricacionModel = require("../models/detalleOrdenFabricacionModel");
const avanceEtapasModel = require("../models/avanceEtapasModel");
const etapasDetalleFabricacionModel = require("../models/etapasDetalleFabricacionModel");

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        estados,
        buscar = "",
        page = 1,
        pageSize = 25,
        sortBy = "id",
        sortDir = "desc",
      } = req.query;

      let estadosToFilter = [];
      if (estados) {
        estadosToFilter = estados.split(",").map((e) => e.trim());
      } else {
        estadosToFilter = ["pendiente", "en proceso", "completada"];
      }

      const { data, total } = await ordenesFabricacionModel.getAllPaginated({
        estados: estadosToFilter,
        buscar,
        page: Number(page) || 1,
        pageSize: Number(pageSize) || 25,
        sortBy,
        sortDir,
      });

      if (!data || data.length === 0) {
        return res.status(200).json({
          data: [],
          page: Math.max(1, parseInt(page) || 1),
          pageSize: Math.min(100, Math.max(1, parseInt(pageSize) || 25)),
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
          sortBy,
          sortDir: String(sortDir).toLowerCase() === "asc" ? "asc" : "desc",
        });
      }

      const idOrdenes = data.map((o) => o.id_orden_fabricacion);

      const [allDetalles, allAvances] = await Promise.all([
        detalleOrdenFabricacionModel.getByOrdenes(idOrdenes),
        avanceEtapasModel.getByOrdenes(idOrdenes),
      ]);

      // Obtener etapas personalizadas para todos los detalles
      const idsDetalles = allDetalles.map((d) => d.id_detalle_fabricacion);
      const todasEtapasPersonalizadas =
        await etapasDetalleFabricacionModel.getByDetalles(idsDetalles);

      // Agrupar etapas por detalle
      const etapasPorDetalle = {};
      todasEtapasPersonalizadas.forEach((ep) => {
        if (!etapasPorDetalle[ep.id_detalle_fabricacion]) {
          etapasPorDetalle[ep.id_detalle_fabricacion] = [];
        }
        etapasPorDetalle[ep.id_detalle_fabricacion].push(ep);
      });

      // Agregar etapas personalizadas a cada detalle
      const allDetallesConEtapas = allDetalles.map((d) => ({
        ...d,
        etapas_personalizadas: etapasPorDetalle[d.id_detalle_fabricacion] || [],
      }));

      const ordenesConTodo = data.map((orden) => {
        const detalles = allDetallesConEtapas.filter(
          (d) => d.id_orden_fabricacion === orden.id_orden_fabricacion,
        );
        const avances = allAvances.filter(
          (a) => a.id_orden_fabricacion === orden.id_orden_fabricacion,
        );

        return {
          ...orden,
          detalles,
          avances,
        };
      });

      const p = Math.max(1, parseInt(page) || 1);
      const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
      const totalPages = Math.max(1, Math.ceil(total / ps));

      res.status(200).json({
        data: ordenesConTodo,
        page: p,
        pageSize: ps,
        total,
        totalPages,
        hasNext: p < totalPages,
        hasPrev: p > 1,
        sortBy,
        sortDir: String(sortDir).toLowerCase() === "asc" ? "asc" : "desc",
      });
    } catch (error) {
      console.error("Error al obtener órdenes de fabricación:", error);
      res.status(500).json({
        error: "Error interno del servidor al obtener órdenes de fabricación.",
      });
    }
  },

  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const [orden, detalles, avances] = await Promise.all([
        ordenesFabricacionModel.getById(id),
        detalleOrdenFabricacionModel.getById(id),
        avanceEtapasModel.getByOrden(id),
      ]);

      if (!orden) {
        return res
          .status(404)
          .json({ error: "Orden de fabricación no encontrada." });
      }

      // Obtener etapas personalizadas para cada detalle
      const idsDetalles = detalles.map((d) => d.id_detalle_fabricacion);
      const etapasPersonalizadas =
        await etapasDetalleFabricacionModel.getByDetalles(idsDetalles);

      // Agrupar etapas por detalle
      const etapasPorDetalle = {};
      etapasPersonalizadas.forEach((ep) => {
        if (!etapasPorDetalle[ep.id_detalle_fabricacion]) {
          etapasPorDetalle[ep.id_detalle_fabricacion] = [];
        }
        etapasPorDetalle[ep.id_detalle_fabricacion].push(ep);
      });

      // Agregar etapas personalizadas a cada detalle
      const detallesConEtapas = detalles.map((d) => ({
        ...d,
        etapas_personalizadas: etapasPorDetalle[d.id_detalle_fabricacion] || [],
      }));

      res.json({ ...orden, detalles: detallesConEtapas, avances });
    } catch (error) {
      console.error("Error en getById:", error);
      res
        .status(500)
        .json({ error: "Error al obtener la orden de fabricación." });
    }
  },

  create: async (req, res) => {
    try {
      const { orden, detalles } = req.body;

      if (!orden || !Array.isArray(detalles) || detalles.length === 0) {
        return res.status(400).json({
          error: "Datos incompletos: se requiere orden y al menos un detalle.",
        });
      }

      const {
        id_orden_venta,
        fecha_inicio,
        fecha_fin_estimada,
        estado,
        id_pedido,
      } = orden;

      if (
        !estado ||
        !["pendiente", "en proceso", "completado"].includes(estado)
      ) {
        return res.status(400).json({ error: "Estado inválido." });
      }

      const id_orden_fabricacion = await ordenesFabricacionModel.create({
        id_orden_venta,
        fecha_inicio,
        fecha_fin_estimada,
        estado,
        id_pedido,
      });

      for (const detalle of detalles) {
        const { id_articulo, cantidad, id_etapa_final, etapas_personalizadas } =
          detalle;

        if (!id_etapa_final || !id_articulo || !cantidad) {
          return res
            .status(400)
            .json({ error: "Faltan campos en uno o más detalles." });
        }
        const id_detalle_fabricacion =
          await detalleOrdenFabricacionModel.create({
            id_orden_fabricacion,
            id_articulo,
            cantidad,
            id_etapa_final,
          });

        // Si tiene etapas personalizadas, guardarlas
        if (etapas_personalizadas && etapas_personalizadas.length > 0) {
          await etapasDetalleFabricacionModel.createMultiple(
            id_detalle_fabricacion,
            etapas_personalizadas,
          );
        }
      }
      res.status(201).json({
        message: "Orden de fabricación y detalles creados correctamente.",
        id_orden_fabricacion,
      });
    } catch (error) {
      console.error("Error al crear orden de fabricación:", error);
      res
        .status(500)
        .json({ error: "Error interno al crear la orden de fabricación." });
    }
  },
  update: async (req, res) => {
    try {
      const id = req.params.id;
      const { id_orden_venta, fecha_inicio, fecha_fin_estimada, estado } =
        req.body;

      await ordenesFabricacionModel.update(id, {
        id_orden_venta,
        fecha_inicio,
        fecha_fin_estimada,
        estado,
      });

      res.json({ message: "Orden de fabricación actualizada correctamente." });
    } catch (error) {
      console.error("Error en update:", error);
      res
        .status(500)
        .json({ error: "Error al actualizar la orden de fabricación." });
    }
  },

  delete: async (req, res) => {
    try {
      const id = req.params.id;

      const orden = await ordenesFabricacionModel.getById(id);
      if (!orden) {
        return res.status(404).json({ error: "Orden no encontrada." });
      }
      if (orden.estado === "cancelada") {
        return res.status(400).json({ error: "La orden ya está cancelada." });
      }

      await ordenesFabricacionModel.delete(id);

      res.json({ message: "Orden de fabricación cancelada correctamente." });
    } catch (error) {
      console.error("Error al cancelar la orden de fabricación:", error);
      res
        .status(500)
        .json({ error: "Error al cancelar la orden de fabricación." });
    }
  },

  existe: async (req, res) => {
    try {
      const { id_pedido } = req.params;
      const existe =
        await ordenesFabricacionModel.checkIfExistsByPedidoId(id_pedido);
      res.json({ existe });
    } catch (error) {
      console.error("Error al verificar la orden de fabricación:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  getEstadoOFByPedidoId: async (req, res) => {
    const { id_pedido } = req.params;

    if (!id_pedido) {
      return res
        .status(400)
        .json({ error: "El ID del pedido es obligatorio." });
    }

    try {
      const estado =
        await ordenesFabricacionModel.getEstadoByPedidoId(id_pedido);

      if (estado === "no existe") {
        return res.status(200).json({
          estado: "no existe",
          message: "No existe Orden de Fabricación asociada.",
        });
      }

      res.status(200).json({ estado: estado });
    } catch (error) {
      console.error("Error al obtener estado de OF:", error);
      res
        .status(500)
        .json({ error: "Error interno al validar la orden de fabricación." });
    }
  },
};
