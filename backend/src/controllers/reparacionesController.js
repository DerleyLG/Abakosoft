const db = require("../database/db");
const ReparacionesModel = require("../models/ReparacionesModel");
const DetalleReparacionMaterial = require("../models/DetalleReparacionMaterialModel");
const inventarioModel = require("../models/inventarioModel");
const tesoreriaModel = require("../models/tesoreriaModel");

module.exports = {
  getAll: async (req, res) => {
    try {
      const {
        estado,
        buscar = "",
        page = 1,
        pageSize = 20,
        sortBy = "fecha_ingreso",
        sortDir = "desc",
      } = req.query;

      const estados = estado ? [estado] : [];
      const { data, total } = await ReparacionesModel.getAllPaginated({
        estados,
        buscar,
        page,
        pageSize,
        sortBy,
        sortDir,
      });

      const totalPages =
        Math.ceil(total / Math.max(1, parseInt(pageSize, 10) || 20)) || 1;

      return res.json({
        data,
        page: Math.max(1, parseInt(page, 10) || 1),
        pageSize: Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20)),
        total,
        totalPages,
        hasNext: Math.max(1, parseInt(page, 10) || 1) < totalPages,
        hasPrev: Math.max(1, parseInt(page, 10) || 1) > 1,
      });
    } catch (error) {
      console.error("Error al listar reparaciones:", error);
      return res
        .status(500)
        .json({ error: "No fue posible cargar las reparaciones." });
    }
  },

  getById: async (req, res) => {
    try {
      const orden = await ReparacionesModel.getById(req.params.id);
      if (!orden) {
        return res.status(404).json({ error: "Reparación no encontrada." });
      }
      const materiales = await DetalleReparacionMaterial.getByReparacion(
        req.params.id,
      );
      return res.json({ ...orden, materiales });
    } catch (error) {
      console.error("Error al obtener reparación:", error);
      return res
        .status(500)
        .json({ error: "No fue posible cargar la reparación." });
    }
  },

  create: async (req, res) => {
    let connection;
    try {
      const {
        id_devolucion_venta = null,
        id_cliente,
        id_articulo,
        motivo,
        fecha_ingreso,
        fecha_estimada = null,
        id_trabajador = null,
        requiere_pago = false,
        observaciones = null,
      } = req.body;

      if (!id_cliente || !id_articulo || !motivo) {
        return res.status(400).json({
          error: "Faltan campos requeridos: cliente, artículo y motivo.",
        });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const id = await ReparacionesModel.create(
        {
          id_devolucion_venta,
          id_cliente,
          id_articulo,
          motivo,
          fecha_ingreso:
            fecha_ingreso || new Date().toISOString().split("T")[0],
          fecha_estimada,
          id_trabajador,
          requiere_pago,
          observaciones,
        },
        connection,
      );

      // Mover a stock_reparacion + registrar movimiento
      const [invRows] = await connection.query(
        `SELECT id_articulo, COALESCE(stock_reparacion, 0) AS stock_reparacion
         FROM inventario WHERE id_articulo = ?`,
        [id_articulo],
      );

      if (invRows.length > 0) {
        if (id_devolucion_venta) {
          await connection.query(
            `UPDATE inventario
             SET stock = GREATEST(0, COALESCE(stock, 0) - 1),
                 stock_reparacion = COALESCE(stock_reparacion, 0) + 1
             WHERE id_articulo = ?`,
            [id_articulo],
          );
        } else {
          await connection.query(
            `UPDATE inventario
             SET stock_reparacion = COALESCE(stock_reparacion, 0) + 1
             WHERE id_articulo = ?`,
            [id_articulo],
          );
        }
      } else {
        await connection.query(
          `INSERT INTO inventario (id_articulo, stock, stock_reparacion, stock_minimo)
           VALUES (?, 0, 1, 0)`,
          [id_articulo],
        );
      }

      // Registrar movimiento de inventario
      await connection.query(
        `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo)
         VALUES (?, 1, 'entrada', 'reparacion', ?, ?, 'reparacion')`,
        [id_articulo, `Ingreso a reparación #${id}`, id],
      );

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: "Reparación registrada correctamente.",
        id_reparacion: id,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al crear reparación:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "No fue posible crear la reparación.",
      });
    }
  },

  createBatch: async (req, res) => {
    let connection;
    try {
      const { articulos, ...baseData } = req.body;

      if (!Array.isArray(articulos) || articulos.length === 0) {
        return res.status(400).json({ error: "Debe enviar al menos un artículo." });
      }
      if (!baseData.id_cliente) {
        return res.status(400).json({ error: "Debe indicar el cliente." });
      }

      const results = [];
      connection = await db.getConnection();
      await connection.beginTransaction();

      for (const art of articulos) {
        if (!art.id_articulo) {
          throw new Error("Cada artículo debe tener un id_articulo.");
        }

        const id = await ReparacionesModel.create(
          {
            id_devolucion_venta: baseData.id_devolucion_venta || null,
            id_cliente: baseData.id_cliente,
            id_articulo: art.id_articulo,
            motivo: art.motivo || baseData.motivo || "Sin motivo",
            fecha_ingreso: baseData.fecha_ingreso || new Date().toISOString().split("T")[0],
            fecha_estimada: baseData.fecha_estimada || null,
            id_trabajador: baseData.id_trabajador || null,
            requiere_pago: false,
            observaciones: baseData.observaciones || null,
          },
          connection,
        );

        // Inventario: misma lógica que create individual
        const [invRows] = await connection.query(
          `SELECT id_articulo, COALESCE(stock_reparacion, 0) AS stock_reparacion
           FROM inventario WHERE id_articulo = ?`,
          [art.id_articulo],
        );
        if (invRows.length > 0) {
          if (baseData.id_devolucion_venta) {
            await connection.query(
              `UPDATE inventario
               SET stock = GREATEST(0, COALESCE(stock, 0) - 1),
                   stock_reparacion = COALESCE(stock_reparacion, 0) + 1
               WHERE id_articulo = ?`,
              [art.id_articulo],
            );
          } else {
            await connection.query(
              `UPDATE inventario SET stock_reparacion = COALESCE(stock_reparacion, 0) + 1 WHERE id_articulo = ?`,
              [art.id_articulo],
            );
          }
        } else {
          await connection.query(
            `INSERT INTO inventario (id_articulo, stock, stock_reparacion, stock_minimo) VALUES (?, 0, 1, 0)`,
            [art.id_articulo],
          );
        }
        await connection.query(
          `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo)
           VALUES (?, 1, 'entrada', 'reparacion', ?, ?, 'reparacion')`,
          [art.id_articulo, `Ingreso a reparación #${id}`, id],
        );

        results.push({ id_reparacion: id, id_articulo: art.id_articulo });
      }

      await connection.commit();
      connection.release();

      return res.status(201).json({
        success: true,
        message: `${results.length} reparación(es) creada(s) correctamente.`,
        results,
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al crear reparaciones en lote:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "No fue posible crear las reparaciones.",
      });
    }
  },

  // Diagnóstico
  setDiagnostico: async (req, res) => {
    let connection;
    try {
      const {
        diagnostico,
        requiere_pago,
        mano_obra,
        descuento,
        id_trabajador,
      } = req.body;

      const orden = await ReparacionesModel.getById(req.params.id);
      if (!orden)
        return res.status(404).json({ error: "Reparación no encontrada." });
      if (orden.estado !== "registrada") {
        return res
          .status(400)
          .json({ error: "La reparación ya fue diagnosticada." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const updates = { diagnostico, estado: "diagnosticada" };
      if (requiere_pago !== undefined)
        updates.requiere_pago = requiere_pago ? 1 : 0;
      if (mano_obra !== undefined) updates.mano_obra = mano_obra;
      if (descuento !== undefined) updates.descuento = descuento;
      if (id_trabajador !== undefined) updates.id_trabajador = id_trabajador;

      await ReparacionesModel.update(req.params.id, updates, connection);
      await recalcularTotal(req.params.id, connection);

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message: "Diagnóstico registrado correctamente.",
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al registrar diagnóstico:", error);
      return res
        .status(500)
        .json({ error: "No fue posible registrar el diagnóstico." });
    }
  },

  // Materiales
  addMaterial: async (req, res) => {
    let connection;
    try {
      const { id_articulo, cantidad, costo_unitario = 0 } = req.body;
      const id_rep = req.params.id;

      if (!id_articulo || !cantidad || Number(cantidad) <= 0) {
        return res
          .status(400)
          .json({ error: "Debe indicar el artículo y una cantidad válida." });
      }

      const orden = await ReparacionesModel.getById(id_rep);
      if (!orden)
        return res.status(404).json({ error: "Reparación no encontrada." });
      if (["entregada", "cancelada"].includes(orden.estado)) {
        return res
          .status(400)
          .json({
            error:
              "No se pueden agregar materiales a una reparación finalizada.",
          });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      await DetalleReparacionMaterial.create(
        { id_reparacion: id_rep, id_articulo, cantidad, costo_unitario },
        connection,
      );

      await inventarioModel.processInventoryMovement(
        {
          id_articulo,
          cantidad_movida: cantidad,
          tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
          tipo_origen_movimiento: "reparacion",
          observaciones: `Consumo en reparación #${id_rep}`,
          referencia_documento_id: id_rep,
          referencia_documento_tipo: "reparacion",
        },
        connection,
      );

      // Recalcular subtotal_materiales y total
      await actualizarSubtotalMateriales(id_rep, connection);
      await recalcularTotal(id_rep, connection);

      // Avanzar a en_reparacion si está en registrada o diagnosticada
      if (["registrada", "diagnosticada"].includes(orden.estado)) {
        await ReparacionesModel.updateEstado(
          id_rep,
          "en_reparacion",
          connection,
        );
      }

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message: "Material agregado correctamente.",
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al agregar material:", error);
      return res
        .status(500)
        .json({
          error: error.message || "No fue posible agregar el material.",
        });
    }
  },

  deleteMaterial: async (req, res) => {
    let connection;
    try {
      const { id, idDetalle } = req.params;

      const material = await DetalleReparacionMaterial.getById(idDetalle);
      if (!material) {
        return res.status(404).json({ error: "Material no encontrado." });
      }

      // Validar que la reparación no esté finalizada ni lista para entrega
      const orden = await ReparacionesModel.getById(id);
      if (["entregada", "cancelada", "lista_entrega"].includes(orden?.estado)) {
        return res
          .status(400)
          .json({ error: "No se puede eliminar material de una reparación finalizada o lista para entrega." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Restaurar inventario: devolver el stock consumido
      await inventarioModel.processInventoryMovement(
        {
          id_articulo: material.id_articulo,
          cantidad_movida: material.cantidad,
          tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
          tipo_origen_movimiento: "reparacion",
          observaciones: `Devolución de material en reparación #${id}`,
          referencia_documento_id: id,
          referencia_documento_tipo: "reparacion",
        },
        connection,
      );

      await DetalleReparacionMaterial.delete(idDetalle, connection);
      await actualizarSubtotalMateriales(id, connection);
      await recalcularTotal(id, connection);

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message: "Material eliminado y stock restaurado.",
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al eliminar material:", error);
      return res
        .status(500)
        .json({ error: error.message || "No fue posible eliminar el material." });
    }
  },

  // Cambios de estado
  marcarListaEntrega: async (req, res) => {
    try {
      const orden = await ReparacionesModel.getById(req.params.id);
      if (!orden)
        return res.status(404).json({ error: "Reparación no encontrada." });
      if (["entregada", "cancelada"].includes(orden.estado)) {
        return res
          .status(400)
          .json({ error: "La reparación ya está finalizada." });
      }
      if (orden.estado === "registrada") {
        return res
          .status(400)
          .json({ error: "Debe realizar el diagnóstico primero." });
      }

      await ReparacionesModel.updateEstado(req.params.id, "lista_entrega");
      return res.json({
        success: true,
        message: "Reparación lista para entrega.",
      });
    } catch (error) {
      console.error("Error al marcar lista de entrega:", error);
      return res
        .status(500)
        .json({ error: "No fue posible actualizar el estado." });
    }
  },

  entregar: async (req, res) => {
    let connection;
    try {
      const { id_metodo_pago = null, referencia = null } = req.body;

      const orden = await ReparacionesModel.getById(req.params.id);
      if (!orden)
        return res.status(404).json({ error: "Reparación no encontrada." });
      if (orden.estado !== "lista_entrega") {
        return res
          .status(400)
          .json({ error: "Debe estar marcada como lista para entrega." });
      }

      // Validar método de pago antes de la transacción
      if (orden.requiere_pago && Number(orden.total) > 0 && !id_metodo_pago) {
        return res.status(400).json({ error: "Debe indicar el método de pago." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Si requiere pago y tiene total > 0
      if (orden.requiere_pago && Number(orden.total) > 0) {
        await tesoreriaModel.insertarMovimiento(
          {
            id_documento: orden.id_reparacion,
            tipo_documento: "reparacion",
            monto: Number(orden.total),
            id_metodo_pago,
            referencia: referencia || undefined,
            observaciones:
              referencia || `Cobro por reparación #${orden.id_reparacion}`,
          },
          connection,
        );
      }

      // Liberar stock_reparacion
      await connection.query(
        `UPDATE inventario SET stock_reparacion = GREATEST(0, COALESCE(stock_reparacion, 0) - 1)
         WHERE id_articulo = ?`,
        [orden.id_articulo],
      );

      // Registrar movimiento de inventario
      await connection.query(
        `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo)
         VALUES (?, 1, 'salida', 'reparacion', ?, ?, 'reparacion')`,
        [orden.id_articulo, `Entrega de reparación #${orden.id_reparacion}`, orden.id_reparacion],
      );

      await ReparacionesModel.update(
        req.params.id,
        {
          estado: "entregada",
          fecha_entrega: new Date().toISOString().split("T")[0],
          id_metodo_pago,
        },
        connection,
      );

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message: orden.requiere_pago
          ? "Reparación entregada y cobro registrado."
          : "Reparación entregada correctamente.",
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      return res
        .status(500)
        .json({ error: error.message || "Error al entregar." });
    }
  },

  cancelar: async (req, res) => {
    let connection;
    try {
      const orden = await ReparacionesModel.getById(req.params.id);
      if (!orden)
        return res.status(404).json({ error: "Reparación no encontrada." });
      if (["entregada", "cancelada"].includes(orden.estado)) {
        return res.status(400).json({ error: "Ya está finalizada." });
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      // Restaurar materiales consumidos al inventario
      const materiales = await DetalleReparacionMaterial.getByReparacion(
        req.params.id,
        connection,
      );
      for (const mat of materiales) {
        await inventarioModel.processInventoryMovement(
          {
            id_articulo: mat.id_articulo,
            cantidad_movida: mat.cantidad,
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
            tipo_origen_movimiento: "reparacion",
            observaciones: `Devolución de material por cancelación de reparación #${req.params.id}`,
            referencia_documento_id: req.params.id,
            referencia_documento_tipo: "reparacion",
          },
          connection,
        );
      }

      // Restaurar stock del artículo (considerando si vino de devolución)
      if (orden.id_devolucion_venta) {
        await connection.query(
          `UPDATE inventario
           SET stock = COALESCE(stock, 0) + 1,
               stock_reparacion = GREATEST(0, COALESCE(stock_reparacion, 0) - 1)
           WHERE id_articulo = ?`,
          [orden.id_articulo],
        );
      } else {
        await connection.query(
          `UPDATE inventario SET stock_reparacion = GREATEST(0, COALESCE(stock_reparacion, 0) - 1)
           WHERE id_articulo = ?`,
          [orden.id_articulo],
        );
      }

      // Registrar movimiento de inventario
      await connection.query(
        `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo)
         VALUES (?, 1, 'salida', 'reparacion', ?, ?, 'reparacion')`,
        [orden.id_articulo, `Cancelación de reparación #${orden.id_reparacion}`, orden.id_reparacion],
      );

      // Recalcular totales (aunque quede en 0 para la orden cancelada)
      await actualizarSubtotalMateriales(req.params.id, connection);
      await recalcularTotal(req.params.id, connection);

      await ReparacionesModel.updateEstado(
        orden.id_reparacion,
        "cancelada",
        connection,
      );

      await connection.commit();
      connection.release();

      return res.json({
        success: true,
        message: "Reparación cancelada y stock liberado.",
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      return res
        .status(500)
        .json({ error: error.message || "Error al cancelar." });
    }
  },
};

// ================================================================
// Funciones helper
// ================================================================

async function actualizarSubtotalMateriales(id_reparacion, connection) {
  const total = await DetalleReparacionMaterial.getSubtotalByReparacion(
    id_reparacion,
    connection,
  );
  await (connection || db).query(
    `UPDATE reparaciones SET subtotal_materiales = ? WHERE id_reparacion = ?`,
    [total, id_reparacion],
  );
}

async function recalcularTotal(id_reparacion, connection) {
  const conn = connection || db;
  const [[{ subtotal_materiales, mano_obra, descuento }]] = await conn.query(
    `SELECT COALESCE(subtotal_materiales,0) AS subtotal_materiales,
            COALESCE(mano_obra,0) AS mano_obra,
            COALESCE(descuento,0) AS descuento
     FROM reparaciones WHERE id_reparacion = ?`,
    [id_reparacion],
  );
  const total = Math.max(
    0,
    Number(subtotal_materiales) + Number(mano_obra) - Number(descuento),
  );
  await conn.query(
    `UPDATE reparaciones SET total = ? WHERE id_reparacion = ?`,
    [total, id_reparacion],
  );
}
