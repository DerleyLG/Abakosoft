const db = require('../database/db');
const ordenCompras = require('../models/ordenesCompraModel');
const detalleOrdenCompra = require('../models/detalleOrdenCompraModel');
const proveedorModel = require('../models/proveedoresModel');
const articuloModel = require('../models/articulosModel');
const inventarioModel = require('../models/inventarioModel');

// Función auxiliar para verificar si un proveedor existe
const proveedorExiste = async (id_proveedor, connection = db) => {
    const proveedor = await proveedorModel.getById(id_proveedor, connection);
    return !!proveedor;
};

// Función auxiliar para verificar si un artículo existe
const articuloExiste = async (id_articulo, connection = db) => {
    const articulo = await articuloModel.getById(id_articulo, connection);
    return !!articulo;
};

// Función auxiliar para verificar si una orden de fabricación existe (si es relevante)
const ordenFabricacionExiste = async (id_orden_fabricacion, connection = db) => {
    if (!id_orden_fabricacion) return true;
    const [rows] = await (connection || db).query('SELECT 1 FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?', [id_orden_fabricacion]);
    return rows.length > 0;
};

// Obtener todas las órdenes de compra (ahora con filtro por estado)
const getOrdenesCompra = async (req, res) => {
    try {
        const { estado } = req.query;

        let estadosToFilter = ['pendiente', 'completada'];
        if (estado === 'cancelada') {
            estadosToFilter = ['cancelada'];
        }

        const ordenes = await ordenCompras.getAll(estadosToFilter);
        res.json(ordenes);
    } catch (error) {
        console.error('Error al obtener las órdenes de compra:', error);
        res.status(500).json({ error: 'Error al obtener las órdenes de compra' });
    }
};

// Obtener una orden de compra por ID
const getOrdenCompraById = async (req, res) => {
    const { id } = req.params;
    try {
        const orden = await ordenCompras.getById(id);
        if (!orden) {
            return res.status(404).json({ error: 'Orden de compra no encontrada' });
        }
        const detalles = await detalleOrdenCompra.getByOrdenCompra(id);
        res.json({ ...orden, detalles });
    } catch (error) {
        console.error('Error al obtener la orden de compra:', error);
        res.status(500).json({ error: 'Error al obtener la orden de compra' });
    }
};

// Crear una nueva orden de compra
async function createOrdenCompra(req, res) {
    let connection;
    try {
        const { id_proveedor, categoria_costo, id_orden_fabricacion, items } = req.body;

        console.log("[OrdenCompraController] Inicio de la creación de la orden de compra.");
        console.log("[OrdenCompraController] Datos recibidos en el body:", req.body);

        connection = await db.getConnection();
        await connection.beginTransaction();
        console.log("[OrdenCompraController] Transacción iniciada.");

        if (!id_proveedor || !Array.isArray(items) || items.length === 0) {
            throw new Error('Faltan datos obligatorios: id_proveedor o items.');
        }

        if (!(await proveedorExiste(id_proveedor, connection))) {
            throw new Error('El proveedor especificado no existe.');
        }

        if (id_orden_fabricacion && !(await ordenFabricacionExiste(id_orden_fabricacion, connection))) {
            throw new Error('La orden de fabricación especificada no existe.');
        }

        const estadoFinal = 'pendiente';
        console.log(`[OrdenCompraController] Estado final de la orden: ${estadoFinal}`);

        const itemsMap = new Map();
        for (const item of items) {
            const { id_articulo, cantidad, precio_unitario } = item;

            if (!id_articulo || isNaN(cantidad) || cantidad <= 0 || isNaN(precio_unitario) || precio_unitario < 0) {
                throw new Error('Cada item requiere un id_articulo, cantidad positiva y precio_unitario válido.');
            }

            const articuloInfo = await articuloModel.getById(id_articulo, connection);
            if (!articuloInfo) {
                throw new Error(`El artículo con ID ${id_articulo} no existe en la base de datos de artículos.`);
            }

            // --- CAMBIO CLAVE: Verificar si el artículo existe en la tabla 'inventario' ---
            const inventarioArticulo = await inventarioModel.obtenerInventarioPorArticulo(id_articulo, connection);
            if (!inventarioArticulo) {
                // Si el artículo no está en inventario, enviamos una respuesta específica
                await connection.rollback(); // Hacemos rollback antes de responder
                connection.release();
                console.log(`[OrdenCompraController] Artículo ${id_articulo} no inicializado en inventario. Enviando 409.`);
                return res.status(409).json({
                    message: `El artículo "${articuloInfo.descripcion}" (ID: ${id_articulo}) no está inicializado en el inventario.`,
                    needsInitialization: true,
                    articulo: {
                        id: id_articulo,
                        descripcion: articuloInfo.descripcion // Puedes añadir más campos si los necesitas en el frontend
                    }
                });
            }
            // --- FIN CAMBIO CLAVE ---

            if (itemsMap.has(id_articulo)) {
                const existente = itemsMap.get(id_articulo);
                existente.cantidad += cantidad;
                existente.precio_unitario = precio_unitario;
                itemsMap.set(id_articulo, existente);
            } else {
                itemsMap.set(id_articulo, { id_articulo, cantidad, precio_unitario });
            }
        }
        console.log('[OrdenCompraController] Items validados y agrupados:', Array.from(itemsMap.values()));

        console.log('[OrdenCompraController] Intentando crear la orden de compra en el modelo...');
        const ordenId = await ordenCompras.create(id_proveedor, categoria_costo || null, id_orden_fabricacion || null, estadoFinal, connection);
        if (!ordenId) {
            throw new Error('Error desconocido al crear la cabecera de la orden de compra.');
        }
        console.log(`[OrdenCompraController] Orden de compra creada con ID: ${ordenId}`);

        for (const [id_articulo, item] of itemsMap) {
            const { cantidad, precio_unitario } = item;
            console.log(`[OrdenCompraController] Creando detalle de orden de compra para artículo ${id_articulo}...`);
            await detalleOrdenCompra.create({
                id_orden_compra: ordenId,
                id_articulo: id_articulo,
                cantidad: cantidad,
                precio_unitario: precio_unitario,
            }, connection);
            console.log(`[OrdenCompraController] Detalle de orden de compra creado para artículo ${id_articulo}.`);
        }

        console.log("[OrdenCompraController] Intentando COMMIT de la transacción...");
        await connection.commit();
        connection.release();
        console.log("[OrdenCompraController] Transacción COMITADA y conexión liberada.");

        return res.status(201).json({ message: 'Orden de compra creada correctamente.', id_orden_compra: ordenId });

    } catch (error) {
        if (connection) {
            console.log("[OrdenCompraController] Error detectado. Intentando ROLLBACK de la transacción...");
            await connection.rollback();
            connection.release();
            console.log("[OrdenCompraController] Transacción ROLLEADA y conexión liberada.");
        }
        console.error('Error creando orden de compra:', error);
        // Si el error ya fue manejado y se envió una respuesta 409, no enviar otra 500
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Error al crear la orden de compra' });
        }
    }
}

// Confirmar Recepción de Mercancía y Actualizar Inventario
async function confirmarRecepcion(req, res) {
    let connection;
    try {
        const { id } = req.params;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const orden = await ordenCompras.getById(id, connection);
        if (!orden) {
            throw new Error('Orden de compra no encontrada.');
        }
        if (orden.estado !== 'pendiente') {
            throw new Error(`La orden de compra #${id} no está en estado 'pendiente'. Estado actual: ${orden.estado}.`);
        }

        const detalles = await detalleOrdenCompra.getByOrdenCompra(id, connection);
        if (detalles.length === 0) {
            throw new Error('La orden de compra no tiene detalles para recibir.');
        }

        console.log(`[OrdenCompraController] Confirmando recepción para orden #${id}...`);

        for (const detalle of detalles) {
            await inventarioModel.processInventoryMovement({
                id_articulo: Number(detalle.id_articulo),
                cantidad_movida: Number(detalle.cantidad),
                tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA,
                tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.COMPRA,
                observaciones: `Entrada por recepción de orden de compra #${id}`,
                referencia_documento_id: id,
                referencia_documento_tipo: 'orden_compra',
            }, connection);
            console.log(`[OrdenCompraController] Stock sumado para artículo ${detalle.id_articulo}.`);
        }

        await ordenCompras.update(id, { estado: 'completada' }, connection);
        console.log(`[OrdenCompraController] Estado de orden #${id} actualizado a 'completada'.`);

        await connection.commit();
        connection.release();
        res.status(200).json({ message: 'Recepción de mercancía confirmada y stock actualizado correctamente.' });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error al confirmar recepción de mercancía:', error);
        res.status(500).json({ message: error.message || 'Error al confirmar la recepción de mercancía.' });
    }
}

// Actualizar una orden de compra
async function updateOrdenCompra(req, res) {
    let connection;
    try {
        const id_orden_compra = req.params.id;
        console.log('→ updateOrdenCompra id:', id_orden_compra);

        const { id_proveedor, categoria_costo, id_orden_fabricacion, estado, items } = req.body;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const ordenActual = await ordenCompras.getById(id_orden_compra, connection);
        if (!ordenActual) {
            throw new Error('Orden de compra no encontrada.');
        }

        if (ordenActual.estado !== 'pendiente') {
            throw new Error('Solo se pueden actualizar órdenes de compra en estado pendiente.');
        }

        await ordenCompras.update(id_orden_compra, { id_proveedor, categoria_costo, id_orden_fabricacion, estado }, connection);

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('El campo items debe ser un array no vacío');
        }

        const detallesExistentes = await detalleOrdenCompra.getByOrdenCompra(id_orden_compra, connection);
        const detallesMap = new Map(detallesExistentes.map(d => [d.id_articulo, d]));

        const itemsMap = new Map();
        for (const item of items) {
            const { id_articulo, cantidad, precio_unitario } = item;
            if (!id_articulo || isNaN(cantidad) || isNaN(precio_unitario)) {
                throw new Error('Cada item requiere id_articulo, cantidad y precio_unitario válidos');
            }
            const articuloInfo = await articuloModel.getById(id_articulo, connection);
            if (!articuloInfo) {
                throw new Error(`El artículo con ID ${id_articulo} no existe.`);
            }
            // --- CAMBIO CLAVE: Verificar si el artículo existe en la tabla 'inventario' ---
            const inventarioArticulo = await inventarioModel.obtenerInventarioPorArticulo(id_articulo, connection);
            if (!inventarioArticulo) {
                await connection.rollback(); // Hacemos rollback antes de responder
                connection.release();
                console.log(`[OrdenCompraController] Artículo ${id_articulo} no inicializado en inventario durante la actualización. Enviando 409.`);
                return res.status(409).json({
                    message: `El artículo "${articuloInfo.descripcion}" (ID: ${id_articulo}) no está inicializado en el inventario.`,
                    needsInitialization: true,
                    articulo: {
                        id: id_articulo,
                        descripcion: articuloInfo.descripcion
                    }
                });
            }
            // --- FIN CAMBIO CLAVE ---

            if (itemsMap.has(id_articulo)) {
                const e = itemsMap.get(id_articulo);
                e.cantidad += cantidad;
                e.precio_unitario = precio_unitario;
            } else {
                itemsMap.set(id_articulo, { id_articulo, cantidad, precio_unitario });
            }
        }
        console.log('→ items agrupados para actualización:', Array.from(itemsMap.values()));

        for (const [id_articulo, { cantidad: nuevaCantidad, precio_unitario: nuevoPrecio }] of itemsMap) {
            if (detallesMap.has(id_articulo)) {
                const det = detallesMap.get(id_articulo);
                const cantidadAnterior = det.cantidad;
                const diferenciaCantidad = nuevaCantidad - cantidadAnterior;

                if (diferenciaCantidad !== 0) {
                    await inventarioModel.processInventoryMovement({
                        id_articulo: Number(id_articulo),
                        cantidad_movida: Math.abs(diferenciaCantidad),
                        tipo_movimiento: diferenciaCantidad > 0 ? inventarioModel.TIPOS_MOVIMIENTO.ENTRADA : inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
                        tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.AJUSTE_MANUAL,
                        observaciones: `Ajuste por actualización de orden de compra #${id_orden_compra}. Cantidad ${cantidadAnterior} -> ${nuevaCantidad}`,
                        referencia_documento_id: id_orden_compra,
                        referencia_documento_tipo: 'orden_compra_ajuste',
                    }, connection);
                    console.log(`→ Stock ajustado para artículo ${id_articulo}: ${diferenciaCantidad > 0 ? '+' : ''}${diferenciaCantidad}`);
                }

                await detalleOrdenCompra.update(det.id_detalle_compra, {
                    id_orden_compra,
                    id_articulo,
                    cantidad: nuevaCantidad,
                    precio_unitario: nuevoPrecio
                }, connection);
                console.log(`→ Detalle actualizado para artículo ${id_articulo}`);
                detallesMap.delete(id_articulo);
            } else {
                await detalleOrdenCompra.create({
                    id_orden_compra,
                    id_articulo,
                    cantidad: nuevaCantidad,
                    precio_unitario: nuevoPrecio
                }, connection);
                console.log(`→ Nuevo detalle insertado para artículo ${id_articulo}. (Stock no afectado, se hará en recepción)`);
            }
        }

        for (const det of detallesMap.values()) {
            await detalleOrdenCompra.delete(det.id_detalle_compra, connection);
            console.log(`→ Detalle eliminado ID ${det.id_detalle_compra} (art ${det.id_articulo})`);
        }

        await connection.commit();
        connection.release();
        return res.status(200).json({ message: 'Orden de compra actualizada correctamente.' });
    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error actualizando orden de compra:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Error al actualizar la orden de compra' });
        }
    }
}

// Eliminar una orden de compra (con sus detalles y reversión de stock si ya fue completada)
const deleteOrdenCompra = async (req, res) => {
    let connection;
    try {
        const { id } = req.params;

        connection = await db.getConnection();
        await connection.beginTransaction();

        const ordenExistente = await ordenCompras.getById(id, connection);
        if (!ordenExistente) {
            throw new Error('Orden de compra no encontrada.');
        }

        if (ordenExistente.estado === 'pendiente') {
            await ordenCompras.update(id, { estado: 'cancelada' }, connection);
            console.log(`Orden de compra #${id} marcada como 'cancelada' (estaba pendiente).`);
        } else if (ordenExistente.estado === 'completada') {
            const detalles = await detalleOrdenCompra.getByOrdenCompra(id, connection);
            for (const detalle of detalles) {
                await inventarioModel.processInventoryMovement({
                    id_articulo: Number(detalle.id_articulo),
                    cantidad_movida: Number(detalle.cantidad),
                    tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
                    tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_PROVEEDOR,
                    observaciones: `Reversión por cancelación de orden de compra completada #${id}`,
                    referencia_documento_id: id,
                    referencia_documento_tipo: 'cancelacion_orden_compra',
                }, connection);
                console.log(`Stock revertido para artículo ${detalle.id_articulo} por cancelación de orden de compra ${id}: -${detalle.cantidad}`);
            }
            await ordenCompras.update(id, { estado: 'cancelada' }, connection);
            console.log(`Orden de compra #${id} marcada como 'cancelada' y stock revertido (estaba completada).`);
        } else if (ordenExistente.estado === 'cancelada') {
            throw new Error(`La orden de compra #${id} ya está cancelada y no puede ser modificada.`);
        }

        await connection.commit();
        connection.release();
        res.json({ message: `Orden de compra #${id} cancelada y stock ${ordenExistente.estado === 'completada' ? 'revertido' : 'no afectado'} correctamente.` });

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('Error al eliminar/cancelar la orden de compra:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: error.message || 'Error al eliminar/cancelar la orden de compra' });
        }
    }
};

module.exports = {
    getOrdenesCompra,
    getOrdenCompraById,
    createOrdenCompra,
    updateOrdenCompra,
    deleteOrdenCompra,
    confirmarRecepcion
};
