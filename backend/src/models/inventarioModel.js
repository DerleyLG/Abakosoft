const db = require('../database/db'); 

const TIPOS_MOVIMIENTO = {
    ENTRADA: 'entrada',
    SALIDA: 'salida',
    AJUSTE: 'ajuste'
};

const TIPOS_ORIGEN_MOVIMIENTO = {
    INICIAL: 'inicial',             // Para el primer ingreso de un artículo al inventario (desde NuevoInventario.jsx)
    PRODUCCION: 'produccion',       // Cuando un lote se fabrica y se ingresa al stock disponible
    VENTA: 'venta',                 // Cuando un producto se vende y sale del stock disponible
    COMPRA: 'compra',               // Cuando se compra stock a un proveedor y entra al stock disponible
    AJUSTE_MANUAL: 'ajuste_manual', // Para correcciones manuales de stock (positivas o negativas)
    DEVOLUCION_CLIENTE: 'devolucion_cliente', // Cuando un cliente devuelve un producto y vuelve al stock
    DEVOLUCION_PROVEEDOR: 'devolucion_proveedor' // Cuando se devuelve stock a un proveedor
};

module.exports = {
    TIPOS_MOVIMIENTO,
    TIPOS_ORIGEN_MOVIMIENTO,

    obtenerInventarioPorArticulo: async (id_articulo) => {
        const [rows] = await db.query('SELECT * FROM inventario WHERE id_articulo = ?', [id_articulo]);
        console.log(`Resultado de obtenerInventarioPorArticulo para id_articulo ${id_articulo}:`, rows[0]);
        return rows.length > 0 ? rows[0] : null;
    },

    obtenerTodo: async () => {
        const sql = `
            SELECT
                i.id_inventario,
                i.id_articulo,
                a.descripcion, 
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
            ORDER BY
                a.descripcion ASC;
        `;
        const [rows] = await db.query(sql);
        console.log('Datos obtenidos de la DB en InventarioModel.obtenerTodo:', rows);
        return rows;
    },

    eliminarDelInventario: async (id_articulo) => {
        const [result] = await db.query('DELETE FROM inventario WHERE id_articulo = ?', [id_articulo]);
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
            stock_minimo_inicial = null
        } = data;

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            console.log(`[processInventoryMovement] Objeto 'data' recibido:`, data);
            console.log(`[processInventoryMovement] id_articulo (extraído): ${id_articulo}`);

            if (typeof id_articulo === 'undefined' || id_articulo === null) {
                throw new Error("ID de artículo no proporcionado o inválido en processInventoryMovement.");
            }

            let inventarioExistente = await connection.query('SELECT * FROM inventario WHERE id_articulo = ? FOR UPDATE', [id_articulo]);
            inventarioExistente = inventarioExistente[0][0];

            let nuevoStockDisponible = inventarioExistente ? inventarioExistente.stock : 0;
            let nuevoStockFabricado = inventarioExistente ? inventarioExistente.stock_fabricado : 0; // Se inicializa con el valor existente
            let currentStockMinimo = inventarioExistente ? inventarioExistente.stock_minimo : 0;

            const now = new Date();

            if (!Object.values(TIPOS_MOVIMIENTO).includes(tipo_movimiento)) {
                throw new Error(`Tipo de movimiento inválido: ${tipo_movimiento}`);
            }
            if (!Object.values(TIPOS_ORIGEN_MOVIMIENTO).includes(tipo_origen_movimiento)) {
                throw new Error(`Tipo de origen de movimiento inválido: ${tipo_origen_movimiento}`);
            }

            if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
                nuevoStockDisponible += cantidad_movida;
                // CAMBIO CLAVE AQUÍ: stock_fabricado solo se incrementa si el origen es 'produccion'
                if (tipo_origen_movimiento === TIPOS_ORIGEN_MOVIMIENTO.PRODUCCION) {
                    nuevoStockFabricado += cantidad_movida;
                }
            } else if (tipo_movimiento === TIPOS_MOVIMIENTO.SALIDA) {
                if (!inventarioExistente || nuevoStockDisponible < cantidad_movida) {
                    throw new Error(`Stock insuficiente para el artículo ${id_articulo}. Disponible: ${nuevoStockDisponible}, Solicitado: ${cantidad_movida}`);
                }
                nuevoStockDisponible -= cantidad_movida;
            } else if (tipo_movimiento === TIPOS_MOVIMIENTO.AJUSTE) {
                if (cantidad_movida < 0 && nuevoStockDisponible < Math.abs(cantidad_movida)) {
                     throw new Error(`Stock insuficiente para ajuste negativo en artículo ${id_articulo}. Disponible: ${nuevoStockDisponible}, Ajuste: ${cantidad_movida}`);
                }
                nuevoStockDisponible += cantidad_movida;
                // stock_fabricado NO se modifica en un ajuste de stock disponible
            }

            if (inventarioExistente) {
                const finalStockMinimo = stock_minimo_inicial !== null ? stock_minimo_inicial : currentStockMinimo;

                await connection.query(
                    `UPDATE inventario SET stock = ?, stock_fabricado = ?, stock_minimo = ?, ultima_actualizacion = ? WHERE id_articulo = ?`,
                    [nuevoStockDisponible, nuevoStockFabricado, finalStockMinimo, now, id_articulo]
                );
            } else {
                console.log(`[processInventoryMovement] Artículo ${id_articulo} NO encontrado en inventario. Origen: ${tipo_origen_movimiento}`);
                if (tipo_origen_movimiento !== TIPOS_ORIGEN_MOVIMIENTO.INICIAL) {
                    throw new Error(`Artículo ${id_articulo} no encontrado en inventario. Debe ser ingresado inicialmente con tipo_origen_movimiento 'inicial'.`);
                }
                if (stock_minimo_inicial === null) {
                    throw new Error(`Se requiere stock_minimo_inicial para el ingreso inicial del artículo ${id_articulo}.`);
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
                [id_articulo, cantidad_movida, tipo_movimiento, tipo_origen_movimiento, observaciones, referencia_documento_id, referencia_documento_tipo, now]
            );
            console.log(`Movimiento ${movimientoResult.insertId} registrado para artículo ${id_articulo}.`);

            await connection.commit();
            connection.release();

            return {
                newStockDisponible: nuevoStockDisponible,
                newStockFabricado: nuevoStockFabricado,
                movimientoId: movimientoResult.insertId
            };

        } catch (error) {
            await connection.rollback();
            connection.release();
            console.error("Error en transacción de inventario:", error);
            throw error;
        }
    }
};
