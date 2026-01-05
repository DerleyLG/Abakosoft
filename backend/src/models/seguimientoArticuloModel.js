const db = require("../database/db");

// Helper para construir filtro de fecha (mes y/o año)
const buildDateFilter = (dateColumn, mes, anio) => {
  const conditions = [];
  const params = [];

  if (mes) {
    conditions.push(`MONTH(${dateColumn}) = ?`);
    params.push(parseInt(mes));
  }
  if (anio) {
    conditions.push(`YEAR(${dateColumn}) = ?`);
    params.push(parseInt(anio));
  }

  if (conditions.length === 0) return { where: "", params: [] };

  return {
    where: ` AND ${conditions.join(" AND ")}`,
    params,
  };
};

module.exports = {
  // Obtener información completa del artículo
  getArticuloInfo: async (idArticulo) => {
    const [rows] = await db.query(
      `
      SELECT 
        a.id_articulo,
        a.descripcion,
        a.referencia,
        a.precio_venta,
       
        c.nombre AS categoria,
        c.tipo AS tipo_categoria,
        i.stock AS stock_disponible,
        i.stock_fabricado,
        i.stock_minimo,
        i.ultima_actualizacion
      FROM articulos a
      LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
      LEFT JOIN inventario i ON a.id_articulo = i.id_articulo
      WHERE a.id_articulo = ?
    `,
      [idArticulo]
    );
    return rows[0] || null;
  },

  // Órdenes de venta donde aparece el artículo
  getOrdenesVenta: async (idArticulo, limit = 10, mes = null, anio = null) => {
    const dateFilter = buildDateFilter("ov.fecha", mes, anio);
    const [rows] = await db.query(
      `
      SELECT 
        ov.id_orden_venta,
        ov.fecha,
        ov.estado,
        c.nombre AS cliente,
        dov.cantidad,
        dov.precio_unitario,
        (dov.cantidad * dov.precio_unitario) AS subtotal
      FROM detalle_orden_venta dov
      JOIN ordenes_venta ov ON dov.id_orden_venta = ov.id_orden_venta
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      WHERE dov.id_articulo = ?${dateFilter.where}
      ORDER BY ov.fecha DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit]
    );
    return rows;
  },

  // Órdenes de pedido donde aparece el artículo
  getOrdenesPedido: async (idArticulo, limit = 10, mes = null, anio = null) => {
    const dateFilter = buildDateFilter("p.fecha_pedido", mes, anio);
    const [rows] = await db.query(
      `
      SELECT 
        p.id_pedido,
        p.fecha_pedido AS fecha,
        p.estado,
        c.nombre AS cliente,
        dp.cantidad,
        dp.precio_unitario,
        (dp.cantidad * dp.precio_unitario) AS subtotal
      FROM detalle_pedido dp
      JOIN pedidos p ON dp.id_pedido = p.id_pedido
      JOIN clientes c ON p.id_cliente = c.id_cliente
      WHERE dp.id_articulo = ?${dateFilter.where}
      ORDER BY p.fecha_pedido DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit]
    );
    return rows;
  },

  // Órdenes de fabricación donde aparece el artículo
  getOrdenesFabricacion: async (
    idArticulo,
    limit = 10,
    mes = null,
    anio = null
  ) => {
    const dateFilter = buildDateFilter("ofa.fecha_inicio", mes, anio);
    const [rows] = await db.query(
      `
      SELECT 
        ofa.id_orden_fabricacion,
        ofa.fecha_inicio AS fecha,
        ofa.estado,
        cli.nombre AS cliente,
        dof.cantidad,
        COALESCE(
          (SELECT SUM(lf.cantidad) 
           FROM lotes_fabricados lf 
           WHERE lf.id_orden_fabricacion = ofa.id_orden_fabricacion 
             AND lf.id_articulo = dof.id_articulo), 
          0
        ) AS cantidad_fabricada
      FROM detalle_orden_fabricacion dof
      JOIN ordenes_fabricacion ofa ON dof.id_orden_fabricacion = ofa.id_orden_fabricacion
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes cli ON p.id_cliente = cli.id_cliente
      WHERE dof.id_articulo = ?${dateFilter.where}
      ORDER BY ofa.fecha_inicio DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit]
    );
    return rows;
  },

  // Órdenes de compra donde aparece el artículo
  getOrdenesCompra: async (idArticulo, limit = 10, mes = null, anio = null) => {
    const dateFilter = buildDateFilter("oc.fecha", mes, anio);
    const [rows] = await db.query(
      `
      SELECT 
        oc.id_orden_compra,
        oc.fecha,
        oc.estado,
        prov.nombre AS proveedor,
        doc.cantidad,
        doc.precio_unitario,
        (doc.cantidad * doc.precio_unitario) AS subtotal
      FROM detalle_orden_compra doc
      JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
      JOIN proveedores prov ON oc.id_proveedor = prov.id_proveedor
      WHERE doc.id_articulo = ?${dateFilter.where}
      ORDER BY oc.fecha DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit]
    );
    return rows;
  },

  // Movimientos de inventario recientes
  getMovimientosInventario: async (
    idArticulo,
    limit = 10,
    mes = null,
    anio = null
  ) => {
    const dateFilter = buildDateFilter("mi.fecha_movimiento", mes, anio);
    const [rows] = await db.query(
      `
      SELECT 
        mi.id_movimiento,
        mi.fecha_movimiento AS fecha,
        mi.tipo_movimiento,
        mi.tipo_origen_movimiento,
        mi.cantidad_movida,
        mi.observaciones
      FROM movimientos_inventario mi
      WHERE mi.id_articulo = ?${dateFilter.where}
      ORDER BY mi.fecha_movimiento DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit]
    );
    return rows;
  },

  // Resumen de totales (con filtro de mes opcional)
  getResumen: async (idArticulo, mes = null, anio = null) => {
    const ventasFilter = buildDateFilter("ov.fecha", mes, anio);
    const [ventas] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT ov.id_orden_venta) AS total_ordenes,
        COALESCE(SUM(dov.cantidad), 0) AS total_cantidad,
        COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) AS total_monto
      FROM detalle_orden_venta dov
      JOIN ordenes_venta ov ON dov.id_orden_venta = ov.id_orden_venta
      WHERE dov.id_articulo = ? AND ov.estado = 'completada'${ventasFilter.where}
    `,
      [idArticulo, ...ventasFilter.params]
    );

    const pedidosFilter = buildDateFilter("p.fecha_pedido", mes, anio);
    const [pedidos] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT p.id_pedido) AS total_ordenes,
        COALESCE(SUM(dp.cantidad), 0) AS total_cantidad
      FROM detalle_pedido dp
      JOIN pedidos p ON dp.id_pedido = p.id_pedido
      WHERE dp.id_articulo = ? AND p.estado NOT IN ('cancelado')${pedidosFilter.where}
    `,
      [idArticulo, ...pedidosFilter.params]
    );

    const fabFilter = buildDateFilter("ofa.fecha_inicio", mes, anio);
    const [fabricacion] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT dof.id_orden_fabricacion) AS total_ordenes,
        COALESCE(SUM(dof.cantidad), 0) AS total_solicitado
      FROM detalle_orden_fabricacion dof
      JOIN ordenes_fabricacion ofa ON dof.id_orden_fabricacion = ofa.id_orden_fabricacion
      WHERE dof.id_articulo = ?${fabFilter.where}
    `,
      [idArticulo, ...fabFilter.params]
    );

    const loteFilter = buildDateFilter("lf.fecha", mes, anio);
    const [fabricado] = await db.query(
      `
      SELECT 
        COALESCE(SUM(lf.cantidad), 0) AS total_fabricado
      FROM lotes_fabricados lf
      WHERE lf.id_articulo = ?${loteFilter.where}
    `,
      [idArticulo, ...loteFilter.params]
    );

    const comprasFilter = buildDateFilter("oc.fecha", mes, anio);
    const [compras] = await db.query(
      `
      SELECT 
        COUNT(DISTINCT oc.id_orden_compra) AS total_ordenes,
        COALESCE(SUM(doc.cantidad), 0) AS total_cantidad,
        COALESCE(SUM(doc.cantidad * doc.precio_unitario), 0) AS total_monto
      FROM detalle_orden_compra doc
      JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
      WHERE doc.id_articulo = ? AND oc.estado = 'completada'${comprasFilter.where}
    `,
      [idArticulo, ...comprasFilter.params]
    );

    return {
      ventas: ventas[0],
      pedidos: pedidos[0],
      fabricacion: {
        total_ordenes: fabricacion[0]?.total_ordenes || 0,
        total_solicitado: fabricacion[0]?.total_solicitado || 0,
        total_fabricado: fabricado[0]?.total_fabricado || 0,
      },
      compras: compras[0],
    };
  },
};
