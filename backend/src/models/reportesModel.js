const db = require('../database/db');

module.exports = {

 async getServiciosTercerizados({ id_orden_fabricacion, id_etapa_produccion, id_servicio, fecha_inicio, fecha_fin }) {
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
    sql += ' AND sta.id_orden_fabricacion = ?';
    params.push(id_orden_fabricacion);
  }

  if (id_etapa_produccion) {
    sql += ' AND sta.id_etapa_produccion = ?';
    params.push(id_etapa_produccion);
  }

  if (id_servicio) {
    sql += ' AND sta.id_servicio = ?';
    params.push(id_servicio);
  }

  if (fecha_inicio && fecha_fin) {
    sql += ' AND sta.fecha_asignacion BETWEEN ? AND ?';
    params.push(fecha_inicio, fecha_fin);
  }

  sql += ' ORDER BY sta.fecha_asignacion DESC';

  const [rows] = await db.query(sql, params);
  return rows;
},

async  getAvanceFabricacion({ orden, desde, hasta, estado }) {
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
  const params = [];

  if (orden) {
    sql += ' AND ofab.id_orden_fabricacion = ?';
    params.push(orden);
  }
  if (desde) {
    sql += ' AND aep.fecha_registro >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND aep.fecha_registro <= ?';
    params.push(hasta);
  }
  if (estado) {
    sql += ' AND aep.estado = ?';
    params.push(estado);
  }

  sql += ' ORDER BY ofab.id_orden_fabricacion, aep.fecha_registro';

  const [rows] = await db.query(sql, params);
  return rows;
},

async getReporteOrdenesCompra({ proveedor, desde, hasta, estado }) {
    let filtros = [];
    let valores = [];

    if (proveedor) {
      filtros.push('p.nombre LIKE ?');
      valores.push(`%${proveedor}%`);
    }

    if (desde && hasta) {
      filtros.push('oc.fecha BETWEEN ? AND ?');
      valores.push(desde, hasta);
    }

    if (estado) {
      filtros.push('oc.estado = ?');
      valores.push(estado);
    }

    let where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

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
 async getInventarioActual({ categoria, articulo }) {
  try {
    let filtros = [];
    let valores = [];

    if (categoria) {
      filtros.push('c.nombre LIKE ?');
      valores.push(`%${categoria}%`);
    }

    if (articulo) {
      filtros.push('a.descripcion LIKE ?');
      valores.push(`%${articulo}%`);
    }

    const where = filtros.length > 0 ? `WHERE ${filtros.join(' AND ')}` : '';

    const sql = `
      SELECT 
        a.descripcion,
        c.nombre AS categoria,
        i.stock,
        i.stock_minimo,
        i.ultima_actualizacion
      FROM inventario i
      INNER JOIN articulos a ON i.id_articulo = a.id_articulo
      LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
      ${where}
      ORDER BY a.descripcion
    `;

    console.log('Consulta Inventario:', sql);
    console.log('Parámetros:', valores);

    const [rows] = await db.query(sql, valores);
    return rows;
  } catch (error) {
    console.error('ERROR en getInventarioActual:', error);
    throw error;
  }
},


async getCostosProduccion({ desde, hasta, orden }) {
  let filtros = [];
  let valores = [];

  if (desde && hasta) {
    filtros.push('ofab.fecha_creacion BETWEEN ? AND ?');
    valores.push(desde, hasta);
  }

  if (orden) {
    filtros.push('ofab.id_orden_fabricacion = ?');
    valores.push(orden);
  }


  const [rows] = await db.query(`
      SELECT 
        ofab.id_orden_fabricacion,
        a.descripcion AS articulo,
        df.cantidad,
        a.costo AS costo_unitario,
        (df.cantidad * a.costo) AS costo_total_articulo,
        (
          SELECT COALESCE(SUM(cia.valor_asignado), 0)
          FROM costos_indirectos_asignados cia
          WHERE cia.id_orden_fabricacion = ofab.id_orden_fabricacion
        ) AS costo_indirecto
      FROM detalle_orden_fabricacion df
      JOIN ordenes_fabricacion ofab ON df.id_orden_fabricacion = ofab.id_orden_fabricacion
      JOIN articulos a ON df.id_articulo = a.id_articulo
      ORDER BY ofab.id_orden_fabricacion;
    `);
    return rows;
  },

  async getVentasPorFiltros({ desde, hasta, estado, id_cliente, monto_min, monto_max }) {
  let sql = `
    SELECT
      ov.id_orden_venta,
      ov.fecha,
      c.nombre AS cliente,
      ov.estado
    FROM ordenes_venta ov
    JOIN clientes c ON ov.id_cliente = c.id_cliente
    WHERE 1=1
  `;

  const params = [];

  if (desde) {
    sql += ' AND ov.fecha >= ? ';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND ov.fecha <= ? ';
    params.push(hasta);
  }
  if (estado) {
    sql += ' AND ov.estado = ? ';
    params.push(estado);
  }
  if (id_cliente) {
    sql += ' AND ov.id_cliente = ? ';
    params.push(id_cliente);
  }
  if (monto_min) {
    sql += ' AND ov.total >= ? ';
    params.push(monto_min);
  }
  if (monto_max) {
    sql += ' AND ov.total <= ? ';
    params.push(monto_max);
  }

  sql += ' ORDER BY ov.fecha DESC;';

  const [rows] = await db.query(sql, params);
  return rows;
},
async getUtilidadPorOrden({ desde, hasta, estado }) {
  let sql = `
    SELECT
      ov.id_orden_venta,
      ov.fecha,
      c.nombre AS cliente,
      SUM(dov.cantidad * a.precio_venta) AS total_venta,
      SUM(dov.cantidad * a.costo) AS costo_total,
      SUM(dov.cantidad * a.precio_venta) - SUM(dov.cantidad * a.costo) AS utilidad,
      ov.estado
    FROM ordenes_venta ov
    JOIN clientes c ON ov.id_cliente = c.id_cliente
    JOIN detalle_orden_venta dov ON ov.id_orden_venta = dov.id_orden_venta
    JOIN articulos a ON dov.id_articulo = a.id_articulo
    WHERE 1=1
  `;

  const params = [];

  if (desde) {
    sql += " AND ov.fecha >= ? ";
    params.push(desde);
  }

  if (hasta) {
    sql += " AND ov.fecha <= ? ";
    params.push(hasta);
  }

  if (estado) {
    sql += " AND ov.estado = ? ";
    params.push(estado);
  }

  sql += `
    GROUP BY ov.id_orden_venta
    ORDER BY ov.fecha DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
},

async getPagosTrabajadores({ id_trabajador, desde, hasta, es_anticipo }) {
  let sql = `
    SELECT 
      pt.id_pago,
      pt.fecha_pago,
      pt.monto_total,
      t.nombre AS trabajador,
      dpt.cantidad,
      dpt.pago_unitario,
      dpt.subtotal,
      pt.es_anticipo
    FROM pagos_trabajadores pt
    JOIN trabajadores t ON pt.id_trabajador = t.id_trabajador
    JOIN detalle_pago_trabajador dpt ON pt.id_pago = dpt.id_pago
    WHERE 1=1
  `;

  const params = [];

  if (id_trabajador) {
    sql += ' AND pt.id_trabajador = ?';
    params.push(id_trabajador);
  }
  if (desde) {
    sql += ' AND pt.fecha_pago >= ?';
    params.push(desde);
  }
  if (hasta) {
    sql += ' AND pt.fecha_pago <= ?';
    params.push(hasta);
  }
  if (es_anticipo !== undefined) {
    sql += ' AND pt.es_anticipo = ?';
    params.push(es_anticipo);
  }

  sql += ' ORDER BY pt.fecha_pago DESC';

  const [rows] = await db.query(sql, params);
  return rows;
}


};
