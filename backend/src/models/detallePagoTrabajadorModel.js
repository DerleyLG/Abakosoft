const db = require('../database/db');


module.exports = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM detalle_pago_trabajador');
    return rows;
  },

getById: async (id_pago) => {
  const [rows] = await db.query(`
    SELECT 
      d.id_detalle_pago,
      d.id_pago,
      d.id_avance_etapa,
      d.cantidad,
      d.pago_unitario,
      d.subtotal,
      d.es_descuento,
      -- Mostrar descripción según sea descuento o avance normal
      IF(d.es_descuento = 1, 'Descuento por anticipo', ep.nombre) AS descripcion_detalle,
      -- Agregar estos campos:
      a.id_orden_fabricacion,
      c.nombre AS nombre_cliente,
      ep.nombre AS nombre_etapa
    FROM detalle_pago_trabajador d
    LEFT JOIN avance_etapas_produccion a ON d.id_avance_etapa = a.id_avance_etapa
    LEFT JOIN ordenes_fabricacion ofab ON a.id_orden_fabricacion = ofab.id_orden_fabricacion
    LEFT JOIN pedidos p ON ofab.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente 
    LEFT JOIN etapas_produccion ep ON a.id_etapa_produccion = ep.id_etapa
    WHERE d.id_pago = ?
    ORDER BY d.id_detalle_pago
  `, [id_pago]);

  return rows;
},



create: async ({ id_pago, id_avance_etapa, cantidad, pago_unitario, es_descuento = 0 }) => {
  try {
    const idAvance = id_avance_etapa !== undefined ? id_avance_etapa : null;

    const [result] = await db.query(
      `INSERT INTO detalle_pago_trabajador (id_pago, id_avance_etapa, cantidad, pago_unitario, es_descuento)
       VALUES (?, ?, ?, ?, ?)`,
      [id_pago, idAvance, cantidad, pago_unitario, es_descuento]
    );
    return result.insertId;
  } catch (error) {
    console.error("Error en modelo detallePagoModel.create:", error); 
    throw error; 
  }
},

  exist: async (id_avance_etapa) => {
   const [rows] = await db.query(
    'SELECT id_detalle_pago FROM detalle_pago_trabajador WHERE id_avance_etapa = ?',
    [id_avance_etapa]
  );
  return rows.length > 0;
  },

  update: async (id, { id_pago, id_avance_etapa, cantidad, pago_unitario}) => {
    await db.query(
      `UPDATE detalle_pago_trabajador
       SET id_pago = ?, id_avance_etapa = ?, cantidad = ?, pago_unitario = ?
       WHERE id_detalle_pago = ?`,
      [id_pago, id_avance_etapa, cantidad, pago_unitario, id]
    );
  },
  
  insertMany: async (id_pago, detalles) => {
  for (const d of detalles) {
    const subtotal = d.cantidad * d.pago_unitario;
    await db.query(
      `INSERT INTO detalle_pago_trabajador 
       (id_pago, id_avance_etapa, cantidad, pago_unitario, subtotal, fecha_pago, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id_pago,
        d.id_avance_etapa,
        d.cantidad,
        d.pago_unitario,
        subtotal,
        d.fecha_pago,
        d.observaciones || null
      ]
    );
  }
},

  delete: async (id) => {
    await db.query('DELETE FROM detalle_pago_trabajador WHERE id_detalle_pago = ?', [id]);
  },

  deleteByPagoId: async (id_pago) => {
    await db.query('DELETE FROM detalle_pago_trabajador WHERE id_pago = ?', [id_pago]);
  }
};
