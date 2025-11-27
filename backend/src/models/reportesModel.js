const db = require("../database/db");

module.exports = {
  async getServiciosTercerizados({
    id_orden_fabricacion,
    id_etapa_produccion,
    id_servicio,
    fecha_inicio,
    fecha_fin,
  }) {
    let sql = `
    SELECT 
      s.descripcion AS servicio, 
      ofab.id_orden_fabricacion, 
      ep.nombre AS etapa,
      sta.fecha_asignacion,
      sta.id_asignacion
    FROM servicios_tercerizados_asignados sta
    JOIN servicios_tercerizados s ON sta.id_servicio = s.id_servicio
    JOIN ordenes_fabricacion ofab ON sta.id_orden_fabricacion = ofab.id_orden_fabricacion
    JOIN etapas_produccion ep ON sta.id_etapa_produccion = ep.id_etapa
    WHERE 1 = 1
  `;

    const params = [];

    if (id_orden_fabricacion) {
      sql += " AND sta.id_orden_fabricacion = ?";
      params.push(id_orden_fabricacion);
    }

    if (id_etapa_produccion) {
      sql += " AND sta.id_etapa_produccion = ?";
      params.push(id_etapa_produccion);
    }

    if (id_servicio) {
      sql += " AND sta.id_servicio = ?";
      params.push(id_servicio);
    }

    if (fecha_inicio && fecha_fin) {
      sql += " AND sta.fecha_asignacion BETWEEN ? AND ?";
      params.push(fecha_inicio, fecha_fin);
    }

    sql += " ORDER BY sta.fecha_asignacion DESC";

    const [rows] = await db.query(sql, params);
    return rows;
  },

  async getAvanceFabricacion({ orden, desde, hasta, estado }) {
    let sql = `
    SELECT
      ofab.id_orden_fabricacion,
      ep.nombre AS etapa,
      aep.fecha_registro,
      t.nombre AS trabajador,
      aep.estado,
      aep.observaciones
    FROM avance_etapas_produccion aep
    JOIN ordenes_fabricacion ofab ON aep.id_orden_fabricacion = ofab.id_orden_fabricacion
    JOIN etapas_produccion ep ON aep.id_etapa_produccion = ep.id_etapa
    LEFT JOIN trabajadores t ON aep.id_trabajador = t.id_trabajador
  `;

    const conditions = []; // Array para almacenar las condiciones WHERE
    const params = []; // Array para almacenar los parámetros

    if (orden) {
      conditions.push("ofab.id_orden_fabricacion = ?");
      params.push(orden);
    }
    if (desde) {
      conditions.push("aep.fecha_registro >= ?");
      params.push(desde);
    }
    if (hasta) {
      conditions.push("aep.fecha_registro <= ?");
      params.push(hasta);
    }
    if (estado) {
      conditions.push("aep.estado = ?");
      params.push(estado);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY ofab.id_orden_fabricacion, aep.fecha_registro";

    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Error en la consulta SQL de getAvanceFabricacion:", error);
      throw error; // Propaga el error para que el controlador lo maneje
    }
  },

  async getReporteOrdenesCompra({ proveedor, desde, hasta, estado }) {
    let filtros = [];
    let valores = [];

    if (proveedor) {
      filtros.push("p.nombre LIKE ?");
      valores.push(`%${proveedor}%`);
    }

    if (desde && hasta) {
      filtros.push("oc.fecha BETWEEN ? AND ?");
      valores.push(desde, hasta);
    }

    if (estado) {
      filtros.push("oc.estado = ?");
      valores.push(estado);
    }

    let where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";

    const sql = `
      SELECT 
        oc.id_orden_compra,
        oc.fecha,
        p.nombre AS proveedor,
        SUM(doc.cantidad * doc.precio_unitario) AS total
      FROM ordenes_compra oc
      JOIN proveedores p ON oc.id_proveedor = p.id_proveedor
      LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
      ${where}
      GROUP BY oc.id_orden_compra
      ORDER BY oc.fecha DESC
    `;

    const [rows] = await db.query(sql, valores);
    return rows;
  },
  async getInventarioActual({ categoria, articulo, desde, hasta }) {
    try {
      if (Array.isArray(desde)) {
        desde = desde[desde.length - 1];
      }
      if (Array.isArray(hasta)) {
        hasta = hasta[hasta.length - 1];
      }
      if (typeof desde === "string" && desde.includes(",")) {
        const parts = desde
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) desde = parts[parts.length - 1];
      }
      if (typeof hasta === "string" && hasta.includes(",")) {
        const parts = hasta
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (parts.length > 0) hasta = parts[parts.length - 1];
      }

      const filtros = [];
      const paramsWhere = [];

      if (categoria) {
        filtros.push("c.nombre LIKE ?");
        paramsWhere.push(`%${categoria}%`);
      }

      if (articulo) {
        filtros.push("a.descripcion LIKE ?");
        paramsWhere.push(`%${articulo}%`);
      }

      const where = filtros.length > 0 ? `WHERE ${filtros.join(" AND ")}` : "";

      const ventasConds = [
        "mv.id_articulo = i.id_articulo",
        "mv.tipo_movimiento = 'salida'",
        "mv.tipo_origen_movimiento = 'venta'",
      ];
      const paramsVentas = [];
      if (desde) {
        ventasConds.push("mv.fecha_movimiento >= ?");
        paramsVentas.push(desde);
      }
      if (hasta) {
        ventasConds.push("mv.fecha_movimiento <= ?");
        paramsVentas.push(hasta);
      }

      const fabricadasConds = [
        "mf.id_articulo = i.id_articulo",
        "mf.tipo_movimiento = 'entrada'",
        "mf.tipo_origen_movimiento = 'produccion'",
      ];
      const paramsFabricadas = [];
      if (desde) {
        fabricadasConds.push("mf.fecha_movimiento >= ?");
        paramsFabricadas.push(desde);
      }
      if (hasta) {
        fabricadasConds.push("mf.fecha_movimiento <= ?");
        paramsFabricadas.push(hasta);
      }

      const sql = `
      SELECT 
        a.descripcion,
        c.nombre AS categoria,
        i.stock,
        i.stock_minimo,
        i.ultima_actualizacion,
        COALESCE((
          SELECT SUM(mv.cantidad_movida)
          FROM movimientos_inventario mv
          WHERE ${ventasConds.join(" AND ")}
        ), 0) AS unidades_vendidas,
        COALESCE((
          SELECT SUM(mf.cantidad_movida)
          FROM movimientos_inventario mf
          WHERE ${fabricadasConds.join(" AND ")}
        ), 0) AS unidades_fabricadas
      FROM inventario i
      INNER JOIN articulos a ON i.id_articulo = a.id_articulo
      LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
      ${where}
      ORDER BY a.descripcion
    `;

      const allParams = [...paramsVentas, ...paramsFabricadas, ...paramsWhere];
      console.log("Consulta Inventario:", sql);
      console.log("Parámetros:", allParams);

      const [rows] = await db.query(sql, allParams);
      return rows;
    } catch (error) {
      console.error("ERROR en getInventarioActual:", error);
      throw error;
    }
  },

  async getCostosProduccion({ desde, hasta, orden }) {
    let conditions = [];
    let params = [];

    if (desde) {
      conditions.push("ofab.fecha_inicio >= ?");
      params.push(desde);
    }
    if (hasta) {
      conditions.push("ofab.fecha_inicio <= ?");
      params.push(hasta);
    }

    if (orden) {
      conditions.push("ofab.id_orden_fabricacion = ?");
      params.push(orden);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT
        ofab.id_orden_fabricacion,
        ofab.fecha_inicio,
        COALESCE(SUM(df.cantidad * a.precio_costo), 0) AS costo_articulos,
        COALESCE(SUM(aep.cantidad * aep.costo_fabricacion), 0) AS costo_mano_obra
    
      FROM ordenes_fabricacion ofab
      LEFT JOIN detalle_orden_fabricacion df ON ofab.id_orden_fabricacion = df.id_orden_fabricacion
      LEFT JOIN articulos a ON df.id_articulo = a.id_articulo
      LEFT JOIN avance_etapas_produccion aep ON ofab.id_orden_fabricacion = aep.id_orden_fabricacion
      ${where}
      GROUP BY ofab.id_orden_fabricacion
      ORDER BY ofab.fecha_inicio DESC;
    `;

    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Error en la consulta SQL de getCostosProduccion:", error);
      throw error;
    }
  },

  async getUtilidadPorOrden({ desde, hasta, orden, solo_mano_obra = true }) {
    let conditions = [];
    let params = [];

    if (desde) {
      conditions.push("ofab.fecha_inicio >= ?");
      params.push(desde);
    }
    if (hasta) {
      conditions.push("ofab.fecha_inicio <= ?");
      params.push(hasta);
    }

    if (orden) {
      conditions.push("ofab.id_orden_fabricacion = ?");
      params.push(orden);
    }

    let where = "WHERE ofab.estado = 'completada'";
    if (conditions.length > 0) {
      where += ` AND ${conditions.join(" AND ")}`;
    }

    const sql = `
      SELECT
        ofab.id_orden_fabricacion,
        ofab.fecha_inicio,
        c.nombre AS cliente,
        COALESCE(mo.costo_mano_obra, 0) AS costo_mano_obra,
        COALESCE(v.total_ingresos, precio_catalogo.total_precio_catalogo, 0) AS total_ingresos,
        COALESCE(v.total_ingresos, precio_catalogo.total_precio_catalogo, 0) - COALESCE(mo.costo_mano_obra, 0) AS utilidad
      FROM ordenes_fabricacion ofab
      LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      /* Mano de obra (avance etapas: cantidad x costo_fabricacion) */
      LEFT JOIN (
        SELECT 
          aep.id_orden_fabricacion,
          SUM(aep.cantidad * aep.costo_fabricacion) AS costo_mano_obra
        FROM avance_etapas_produccion aep
        GROUP BY aep.id_orden_fabricacion
      ) mo ON mo.id_orden_fabricacion = ofab.id_orden_fabricacion
      /* Ingresos por ventas solo vía pedido (OF -> pedido -> OV),
         distribuidos proporcionalmente por artículo entre las OF del mismo pedido */
      LEFT JOIN (
        SELECT 
          poa.id_orden_fabricacion,
          SUM(ing.ingresos_art * (poa.cant_of / NULLIF(tpa.total_producido, 0))) AS total_ingresos
        FROM (
          SELECT of2.id_orden_fabricacion, of2.id_pedido, df.id_articulo, SUM(df.cantidad) AS cant_of
          FROM ordenes_fabricacion of2
          JOIN detalle_orden_fabricacion df ON df.id_orden_fabricacion = of2.id_orden_fabricacion
          GROUP BY of2.id_orden_fabricacion, of2.id_pedido, df.id_articulo
        ) poa
        JOIN (
          SELECT ov.id_pedido, dov.id_articulo, SUM(dov.cantidad * dov.precio_unitario) AS ingresos_art
          FROM ordenes_venta ov
          JOIN detalle_orden_venta dov ON dov.id_orden_venta = ov.id_orden_venta
          WHERE ov.estado = 'completada'
          GROUP BY ov.id_pedido, dov.id_articulo
        ) ing ON ing.id_pedido = poa.id_pedido AND ing.id_articulo = poa.id_articulo
        JOIN (
          SELECT of3.id_pedido, df2.id_articulo, SUM(df2.cantidad) AS total_producido
          FROM ordenes_fabricacion of3
          JOIN detalle_orden_fabricacion df2 ON df2.id_orden_fabricacion = of3.id_orden_fabricacion
          GROUP BY of3.id_pedido, df2.id_articulo
        ) tpa ON tpa.id_pedido = poa.id_pedido AND tpa.id_articulo = poa.id_articulo
        GROUP BY poa.id_orden_fabricacion
      ) v ON v.id_orden_fabricacion = ofab.id_orden_fabricacion
      /* Precio de catálogo (precio_venta de la tabla artículos cuando no hay venta vinculada) */
      LEFT JOIN (
        SELECT 
          dof.id_orden_fabricacion,
          SUM(dof.cantidad * COALESCE(a.precio_venta, 0)) AS total_precio_catalogo
        FROM detalle_orden_fabricacion dof
        JOIN articulos a ON dof.id_articulo = a.id_articulo
        GROUP BY dof.id_orden_fabricacion
      ) precio_catalogo ON precio_catalogo.id_orden_fabricacion = ofab.id_orden_fabricacion
      ${where}
      ORDER BY ofab.fecha_inicio DESC;
    `;
    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Error en la consulta SQL de getUtilidadPorOrden:", error);
      throw error;
    }
  },

  async getPagosTrabajadores({ id_trabajador, desde, hasta }) {
    let sql = `
    SELECT 
      pt.id_pago,
      pt.fecha_pago,
      pt.monto_total,
      t.nombre AS trabajador
    FROM pagos_trabajadores pt
    JOIN trabajadores t ON pt.id_trabajador = t.id_trabajador
    JOIN detalle_pago_trabajador dpt ON pt.id_pago = dpt.id_pago
  `;

    const params = [];

    if (id_trabajador) {
      sql += " AND pt.id_trabajador = ?";
      params.push(id_trabajador);
    }
    if (desde) {
      sql += " AND pt.fecha_pago >= ?";
      params.push(desde);
    }
    if (hasta) {
      sql += " AND pt.fecha_pago <= ?";
      params.push(hasta);
    }

    sql += " ORDER BY pt.fecha_pago DESC";

    const [rows] = await db.query(sql, params);
    return rows;
  },

  async getPagosTrabajadoresPorDia({
    id_trabajador,
    desde,
    hasta,
    id_orden_fabricacion,
  }) {
    const filtros = ["1=1"];
    const params = [];

    if (Array.isArray(desde)) {
      desde = desde[desde.length - 1];
    }
    if (Array.isArray(hasta)) {
      hasta = hasta[hasta.length - 1];
    }
    if (typeof desde === "string" && desde.includes(",")) {
      const parts = desde
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) desde = parts[parts.length - 1];
    }
    if (typeof hasta === "string" && hasta.includes(",")) {
      const parts = hasta
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (parts.length > 0) hasta = parts[parts.length - 1];
    }

    const esFechaSimple = (s) =>
      typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
    const extraeFecha = (s) => {
      if (typeof s !== "string") return null;
      const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : null;
    };
    const dDesde = extraeFecha(desde);
    const dHasta = extraeFecha(hasta);
    const mismoDia = dDesde && dHasta && dDesde === dHasta;
    const desdeNorm = esFechaSimple(desde) ? `${desde} 00:00:00` : desde;
    const hastaNorm = esFechaSimple(hasta) ? `${hasta} 23:59:59` : hasta;

    if (id_trabajador) {
      filtros.push("pt.id_trabajador = ?");
      params.push(id_trabajador);
    }
    if (id_orden_fabricacion) {
      filtros.push("a.id_orden_fabricacion = ?");
      params.push(id_orden_fabricacion);
    }

    if (dDesde && dHasta) {
      if (mismoDia) {
        filtros.push("DATE(pt.fecha_pago) = ?");
        params.push(dDesde);
      } else {
        filtros.push("DATE(pt.fecha_pago) BETWEEN ? AND ?");
        params.push(dDesde, dHasta);
      }
    } else {
      if (desdeNorm) {
        filtros.push("pt.fecha_pago >= ?");
        params.push(desdeNorm);
      }
      if (hastaNorm) {
        filtros.push("pt.fecha_pago <= ?");
        params.push(hastaNorm);
      }
    }

    const where = `WHERE ${filtros.join(" AND ")}`;

    const sql = `
    SELECT
      DATE(pt.fecha_pago) AS fecha,
      pt.id_trabajador,
      t.nombre AS trabajador,
      COALESCE(SUM(CASE WHEN d.es_descuento = 0 THEN (d.cantidad * d.pago_unitario) ELSE 0 END), 0) AS total_bruto,
      COALESCE(SUM(CASE WHEN d.es_descuento = 1 THEN (d.cantidad * d.pago_unitario) ELSE 0 END), 0) AS total_descuentos,
      COALESCE(SUM(d.cantidad * d.pago_unitario), 0) AS total_neto
    FROM pagos_trabajadores pt
    JOIN trabajadores t ON t.id_trabajador = pt.id_trabajador
    LEFT JOIN detalle_pago_trabajador d ON d.id_pago = pt.id_pago
    LEFT JOIN avance_etapas_produccion a ON a.id_avance_etapa = d.id_avance_etapa
    ${where}
    GROUP BY DATE(pt.fecha_pago), pt.id_trabajador
    ORDER BY fecha DESC, trabajador ASC
  `;

    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error("Error en getPagosTrabajadoresPorDia:", error);
      throw error;
    }
  },

  async getVentasPorPeriodo({
    desde,
    hasta,
    estado,
    id_cliente,
    groupBy = "orden",
  }) {
    const filtros = ["1=1"];
    const params = [];

    if (desde) {
      const desdeConHora = /^\d{4}-\d{2}-\d{2}$/.test(desde)
        ? `${desde} 00:00:00`
        : desde;
      filtros.push("ov.fecha >= ?");
      params.push(desdeConHora);
    }
    if (hasta) {
      const hastaConHora = /^\d{4}-\d{2}-\d{2}$/.test(hasta)
        ? `${hasta} 23:59:59`
        : hasta;
      filtros.push("ov.fecha <= ?");
      params.push(hastaConHora);
    }

    if (estado) {
      filtros.push("ov.estado = ?");
      params.push(estado);
    }

    if (id_cliente) {
      filtros.push("ov.id_cliente = ?");
      params.push(id_cliente);
    }

    const where = `WHERE ${filtros.join(" AND ")}`;

    let select, groupBySql, orderBy;

    if (groupBy === "dia") {
      select = `
      SELECT
        DATE(ov.fecha) AS fecha,
        COUNT(DISTINCT ov.id_orden_venta) AS ordenes,
        COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) AS total_venta
      FROM ordenes_venta ov
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    `;
      groupBySql = `GROUP BY DATE(ov.fecha)`;
      orderBy = `ORDER BY fecha DESC`;
    } else if (groupBy === "mes") {
      select = `
      SELECT
        DATE_FORMAT(ov.fecha, '%Y-%m') AS periodo,
        COUNT(DISTINCT ov.id_orden_venta) AS ordenes,
        COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) AS total_venta
      FROM ordenes_venta ov
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    `;
      groupBySql = `GROUP BY YEAR(ov.fecha), MONTH(ov.fecha)`;
      orderBy = `ORDER BY YEAR(ov.fecha) DESC, MONTH(ov.fecha) DESC`;
    } else {
      select = `
      SELECT
        ov.id_orden_venta,
        ov.fecha,
        c.nombre AS cliente,
        ov.estado,
        COALESCE(SUM(dov.cantidad * dov.precio_unitario), 0) AS total_venta
      FROM ordenes_venta ov
      JOIN clientes c ON ov.id_cliente = c.id_cliente
      LEFT JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    `;
      groupBySql = `GROUP BY ov.id_orden_venta`;
      orderBy = `ORDER BY ov.fecha DESC`;
    }

    const sql = `
    ${select}
    ${where}
    ${groupBySql}
    ${orderBy}
  `;

    const [rows] = await db.query(sql, params);
    return rows;
  },

  async getMovimientosInventario({
    id_articulo,
    tipo_movimiento,
    tipo_origen_movimiento,
    fecha_desde,
    fecha_hasta,
  }) {
    let sql = `
    SELECT 
      mi.id_movimiento,
      mi.fecha_movimiento AS fecha,
      mi.tipo_movimiento,
      mi.cantidad_movida AS cantidad,
      mi.observaciones,
      mi.tipo_origen_movimiento,
      mi.referencia_documento_id,
      mi.referencia_documento_tipo,
      a.descripcion AS articulo,
      c.nombre AS categoria
    FROM movimientos_inventario mi
    JOIN articulos a ON mi.id_articulo = a.id_articulo
    LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
  `;

    const conditions = [];
    const params = [];

    if (id_articulo) {
      conditions.push("mi.id_articulo = ?");
      params.push(id_articulo);
    }

    if (tipo_movimiento) {
      conditions.push("mi.tipo_movimiento = ?");
      params.push(tipo_movimiento);
    }

    if (tipo_origen_movimiento) {
      conditions.push("mi.tipo_origen_movimiento = ?");
      params.push(tipo_origen_movimiento);
    }

    if (fecha_desde && fecha_hasta) {
      conditions.push("mi.fecha_movimiento BETWEEN ? AND ?");
      params.push(fecha_desde, fecha_hasta);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    sql += " ORDER BY mi.fecha_movimiento DESC";

    try {
      const [rows] = await db.query(sql, params);
      return rows;
    } catch (error) {
      console.error(
        "Error en la consulta SQL de getMovimientosInventario:",
        error
      );
      throw error;
    }
  },
};
