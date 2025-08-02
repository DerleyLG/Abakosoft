// controllers/compraMateriaPrimaController.js
const compraMateriaPrimaModel = require('../models/compraMateriaPrimaModel');
const proveedorModel = require('../models/proveedoresModel'); // Para validar el proveedor

// Función auxiliar para verificar si un proveedor existe
const proveedorExiste = async (id_proveedor) => {
    if (!id_proveedor) return true; // Si es opcional y null/undefined, se considera válido
    const proveedor = await proveedorModel.getById(id_proveedor);
    return !!proveedor;
};

/**
 * Crea un nuevo registro de compra de materia prima SIN afectar el inventario.
 * Solo para fines de reporte, usando una descripción de gasto.
 */
const createCompraMateriaPrima = async (req, res) => {
    try {
        const { descripcion_gasto, cantidad, precio_unitario, id_proveedor, observaciones } = req.body;

        // Validaciones básicas
        if (!descripcion_gasto || !cantidad || !precio_unitario) {
            return res.status(400).json({ message: 'Faltan campos obligatorios: descripcion_gasto, cantidad, precio_unitario.' });
        }
        if (typeof descripcion_gasto !== 'string' || descripcion_gasto.trim() === '') {
            return res.status(400).json({ message: 'La descripción del gasto no puede estar vacía.' });
        }
        if (isNaN(cantidad) || Number(cantidad) <= 0) {
            return res.status(400).json({ message: 'La cantidad debe ser un número positivo.' });
        }
        if (isNaN(precio_unitario) || Number(precio_unitario) < 0) {
            return res.status(400).json({ message: 'El precio unitario debe ser un número válido (mayor o igual a cero).' });
        }

        // Validar existencia de proveedor (si se proporciona)
        if (id_proveedor && !(await proveedorExiste(id_proveedor))) {
            return res.status(400).json({ message: `El proveedor con ID ${id_proveedor} no existe.` });
        }

        // Crear el registro de compra de materia prima (sin tocar el inventario)
        const compraId = await compraMateriaPrimaModel.create({
            descripcion_gasto: descripcion_gasto.trim(),
            cantidad: Number(cantidad),
            precio_unitario: Number(precio_unitario),
            id_proveedor: id_proveedor ? Number(id_proveedor) : null,
            observaciones: observaciones || null
        });

        res.status(201).json({ message: 'Costo de materia prima registrado correctamente (sin afectar inventario).', id_compra: compraId });

    } catch (error) {
        console.error('Error al registrar costo de materia prima:', error);
        res.status(500).json({ message: error.message || 'Error al registrar el costo de materia prima.' });
    }
};


const getComprasMateriaPrima = async (req, res) => {
    try {
        const compras = await compraMateriaPrimaModel.getAll();
        res.status(200).json(compras);
    } catch (error) {
        console.error('Error al obtener compras de materia prima:', error);
        res.status(500).json({ message: 'Error al obtener las compras de materia prima.' });
    }
};



module.exports = {
    createCompraMateriaPrima,
    getComprasMateriaPrima,
};
