const express = require('express');
const router = express.Router();
const controller = require('../controllers/avanceEtapasController');




router.get('/completadas/:idOrden/:idArticulo', controller.getEtapasFinalizadas);
router.get('/costo-anterior/:id_articulo/:id_etapa_produccion', controller.getCostoAnterior);
router.get('/', controller.getAll);
router.get('/pagados', controller.getAllPagados);
router.get('/:id', controller.getAvancesByOrden);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);


module.exports = router;
