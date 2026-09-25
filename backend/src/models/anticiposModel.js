const db = require("../database/db");

module.exports = {
  getAll: async () => {
    const [rows] = await db.query(`
    SELECT 
      a.id_anticipo,
      a.id_trabajador,
      t.nombre AS trabajador,
      a.id_orden_fabricacion,
      c.nombre AS cliente,
      a.fecha,
      a.monto,
      a.monto_usado,
      a.estado,
      a.observaciones
    FROM anticipos_trabajadores a
    JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
    LEFT JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion

    LEFT JOIN pedidos p ON o.id_pedido = p.id_pedido
    LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY a.fecha DESC
  `);

    return rows;
  },

  getAllPaginated: async ({
    page = 1,
    pageSize = 20,
    sortBy = "fecha",
    sortDir = "desc",
    buscar = "",
    estado = "",
    trabajadorId = null,
  } = {}) => {
    const SORT_MAP = {
      fecha: "a.fecha",
      monto: "a.monto",
      trabajador: "t.nombre",
      estado: "a.estado",
    };
    const col = SORT_MAP[sortBy] || "a.fecha";
    const dir = String(sortDir).toLowerCase() === "asc" ? "ASC" : "DESC";
    const pg = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const offset = (pg - 1) * ps;

    const filtros = [];
    const params = [];

    if (buscar && String(buscar).trim()) {
      const like = `%${String(buscar).trim()}%`;
      filtros.push(
        "(t.nombre LIKE ? OR a.observaciones LIKE ? OR c.nombre LIKE ?)",
      );
      params.push(like, like, like);
    }
    if (estado && ["pendiente", "parcial", "saldado"].includes(estado)) {
      filtros.push("a.estado = ?");
      params.push(estado);
    }
    if (trabajadorId) {
      filtros.push("a.id_trabajador = ?");
      params.push(Number(trabajadorId));
    }

    const whereSQL = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

    const fromSQL = `
      FROM anticipos_trabajadores a
      JOIN trabajadores t ON a.id_trabajador = t.id_trabajador
      LEFT JOIN ordenes_fabricacion o ON a.id_orden_fabricacion = o.id_orden_fabricacion
      LEFT JOIN pedidos p ON o.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      ${whereSQL}
    `;

    const [rows] = await db.query(
      `SELECT
        a.id_anticipo,
        a.id_trabajador,
        t.nombre AS trabajador,
        a.id_orden_fabricacion,
        c.nombre AS cliente,
        a.fecha,
        a.monto,
        a.monto_usado,
        a.estado,
        a.observaciones
      ${fromSQL}
      ORDER BY ${col} ${dir}
      LIMIT ? OFFSET ?`,
      [...params, ps, offset],
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total ${fromSQL}`,
      params,
    );

    // Totales del conjunto filtrado completo (no solo de la página actual)
    const [[resumen]] = await db.query(
      `SELECT
         COALESCE(SUM(a.monto), 0) AS total_anticipado,
         COALESCE(SUM(a.monto - COALESCE(a.monto_usado, 0)), 0) AS saldo_pendiente
       ${fromSQL}`,
      params,
    );

    return { data: rows, total, resumen };
  },

    create: async ({
    id_trabajador,
    fecha,
    id_orden_fabricacion,
    monto,
    observaciones,
  }) => {
    const [result] = await db.query(
      `INSERT INTO anticipos_trabajadores
      (id_trabajador,  id_orden_fabricacion,fecha, monto,  observaciones)
      VALUES (?, ?, ?, ?, ?)`,
      [id_trabajador, id_orden_fabricacion, fecha, monto, observaciones],
    );
    return result.insertId;
  },

  getById: async (id_anticipo) => {
    const [rows] = await db.query(
      `SELECT * FROM anticipos_trabajadores WHERE id_anticipo = ?`,
      [id_anticipo],
    );
    return rows[0] || null;
  },

  // Actualiza los campos editables de un anticipo (monto, observaciones, fecha, OF)
  update: async (
    id_anticipo,
    { id_orden_fabricacion, monto, observaciones, fecha },
    connection = null,
  ) => {
    const conn = connection || db;
    const [result] = await conn.query(
      `UPDATE anticipos_trabajadores
       SET id_orden_fabricacion = COALESCE(?, id_orden_fabricacion),
           monto = COALESCE(?, monto),
           observaciones = COALESCE(?, observaciones),
           fecha = COALESCE(?, fecha)
       WHERE id_anticipo = ?`,
      [
        id_orden_fabricacion ?? null,
        monto ?? null,
        observaciones ?? null,
        fecha ?? null,
        id_anticipo,
      ],
    );
    return result.affectedRows;
  },

  // Elimina un anticipo y revierte sus aplicaciones (restaura monto_usado/estado
  // de los anticipos afectados). Debe llamarse dentro de una transacción.
  delete: async (id_anticipo, connection = null) => {
    const conn = connection || db;

    // 1. Revertir aplicaciones: restaurar monto_usado de los anticipos afectados
    const [aplicaciones] = await conn.query(
      `SELECT id_anticipo, SUM(monto_aplicado) AS total_revertir
       FROM anticipo_aplicaciones
       WHERE id_anticipo = ?
       GROUP BY id_anticipo`,
      [id_anticipo],
    );

    for (const row of aplicaciones) {
      const [anticipoRows] = await conn.query(
        `SELECT monto, monto_usado FROM anticipos_trabajadores WHERE id_anticipo = ? FOR UPDATE`,
        [row.id_anticipo],
      );
      const anticipo = anticipoRows[0];
      if (!anticipo) continue;

      const nuevoMontoUsado = Math.max(
        0,
        Number(anticipo.monto_usado || 0) - Number(row.total_revertir),
      );
      let nuevoEstado = "pendiente";
      if (nuevoMontoUsado >= Number(anticipo.monto)) {
        nuevoEstado = "saldado";
      } else if (nuevoMontoUsado > 0) {
        nuevoEstado = "parcial";
      }

      await conn.query(
        `UPDATE anticipos_trabajadores SET monto_usado = ?, estado = ? WHERE id_anticipo = ?`,
        [nuevoMontoUsado, nuevoEstado, row.id_anticipo],
      );
    }

    // 2. Eliminar aplicaciones del anticipo
    await conn.query(
      `DELETE FROM anticipo_aplicaciones WHERE id_anticipo = ?`,
      [id_anticipo],
    );

    // 3. Eliminar el anticipo
    const [result] = await conn.query(
      `DELETE FROM anticipos_trabajadores WHERE id_anticipo = ?`,
      [id_anticipo],
    );
    return result.affectedRows;
  },

  getActivo: async (id_trabajador, id_orden_fabricacion) => {
    if (id_orden_fabricacion) {
      const [rows] = await db.query(
        `SELECT * FROM anticipos_trabajadores
         WHERE id_trabajador = ? AND id_orden_fabricacion = ? AND estado != 'saldado'
         ORDER BY fecha ASC
         LIMIT 1`,
        [id_trabajador, id_orden_fabricacion],
      );
      return rows[0];
    }
    const [rows] = await db.query(
      `SELECT * FROM anticipos_trabajadores
       WHERE id_trabajador = ? AND estado != 'saldado'
       ORDER BY fecha ASC
       LIMIT 1`,
      [id_trabajador],
    );
    return rows[0];
  },

  getDisponiblesByTrabajador: async (
    id_trabajador,
    preferOrderId = null,
    connection = null,
  ) => {
    const conn = connection || db;
    const sql = `SELECT * FROM anticipos_trabajadores
                 WHERE id_trabajador = ? AND estado != 'saldado'
                 ORDER BY (id_orden_fabricacion = ?) DESC, fecha ASC`;
    const params = [id_trabajador, preferOrderId];
    const [rows] = await conn.query(sql, params);
    return rows;
  },

  // Aplicaciones de un anticipo: qué pagos lo descontaron y cuánto
  getAplicaciones: async (id_anticipo) => {
    const [rows] = await db.query(
      `SELECT
         aa.id_aplicacion,
         aa.id_detalle_pago,
         aa.monto_aplicado,
         p.id_pago,
         p.fecha_pago,
         t.nombre AS trabajador
       FROM anticipo_aplicaciones aa
       JOIN detalle_pago_trabajador d ON d.id_detalle_pago = aa.id_detalle_pago
       JOIN pagos_trabajadores p ON p.id_pago = d.id_pago
       JOIN trabajadores t ON t.id_trabajador = p.id_trabajador
       WHERE aa.id_anticipo = ?
       ORDER BY p.fecha_pago DESC`,
      [id_anticipo],
    );
    return rows;
  },

  descontar: async (id_anticipo, montoAplicado, connection = null) => {
    const conn = connection || db;
    // Obtener anticipo actual con lock de fila para evitar condiciones de
    // carrera entre descuentos concurrentes (dos pagos simultáneos sobre el
    // mismo anticipo podían leer el mismo monto_usado y sobre-descontar).
    const [rows] = await conn.query(
      `SELECT monto, monto_usado FROM anticipos_trabajadores WHERE id_anticipo = ? FOR UPDATE`,
      [id_anticipo],
    );
    const anticipo = rows[0];
    if (!anticipo) {
      throw new Error(`El anticipo ${id_anticipo} no existe.`);
    }

    const disponible =
      Number(anticipo.monto || 0) - Number(anticipo.monto_usado || 0);
    if (Number(montoAplicado) > disponible) {
      throw new Error(
        `El anticipo ${id_anticipo} no tiene saldo suficiente. Disponible: ${disponible}`,
      );
    }

    const nuevoMontoUsado =
      Number(anticipo.monto_usado || 0) + Number(montoAplicado);

    let nuevoEstado = "parcial";
    if (nuevoMontoUsado >= Number(anticipo.monto)) {
      nuevoEstado = "saldado";
    }

    await conn.query(
      `UPDATE anticipos_trabajadores
       SET monto_usado = ?, estado = ?
       WHERE id_anticipo = ?`,
      [nuevoMontoUsado, nuevoEstado, id_anticipo],
    );
  },

  // Registra a qué anticipo se aplicó una porción de una línea de descuento,
  // para poder revertirla con precisión si el pago se edita o elimina.
  registrarAplicacion: async (
    { id_detalle_pago, id_anticipo, monto_aplicado },
    connection = null,
  ) => {
    const conn = connection || db;
    await conn.query(
      `INSERT INTO anticipo_aplicaciones (id_detalle_pago, id_anticipo, monto_aplicado)
       VALUES (?, ?, ?)`,
      [id_detalle_pago, id_anticipo, monto_aplicado],
    );
  },

  // Aplica un descuento por anticipo (posiblemente repartido entre varios anticipos
  // del trabajador) y deja registro de cada porción aplicada vía registrarAplicacion.
  // Lanza un error si el saldo disponible no alcanza para cubrir el monto solicitado.
  aplicarDescuento: async (
    { id_trabajador, id_detalle_pago, montoAAplicar, preferOrder = null },
    connection = null,
  ) => {
    const conn = connection || db;
    const anticiposDisponibles =
      await module.exports.getDisponiblesByTrabajador(
        id_trabajador,
        preferOrder,
        conn,
      );

    const totalDisponible = anticiposDisponibles.reduce(
      (s, a) => s + (Number(a.monto) - Number(a.monto_usado || 0)),
      0,
    );

    if (totalDisponible < montoAAplicar) {
      throw new Error(
        `El trabajador no tiene suficiente saldo en anticipos para cubrir el descuento solicitado. Disponible: ${totalDisponible}`,
      );
    }

    let restante = montoAAplicar;
    for (const anticipo of anticiposDisponibles) {
      const disponible =
        Number(anticipo.monto) - Number(anticipo.monto_usado || 0);
      if (disponible <= 0) continue;
      const aplicar = Math.min(disponible, restante);
      await module.exports.descontar(anticipo.id_anticipo, aplicar, conn);
      await module.exports.registrarAplicacion(
        {
          id_detalle_pago,
          id_anticipo: anticipo.id_anticipo,
          monto_aplicado: aplicar,
        },
        conn,
      );
      restante -= aplicar;
      if (restante <= 0) break;
    }
  },

  // Revierte todas las aplicaciones de anticipo asociadas a un pago (todas sus líneas
  // de descuento), restaurando monto_usado/estado de cada anticipo afectado.
  // Debe llamarse ANTES de borrar los detalles del pago (de donde se leen las aplicaciones).
  revertirAplicacionesPorPago: async (id_pago, connection = null) => {
    const conn = connection || db;
    const [rows] = await conn.query(
      `SELECT aa.id_anticipo, SUM(aa.monto_aplicado) AS total_revertir
       FROM anticipo_aplicaciones aa
       JOIN detalle_pago_trabajador d ON d.id_detalle_pago = aa.id_detalle_pago
       WHERE d.id_pago = ?
       GROUP BY aa.id_anticipo`,
      [id_pago],
    );

    for (const row of rows) {
      const [anticipoRows] = await conn.query(
        `SELECT monto, monto_usado FROM anticipos_trabajadores WHERE id_anticipo = ? FOR UPDATE`,
        [row.id_anticipo],
      );
      const anticipo = anticipoRows[0];
      if (!anticipo) continue;

      const nuevoMontoUsado = Math.max(
        0,
        Number(anticipo.monto_usado || 0) - Number(row.total_revertir),
      );
      let nuevoEstado = "pendiente";
      if (nuevoMontoUsado >= Number(anticipo.monto)) {
        nuevoEstado = "saldado";
      } else if (nuevoMontoUsado > 0) {
        nuevoEstado = "parcial";
      }

      await conn.query(
        `UPDATE anticipos_trabajadores SET monto_usado = ?, estado = ? WHERE id_anticipo = ?`,
        [nuevoMontoUsado, nuevoEstado, row.id_anticipo],
      );
    }
  },
};
