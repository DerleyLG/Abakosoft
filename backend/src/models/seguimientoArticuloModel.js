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
      [idArticulo],
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
      [idArticulo, ...dateFilter.params, limit],
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
      [idArticulo, ...dateFilter.params, limit],
    );
    return rows;
  },

  // Órdenes de fabricación donde aparece el artículo
  getOrdenesFabricacion: async (
    idArticulo,
    limit = 10,
    mes = null,
    anio = null,
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
      [idArticulo, ...dateFilter.params, limit],
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
      WHERE doc.id_articulo = ?
        AND oc.estado != 'cancelada'${dateFilter.where}
      ORDER BY oc.fecha DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit],
    );
    return rows;
  },

  // Movimientos de inventario recientes (básico)
  getMovimientosInventario: async (
    idArticulo,
    limit = 10,
    mes = null,
    anio = null,
  ) => {
    try {
      console.log(
        "[Model] getMovimientosInventario - idArticulo:",
        idArticulo,
        "limit:",
        limit,
      );
      const dateFilter = buildDateFilter("mi.fecha_movimiento", mes, anio);
      console.log("[Model] dateFilter:", dateFilter);
      const query = `
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
      `;
      const params = [idArticulo, ...dateFilter.params, limit];
      console.log("[Model] Ejecutando query con params:", params);
      const [rows] = await db.query(query, params);
      console.log("[Model] Query ejecutada, filas:", rows?.length || 0);
      return rows;
    } catch (error) {
      console.error("[Model] Error en getMovimientosInventario:", error);
      throw error;
    }
  },

  // Movimientos de inventario DETALLADOS con información del documento relacionado
  // Incluye: cliente/proveedor, fecha, referencia, descripción, stock antes/después, valor COP
  getMovimientosDetallados: async (
    idArticulo,
    limit = 50,
    mes = null,
    anio = null,
  ) => {
    const dateFilter = buildDateFilter("mi.fecha_movimiento", mes, anio);

    // Query principal que obtiene movimientos con información contextual
    const [rows] = await db.query(
      `
      SELECT 
        mi.id_movimiento,
        mi.fecha_movimiento AS fecha,
        mi.tipo_movimiento,
        mi.tipo_origen_movimiento,
        mi.cantidad_movida,
        mi.observaciones,
        mi.referencia_documento_id,
        mi.referencia_documento_tipo,
        a.referencia AS articulo_referencia,
        a.descripcion AS articulo_descripcion,
        
        -- Información de VENTA
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN c_venta.nombre 
          ELSE NULL 
        END AS cliente_venta,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN dov.cantidad 
          ELSE NULL 
        END AS cantidad_venta,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN dov.precio_unitario 
          ELSE NULL 
        END AS precio_unitario_venta,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN (dov.cantidad * dov.precio_unitario) 
          ELSE NULL 
        END AS valor_total_venta,
        
        -- Información de COMPRA
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN prov_compra.nombre 
          ELSE NULL 
        END AS proveedor_compra,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN doc.cantidad 
          ELSE NULL 
        END AS cantidad_compra,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN doc.precio_unitario 
          ELSE NULL 
        END AS precio_unitario_compra,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN (doc.cantidad * doc.precio_unitario) 
          ELSE NULL 
        END AS valor_total_compra,
        
        -- Información de FABRICACIÓN (lotes)
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN t_fab.nombre 
          ELSE NULL 
        END AS trabajador_fabricacion,
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN lf.cantidad 
          ELSE NULL 
        END AS cantidad_fabricada,
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN ofa.id_orden_fabricacion
          ELSE NULL 
        END AS id_orden_fabricacion,
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN c_pedido.nombre 
          ELSE NULL 
        END AS cliente_pedido_fab
        
      FROM movimientos_inventario mi
      JOIN articulos a ON mi.id_articulo = a.id_articulo
      
      -- JOINs para VENTAS (incluye anulaciones)
      LEFT JOIN ordenes_venta ov ON mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') 
        AND mi.referencia_documento_id = ov.id_orden_venta
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta 
        AND dov.id_articulo = mi.id_articulo
      LEFT JOIN clientes c_venta ON ov.id_cliente = c_venta.id_cliente
      
      -- JOINs para COMPRAS (incluye anulaciones)
      LEFT JOIN ordenes_compra oc ON mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') 
        AND mi.referencia_documento_id = oc.id_orden_compra
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra 
        AND doc.id_articulo = mi.id_articulo
      LEFT JOIN proveedores prov_compra ON oc.id_proveedor = prov_compra.id_proveedor
      
      -- JOINs para FABRICACIÓN (lotes)
      LEFT JOIN lotes_fabricados lf ON mi.tipo_origen_movimiento = 'produccion' 
        AND mi.referencia_documento_id = lf.id_lote
      LEFT JOIN ordenes_fabricacion ofa ON lf.id_orden_fabricacion = ofa.id_orden_fabricacion
      LEFT JOIN trabajadores t_fab ON lf.id_trabajador = t_fab.id_trabajador
      LEFT JOIN pedidos p_fab ON ofa.id_pedido = p_fab.id_pedido
      LEFT JOIN clientes c_pedido ON p_fab.id_cliente = c_pedido.id_cliente
      
      WHERE mi.id_articulo = ?${dateFilter.where}
      ORDER BY mi.fecha_movimiento DESC
      LIMIT ?
    `,
      [idArticulo, ...dateFilter.params, limit],
    );

    // Calcular stock antes y después para cada movimiento
    // Primero obtenemos el stock actual
    const [[stockActual]] = await db.query(
      `SELECT COALESCE(stock, 0) AS stock_actual FROM inventario WHERE id_articulo = ?`,
      [idArticulo],
    );

    let stockActualNum = stockActual?.stock_actual || 0;

    // Procesar los movimientos para agregar stock_antes y stock_despues
    // Los movimientos vienen ordenados DESC (más reciente primero)
    const movimientosConStock = rows.map((mov, index) => {
      // Forzar a número para evitar errores de concatenación o strings mal formateados
      const cantidadMovida = Number(mov.cantidad_movida) || 0;
      const stockDespues = Number(stockActualNum) || 0;

      // Calcular stock antes según el tipo de movimiento
      let stockAntes;
      if (mov.tipo_movimiento === "entrada") {
        stockAntes = stockDespues - cantidadMovida;
      } else if (mov.tipo_movimiento === "salida") {
        stockAntes = stockDespues + cantidadMovida;
      } else if (mov.tipo_movimiento === "ajuste") {
        stockAntes = stockDespues - cantidadMovida;
      } else {
        stockAntes = stockDespues;
      }

      stockActualNum = stockAntes;

      return {
        ...mov,
        stock_antes: stockAntes,
        stock_despues: stockDespues,
        // Determinar entidad relacionada y valor
        entidad:
          mov.cliente_venta ||
          mov.proveedor_compra ||
          mov.trabajador_fabricacion ||
          (mov.cliente_pedido_fab
            ? `Pedido: ${mov.cliente_pedido_fab}`
            : null) ||
          "N/A",
        valor_documento:
          mov.valor_total_venta || mov.valor_total_compra || null,
        cantidad_documento:
          mov.cantidad_venta ||
          mov.cantidad_compra ||
          mov.cantidad_fabricada ||
          mov.cantidad_movida,
        precio_unitario:
          mov.precio_unitario_venta || mov.precio_unitario_compra || null,
      };
    });

    return movimientosConStock;
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
      [idArticulo, ...ventasFilter.params],
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
      [idArticulo, ...pedidosFilter.params],
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
      [idArticulo, ...fabFilter.params],
    );

    const loteFilter = buildDateFilter("lf.fecha", mes, anio);
    const [fabricado] = await db.query(
      `
      SELECT 
        COALESCE(SUM(lf.cantidad), 0) AS total_fabricado
      FROM lotes_fabricados lf
      WHERE lf.id_articulo = ?${loteFilter.where}
    `,
      [idArticulo, ...loteFilter.params],
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
      [idArticulo, ...comprasFilter.params],
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

  // Obtener TODOS los movimientos de inventario (para vista general) con paginación
  getAllMovimientos: async (
    page = 1,
    pageSize = 25,
    mes = null,
    anio = null,
    tipoOrigen = null,
    idArticulo = null,
    buscar = null,
  ) => {
    const offset = (page - 1) * pageSize;

    // Construir condiciones de filtro
    let whereConditions = [];
    let params = [];

    if (mes) {
      whereConditions.push("MONTH(mi.fecha_movimiento) = ?");
      params.push(parseInt(mes));
    }
    if (anio) {
      whereConditions.push("YEAR(mi.fecha_movimiento) = ?");
      params.push(parseInt(anio));
    }
    if (tipoOrigen) {
      whereConditions.push("mi.tipo_origen_movimiento = ?");
      params.push(tipoOrigen);
    }
    if (idArticulo) {
      whereConditions.push("mi.id_articulo = ?");
      params.push(idArticulo);
    }
    if (buscar) {
      whereConditions.push("(a.referencia LIKE ? OR a.descripcion LIKE ?)");
      params.push(`%${buscar}%`, `%${buscar}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Query para contar total
    const [[countResult]] = await db.query(
      `SELECT COUNT(*) AS total FROM movimientos_inventario mi
       JOIN articulos a ON mi.id_articulo = a.id_articulo
       ${whereClause}`,
      params,
    );
    const total = countResult.total;

    // Query principal
    const [rows] = await db.query(
      `
      SELECT 
        mi.id_movimiento,
        mi.id_articulo,
        mi.fecha_movimiento AS fecha,
        mi.tipo_movimiento,
        mi.tipo_origen_movimiento,
        mi.cantidad_movida,
        mi.observaciones,
        mi.referencia_documento_id,
        mi.referencia_documento_tipo,
        a.referencia AS articulo_referencia,
        a.descripcion AS articulo_descripcion,
        inv.stock AS stock_actual,
        
        -- Información de VENTA
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN c_venta.nombre 
          ELSE NULL 
        END AS cliente_venta,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN dov.precio_unitario 
          ELSE NULL 
        END AS precio_unitario_venta,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') THEN (dov.cantidad * dov.precio_unitario) 
          ELSE NULL 
        END AS valor_total_venta,
        
        -- Información de COMPRA
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN prov_compra.nombre 
          ELSE NULL 
        END AS proveedor_compra,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN doc.precio_unitario 
          ELSE NULL 
        END AS precio_unitario_compra,
        CASE 
          WHEN mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') THEN (doc.cantidad * doc.precio_unitario) 
          ELSE NULL 
        END AS valor_total_compra,
        
        -- Información de FABRICACIÓN (lotes)
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN t_fab.nombre 
          ELSE NULL 
        END AS trabajador_fabricacion,
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN c_pedido.nombre 
          ELSE NULL 
        END AS cliente_pedido_fab,
        CASE 
          WHEN mi.tipo_origen_movimiento = 'produccion' THEN ofa.id_orden_fabricacion 
          ELSE NULL 
        END AS id_orden_fabricacion
        
      FROM movimientos_inventario mi
      JOIN articulos a ON mi.id_articulo = a.id_articulo
      LEFT JOIN inventario inv ON mi.id_articulo = inv.id_articulo
      
      -- JOINs para VENTAS
      LEFT JOIN ordenes_venta ov ON mi.tipo_origen_movimiento IN ('venta', 'anulacion_venta', 'devolucion_cliente') 
        AND mi.referencia_documento_id = ov.id_orden_venta
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta 
        AND dov.id_articulo = mi.id_articulo
      LEFT JOIN clientes c_venta ON ov.id_cliente = c_venta.id_cliente
      
      -- JOINs para COMPRAS
      LEFT JOIN ordenes_compra oc ON mi.tipo_origen_movimiento IN ('compra', 'anulacion_compra', 'devolucion_proveedor') 
        AND mi.referencia_documento_id = oc.id_orden_compra
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra 
        AND doc.id_articulo = mi.id_articulo
      LEFT JOIN proveedores prov_compra ON oc.id_proveedor = prov_compra.id_proveedor
      
      -- JOINs para FABRICACIÓN
      LEFT JOIN lotes_fabricados lf ON mi.tipo_origen_movimiento = 'produccion' 
        AND mi.referencia_documento_id = lf.id_lote
      LEFT JOIN ordenes_fabricacion ofa ON lf.id_orden_fabricacion = ofa.id_orden_fabricacion
      LEFT JOIN trabajadores t_fab ON lf.id_trabajador = t_fab.id_trabajador
      LEFT JOIN pedidos p_fab ON ofa.id_pedido = p_fab.id_pedido
      LEFT JOIN clientes c_pedido ON p_fab.id_cliente = c_pedido.id_cliente
      
      ${whereClause}
      ORDER BY mi.fecha_movimiento DESC
      LIMIT ? OFFSET ?
    `,
      [...params, pageSize, offset],
    );

    // Para calcular stock_antes y stock_despues correctamente,
    // necesitamos procesar los movimientos considerando todos los movimientos
    // posteriores de cada artículo (los que vinieron después en el tiempo)

    // Primero, obtener los IDs de artículos únicos en esta página
    const articulosEnPagina = [...new Set(rows.map((r) => r.id_articulo))];

    // Para cada artículo, obtener TODOS sus movimientos posteriores al más antiguo de esta página
    // para poder calcular el stock correctamente
    const stockPorArticulo = {};

    for (const idArticulo of articulosEnPagina) {
      // Obtener el stock actual del artículo
      const [[stockActual]] = await db.query(
        `SELECT COALESCE(stock, 0) AS stock FROM inventario WHERE id_articulo = ?`,
        [idArticulo],
      );
      stockPorArticulo[idArticulo] = {
        stockActual: stockActual?.stock || 0,
        movimientosProcesados: new Map(),
      };

      // Encontrar los movimientos de este artículo en la página actual
      const movsDeArticulo = rows.filter((r) => r.id_articulo === idArticulo);
      if (movsDeArticulo.length === 0) continue;

      // Obtener el movimiento más antiguo de esta página para este artículo
      const movMasAntiguo = movsDeArticulo[movsDeArticulo.length - 1];

      // Obtener TODOS los movimientos de este artículo desde el más antiguo de la página
      // hasta el más reciente, para poder calcular stock correctamente
      const [todosMovsPosteriores] = await db.query(
        `SELECT id_movimiento, tipo_movimiento, cantidad_movida, fecha_movimiento
         FROM movimientos_inventario
         WHERE id_articulo = ? AND fecha_movimiento >= ?
         ORDER BY fecha_movimiento DESC, id_movimiento DESC`,
        [idArticulo, movMasAntiguo.fecha],
      );

      // Calcular stock para cada movimiento de este artículo
      let stockTemporal = stockPorArticulo[idArticulo].stockActual;

      for (const mov of todosMovsPosteriores) {
        const stockDespues = stockTemporal;
        let stockAntes;

        if (mov.tipo_movimiento === "entrada") {
          // Entrada: el stock aumentó, antes tenía menos
          stockAntes = stockDespues - mov.cantidad_movida;
        } else if (mov.tipo_movimiento === "salida") {
          // Salida: el stock disminuyó, antes tenía más
          stockAntes = stockDespues + mov.cantidad_movida;
        } else if (mov.tipo_movimiento === "ajuste") {
          // Ajuste: cantidad_movida ya tiene el signo correcto (+/-)
          stockAntes = stockDespues - mov.cantidad_movida;
        } else {
          stockAntes = stockDespues;
        }

        stockPorArticulo[idArticulo].movimientosProcesados.set(
          mov.id_movimiento,
          {
            stock_antes: stockAntes,
            stock_despues: stockDespues,
          },
        );

        stockTemporal = stockAntes;
      }
    }

    // Ahora procesar los movimientos de la página con los stocks calculados
    const movimientosProcesados = rows.map((mov) => {
      const stockInfo = stockPorArticulo[
        mov.id_articulo
      ]?.movimientosProcesados.get(mov.id_movimiento);

      return {
        id_movimiento: mov.id_movimiento,
        id_articulo: mov.id_articulo,
        fecha: mov.fecha,
        tipo_movimiento: mov.tipo_movimiento,
        tipo_origen_movimiento: mov.tipo_origen_movimiento,
        cantidad_movida: mov.cantidad_movida,
        observaciones: mov.observaciones,
        referencia_documento_id: mov.referencia_documento_id,
        referencia_documento_tipo: mov.referencia_documento_tipo,
        articulo_referencia: mov.articulo_referencia,
        articulo_descripcion: mov.articulo_descripcion,
        stock_antes: stockInfo?.stock_antes ?? 0,
        stock_despues: stockInfo?.stock_despues ?? mov.stock_actual ?? 0,
        stock_actual: mov.stock_actual,
        entidad:
          mov.cliente_venta ||
          mov.proveedor_compra ||
          mov.trabajador_fabricacion ||
          (mov.cliente_pedido_fab
            ? `Pedido: ${mov.cliente_pedido_fab}`
            : null) ||
          null,
        valor_documento:
          mov.valor_total_venta || mov.valor_total_compra || null,
        precio_unitario:
          mov.precio_unitario_venta || mov.precio_unitario_compra || null,
        id_orden_fabricacion: mov.id_orden_fabricacion || null,
      };
    });

    return {
      data: movimientosProcesados,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  // Balance de stock solo por tipo_movimiento
  balanceStock: async (idArticulo, mes = null, anio = null) => {
    const filter = buildDateFilter("fecha_movimiento", mes, anio);
    const [rows] = await db.query(
      `SELECT tipo_movimiento, cantidad_movida FROM movimientos_inventario WHERE id_articulo = ?${filter.where}`,
      [idArticulo, ...filter.params],
    );
    let entradas = 0;
    let salidas = 0;
    let ajustes = 0;
    for (const mov of rows) {
      if (mov.tipo_movimiento === "entrada") entradas += mov.cantidad_movida;
      else if (mov.tipo_movimiento === "salida") salidas += mov.cantidad_movida;
      else if (mov.tipo_movimiento === "ajuste") ajustes += mov.cantidad_movida;
    }
    return {
      entradas,
      salidas,
      ajustes,
      neto: entradas - salidas + ajustes,
    };
  },
};
