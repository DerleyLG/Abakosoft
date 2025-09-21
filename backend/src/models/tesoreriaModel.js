// models/TesoreriaModel.js

const db = require("../database/db");

const TesoreriaModel = {
  getMetodosPago: async () => {
    const [rows] = await db.query("SELECT * FROM metodos_pago");
    return rows;
  },

  getMovimientosTesoreria: async () => {
    const [rows] = await db.query(
      "SELECT id_movimiento, id_documento, tipo_documento, fecha_movimiento, monto, id_metodo_pago, referencia, observaciones FROM movimientos_tesoreria ORDER BY fecha_movimiento DESC"
    );
    return rows;
  },

  insertarMovimiento: async (movimientoData, connection = db) => {
    const conn = connection || db;
    const {
      id_documento = null,
      tipo_documento,
      monto,
      id_metodo_pago,
      referencia = null,
      observaciones = null,
      fecha_movimiento = null,
    } = movimientoData;
    if (!tipo_documento) {
      throw new Error(
        "El tipo_documento es obligatorio para registrar un movimiento de tesorería."
      );
    }

    const query = `
      INSERT INTO movimientos_tesoreria (
        id_documento,
        tipo_documento,
        fecha_movimiento,
        monto,
        id_metodo_pago,
        referencia,
        observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?) `;

    const fechaFinal = fecha_movimiento || new Date();

    const [result] = await conn.query(query, [
      id_documento,
      tipo_documento,
      fechaFinal,
      monto,
      id_metodo_pago,
      referencia,
      observaciones,
    ]);

    return result.insertId;
  },

  getIngresosSummary: async (connection = db) => {
    const [totalMesResult] = await connection.query(`
      SELECT SUM(monto) AS total FROM movimientos_tesoreria
      WHERE DATE_FORMAT(fecha_movimiento, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      AND tipo_documento = 'orden_venta'
    `);

    
     const [ventasMensualResult] = await connection.query(`
      SELECT COUNT(*) AS total FROM movimientos_tesoreria
      WHERE DATE_FORMAT(fecha_movimiento, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      AND tipo_documento = 'orden_venta'
    `);

    const totalMes = totalMesResult[0].total || 0;
    const ventasMensual = ventasMensualResult[0].total || 0;

    return {
      totalMes: totalMes,
      ventasMensual: ventasMensual,
    };
  },

  getEgresosSummary: async () => {
    try {
      // Usar DATE_FORMAT para filtrar por el mes y año actuales
      const [pagosTrabajadores] = await db.query(`
        SELECT SUM(monto_total) AS totalPagosTrabajadores
        FROM pagos_trabajadores
        WHERE DATE_FORMAT(fecha_pago, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [ordenesCompra] = await db.query(`
        SELECT SUM(doc.cantidad * doc.precio_unitario) AS totalOrdenesCompra
        FROM detalle_orden_compra doc
        JOIN ordenes_compra oc ON doc.id_orden_compra = oc.id_orden_compra
        WHERE DATE_FORMAT(oc.fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [costosIndirectos] = await db.query(`
        SELECT SUM(valor) AS totalCostos
        FROM costos_indirectos
        WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const [comprasMateriaPrima] = await db.query(`
        SELECT SUM(cantidad * precio_unitario) AS totalMateriaPrima
        FROM compras_materia_prima
        WHERE DATE_FORMAT(fecha_compra, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      `);

      const summary = {
        totalPagosTrabajadores: pagosTrabajadores[0].totalPagosTrabajadores || 0,
        totalOrdenesCompra: ordenesCompra[0].totalOrdenesCompra || 0,
        totalCostos: costosIndirectos[0].totalCostos || 0,
        totalMateriaPrima: comprasMateriaPrima[0].totalMateriaPrima || 0,
      };

      summary.totalEgresos = summary.totalPagosTrabajadores + summary.totalOrdenesCompra + summary.totalCostos + summary.totalMateriaPrima;

      return summary;

    } catch (error) {
      console.error('Error fetching egresos summary:', error);
      throw error;
    }
  },

 
  getPagosTrabajadoresCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM pagos_trabajadores
      WHERE DATE_FORMAT(fecha_pago, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getOrdenesCompraCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM ordenes_compra
      WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getCostosIndirectosCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM costos_indirectos
      WHERE DATE_FORMAT(fecha, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },

  getMateriaPrimaCount: async () => {
    const [result] = await db.query(`
      SELECT COUNT(*) as count FROM compras_materia_prima
      WHERE DATE_FORMAT(fecha_compra, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
    `);
    return result[0].count;
  },
};

module.exports = TesoreriaModel;