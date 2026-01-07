const db = require("../database/db");

const TIPOS_MOVIMIENTO = {
  ENTRADA: "entrada",
  SALIDA: "salida",
  AJUSTE: "ajuste",
};

const TIPOS_ORIGEN_MOVIMIENTO = {
  INICIAL: "inicial", // Para el primer ingreso de un artículo al inventario 
  PRODUCCION: "produccion", // Cuando un lote se fabrica y se ingresa al stock disponible
  VENTA: "venta", // Cuando un producto se vende y sale del stock disponible
  COMPRA: "compra", // Cuando se compra stock a un proveedor y entra al stock disponible
  AJUSTE_MANUAL: "ajuste_manual", // Para correcciones manuales de stock (positivas o negativas)
  ANULACION_VENTA: "anulacion_venta", // Reintegro de stock por anulación de orden de venta
  ANULACION_COMPRA: "anulacion_compra", // Reversión de stock por cancelación de orden de compra
  DEVOLUCION_CLIENTE: "devolucion_cliente", // Cuando un cliente devuelve físicamente un producto 
  DEVOLUCION_PROVEEDOR: "devolucion_proveedor", // Cuando se devuelve físicamente stock a un proveedor 
};

module.exports = {
  TIPOS_MOVIMIENTO,
  TIPOS_ORIGEN_MOVIMIENTO,

  obtenerInventarioPorArticulo: async (id_articulo) => {
    const [rows] = await db.query(
      "SELECT * FROM inventario WHERE id_articulo = ?",
      [id_articulo]
    );
    console.log(
      `Resultado de obtenerInventarioPorArticulo para id_articulo ${id_articulo}:`,
      rows[0]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  obtenerTodo: async () => {
    const sql = `
            SELECT
                i.id_inventario,
                i.id_articulo,
                a.descripcion,
                a.id_categoria,
                c.nombre AS nombre_categoria,
                i.stock AS stock_disponible,
                i.stock_fabricado,
                i.stock_minimo,
                i.ultima_actualizacion,
                -- Cálculo del stock_en_proceso:
                -- Suma la cantidad total requerida de este artículo en órdenes 'pendiente' o 'en proceso'
                COALESCE(
                    (SELECT SUM(dof.cantidad)
                     FROM detalle_orden_fabricacion dof
                     JOIN ordenes_fabricacion ofa ON dof.id_orden_fabricacion = ofa.id_orden_fabricacion
                     WHERE dof.id_articulo = i.id_articulo
                       AND ofa.estado IN ('pendiente', 'en proceso')),
                    0
                ) -
                -- Resta la cantidad de este artículo ya producida (lotes) para esas mismas órdenes
                COALESCE(
                    (SELECT SUM(lf.cantidad)
                     FROM lotes_fabricados lf
                     JOIN ordenes_fabricacion ofa ON lf.id_orden_fabricacion = ofa.id_orden_fabricacion
                     WHERE lf.id_articulo = i.id_articulo
                       AND ofa.estado IN ('pendiente', 'en proceso')),
                    0
                ) AS stock_en_proceso
            FROM
                inventario i
            JOIN
                articulos a ON i.id_articulo = a.id_articulo
            LEFT JOIN
                categorias c ON a.id_categoria = c.id_categoria
            ORDER BY
                a.descripcion ASC;
        `;
    const [rows] = await db.query(sql);
    console.log(
      "Datos obtenidos de la DB en InventarioModel.obtenerTodo:",
      rows
    );
    return rows;
  },

  obtenerPaginado: async ({
    buscar = "",
    id_categoria = null,
    tipo_categoria = null,
    page = 1,
    pageSize = 25,
    sortBy = "descripcion",
    sortDir = "asc",
    stock_fabricado = "",
    stock_en_proceso = "",
    stock_disponible = "",
  }) => {
    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(1000, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const SORT_MAP = {
      descripcion: "a.descripcion",
      stock_disponible: "i.stock",
      stock_fabricado: "i.stock_fabricado",
      stock_minimo: "i.stock_minimo",
      categoria: "c.nombre",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.descripcion;
    const dir = String(sortDir).toLowerCase() === "desc" ? "DESC" : "ASC";

    const filters = [];
    const params = [];
    if (buscar && String(buscar).trim() !== "") {
      filters.push("(a.descripcion LIKE ? OR a.referencia LIKE ?)");
      const like = `%${buscar}%`;
      params.push(like, like);
    }
    if (id_categoria) {
      filters.push("a.id_categoria = ?");
      params.push(Number(id_categoria));
    }
    if (tipo_categoria) {
      filters.push("c.tipo = ?");
      params.push(tipo_categoria);
    }
    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const baseSelect = `
            SELECT
                i.id_inventario,
                i.id_articulo,
                a.descripcion,
                a.referencia,
                a.id_categoria,
                c.nombre AS nombre_categoria,
                i.stock AS stock_disponible,
                i.stock_fabricado,
                i.stock_minimo,
                i.ultima_actualizacion,
                COALESCE(
                    (SELECT SUM(dof.cantidad)
                     FROM detalle_orden_fabricacion dof
                     JOIN ordenes_fabricacion ofa ON dof.id_orden_fabricacion = ofa.id_orden_fabricacion
                     WHERE dof.id_articulo = i.id_articulo
                       AND ofa.estado IN ('pendiente', 'en proceso')),
                    0
                ) - COALESCE(
                    (SELECT SUM(lf.cantidad)
                     FROM lotes_fabricados lf
                     JOIN ordenes_fabricacion ofa ON lf.id_orden_fabricacion = ofa.id_orden_fabricacion
                     WHERE lf.id_articulo = i.id_articulo
                       AND ofa.estado IN ('pendiente', 'en proceso')),
                    0
                ) AS stock_en_proceso
            FROM inventario i
            JOIN articulos a ON i.id_articulo = a.id_articulo
            LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
            ${whereClause}
        `;

    const havingConds = [];
    const ruleCond = (alias, rule) => {
      if (!rule) return null;
      if (rule === "gt0") return `${alias} > 0`;
      if (rule === "eq0") return `${alias} = 0`;
      return null;
    };
    const c1 = ruleCond("stock_fabricado", stock_fabricado);
    if (c1) havingConds.push(c1);
    const c2 = ruleCond("stock_en_proceso", stock_en_proceso);
    if (c2) havingConds.push(c2);
    const c3 = ruleCond("stock_disponible", stock_disponible);
    if (c3) havingConds.push(c3);
    const havingClause = havingConds.length
      ? ` HAVING ${havingConds.join(" AND ")} `
      : "";

    const dataSql = `${baseSelect} ${havingClause} ORDER BY ${sortCol} ${dir} LIMIT ? OFFSET ?`;
    const dataParams = [...params, ps, offset];
    const [rows] = await db.query(dataSql, dataParams);

    // Conteo total aplicando mismas condiciones (envolver en subconsulta)
    const countSql = `SELECT COUNT(*) AS total FROM ( ${baseSelect} ${havingClause} ) AS t`;
    const [countRows] = await db.query(countSql, params);
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  getArticulosBajoStock: async () => {
    const [rows] = await db.query(`
            SELECT
                a.descripcion,
                i.stock,
                i.stock_minimo
            FROM
                inventario i
            JOIN
                articulos a ON i.id_articulo = a.id_articulo
            WHERE
                i.stock <= i.stock_minimo
            ORDER BY a.descripcion ASC
        `);
    return rows;
  },

  eliminarDelInventario: async (id_articulo) => {
    const [result] = await db.query(
      "DELETE FROM inventario WHERE id_articulo = ?",
      [id_articulo]
    );
    return result.affectedRows > 0;
  },

  processInventoryMovement: async (data) => {
    const id_articulo = data.id_articulo || data.id;

    const {
      cantidad_movida,
      tipo_movimiento,
      tipo_origen_movimiento,
      observaciones = null,
      referencia_documento_id = null,
      referencia_documento_tipo = null,
      stock_minimo_inicial = null,
    } = data;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      console.log(`[processInventoryMovement] Objeto 'data' recibido:`, data);
      console.log(
        `[processInventoryMovement] id_articulo (extraído): ${id_articulo}`
      );

      if (typeof id_articulo === "undefined" || id_articulo === null) {
        throw new Error(
          "ID de artículo no proporcionado o inválido en processInventoryMovement."
        );
      }

      let inventarioExistente = await connection.query(
        "SELECT * FROM inventario WHERE id_articulo = ? FOR UPDATE",
        [id_articulo]
      );
      inventarioExistente = inventarioExistente[0][0];

      let nuevoStockDisponible = inventarioExistente
        ? inventarioExistente.stock
        : 0;
      let nuevoStockFabricado = inventarioExistente
        ? inventarioExistente.stock_fabricado
        : 0; // Se inicializa con el valor existente
      let currentStockMinimo = inventarioExistente
        ? inventarioExistente.stock_minimo
        : 0;

      const now = new Date();

      if (!Object.values(TIPOS_MOVIMIENTO).includes(tipo_movimiento)) {
        throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}`);
      }
      if (
        !Object.values(TIPOS_ORIGEN_MOVIMIENTO).includes(tipo_origen_movimiento)
      ) {
        throw new Error(
          `Tipo de origen de movimiento inválido: ${tipo_origen_movimiento}`
        );
      }

      if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
        nuevoStockDisponible += cantidad_movida;
        // CAMBIO CLAVE AQUÍ: stock_fabricado solo se incrementa si el origen es 'produccion'
        if (tipo_origen_movimiento === TIPOS_ORIGEN_MOVIMIENTO.PRODUCCION) {
          nuevoStockFabricado += cantidad_movida;
        }
      } else if (tipo_movimiento === TIPOS_MOVIMIENTO.SALIDA) {
        // Permitir stock negativo (no validar stock insuficiente)
        nuevoStockDisponible -= cantidad_movida;
      } else if (tipo_movimiento === TIPOS_MOVIMIENTO.AJUSTE) {
        if (
          cantidad_movida < 0 &&
          nuevoStockDisponible < Math.abs(cantidad_movida)
        ) {
          throw new Error(
            `Stock insuficiente para ajuste negativo en artículo ${id_articulo}. Disponible: ${nuevoStockDisponible}, Ajuste: ${cantidad_movida}`
          );
        }
        nuevoStockDisponible += cantidad_movida;
        // stock_fabricado NO se modifica en un ajuste de stock disponible
      }

      if (inventarioExistente) {
        const finalStockMinimo =
          stock_minimo_inicial !== null
            ? stock_minimo_inicial
            : currentStockMinimo;

        await connection.query(
          `UPDATE inventario SET stock = ?, stock_fabricado = ?, stock_minimo = ?, ultima_actualizacion = ? WHERE id_articulo = ?`,
          [
            nuevoStockDisponible,
            nuevoStockFabricado,
            finalStockMinimo,
            now,
            id_articulo,
          ]
        );
      } else {
        console.log(
          `[processInventoryMovement] Artículo ${id_articulo} NO encontrado en inventario. Origen: ${tipo_origen_movimiento}`
        );
        if (tipo_origen_movimiento !== TIPOS_ORIGEN_MOVIMIENTO.INICIAL) {
          throw new Error(
            `Artículo ${id_articulo} no encontrado en inventario. Debe ser ingresado inicialmente con tipo_origen_movimiento 'inicial'.`
          );
        }
        if (stock_minimo_inicial === null) {
          throw new Error(
            `Se requiere stock_minimo_inicial para el ingreso inicial del artículo ${id_articulo}.`
          );
        }
        // Al crear un nuevo registro de inventario, stock_fabricado se inicializa con 0
        // y solo se incrementará con movimientos de tipo 'produccion'.
        // El 'stock' inicial (stock_disponible) será la cantidad_movida.
        await connection.query(
          `INSERT INTO inventario (id_articulo, stock, stock_fabricado, stock_minimo, ultima_actualizacion) VALUES (?, ?, ?, ?, ?)`,
          [id_articulo, cantidad_movida, 0, stock_minimo_inicial, now] // stock_fabricado se inicializa en 0 aquí
        );
        console.log(`Artículo ${id_articulo} insertado en inventario.`);
      }

      const [movimientoResult] = await connection.query(
        `INSERT INTO movimientos_inventario (id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo, fecha_movimiento)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_articulo,
          cantidad_movida,
          tipo_movimiento,
          tipo_origen_movimiento,
          observaciones,
          referencia_documento_id,
          referencia_documento_tipo,
          now,
        ]
      );
      console.log(
        `Movimiento ${movimientoResult.insertId} registrado para artículo ${id_articulo}.`
      );

      await connection.commit();
      connection.release();

      return {
        newStockDisponible: nuevoStockDisponible,
        newStockFabricado: nuevoStockFabricado,
        movimientoId: movimientoResult.insertId,
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      console.error("Error en transacción de inventario:", error);
      throw error;
    }
  },
};
