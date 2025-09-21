const ordenModel = require("../models/ordenesVentaModel");
const detalleOrdenModel = require("../models/detalleOrdenVentaModel");
const clienteModel = require("../models/clientesModel");
const articuloModel = require("../models/articulosModel");
const inventarioModel = require("../models/inventarioModel");
const tesoreriaModel = require("../models/tesoreriaModel");
const db = require("../database/db");

// Función auxiliar para verificar existencia de cliente
async function clienteExists(id_cliente, connection = db) {
  const [rows] = await (connection || db).query(
    "SELECT 1 FROM clientes WHERE id_cliente = ? LIMIT 1",
    [id_cliente]
  );
  return rows.length > 0;
}

// Función auxiliar para verificar existencia de orden de venta
async function ordenExists(id_orden_venta, connection = db) {
  const [rows] = await (connection || db).query(
    "SELECT 1 FROM ordenes_venta WHERE id_orden_venta = ? LIMIT 1",
    [id_orden_venta]
  );
  return rows.length > 0;
}

const ESTADOS_VALIDOS = ["pendiente", "completada", "anulada"];

module.exports = {
  // Órdenes de Venta
  getAll: async (req, res) => {
    try {
      const estado = req.query.estado;
      let estados;
      if (estado === "anulada") {
        estados = ["anulada"];
      } else {
        estados = ["pendiente", "completada"];
      }
      const data = await ordenModel.getAll(estados);
      res.json(data);
    } catch (err) {
      console.error("Error al obtener órdenes de venta:", err);
      res.status(500).json({ error: "Error al obtener órdenes de venta." });
    }
  },

  getById: async (req, res) => {
    try {
      const id = req.params.id;
      const orden = await ordenModel.getById(id);
      if (!orden)
        return res.status(404).json({ error: "Orden de venta no encontrada." });
      
      // Obtener los detalles de la orden de venta
      const detalles = await detalleOrdenModel.getByVenta(id); // Asumiendo que getByVenta existe en detalleOrdenModel
      res.json({ ...orden, detalles }); // Devolver la orden con sus detalles
    } catch (err) {
      console.error("Error al obtener la orden:", err);
      res.status(500).json({ error: "Error al obtener la orden." });
    }
  },

  /*create: async (req, res) => {
    let connection; // Para la transacción
    try {
      const { id_cliente, estado, fecha, detalles } = req.body;


      connection = await db.getConnection();
      await connection.beginTransaction();
      console.log("[OrdenVentaController] Transacción iniciada.");

      // Validar cliente
      const clienteExistente = await clienteModel.getById(id_cliente, connection); // Pasamos la conexión
      if (!clienteExistente) {
        throw new Error("El cliente especificado no existe.");
      }
      console.log("[OrdenVentaController] Cliente validado.");

      // Validar estado
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(`Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
      }
      console.log("[OrdenVentaController] Estado validado.");

      // Validar fecha
      if (!fecha || isNaN(Date.parse(fecha))) {
        throw new Error("Fecha inválida o no proporcionada.");
      }
      console.log("[OrdenVentaController] Fecha validada.");

      // Validar detalles
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe incluir al menos un detalle.");
      }
      console.log("[OrdenVentaController] Detalles validados.");

      // 🔍 Validar cada detalle y stock antes de crear la orden
      for (const detalle of detalles) {
        const { id_articulo, cantidad } = detalle;
        console.log(`[OrdenVentaController] Validando detalle para artículo ${id_articulo}, cantidad ${cantidad}`);

        const articuloExistente = await articuloModel.getById(id_articulo, connection); // Pasamos la conexión
        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }
        console.log(`[OrdenVentaController] Artículo ${id_articulo} existe.`);

        // Obtener stock disponible del inventario
        const inventarioArticulo = await inventarioModel.obtenerInventarioPorArticulo(id_articulo, connection); // Pasamos la conexión
        
        if (!inventarioArticulo || inventarioArticulo.stock < cantidad) {
          throw new Error(`Stock insuficiente para el artículo ${articuloExistente.descripcion}. Stock disponible: ${inventarioArticulo?.stock || 0}, solicitado: ${cantidad}`);
        }
        

        const precio_unitario = articuloExistente.precio_venta;
        if (precio_unitario == null) {
          throw new Error(`El artículo con ID ${id_articulo} no tiene precio de venta definido.`);
        }
        // Asignar el precio_unitario del artículo existente al detalle
        detalle.precio_unitario = precio_unitario;
 
      }
    

      // Todas las validaciones pasaron, crea la orden de venta

      const id_orden_venta = await ordenModel.create({
        id_cliente,
        estado,
        fecha,
      }, connection); // Pasamos la conexión
      console.log(`[OrdenVentaController] Orden de venta creada con ID: ${id_orden_venta}`);

      // Crear detalles y descontar stock
      for (const detalle of detalles) {
        const { id_articulo, cantidad } = detalle; 
       

        //  Descontar stock del inventario
        try {
            console.log(`[OrdenVentaController] Descontando stock para artículo ${id_articulo}...`);
            await inventarioModel.processInventoryMovement({
                id_articulo: Number(id_articulo),
                cantidad_movida: Number(cantidad),
                tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
                tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.VENTA,
                observaciones: `Salida por orden de venta #${id_orden_venta}`,
                referencia_documento_id: id_orden_venta,
                referencia_documento_tipo: 'orden_venta',
            }, connection); // Pasamos la conexión para que processInventoryMovement use la misma transacción
          
        } catch (inventoryError) {
            console.error(`[OrdenVentaController] Error al descontar stock para artículo ${id_articulo}:`, inventoryError.message);
            throw new Error(`Stock insuficiente para el artículo ${detalle.descripcion} (ID: ${id_articulo}). Error: ${inventoryError.message}`);
        }

        //  Crear el detalle de la orden de venta
        console.log(`[OrdenVentaController] Preparando datos para detalle de orden de venta para artículo ${id_articulo}:`, {
            id_orden_venta,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: '',
            precio_unitario: detalle.precio_unitario,
        });
        try {
            await detalleOrdenModel.create({
              id_orden_venta,
              id_articulo: detalle.id_articulo,
              cantidad: detalle.cantidad,
              observaciones: '', // Se pasa string vacío para evitar NOT NULL si el frontend no lo envía
              precio_unitario: detalle.precio_unitario,
            }, connection); // Pasamos la conexión
            console.log(`[OrdenVentaController] Detalle de orden de venta creado para artículo ${id_articulo}.`);
        } catch (detailError) {
            console.error(`[OrdenVentaController] ERROR CRÍTICO al crear detalle de orden de venta para artículo ${id_articulo}:`, detailError); // Log completo del error
            throw new Error(`Error al crear detalle para artículo ${detalle.descripcion} (ID: ${id_articulo}). Detalle: ${detailError.message}`);
        }
      }

   
      await connection.commit(); 
      connection.release(); 
  

      return res.status(201).json({
        message: "Orden de venta creada con sus detalles y stock descontado.",
        id_orden_venta,
      });
    } catch (error) {
      if (connection) {
        console.error("[OrdenVentaController] Error detectado. Intentando ROLLBACK de la transacción...");
        await connection.rollback(); // Revertir la transacción en caso de error
        connection.release(); // Liberar la conexión
        console.error("[OrdenVentaController] Transacción ROLLEADA y conexión liberada.");
      }
      console.error("Detalles del error al crear orden de venta:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
      });
      return res
        .status(500)
        .json({ error: error.message || "Error al crear la orden de venta." });
    }
  },
*/

create: async (req, res) => {
    let connection; // Para la transacción
    try {
      const { 
        id_cliente, 
        estado, 
        fecha, 
        detalles, 
        id_metodo_pago,
        referencia,
        observaciones_pago,
      } = req.body;

      connection = await db.getConnection();
      await connection.beginTransaction();


      // Validar cliente
      const clienteExistente = await clienteModel.getById(id_cliente, connection); 
      if (!clienteExistente) {
        throw new Error("El cliente especificado no existe.");
      }
    

      // Validar estado
      if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(`Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}`);
      }
    

      // Validar fecha
      if (!fecha || isNaN(Date.parse(fecha))) {
        throw new Error("Fecha inválida o no proporcionada.");
      }
   

      // Validar detalles
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debe incluir al menos un detalle.");
      }
  

      //  Validar cada detalle y stock antes de crear la orden
      let totalVenta = 0; 
      for (const detalle of detalles) {
        const { id_articulo, cantidad } = detalle;
        const articuloExistente = await articuloModel.getById(id_articulo, connection);
        if (!articuloExistente) {
          throw new Error(`El artículo con ID ${id_articulo} no existe.`);
        }
        
        const inventarioArticulo = await inventarioModel.obtenerInventarioPorArticulo(id_articulo, connection); 
        
        if (!inventarioArticulo || inventarioArticulo.stock < cantidad) {
          throw new Error(`Stock insuficiente para el artículo ${articuloExistente.descripcion}. Stock disponible: ${inventarioArticulo?.stock || 0}, solicitado: ${cantidad}`);
        }
        
        const precio_unitario = articuloExistente.precio_venta;
        if (precio_unitario == null) {
          throw new Error(`El artículo con ID ${id_articulo} no tiene precio de venta definido.`);
        }
        // Asignar el precio_unitario del artículo existente al detalle
        detalle.precio_unitario = precio_unitario;
        totalVenta += precio_unitario * cantidad;
      }
    
      // Todas las validaciones pasaron, crea la orden de venta
      const id_orden_venta = await ordenModel.create({
        id_cliente,
        estado,
        fecha,
        total: totalVenta, //  Pasamos el total calculado al modelo
        monto: totalVenta 
      }, connection); 
     

      // Crear detalles y descontar stock
      for (const detalle of detalles) {
        const { id_articulo, cantidad } = detalle; 
        
        // Descontar stock del inventario
        try {
          await inventarioModel.processInventoryMovement({
            id_articulo: Number(id_articulo),
            cantidad_movida: Number(cantidad),
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.SALIDA,
            tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.VENTA,
            observaciones: `Salida por orden de venta #${id_orden_venta}`,
            referencia_documento_id: id_orden_venta,
            referencia_documento_tipo: 'orden_venta',
          }, connection); 
        } catch (inventoryError) {
          console.error(`[OrdenVentaController] Error al descontar stock para artículo ${id_articulo}:`, inventoryError.message);
          throw new Error(`Stock insuficiente para el artículo ${detalle.descripcion} (ID: ${id_articulo}). Error: ${inventoryError.message}`);
        }

        // Crear el detalle de la orden de venta
        try {
          await detalleOrdenModel.create({
            id_orden_venta,
            id_articulo: detalle.id_articulo,
            cantidad: detalle.cantidad,
            observaciones: '',
            precio_unitario: detalle.precio_unitario,
          }, connection); 
        } catch (detailError) {
          console.error(`[OrdenVentaController] ERROR CRÍTICO al crear detalle de orden de venta para artículo ${id_articulo}:`, detailError);
          throw new Error(`Error al crear detalle para artículo ${detalle.descripcion} (ID: ${id_articulo}). Detalle: ${detailError.message}`);
        }
      }

      //  Lógica para la Tesorería: Registrar el movimiento de pago
   
      const movimientoData = {
        id_documento: id_orden_venta, 
        tipo_documento: 'orden_venta', 
        monto: totalVenta,
        id_metodo_pago: id_metodo_pago,
        referencia: referencia,
        observaciones: observaciones_pago,
      };
      await tesoreriaModel.insertarMovimiento(movimientoData, connection); 
     
      
      await connection.commit(); 
      connection.release(); 
      
      return res.status(201).json({
        message: "Orden de venta y movimiento de tesorería creados.",
        id_orden_venta,
      });

    } catch (error) {
      if (connection) {
        console.error("[OrdenVentaController] Error detectado. Intentando ROLLBACK de la transacción...");
        await connection.rollback(); 
        connection.release();
        console.error("[OrdenVentaController] Transacción ROLLEADA y conexión liberada.");
      }
      console.error("Detalles del error al crear orden de venta:", {
        message: error.message,
        stack: error.stack,
        body: req.body,
      });
      return res
        .status(500)
        .json({ error: error.message || "Error al crear la orden de venta." });
    }
  },

  update: async (req, res) => {
    let connection;
    try {
      const id = +req.params.id;
      const { id_cliente, estado } = req.body;

      // Iniciar transacción para actualizar la orden y posiblemente ajustar stock si el estado cambia
      connection = await db.getConnection();
      await connection.beginTransaction();

      const ordenActual = await ordenModel.getById(id, connection);
      if (!ordenActual) {
        throw new Error("Orden de venta no encontrada.");
      }

      // Validaciones
      if (!id_cliente || !estado) {
        throw new Error("Faltan campos obligatorios.");
      }
      if (!(await clienteExists(id_cliente, connection))) {
        throw new Error("Cliente no existe.");
      }
      if (!ESTADOS_VALIDOS.includes(estado)) {
        throw new Error(`Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(", ")}.`);
      }

      // Lógica de ajuste de stock si el estado cambia a 'anulada'
      if (ordenActual.estado !== 'anulada' && estado === 'anulada') {
        // Si la orden pasa de cualquier estado a 'anulada', reintegrar el stock
        const detalles = await detalleOrdenModel.getByVenta(id, connection); // Obtener detalles con la misma conexión
        for (const detalle of detalles) {
          await inventarioModel.processInventoryMovement({
            id_articulo: detalle.id_articulo,
            cantidad_movida: detalle.cantidad,
            tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA, // Reintegrar stock
            tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE, // O un tipo específico para anulación
            observaciones: `Reintegro por anulación de orden de venta #${id}`,
            referencia_documento_id: id,
            referencia_documento_tipo: 'anulacion_orden_venta',
          }, connection); // Pasamos la conexión
          console.log(`Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`);
        }
      }

      const updatedRows = await ordenModel.update(id, { id_cliente, estado }, connection); // Pasamos la conexión

      if (updatedRows === 0 && ordenActual.estado === 'pendiente' && estado === 'pendiente') {
        // Esto puede ocurrir si no hay cambios en los campos actualizables (id_cliente, estado)
        // y el estado sigue siendo pendiente. No es un error, simplemente no hubo UPDATE.
        res.json({ message: "Orden de venta actualizada (sin cambios en stock)." });
      } else if (updatedRows === 0) {
         // Si updatedRows es 0 y el estado no era pendiente, o ya estaba anulada
        throw new Error("No se pudo actualizar la orden de venta. Posiblemente ya no está en estado 'pendiente'.");
      }

      await connection.commit();
      connection.release();
      res.json({ message: "Orden de venta actualizada." });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error al actualizar la orden de venta:", err);
      res.status(500).json({ error: err.message || "Error al actualizar la orden de venta." });
    }
  },

  delete: async (req, res) => {
    let connection;
    try {
      const id = +req.params.id;

      connection = await db.getConnection();
      await connection.beginTransaction();

      const orden = await ordenModel.getById(id, connection); // Usamos la conexión
      if (!orden) {
        throw new Error("Orden de venta no encontrada.");
      }

    

      // Si la orden no está pendiente, no se puede anular (y no se devuelve stock)
      if (orden.estado.toLowerCase().trim() !== "pendiente") {
        throw new Error("Solo se pueden anular órdenes pendientes.");
      }

      // Anular la orden (cambiar estado a 'anulada')
      await ordenModel.update(id, { estado: "anulada" }, connection); // Usamos la conexión

      // Reintegrar el stock para cada detalle de la orden anulada
      const detalles = await detalleOrdenModel.getByVenta(id, connection); // Obtener detalles con la misma conexión
      for (const detalle of detalles) {
        await inventarioModel.processInventoryMovement({
          id_articulo: detalle.id_articulo,
          cantidad_movida: detalle.cantidad,
          tipo_movimiento: inventarioModel.TIPOS_MOVIMIENTO.ENTRADA, // Reintegrar stock
          tipo_origen_movimiento: inventarioModel.TIPOS_ORIGEN_MOVIMIENTO.DEVOLUCION_CLIENTE, // O un tipo específico para anulación
          observaciones: `Reintegro por anulación de orden de venta #${id}`,
          referencia_documento_id: id,
          referencia_documento_tipo: 'anulacion_orden_venta',
        }, connection); // Pasamos la conexión
        console.log(`Stock reintegrado para artículo ${detalle.id_articulo} por anulación de orden de venta ${id}: +${detalle.cantidad}`);
      }

      await connection.commit();
      connection.release();
      res.json({ message: "Orden de venta anulada y stock reintegrado correctamente." });
    } catch (err) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error anulando la orden de venta:", err);
      res.status(500).json({ error: err.message || "Error al anular la orden de venta." });
    }
  },
   getArticulosConStock: async (req, res) => {
    try {
      const articulos = await ordenModel.getArticulosConStock();
      res.json(articulos);
    } catch (error) {
      console.error('Error al obtener artículos con stock:', error);
      res.status(500).json({ error: 'Error interno del servidor.' });
    }
  },
};
