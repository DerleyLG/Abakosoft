const ArticulosController = require('../controllers/articulosController');
const express = require ('express');
const router = express.Router();
const ArticuloModel = require('../models/articulosModel');

router.get('/componentes/:id', ArticulosController.getComponentesParaOrdenFabricacion);
router.get('/', ArticulosController.getArticulos);
router.get('/:id', ArticulosController.getArticuloById);
router.post('/', ArticulosController.createArticulo);
router.put('/:id', ArticulosController.updateArticulo);
router.delete('/:id', ArticulosController.deleteArticulo);
router.get('/es-compuesto/:id_articulo', async (req, res) => {
    try {
        const { id_articulo } = req.params;
        const esCompuesto = await ArticuloModel.esCompuesto(id_articulo);
        res.status(200).json({ esCompuesto });
    } catch (error) {
        console.error('Error al verificar el artículo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


module.exports = router;