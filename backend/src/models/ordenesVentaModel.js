const db = require("../database/db");

module.exports = {
  getAll: async (estados = ["pendiente", "completada"]) => {
    const placeholders = estados.map(() => "?").join(",");

    const [rows] = await db.query(
      `
    SELECT 
      ov.id_orden_venta, 
      ov.id_pedido,
      vc.id_venta_credito,
      ov.fecha, 
      ov.id_cliente, 
      c.nombre AS cliente_nombre, 
      ov.estado,
      mp.nombre AS metodo_pago,
      vc.estado AS estado_credito,
      vc.saldo_pendiente,
      SUM(dov.cantidad * dov.precio_unitario) AS monto_total
    FROM ordenes_venta ov
    JOIN clientes c 
      ON ov.id_cliente = c.id_cliente
    
  
    LEFT JOIN movimientos_tesoreria mt 
      ON mt.id_documento = ov.id_orden_venta 
     AND mt.tipo_documento = 'orden_venta'
    
    
    LEFT JOIN metodos_pago mp 
      ON mt.id_metodo_pago = mp.id_metodo_pago
    
    
    LEFT JOIN ventas_credito vc 
      ON ov.id_orden_venta = vc.id_orden_venta
    
    LEFT JOIN detalle_orden_venta dov 
      ON ov.id_orden_venta = dov.id_orden_venta
    
    WHERE ov.estado IN (${placeholders})
    GROUP BY 
      ov.id_orden_venta,
      ov.id_pedido,
      vc.id_venta_credito,
      ov.fecha,
      ov.id_cliente,
      c.nombre,
      ov.estado,
      mp.nombre,
      vc.estado,
      vc.saldo_pendiente
    ORDER BY ov.id_orden_venta DESC;
  `,
      estados
    );

    return rows;
  },

  async getAllPaginated({
    estados = ["pendiente", "completada"],
    buscar = "",
    page = 1,
    pageSize = 25,
    sortBy = "fecha",
    sortDir = "desc",
  }) {
    const SORT_MAP = {
      id: "ov.id_orden_venta",
      fecha: "ov.fecha",
      cliente: "c.nombre",
      monto_total: "monto_total",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.fecha;
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const estadoPlaceholders = estados.map(() => "?").join(",");
    const whereParts = [`ov.estado IN (${estadoPlaceholders})`];
    const params = [...estados];
    if (buscar) {
      whereParts.push("c.nombre LIKE ?");
      params.push(`%${buscar}%`);
    }
    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const base = `
      FROM ordenes_venta ov
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      LEFT JOIN movimientos_tesoreria mt ON mt.id_documento = ov.id_orden_venta AND mt.tipo_documento = 'orden_venta'
      LEFT JOIN metodos_pago mp ON mt.id_metodo_pago = mp.id_metodo_pago
      LEFT JOIN ventas_credito vc ON ov.id_orden_venta = vc.id_orden_venta
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
      ${whereSQL}
      GROUP BY 
        ov.id_orden_venta,
        ov.id_pedido,
        vc.id_venta_credito,
        ov.fecha,
        ov.id_cliente,
        c.nombre,
        ov.estado,
        mp.nombre,
        vc.estado,
        vc.saldo_pendiente
    `;

    const [rows] = await db.query(
      `SELECT 
        ov.id_orden_venta,
        ov.id_pedido,
        vc.id_venta_credito,
        ov.fecha,
        ov.id_cliente,
        c.nombre AS cliente_nombre,
        ov.estado,
        mp.nombre AS metodo_pago,
        vc.estado AS estado_credito,
        vc.saldo_pendiente,
        SUM(dov.cantidad * dov.precio_unitario) AS monto_total
       ${base}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM (
         SELECT ov.id_orden_venta ${base}
       ) AS sub`,
      params
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  getArticulosConStock: async () => {
    const [rows] = await db.query(
      `SELECT
         a.id_articulo,
         a.referencia,
         a.descripcion,
         a.precio_venta,
         a.id_categoria,
         COALESCE(i.stock, 0) as stock,
         c.tipo as categoria_tipo
       FROM articulos AS a
       JOIN categorias AS c ON a.id_categoria = c.id_categoria
       LEFT JOIN inventario AS i ON a.id_articulo = i.id_articulo
       WHERE c.tipo = 'articulo_fabricable'
       ORDER BY a.descripcion ASC`
    );
    return rows;
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM ordenes_venta WHERE id_orden_venta = ?",
      [id]
    );
    return rows[0];
  },

  create: async (
    { id_cliente, estado, fecha, monto, total, id_pedido } = {},
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      `INSERT INTO ordenes_venta (id_cliente, estado, fecha, monto, total, id_pedido)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id_cliente, estado, fecha, monto, total, id_pedido]
    );
    return result.insertId;
  },

  update: async (
    id,
    { id_cliente, estado, id_pedido, total },
    connection = db
  ) => {
    const [result] = await (connection || db).query(
      `UPDATE ordenes_venta
       SET id_cliente = COALESCE(?, id_cliente), 
           estado = COALESCE(?, estado), 
           id_pedido = COALESCE(?, id_pedido),
           total = COALESCE(?, total)
       WHERE id_orden_venta = ?`,
      [id_cliente, estado, id_pedido, total, id]
    );
    return result.affectedRows;
  },

  delete: async (id, connection = db) => {
    await (connection || db).query(
      "DELETE FROM detalle_orden_venta WHERE id_orden_venta = ?",
      [id]
    );

    const [result] = await (connection || db).query(
      "DELETE FROM ordenes_venta WHERE id_orden_venta = ?",
      [id]
    );
    return result.affectedRows > 0;
  },
};
