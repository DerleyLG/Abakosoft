const InventarioModel = require('../models/inventarioModel');
const db = require('../database/db');

module.exports = {
    /**
     * Registra un movimiento de inventario y actualiza el stock correspondiente.
     * Este es el endpoint que el formulario NuevoInventario.jsx usará para el ingreso inicial.
     * También puede ser usado para entradas por compra, salidas por venta, etc.
     * Ruta: POST /inventario/movimientos
     */
    registrarMovimiento: async (req, res) => {
        const {
            id_articulo,
            cantidad, // Será la cantidad_movida
            tipo_movimiento, // 'entrada', 'salida', 'ajuste'
            descripcion, // Será observaciones
            origen, // Será tipo_origen_movimiento
            stock_minimo // Solo relevante para el ingreso inicial
        } = req.body;

        try {
            // Validaciones de entrada básica del controlador
            if (!id_articulo || typeof cantidad === 'undefined' || !tipo_movimiento || !origen) {
                return res.status(400).json({ error: 'Faltan campos obligatorios: id_articulo, cantidad, tipo_movimiento, origen.' });
            }

            const cantidadNumerica = Number(cantidad);
            if (isNaN(cantidadNumerica) || cantidadNumerica < 0 || (cantidadNumerica === 0 && origen !== InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL)) {
                return res.status(400).json({ error: 'La cantidad debe ser un número positivo, o 0 si es un ingreso inicial.' });
            }

            // Validar que el artículo exista en la tabla maestra 'articulos'
            const [articuloExiste] = await db.query('SELECT 1 FROM articulos WHERE id_articulo = ?', [id_articulo]);
            if (articuloExiste.length === 0) {
                return res.status(404).json({ message: 'Artículo no encontrado en la base de datos de artículos.' });
            }

            // --- NUEVA VALIDACIÓN: Verificar si el artículo ya está en inventario ---
             const inventarioActual = await InventarioModel.obtenerInventarioPorArticulo(id_articulo);
            if (inventarioActual && origen === InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL) {
                return res.status(400).json({ error: `El artículo ${id_articulo} ya existe en el inventario. No se puede realizar un ingreso inicial duplicado.` });
            }
            // --- FIN NUEVA VALIDACIÓN ---

            // Llamar a la función central del modelo de inventario para procesar el movimiento.
            // El modelo se encargará de validar los tipos de movimiento y origen.
            const result = await InventarioModel.processInventoryMovement({
                id_articulo: Number(id_articulo),
                cantidad_movida: cantidadNumerica, // Usamos la cantidad ya parseada
                tipo_movimiento: tipo_movimiento,
                tipo_origen_movimiento: origen,
                observaciones: descripcion,
                // stock_minimo_inicial solo se pasa si el origen es 'inicial' y se está creando un nuevo registro de inventario
                stock_minimo_inicial: (origen === InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL && typeof stock_minimo !== 'undefined') ? Number(stock_minimo) : null,
                // referencia_documento_id y referencia_documento_tipo se añadirán en otros controladores
                // (ej. al registrar un lote de producción o una venta)
            });

            res.status(201).json({
                message: 'Movimiento registrado y stock actualizado con éxito',
                newStockDisponible: result.newStockDisponible,
                newStockFabricado: result.newStockFabricado,
                movimientoId: result.movimientoId
            });
        } catch (error) {
            console.error('Error al registrar movimiento y actualizar inventario:', error);
            // El mensaje de error del modelo ya es más específico, lo pasamos directamente
            res.status(500).json({ error: error.message || 'Error interno al registrar el movimiento.' });
        }
    },

    /**
     * Obtiene todos los artículos en inventario.
     * Ruta: GET /inventario
     */
    obtenerInventario: async (req, res) => {
        try {
            const inventario = await InventarioModel.obtenerTodo();
            res.json(inventario);
        } catch (error) {
            console.error('Error al obtener inventario:', error);
            res.status(500).json({ error: 'Error al obtener inventario' });
        }
    },

    /**
     * Obtiene un artículo específico del inventario por su ID.
     * Ruta: GET /inventario/:id_articulo
     */
    getById: async (req, res) => {
        // --- CORRECCIÓN CLAVE AQUÍ: Extraer 'id' en lugar de 'id_articulo' ---
        console.log(`[InventarioController.getById] req.params recibido:`, req.params);
        const { id } = req.params; // <-- CAMBIO: Ahora se extrae 'id'
        const id_articulo = id; // <-- Asignamos 'id' a 'id_articulo' para usarlo consistentemente
        console.log(`[InventarioController.getById] Extracted id_articulo: ${id_articulo}`);
        // --- FIN CORRECCIÓN ---

        try {
            const articulo = await InventarioModel.obtenerInventarioPorArticulo(id_articulo);

            if (!articulo) {
                return res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
            }

            res.status(200).json(articulo);
        } catch (error) {
            console.error('Error al obtener artículo del inventario:', error);
            res.status(500).json({ mensaje: error.message || 'Error interno del servidor' });
        }
    },

    /**
     * Actualiza el stock y/o stock mínimo de un artículo en inventario (ajuste manual).
     * Ruta: PUT /inventario/:id_articulo
     */
    actualizarInventario: async (req, res) => {
        const { id } = req.params;
        const { stock: nuevoStockTotal, stock_minimo: nuevoStockMinimo } = req.body;

        try {
            // Validaciones de entrada básica del controlador
            if (nuevoStockTotal == null || nuevoStockMinimo == null) {
                return res.status(400).json({ error: 'Faltan campos requeridos: stock o stock_minimo.' });
            }
            if (isNaN(Number(nuevoStockTotal)) || isNaN(Number(nuevoStockMinimo))) {
                 return res.status(400).json({ error: 'Stock y stock mínimo deben ser números válidos.' });
            }

            const inventarioActual = await InventarioModel.obtenerInventarioPorArticulo(id);
            if (!inventarioActual) {
                return res.status(404).json({ error: 'Artículo no encontrado en inventario para actualizar.' });
            }

            const cantidadMovida = Number(nuevoStockTotal) - inventarioActual.stock;

            if (cantidadMovida === 0 && Number(nuevoStockMinimo) !== inventarioActual.stock_minimo) {
                await db.query(
                    `UPDATE inventario SET stock_minimo = ?, ultima_actualizacion = ? WHERE id_articulo = ?`,
                    [Number(nuevoStockMinimo), new Date(), id]
                );
                return res.json({ message: 'Stock mínimo actualizado correctamente (sin movimiento de stock).' });
            }
            
            await InventarioModel.processInventoryMovement({
                id_articulo: Number(id),
                cantidad_movida: cantidadMovida,
                tipo_movimiento: InventarioModel.TIPOS_MOVIMIENTO.AJUSTE,
                tipo_origen_movimiento: InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.AJUSTE_MANUAL,
                observaciones: `Ajuste manual de stock. Stock anterior: ${inventarioActual.stock}, Nuevo stock: ${Number(nuevoStockTotal)}. Stock mínimo: ${Number(nuevoStockMinimo)}`,
                stock_minimo_inicial: Number(nuevoStockMinimo)
            });

            res.json({ message: 'Inventario y stock mínimo actualizados correctamente' });
        } catch (error) {
            console.error('Error al actualizar inventario:', error);
            res.status(500).json({ error: error.message || 'Error al actualizar inventario.' });
        }
    },

    /**
     * Elimina un artículo del inventario.
     * Ruta: DELETE /inventario/:id_articulo
     */
    eliminarArticulo: async (req, res) => {
        const { id_articulo } = req.params; 

        try {
            const inventarioActual = await InventarioModel.obtenerInventarioPorArticulo(id_articulo);
            if (inventarioActual && (inventarioActual.stock > 0 || inventarioActual.stock_fabricado > 0)) {
                return res.status(400).json({ message: 'No se puede eliminar un artículo del inventario si tiene stock disponible o fabricado.' });
            }
            
            const eliminado = await InventarioModel.eliminarDelInventario(id_articulo);

            if (eliminado) {
                res.status(200).json({ mensaje: 'Artículo eliminado del inventario' });
            } else {
                res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
            }
        } catch (error) {
            console.error('Error al eliminar artículo del inventario:', error);
            res.status(500).json({ mensaje: error.message || 'Error interno al eliminar el artículo' });
        }
    },
};
