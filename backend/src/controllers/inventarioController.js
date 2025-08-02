const InventarioModel = require('../models/inventarioModel');
const db = require('../database/db');
const articuloModel = require('../models/articulosModel'); // Necesario para verificar si el artículo existe

module.exports = {

    registrarMovimiento: async (req, res) => {
        const {
            id_articulo,
            cantidad,
            tipo_movimiento,
            descripcion, 
            origen, 
            stock_minimo 
        } = req.body;

        try {
           
            if (!id_articulo || typeof cantidad === 'undefined' || !tipo_movimiento || !origen) {
                return res.status(400).json({ error: 'Faltan campos obligatorios: id_articulo, cantidad, tipo_movimiento, origen.' });
            }

            const cantidadNumerica = Number(cantidad);
            if (isNaN(cantidadNumerica) || cantidadNumerica < 0 || (cantidadNumerica === 0 && origen !== InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL)) {
                return res.status(400).json({ error: 'La cantidad debe ser un número positivo, o 0 si es un ingreso inicial.' });
            }

           
            const [articuloExiste] = await db.query('SELECT 1 FROM articulos WHERE id_articulo = ?', [id_articulo]);
            if (articuloExiste.length === 0) {
                return res.status(404).json({ message: 'Artículo no encontrado en la base de datos de artículos.' });
            }

            
            const inventarioActual = await InventarioModel.obtenerInventarioPorArticulo(id_articulo);
            if (inventarioActual && origen === InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL) {
                return res.status(400).json({ error: `El artículo ${id_articulo} ya existe en el inventario. No se puede realizar un ingreso inicial duplicado.` });
            }
      
            const result = await InventarioModel.processInventoryMovement({
                id_articulo: Number(id_articulo),
                cantidad_movida: cantidadNumerica, 
                tipo_movimiento: tipo_movimiento,
                tipo_origen_movimiento: origen,
                observaciones: descripcion,
               
                stock_minimo_inicial: (origen === InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL && typeof stock_minimo !== 'undefined') ? Number(stock_minimo) : null,
                
            });

            res.status(201).json({
                message: 'Movimiento registrado y stock actualizado con éxito',
                newStockDisponible: result.newStockDisponible,
                newStockFabricado: result.newStockFabricado,
                movimientoId: result.movimientoId
            });
        } catch (error) {
            console.error('Error al registrar movimiento y actualizar inventario:', error);
        
            res.status(500).json({ error: error.message || 'Error interno al registrar el movimiento.' });
        }
    },

  
    obtenerInventario: async (req, res) => {
        try {
            const inventario = await InventarioModel.obtenerTodo();
            res.json(inventario);
        } catch (error) {
            console.error('Error al obtener inventario:', error);
            res.status(500).json({ error: 'Error al obtener inventario' });
        }
    },

    getArticulosBajoStock: async (req, res) => {
        try {
            const articulos = await InventarioModel.getArticulosBajoStock();
            res.json(articulos);
        } catch (error) {
            console.error('Error al obtener artículos con bajo stock:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },
    
    getById: async (req, res) => {
     
        console.log(`[InventarioController.getById] req.params recibido:`, req.params);
        const { id } = req.params; 
        const id_articulo = id; 
        console.log(`[InventarioController.getById] Extracted id_articulo: ${id_articulo}`);
     

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

    /**
     * Inicializa un artículo en el inventario con stock 0.
     * Este endpoint es llamado por el frontend cuando se sugiere agregar un artículo
     * que existe en el catálogo pero no en el inventario.
     * Ruta: POST /inventario/inicializar
     */
    inicializarArticuloEnInventario: async (req, res) => {
        let connection;
        try {
            const { id_articulo } = req.body; // El frontend enviará el ID del artículo

            if (!id_articulo) {
                return res.status(400).json({ message: 'ID de artículo es obligatorio para la inicialización.' });
            }

            connection = await db.getConnection();
            await connection.beginTransaction();

            // Verificar que el artículo exista en la tabla de artículos antes de inicializarlo en inventario
            const articuloInfo = await articuloModel.getById(id_articulo, connection);
            if (!articuloInfo) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ message: `Artículo con ID ${id_articulo} no encontrado en el catálogo de artículos.` });
            }

            // Verificar si el artículo ya está en inventario para evitar duplicados
            const inventarioExistente = await InventarioModel.obtenerInventarioPorArticulo(id_articulo, connection);
            if (inventarioExistente) {
                await connection.rollback();
                connection.release();
                return res.status(409).json({ message: `El artículo "${articuloInfo.descripcion}" (ID: ${id_articulo}) ya está inicializado en el inventario.` });
            }

            console.log(`[inventarioController] Inicializando artículo ${id_articulo} en inventario con stock 0.`);

            // Llamar a tu función processInventoryMovement para insertar el registro inicial
            await InventarioModel.processInventoryMovement({
                id_articulo: Number(id_articulo),
                cantidad_movida: 0, // Stock inicial de 0
                tipo_movimiento: InventarioModel.TIPOS_MOVIMIENTO.ENTRADA, // Es una "entrada" al sistema de inventario
                tipo_origen_movimiento: InventarioModel.TIPOS_ORIGEN_MOVIMIENTO.INICIAL, // Origen "inicial"
                observaciones: `Inicialización de artículo en inventario a petición del usuario.`,
                referencia_documento_id: null,
                referencia_documento_tipo: 'inicializacion_manual',
                stock_minimo_inicial: 2 // Tu modelo requiere un stock_minimo_inicial para la inserción
            }, connection); // Pasamos la conexión para que sea parte de la transacción

            await connection.commit();
            connection.release();
            res.status(200).json({ message: `Artículo "${articuloInfo.descripcion}" inicializado en inventario con stock 0 correctamente.` });

        } catch (error) {
            if (connection) {
                await connection.rollback();
                connection.release();
            }
            console.error('Error al inicializar artículo en inventario:', error);
            res.status(500).json({ message: error.message || 'Error al inicializar el artículo en el inventario.' });
        }
    }
};
