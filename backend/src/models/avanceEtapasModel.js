const db = require("../database/db");
const detalleOrdenesFabricacionModel = require("./detalleOrdenFabricacionModel");
const inventarioModel = require("./inventarioModel");
const LoteModel = require("./lotesFabricadosModel");

module.exports = {
  getAll: async (id_trabajador) => {
    const [rows] = await db.query(
      `
      SELECT 
        a.id_avance_etapa, 
        a.id_orden_fabricacion, 
        a.id_etapa_produccion, 
        a.id_trabajador,
        a.cantidad, 
        a.estado,
        a.fecha_registro, 
        a.costo_fabricacion,
        e.nombre AS nombre_etapa,
        t.nombre AS nombre_trabajador,
        art.descripcion,
        c.nombre AS nombre_cliente,
        COALESCE(ant.monto, 0) AS monto_anticipo,
        ant.estado AS estado_anticipo
      FROM avance_etapas_produccion a
      JOIN articulos art ON a.id_articulo = art.id_articulo
      JOIN etapas_produccion e ON a.id_etapa_produccion = e.id_etapa
      JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
      JOIN ordenes_fabricacion ofa ON a.id_orden_fabricacion = ofa.id_orden_fabricacion
          LEFT JOIN anticipos_trabajadores ant ON ant.id_orden_fabricacion = a.id_orden_fabricacion AND ant.id_trabajador = a.id_trabajador
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      WHERE a.pagado = 0 AND ofa.estado NOT IN ('cancelada')
      ${id_trabajador ? "AND a.id_trabajador = ?" : ""}
      ORDER BY art.descripcion ASC, a.fecha_registro DESC;
    `,
      id_trabajador ? [id_trabajador] : []
    );

    return rows;
  },

  getAllPagados: async (id_trabajador = null) => {
    let query = `
      SELECT
          ae.id_avance_etapa,
          ae.id_orden_fabricacion,
          COALESCE(c.nombre, '') AS nombre_cliente,
          ae.id_articulo,
          COALESCE(a.descripcion, '') AS descripcion,
          ae.id_etapa_produccion,
          COALESCE(ep.nombre, '') AS nombre_etapa,
          ae.id_trabajador,
          COALESCE(t.nombre, '') AS nombre_trabajador,
          ae.cantidad,
          ae.costo_fabricacion AS costo_fabricacion, 
          ae.fecha_registro,
          ae.estado,
          ae.pagado
      FROM avance_etapas_produccion ae
      LEFT JOIN ordenes_fabricacion ofab ON ae.id_orden_fabricacion = ofab.id_orden_fabricacion
      LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN articulos a ON ae.id_articulo = a.id_articulo
      LEFT JOIN etapas_produccion ep ON ae.id_etapa_produccion = ep.id_etapa
      LEFT JOIN trabajadores t ON ae.id_trabajador = t.id_trabajador
      WHERE ae.pagado = 1
    `;
    const params = [];

    if (id_trabajador) {
      query += ` AND ae.id_trabajador = ?`;
      params.push(id_trabajador);
    }
    query += ` ORDER BY a.descripcion ASC, ae.fecha_registro DESC`;

    try {
      const [rows] = await db.query(query, params);

      return rows;
    } catch (dbError) {
      throw dbError;
    }
  },

  getById: async (id) => {
    const [rows] = await db.query(
      "SELECT * FROM avance_etapas_produccion WHERE id_avance_etapa = ?",
      [id]
    );
    return rows[0];
  },

  tienePagosVinculadosAOrden: async (id_orden_fabricacion, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT COUNT(*) AS cnt
       FROM detalle_pago_trabajador d
       JOIN avance_etapas_produccion a ON a.id_avance_etapa = d.id_avance_etapa
       WHERE a.id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );
    return (rows?.[0]?.cnt || 0) > 0;
  },

  getByOrden: async (id_orden_fabricacion) => {
    const [rows] = await db.query(
      `
      SELECT 
        ae.*, 
        ar.descripcion AS descripcion,
        ep.nombre AS nombre,
        t.nombre AS nombre_trabajador
      FROM avance_etapas_produccion ae
      JOIN articulos ar ON ae.id_articulo = ar.id_articulo
      JOIN etapas_produccion ep ON ae.id_etapa_produccion = ep.id_etapa
      JOIN trabajadores t ON ae.id_trabajador = t.id_trabajador
      WHERE ae.id_orden_fabricacion = ?
      ORDER BY ae.fecha_registro DESC
    `,
      [id_orden_fabricacion]
    );
    return rows;
  },
  getByOrdenes: async (ids_orden_fabricacion) => {
    if (!ids_orden_fabricacion || ids_orden_fabricacion.length === 0) {
      return [];
    }

    const placeholders = ids_orden_fabricacion.map(() => "?").join(",");
    const query = `
      SELECT 
        ae.*, 
        ar.descripcion,
        ep.nombre AS nombre_etapa,
        t.nombre AS nombre_trabajador
      FROM avance_etapas_produccion ae
      JOIN articulos ar ON ae.id_articulo = ar.id_articulo
      JOIN etapas_produccion ep ON ae.id_etapa_produccion = ep.id_etapa
      JOIN trabajadores t ON ae.id_trabajador = t.id_trabajador
      WHERE ae.id_orden_fabricacion IN (${placeholders})
      ORDER BY ae.fecha_registro DESC;
    `;
    const [rows] = await db.query(query, ids_orden_fabricacion);
    return rows;
  },

  create: async (
    {
      id_orden_fabricacion,
      id_articulo,
      id_etapa_produccion,
      id_trabajador,
      cantidad,
      estado,
      observaciones = null,
      costo_fabricacion,
    },
    connection = db
  ) => {
    const estadoSeguro = estado ?? "en proceso";
    const costoSeguro = costo_fabricacion ?? 0;
    const [result] = await (connection || db).query(
      `INSERT INTO avance_etapas_produccion 
       (id_orden_fabricacion,id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones, costo_fabricacion) 
       VALUES (?, ?, ?, ?, ?, ?,?,?)`,
      [
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion,
        id_trabajador,
        cantidad,
        estadoSeguro,
        observaciones,
        costoSeguro,
      ]
    );
    return result.insertId;
  },

  getEstadoOrden: async (id_orden_fabricacion, connection = db) => {
    const [rows] = await (connection || db).query(
      `SELECT estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );
    return rows[0]?.estado || null;
  },

  actualizarEstadoOrden: async (
    id_orden_fabricacion,
    nuevoEstado,
    connection = db
  ) => {
    // actualizar la OF
    await (connection || db).query(
      `UPDATE ordenes_fabricacion SET estado = ? WHERE id_orden_fabricacion = ?`,
      [nuevoEstado, id_orden_fabricacion]
    );

    // obtener pedido asociado
    const [rows] = await (connection || db).query(
      `SELECT id_pedido FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );

    if (rows.length && rows[0].id_pedido) {
      let nuevoEstadoPedido = null;

      if (nuevoEstado === "en proceso") {
        nuevoEstadoPedido = "en fabricacion";
      } else if (nuevoEstado === "completada") {
        nuevoEstadoPedido = "listo para entrega";
      }

      if (nuevoEstadoPedido) {
        await (connection || db).query(
          `UPDATE pedidos SET estado = ? WHERE id_pedido = ?`,
          [nuevoEstadoPedido, rows[0].id_pedido]
        );
      }
    }
  },

  update: async (
    id,
    {
      id_orden_fabricacion,
      id_articulo,
      id_etapa_produccion,
      id_trabajador,
      cantidad,
      estado,
      observaciones = null,
    }
  ) => {
    await db.query(
      `UPDATE avance_etapas_produccion 
       SET id_orden_fabricacion = ?, id_articulo=?, id_etapa_produccion = ?, id_trabajador = ?, cantidad = ?, estado = ?, observaciones = ?
       WHERE id_avance_etapa = ?`,
      [
        id_orden_fabricacion,
        id_articulo,
        id_etapa_produccion,
        id_trabajador,
        cantidad,
        estado,
        observaciones,
        id,
      ]
    );
  },

  updatePagado: async (id_avance_etapa, pagado = 1) => {
    const [result] = await db.query(
      "UPDATE avance_etapas_produccion SET pagado = ? WHERE id_avance_etapa = ?",
      [pagado, id_avance_etapa]
    );
    return result.insertId;
  },

  /**
   * Actualiza únicamente el costo de fabricación de un avance específico.
   */
  updateCostoFabricacion: async (
    id_avance_etapa,
    nuevo_costo,
    connection = db
  ) => {
    await (connection || db).query(
      `UPDATE avance_etapas_produccion 
       SET costo_fabricacion = ?
       WHERE id_avance_etapa = ?`,
      [nuevo_costo, id_avance_etapa]
    );
  },

  delete: async (id) => {
    await db.query(
      "DELETE FROM avance_etapas_produccion WHERE id_avance_etapa = ?",
      [id]
    );
  },

  getCantidadTotalArticuloEnOrden: async (
    idOrden,
    idArticulo,
    connection = db
  ) => {
    const query = `
      SELECT cantidad
      FROM detalle_orden_fabricacion
      WHERE id_orden_fabricacion = ? AND id_articulo = ?
      LIMIT 1
    `;
    const [rows] = await (connection || db).query(query, [idOrden, idArticulo]);
    return rows.length > 0 ? rows[0].cantidad : 0;
  },

  getCantidadRegistradaEnEtapa: async (
    idOrden,
    idArticulo,
    idEtapa,
    connection = db
  ) => {
    const query = `
      SELECT SUM(cantidad) AS total
      FROM avance_etapas_produccion
      WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?
    `;
    const [rows] = await (connection || db).query(query, [
      idOrden,
      idArticulo,
      idEtapa,
    ]);
    return rows[0].total || 0;
  },

  getEtapasTotalmenteCompletadas: async (
    idOrdenFabricacion,
    idArticulo,
    connection = db
  ) => {
    const [rows] = await (connection || db).query(
      `
      SELECT 
        a.id_etapa_produccion,
        d.cantidad AS cantidad_orden,
        SUM(a.cantidad) AS total_avance
      FROM avance_etapas_produccion a
      JOIN detalle_orden_fabricacion d 
        ON a.id_orden_fabricacion = d.id_orden_fabricacion 
        AND a.id_articulo = d.id_articulo
      WHERE a.id_orden_fabricacion = ? 
        AND a.id_articulo = ?
      GROUP BY a.id_etapa_produccion, d.cantidad
      HAVING total_avance >= cantidad_orden;
    `,
      [idOrdenFabricacion, idArticulo]
    );

    return rows.map((row) => row.id_etapa_produccion);
  },

  getCantidadTotalArticulo: async (
    id_orden_fabricacion,
    id_articulo,
    connection = db
  ) => {
    const [rows] = await (connection || db).query(
      `SELECT cantidad 
       FROM detalle_orden_fabricacion 
       WHERE id_orden_fabricacion = ? AND id_articulo = ?`,
      [id_orden_fabricacion, id_articulo]
    );

    if (rows.length === 0) return 0;
    return rows[0].cantidad;
  },

  getCantidadRegistradaEtapa: async (
    id_orden_fabricacion,
    id_articulo,
    id_etapa_produccion,
    connection = db
  ) => {
    const [rows] = await (connection || db).query(
      `SELECT SUM(cantidad) AS total 
       FROM avance_etapas_produccion 
       WHERE id_orden_fabricacion = ? 
         AND id_articulo = ? 
         AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_produccion]
    );

    return rows[0].total || 0;
  },

  puedeRegistrarAvance: async (
    id_orden_fabricacion,
    id_articulo,
    id_etapa,
    cantidadSolicitada,
    connection = db
  ) => {
    const [etapaActual] = await (connection || db).query(
      `SELECT orden FROM etapas_produccion WHERE id_etapa = ?`,
      [id_etapa]
    );

    if (!etapaActual.length || etapaActual[0].orden === 1) {
      const [[detalle]] = await (connection || db).query(
        `SELECT cantidad FROM detalle_orden_fabricacion
         WHERE id_orden_fabricacion = ? AND id_articulo = ?`,
        [id_orden_fabricacion, id_articulo]
      );

      const [[sumaActual]] = await (connection || db).query(
        `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
         WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
        [id_orden_fabricacion, id_articulo, id_etapa]
      );

      const totalDisponible = detalle.cantidad - (sumaActual.total || 0);

      return {
        permitido: cantidadSolicitada <= totalDisponible,
        disponible: totalDisponible,
      };
    }

    const [[etapaAnterior]] = await (connection || db).query(
      `SELECT id_etapa FROM etapas_produccion WHERE orden = ?`,
      [etapaActual[0].orden - 1]
    );

    const id_etapa_anterior = etapaAnterior.id_etapa;

    const [[completadas]] = await (connection || db).query(
      `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
       WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_anterior]
    );

    const [[usadas]] = await (connection || db).query(
      `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
       WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa]
    );

    const disponibles = (completadas.total || 0) - (usadas.total || 0);

    return {
      permitido: cantidadSolicitada <= disponibles,
      disponible: disponibles,
    };
  },

  obtenerUltimoCosto: async (id_articulo, id_etapaProduccion) => {
    const [rows] = await db.query(
      `SELECT costo_fabricacion
       FROM avance_etapas_produccion
       WHERE id_articulo = ? AND id_etapa_produccion = ?
       ORDER BY id_avance_etapa DESC
       LIMIT 1`,
      [id_articulo, id_etapaProduccion]
    );

    if (rows.length > 0) {
      return rows[0].costo_fabricacion;
    }
    return null;
  },

  checkearSiOrdenCompleta: async (id_orden_fabricacion, connection = db) => {
    const [ordenData] = await (connection || db).query(
      `SELECT id_pedido, estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );

    if (!ordenData.length) {
      console.log(`Orden ${id_orden_fabricacion} no encontrada.`);
      return false;
    }

    const id_pedido = ordenData[0].id_pedido;
    const estadoActualOrden = ordenData[0].estado;

    if (estadoActualOrden === "completada") {
      console.log(
        `Orden ${id_orden_fabricacion} ya está completada. No se requiere acción.`
      );
      return true;
    }

    const [articulosProgreso] = await (connection || db).query(
      `
      SELECT
        dof.id_articulo,
        dof.cantidad AS cantidad_total_requerida,
        dof.id_etapa_final,
        IFNULL(SUM(CASE WHEN a.estado = 'completado' THEN a.cantidad ELSE 0 END), 0) AS cantidad_avanzada_final
      FROM
        detalle_orden_fabricacion dof
      LEFT JOIN
        avance_etapas_produccion a ON dof.id_articulo = a.id_articulo
        AND dof.id_orden_fabricacion = a.id_orden_fabricacion
        AND a.id_etapa_produccion = dof.id_etapa_final
      WHERE
        dof.id_orden_fabricacion = ?
      GROUP BY
        dof.id_articulo, dof.cantidad, dof.id_etapa_final
    `,
      [id_orden_fabricacion]
    );

    const hayArticulosIncompletos = articulosProgreso.some(
      (articulo) =>
        articulo.cantidad_avanzada_final < articulo.cantidad_total_requerida
    );

    if (!hayArticulosIncompletos) {
      const esParaCompuesto =
        await detalleOrdenesFabricacionModel.esArticuloCompuesto(
          id_orden_fabricacion
        );

      if (esParaCompuesto) {
        try {
          const [articulosPedido] = await (connection || db).query(
            `SELECT a.id_articulo, dofp.cantidad FROM detalle_pedido dofp
                 JOIN ordenes_fabricacion ofab ON dofp.id_pedido = ofab.id_pedido
                 JOIN articulos a ON dofp.id_articulo = a.id_articulo
                 WHERE ofab.id_orden_fabricacion = ? AND a.es_compuesto = 1`,
            [id_orden_fabricacion]
          );

          if (articulosPedido.length > 0) {
            const articuloFinal = articulosPedido[0];
            const id_articulo_final = articuloFinal.id_articulo;
            const cantidad_final = articuloFinal.cantidad;

            const [ultimoAvance] = await (connection || db).query(
              `SELECT id_trabajador FROM avance_etapas_produccion WHERE id_orden_fabricacion = ? ORDER BY fecha_registro DESC LIMIT 1`,
              [id_orden_fabricacion]
            );

            const id_trabajador_final =
              ultimoAvance.length > 0 ? ultimoAvance[0].id_trabajador : null;

            const loteId = await LoteModel.createLote(
              {
                id_orden_fabricacion,
                id_articulo: id_articulo_final,
                id_trabajador: id_trabajador_final,
                cantidad: cantidad_final,
                observaciones: `Lote de producto compuesto creado al completar la OF #${id_orden_fabricacion} de sus componentes.`,
              },
              connection
            );

            await inventarioModel.processInventoryMovement({
              id_articulo: Number(id_articulo_final),
              cantidad_movida: Number(cantidad_final),
              tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
              tipo_origen_movimiento:
                inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.PRODUCCION,
              referencia_documento_id: loteId,
              referencia_documento_tipo: "lote",
            });
          } else {
            console.warn(
              `No se encontró un artículo compuesto en el pedido asociado a la orden ${id_orden_fabricacion}. No se creó el lote final.`
            );
          }
        } catch (error) {
          console.error(
            ` Error al crear el lote del producto final para la orden ${id_orden_fabricacion}:`,
            error
          );
        }
      }
      await (connection || db).query(
        `UPDATE ordenes_fabricacion SET estado = 'completada' WHERE id_orden_fabricacion = ?`,
        [id_orden_fabricacion]
      );

      if (id_pedido) {
        await (connection || db).query(
          `UPDATE pedidos SET estado = 'listo para entrega' WHERE id_pedido = ?`,
          [id_pedido]
        );
      } else {
        console.warn(
          `No se encontró id_pedido para la orden ${id_orden_fabricacion}. No se actualizó el pedido.`
        );
      }

      return true;
    }

  
    return false;
  },

  actualizarEstadoAvancesEtapa: async (
    id_orden_fabricacion,
    id_articulo,
    id_etapa_produccion,
    connection = db
  ) => {
    const [[detalle]] = await (connection || db).query(
      `SELECT cantidad AS cantidad_total FROM detalle_orden_fabricacion
       WHERE id_orden_fabricacion = ? AND id_articulo = ?
       LIMIT 1`,
      [id_orden_fabricacion, id_articulo]
    );
    const cantidad_total = Number(detalle?.cantidad_total ?? 0);

    const [[suma]] = await (connection || db).query(
      `SELECT COALESCE(SUM(cantidad), 0) AS total_registrado
       FROM avance_etapas_produccion
       WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_produccion]
    );
    const total_registrado = Number(suma?.total_registrado ?? 0);

    if (cantidad_total > 0 && total_registrado >= cantidad_total) {
      await (connection || db).query(
        `UPDATE avance_etapas_produccion
         SET estado = 'completado'
         WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ? AND estado <> 'completado'`,
        [id_orden_fabricacion, id_articulo, id_etapa_produccion]
      );
    } else {
      await (connection || db).query(
        `UPDATE avance_etapas_produccion
         SET estado = 'en proceso'
         WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ? AND estado <> 'en proceso'`,
        [id_orden_fabricacion, id_articulo, id_etapa_produccion]
      );
    }
  },

  getEtapaFinalCliente: async (
    id_orden_fabricacion,
    id_articulo,
    connection = db
  ) => {
    const [rows] = await (connection || db).query(
      `
      SELECT id_etapa_final
      FROM detalle_orden_fabricacion
      WHERE id_orden_fabricacion = ? AND id_articulo = ?
      LIMIT 1
    `,
      [id_orden_fabricacion, id_articulo]
    );

    return rows.length > 0 ? rows[0].id_etapa_final : null;
  },
};
