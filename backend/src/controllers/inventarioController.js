/** const MovimientoInventario = require('../models/movimientosInventarioModel');
const Inventario = require('../models/inventarioModel');
const db = require('../database/db');

const registrarMovimiento = async (req, res) => {
  const {id,
    id_articulo,
    cantidad,
    tipo_movimiento,
    descripcion,
    origen,
    stock_minimo
  } = req.body;

 const articulo = await db.query('SELECT * FROM inventario WHERE id_articulo = ?', [id]);
   if (articulo.length === 0) {
    return res.status(404).json({ message: 'No encontrado' });
  }
  try {
    // Buscar si ya existe el artículo en inventario
 const resultado = await Inventario.agregarActualizarInventario(id_articulo, cantidad, stock_minimo);
if (resultado === 'error') {
      return res.status(500).json({ error: 'Error al actualizar inventario' });
    }
    // Registrar el movimiento
    await MovimientoInventario.create({
      id_articulo,
      cantidad,
      tipo_movimiento,
      descripcion,
      origen,
      fecha: new Date()
    });

   res.status(201).json({
  mensaje: 'Movimiento registrado con éxito',
  inventario: `Inventario ${resultado} correctamente`
})
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
};

const obtenerInventario = async (req, res) => {
  try {
    const inventario = await Inventario.obtenerTodo();
    res.json(inventario);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
};

const getById = async (req, res) => {
  const { id } = req.params;

  try {
    const articulo = await Inventario.getById(id);

    if (!articulo) {
      return res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
    }

    res.status(200).json(articulo);
  } catch (error) {
    console.error('Error al obtener artículo del inventario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};



const actualizarInventario = async (req, res) => {
  try {
    const { id_articulo, stock, stock_minimo } = req.body;

    if (!id_articulo || stock == null || stock_minimo == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const existe = await Inventario.obtenerStock(id_articulo);
    if (!existe) {
      return res.status(404).json({ error: 'Artículo no encontrado en inventario' });
    }

    await Inventario.actualizarStock(id_articulo, stock, stock_minimo);
    res.json({ message: 'Inventario actualizado correctamente' });
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    res.status(500).json({ error: 'Error al actualizar inventario' });
  }
};

const eliminarArticulo = async (req, res) => {
  try {
    const { id_articulo } = req.params;
    console.log('ID recibido para eliminar:', id_articulo);  

    const eliminado = await Inventario.eliminarDelInventario(id_articulo);

    if (eliminado) {
      res.status(200).json({ mensaje: 'Artículo eliminado del inventario' });
    } else {
      res.status(404).json({ mensaje: 'Artículo no encontrado en inventario' });
    }
  } catch (error) {
    console.error('Error al eliminar artículo del inventario:', error);
    res.status(500).json({ mensaje: 'Error interno al eliminar el artículo' });
  }
};


module.exports = {
  registrarMovimiento,
  obtenerInventario,
  actualizarInventario,
  eliminarArticulo,
  getById
};
**/
const InventarioModel = require('../models/inventarioModel'); // Asegúrate de que la ruta sea correcta
const db = require('../database/db'); // Para obtener conexiones si es necesario en otras funciones, aunque processInventoryMovement lo maneja

// Las constantes TIPOS_MOVIMIENTO y TIPOS_ORIGEN_MOVIMIENTO
// ya no se definen aquí. Se asume que el InventarioModel las maneja internamente
// y validará los valores que le pasemos.

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
            if (isNaN(Number(cantidad)) || Number(cantidad) <= 0) {
                return res.status(400).json({ error: 'La cantidad debe ser un número positivo.' });
            }

            // Validar que el artículo exista en la tabla maestra 'articulos'
            const [articuloExiste] = await db.query('SELECT 1 FROM articulos WHERE id_articulo = ?', [id_articulo]);
            if (articuloExiste.length === 0) {
                return res.status(404).json({ message: 'Artículo no encontrado en la base de datos de artículos.' });
            }

            // Llamar a la función central del modelo de inventario para procesar el movimiento.
            // El modelo se encargará de validar los tipos de movimiento y origen.
            const result = await InventarioModel.processInventoryMovement({
                id_articulo: Number(id_articulo),
                cantidad_movida: Number(cantidad),
                tipo_movimiento: tipo_movimiento,
                tipo_origen_movimiento: origen,
                observaciones: descripcion,
                // stock_minimo_inicial solo se pasa si el origen es 'inicial' y se está creando un nuevo registro de inventario
                stock_minimo_inicial: (origen === 'inicial' && typeof stock_minimo !== 'undefined') ? Number(stock_minimo) : null,
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
        const { id_articulo } = req.params;

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
        const { stock: nuevoStockTotal, stock_minimo: nuevoStockMinimo } = req.body; // 'stock' es el nuevo stock total deseado
 console.log('--- Debugging actualizarInventario ---');
    console.log('ID de artículo recibido en URL (req.params.id_articulo):', id);
    console.log('Nuevo stock total recibido (req.body.stock):', nuevoStockTotal);
    console.log('Nuevo stock mínimo recibido (req.body.stock_minimo):', nuevoStockMinimo);
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

            // Calcular la cantidad_movida como la diferencia entre el nuevo stock total y el stock actual
            const cantidadMovida = Number(nuevoStockTotal) - inventarioActual.stock;

            // Si no hay cambio en stock y solo se actualiza stock_minimo
            if (cantidadMovida === 0 && Number(nuevoStockMinimo) !== inventarioActual.stock_minimo) {
                // Solo actualiza el stock_minimo sin registrar movimiento de stock
                await db.query(
                    `UPDATE inventario SET stock_minimo = ?, ultima_actualizacion = ? WHERE id = ?`,
                    [Number(nuevoStockMinimo), new Date(), id]
                );
                return res.json({ message: 'Stock mínimo actualizado correctamente (sin movimiento de stock).' });
            }
            
            // Si hay cambio en stock, usar processInventoryMovement
            await InventarioModel.processInventoryMovement({
                id: Number(id),
                cantidad_movida: cantidadMovida, // Puede ser positivo o negativo
                tipo_movimiento: 'ajuste', // El modelo validará esto
                tipo_origen_movimiento: 'ajuste_manual', // El modelo validará esto
                observaciones: `Ajuste manual de stock. Stock anterior: ${inventarioActual.stock}, Nuevo stock: ${Number(nuevoStockTotal)}. Stock mínimo: ${Number(nuevoStockMinimo)}`,
                stock_minimo_inicial: Number(nuevoStockMinimo) // Se pasa para que actualice el stock_minimo en el registro existente
            });

            res.json({ message: 'Inventario y stock mínimo actualizados correctamente' });
        } catch (error) {
            console.error('Error al actualizar inventario:', error);
            res.status(500).json({ error: error.message || 'Error al actualizar inventario.' });
        }
    },

    /**
     * Elimina un artículo del inventario.
     * Ruta: DELETE /inventario/:id
     */
    eliminarArticulo: async (req, res) => {
        try {
            const { id_articulo } = req.params;

            // Opcional: Validar que el stock sea 0 antes de permitir la eliminación física
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
