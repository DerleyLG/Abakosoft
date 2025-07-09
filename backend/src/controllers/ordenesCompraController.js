const db = require('../database/db');
const ordenCompras = require('../models/ordenesCompraModel');
const detalleOrdenCompra = require('../models/detalleOrdenCompraModel');

// Verificar si una orden de fabricación existe
const ordenFabricacionExiste = async (id_orden_fabricacion) => {
    const [rows] = await db.query('SELECT 1 FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?', [id_orden_fabricacion]);
    return rows.length > 0;
};

// Verificar si un proveedor existe
const proveedorExiste = async (id_proveedor) => {
    const [rows] = await db.query('SELECT 1 FROM proveedores WHERE id_proveedor = ?', [id_proveedor]);
    return rows.length > 0;
};

// Obtener todas las órdenes de compra
const getOrdenesCompra = async (req, res) => {
    try {
        const ordenes = await ordenCompras.getAll();
        res.json(ordenes);
    } catch (error) {
        console.error(error);
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
        res.json(orden);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener la orden de compra' });
    }
};

// Crear una nueva orden de compra
async function createOrdenCompra(req, res) {
  try {
    const { id_proveedor, categoria_costo, id_orden_fabricacion, items } = req.body;

    if (!id_proveedor || !id_orden_fabricacion || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    // Agrupar artículos por descripcion_articulo sumando las cantidades
    const itemsMap = new Map();

    for (const item of items) {
      const { descripcion_articulo, cantidad, precio } = item;

      if (!descripcion_articulo || !cantidad || !precio) {
        return res.status(400).json({ message: 'Faltan campos en un item' });
      }

      if (itemsMap.has(descripcion_articulo)) {
        const existente = itemsMap.get(descripcion_articulo);
        existente.cantidad += cantidad;  // Sumar cantidades
        existente.precio = precio;  // Actualizar precio con el último valor recibido
        itemsMap.set(descripcion_articulo, existente);
      } else {
        itemsMap.set(descripcion_articulo, { descripcion_articulo, cantidad, precio });
      }
    }

    // Crear la orden de compra (cabecera) UNA SOLA VEZ
    const ordenId = await ordenCompras.create(id_proveedor, categoria_costo, id_orden_fabricacion);

    if (!ordenId) {
      return res.status(500).json({ message: 'Error al crear la orden de compra' });
    }

    // Insertar los detalles de la orden (items)
    for (const [descripcion_articulo, item] of itemsMap) {
      const { cantidad, precio } = item;

      if (!descripcion_articulo || !cantidad || !precio) {
        return res.status(400).json({ message: 'Faltan campos en un item' });
      }

      // Insertar el detalle de la orden de compra (solo un detalle por cada artículo)
      await detalleOrdenCompra.create({
        id_orden_compra: ordenId,
        descripcion_articulo,
        cantidad,
        precio_unitario: precio,
      });
    }

    return res.status(201).json({ message: 'Orden de compra creada correctamente', id_orden_compra: ordenId });

  } catch (error) {
    console.error('Error creando orden de compra:', error);
    res.status(500).json({ message: 'Error al crear la orden de compra', error });
  }
}

// Actualizar una orden de compra
async function updateOrdenCompra(req, res) {
  try {
    const id_orden_compra = req.params.id;
    console.log('→ updateOrdenCompra id:', id_orden_compra);

    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'El campo items debe ser un array no vacío' });
    }
    for (const { descripcion_articulo, cantidad, precio } of items) {
      if (!descripcion_articulo || isNaN(cantidad) || isNaN(precio)) {
        return res.status(400).json({ message: 'Cada item requiere descripcion_articulo, cantidad y precio válidos' });
      }
    }

    // Traer detalles existentes
    const detallesExistentes = await detalleOrdenCompra.getByOrdenCompra(id_orden_compra);
    // Mapear por descripcion_articulo ya que ese es el identificador ahora
    const detallesMap = new Map(detallesExistentes.map(d => [d.descripcion_articulo, d]));

    // Agrupar items entrantes sumando duplicados
    const itemsMap = new Map();
    for (const { descripcion_articulo, cantidad, precio } of items) {
      if (itemsMap.has(descripcion_articulo)) {
        const e = itemsMap.get(descripcion_articulo);
        e.cantidad += cantidad;
      } else {
        itemsMap.set(descripcion_articulo, { descripcion_articulo, cantidad, precio });
      }
    }
    console.log('→ items agrupados:', Array.from(itemsMap.values()));

    // Reemplazar cantidades en BD
    for (const [descripcion_articulo, { cantidad, precio }] of itemsMap) {
      if (detallesMap.has(descripcion_articulo)) {
        const det = detallesMap.get(descripcion_articulo);
        console.log(`→ Reemplazando detalle ID ${det.id_detalle_compra}: cantidad ${det.cantidad}→${cantidad}`);
        const { affectedRows } = await detalleOrdenCompra.update(det.id_detalle_compra, {
          cantidad,
          precio_unitario: precio
        });
        console.log(`   filas afectadas: ${affectedRows}`);
        detallesMap.delete(descripcion_articulo);
      } else {
        console.log(`→ Insertando nuevo detalle art ${descripcion_articulo}: cantidad ${cantidad}`);
        await detalleOrdenCompra.create({
          id_orden_compra,
          descripcion_articulo,
          cantidad,
          precio_unitario: precio
        });
      }
    }

    // Eliminar detalles que ya no vienen en el PUT
    for (const det of detallesMap.values()) {
      console.log(`→ Eliminando detalle sobrante ID ${det.id_detalle_compra} (art ${det.descripcion_articulo})`);
      await detalleOrdenCompra.delete(det.id_detalle_compra);
    }

    return res.status(200).json({ message: 'Orden de compra actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando orden de compra:', error);
    res.status(500).json({ message: 'Error al actualizar la orden de compra', error: error.message });
  }
}

// Eliminar una orden de compra (con sus detalles)
const deleteOrdenCompra = async (req, res) => {
    const { id } = req.params;

    const ordenExistente = await ordenCompras.getById(id);
    if (!ordenExistente) {
        return res.status(404).json({ error: 'Orden de compra no encontrada' });
    }

    try {
        // Eliminar los detalles primero
        await detalleOrdenCompra.delete(id);

        // Luego eliminar la cabecera
        const result = await ordenCompras.delete(id);

        if (result.affectedRows === 0) {
            return res.status(400).json({ error: 'Error al eliminar la orden de compra' });
        }

        res.json({ message: 'Orden de compra eliminada correctamente' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar la orden de compra' });
    }
};

module.exports = {
    getOrdenesCompra,
    getOrdenCompraById,
    createOrdenCompra,
    updateOrdenCompra,
    deleteOrdenCompra
};
