const db = require('../database/db');




module.exports = {
  getAll: async (id_trabajador) => {
    const [rows] = await db.query(`
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
  c.nombre AS nombre_cliente
FROM avance_etapas_produccion a
JOIN articulos art ON a.id_articulo = art.id_articulo
JOIN etapas_produccion e ON a.id_etapa_produccion = e.id_etapa
JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
JOIN ordenes_fabricacion ofa ON a.id_orden_fabricacion = ofa.id_orden_fabricacion
JOIN pedidos p ON ofa.id_pedido = p.id_pedido
JOIN clientes c ON p.id_cliente = c.id_cliente
WHERE a.pagado = 0 AND ofa.estado NOT IN ('cancelada')
 ${id_trabajador ? 'AND a.id_trabajador = ?' : ''}
ORDER BY a.fecha_registro DESC;
`,  id_trabajador ? [id_trabajador] : []);

return rows;
  },

   getAllPagados: async (id_trabajador) => {
    const [rows] = await db.query(`
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
  c.nombre AS nombre_cliente
FROM avance_etapas_produccion a
JOIN articulos art ON a.id_articulo = art.id_articulo
JOIN etapas_produccion e ON a.id_etapa_produccion = e.id_etapa
JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
JOIN ordenes_fabricacion ofa ON a.id_orden_fabricacion = ofa.id_orden_fabricacion
JOIN pedidos p ON ofa.id_pedido = p.id_pedido
JOIN clientes c ON p.id_cliente = c.id_cliente
WHERE a.pagado = 1
AND a.id_trabajador = ?
ORDER BY a.fecha_registro DESC;
`, [id_trabajador]  );

return rows;
  },


getById: async (id) => {
    const [rows] = await db.query(
      'SELECT * FROM avance_etapas_produccion WHERE id_avance_etapa = ?',
      [id]
    );
    return rows[0];
  },
  getByOrden: async (id_orden_fabricacion) =>{
    console.log('Buscando avances para orden:', id_orden_fabricacion)
  const [rows] = await db.query(`
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
  `, [id_orden_fabricacion]);
    return rows;
  },
  
  create: async ({ id_orden_fabricacion, id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones = null, costo_fabricacion }) => {
    const [result] = await db.query(
      `INSERT INTO avance_etapas_produccion 
       (id_orden_fabricacion,id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones, costo_fabricacion) 
       VALUES (?, ?, ?, ?, ?, ?,?,?)`,
      [id_orden_fabricacion,id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones, costo_fabricacion]
    );
    return result.insertId;
  },

getEstadoOrden: async (id_orden_fabricacion) => {
    const [rows] = await db.query(
      `SELECT estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );
    return rows[0]?.estado || null;
  },

    actualizarEstadoOrden: async (id_orden_fabricacion, nuevoEstado) => {
    await db.query(
      `UPDATE ordenes_fabricacion SET estado = ? WHERE id_orden_fabricacion = ?`,
      [nuevoEstado, id_orden_fabricacion]
    );
  },

  update: async (id, { id_orden_fabricacion,id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones = null }) => {
    await db.query(
      `UPDATE avance_etapas_produccion 
       SET id_orden_fabricacion = ?, id_articulo=?, id_etapa_produccion = ?, id_trabajador = ?, cantidad = ?, estado = ?, observaciones = ?
       WHERE id_avance_etapa = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_produccion, id_trabajador, cantidad, estado, observaciones, id]
    );
  },

updatePagado: async (id_avance_etapa, pagado = 1 ) => {
  const [result] = await db.query(
    'UPDATE avance_etapas_produccion SET pagado = ? WHERE id_avance_etapa = ?',
    [pagado, id_avance_etapa]
  );
  return result.insertId;
},

  delete: async (id) => {
    await db.query('DELETE FROM avance_etapas_produccion WHERE id_avance_etapa = ?', [id]);
  },


getCantidadTotalArticuloEnOrden: async (idOrden, idArticulo) => {
  const query = `
    SELECT cantidad
    FROM detalle_orden_fabricacion
    WHERE id_orden_fabricacion = ? AND id_articulo = ?
    LIMIT 1
  `;
  const [rows] = await db.query(query, [idOrden, idArticulo]);
  return rows.length > 0 ? rows[0].cantidad : 0;
},

getCantidadRegistradaEnEtapa: async (idOrden, idArticulo, idEtapa) => {
  const query = `
    SELECT SUM(cantidad) AS total
    FROM avance_etapas_produccion
    WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?
  `;
  const [rows] = await db.query(query, [idOrden, idArticulo, idEtapa]);
  return rows[0].total || 0;
},



getEtapasTotalmenteCompletadas: async (idOrdenFabricacion, idArticulo) => {
  const [rows] = await db.query(`
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
  `, [idOrdenFabricacion, idArticulo]);

  return rows.map(row => row.id_etapa_produccion);
},

getCantidadTotalArticulo: async (id_orden_fabricacion, id_articulo) => {
  const [rows] = await db.query(
    `SELECT cantidad 
     FROM detalle_orden_fabricacion 
     WHERE id_orden_fabricacion = ? AND id_articulo = ?`,
    [id_orden_fabricacion, id_articulo]
  );

  if (rows.length === 0) return 0;
  return rows[0].cantidad;
},

getCantidadRegistradaEtapa: async (id_orden_fabricacion, id_articulo, id_etapa_produccion) => {
  const [rows] = await db.query(
    `SELECT SUM(cantidad) AS total 
     FROM avance_etapas_produccion 
     WHERE id_orden_fabricacion = ? 
       AND id_articulo = ? 
       AND id_etapa_produccion = ?`,
    [id_orden_fabricacion, id_articulo, id_etapa_produccion]
  );

  return rows[0].total || 0;
},

puedeRegistrarAvance: async (id_orden_fabricacion, id_articulo, id_etapa, cantidadSolicitada) => {
  // Obtener la etapa anterior (orden menor)
  const [etapaActual] = await db.query(
    `SELECT orden FROM etapas_produccion WHERE id_etapa = ?`,
    [id_etapa]
  );

  if (!etapaActual.length || etapaActual[0].orden === 1) {
    //  verificar contra cantidad total a fabricar
    const [[detalle]] = await db.query(
      `SELECT cantidad FROM detalle_orden_fabricacion
       WHERE id_orden_fabricacion = ? AND id_articulo = ?`,
      [id_orden_fabricacion, id_articulo]
    );

    const [[sumaActual]] = await db.query(
      `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
       WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa]
    );

    const totalDisponible = detalle.cantidad - (sumaActual.total || 0);

    return {
      permitido: cantidadSolicitada <= totalDisponible,
      disponible: totalDisponible
    };
  }

  //  Obtener la etapa anterior
  const [[etapaAnterior]] = await db.query(
    `SELECT id_etapa FROM etapas_produccion WHERE orden = ?`,
    [etapaActual[0].orden - 1]
  );

  const id_etapa_anterior = etapaAnterior.id_etapa;

  //  Obtener cantidad completada en la etapa anterior
  const [[completadas]] = await db.query(
    `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
     WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
    [id_orden_fabricacion, id_articulo, id_etapa_anterior]
  );

  //  Obtener cantidad ya registrada en esta etapa
  const [[usadas]] = await db.query(
    `SELECT SUM(cantidad) as total FROM avance_etapas_produccion
     WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
    [id_orden_fabricacion, id_articulo, id_etapa]
  );

  const disponibles = (completadas.total || 0) - (usadas.total || 0);

  return {
    permitido: cantidadSolicitada <= disponibles,
    disponible: disponibles
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
console.log("Consulta de costo anterior:", rows);
  if (rows.length > 0) {
    return rows[0].costo_fabricacion;
  }
  return null;
  
},

checkearSiOrdenCompleta: async (id_orden_fabricacion) => {

  const [ordenData] = await db.query(
    `SELECT id_pedido, estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
    [id_orden_fabricacion]
  );

  if (!ordenData.length) {
    console.log(`Orden ${id_orden_fabricacion} no encontrada.`);
    return false; 
  }

  const id_pedido = ordenData[0].id_pedido;
  const estadoActualOrden = ordenData[0].estado;

  if (estadoActualOrden === 'completada') {
    console.log(`Orden ${id_orden_fabricacion} ya está completada. No se requiere acción.`);
    return true; 
  }

 
  const [articulosProgreso] = await db.query(`
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
  `, [id_orden_fabricacion]);


  const hayArticulosIncompletos = articulosProgreso.some(
    (articulo) => articulo.cantidad_avanzada_final < articulo.cantidad_total_requerida
  );

  
  if (!hayArticulosIncompletos) {
    console.log(`Orden ${id_orden_fabricacion} ha sido completamente completada. Actualizando estados...`);


    await db.query(
      `UPDATE ordenes_fabricacion SET estado = 'completada' WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );


    if (id_pedido) {
      await db.query(
        `UPDATE pedidos SET estado = 'completado' WHERE id_pedido = ?`,
        [id_pedido]
      );
      console.log(`Pedido ${id_pedido} asociado a la orden ${id_orden_fabricacion} marcado como 'completado'.`);
    } else {
      console.warn(`No se encontró id_pedido para la orden ${id_orden_fabricacion}. No se actualizó el pedido.`);
    }

    return true; 
  }

 
  console.log(`Orden ${id_orden_fabricacion} aún tiene artículos pendientes.`);
  return false;
},


getEtapaFinalCliente: async (id_orden_fabricacion, id_articulo) => {
  const [rows] = await db.query(`
    SELECT id_etapa_final
    FROM detalle_orden_fabricacion
    WHERE id_orden_fabricacion = ? AND id_articulo = ?
    LIMIT 1
  `, [id_orden_fabricacion, id_articulo]);
console.log('🗂 Resultado crudo de consulta:', rows);
  return rows.length > 0 ? rows[0].id_etapa_final : null;
},

actualizarEstadoAvancesEtapa: async (id_orden_fabricacion, id_articulo, id_etapa_produccion) => {
  // Obtener la cantidad total esperada
  const [[{ cantidad_total }]] = await db.query(
    `SELECT cantidad FROM detalle_orden_fabricacion
     WHERE id_orden_fabricacion = ? AND id_articulo = ?`,
    [id_orden_fabricacion, id_articulo]
  );

  // Obtener la cantidad acumulada registrada en esta etapa
  const [[{ total_registrado }]] = await db.query(
    `SELECT SUM(cantidad) AS total_registrado
     FROM avance_etapas_produccion
     WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
    [id_orden_fabricacion, id_articulo, id_etapa_produccion]
  );

  if ((total_registrado || 0) >= (cantidad_total || 0)) {
    // Si ya se alcanzó la cantidad total, actualizar todos a 'completado'
    await db.query(
      `UPDATE avance_etapas_produccion
       SET estado = 'completado'
       WHERE id_orden_fabricacion = ? AND id_articulo = ? AND id_etapa_produccion = ?`,
      [id_orden_fabricacion, id_articulo, id_etapa_produccion]
    );
  }
}

};
