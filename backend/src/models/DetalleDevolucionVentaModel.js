const db = require("../database/db");

module.exports = {
  create: async (
    {
      id_devolucion_venta,
      id_articulo,
      cantidad,
      precio_unitario,
      observaciones = null,
    },
    connection = db,
  ) => {
    const [result] = await (connection || db).query(
      `
      INSERT INTO detalle_devolucion_venta
      (
        id_devolucion_venta,
        id_articulo,
        cantidad,
        precio_unitario,
        observaciones
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        id_devolucion_venta,
        id_articulo,
        cantidad,
        precio_unitario,
        observaciones,
      ],
    );

    return result.insertId;
  },

  createMany: async (id_devolucion_venta, detalles, connection = db) => {
    for (const detalle of detalles) {
      await module.exports.create(
        {
          id_devolucion_venta,
          ...detalle,
        },
        connection,
      );
    }
  },

  getByDevolucion: async (id_devolucion_venta, connection = db) => {
    const [rows] = await (connection || db).query(
      `
      SELECT
        ddv.*,
        a.descripcion,
        a.referencia
      FROM detalle_devolucion_venta ddv
      INNER JOIN articulos a
        ON ddv.id_articulo = a.id_articulo
      WHERE ddv.id_devolucion_venta = ?
      `,
      [id_devolucion_venta],
    );

    return rows;
  },

  getCantidadDevuelta: async (id_orden_venta, id_articulo, connection = db) => {
    const [rows] = await (connection || db).query(
      `
      SELECT
        COALESCE(SUM(ddv.cantidad), 0) AS cantidad_devuelta
      FROM detalle_devolucion_venta ddv
      INNER JOIN devoluciones_venta dv
        ON dv.id_devolucion_venta = ddv.id_devolucion_venta
      WHERE dv.id_orden_venta = ?
        AND ddv.id_articulo = ?
        AND dv.estado <> 'anulada'
      FOR UPDATE
      `,
      [id_orden_venta, id_articulo],
    );

    return Number(rows[0].cantidad_devuelta || 0);
  },

  deleteByDevolucion: async (id_devolucion_venta, connection = db) => {
    const [result] = await (connection || db).query(
      `
      DELETE
      FROM detalle_devolucion_venta
      WHERE id_devolucion_venta = ?
      `,
      [id_devolucion_venta],
    );

    return result.affectedRows;
  },
};
