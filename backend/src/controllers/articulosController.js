const Articulo = require('../models/articulosModel');
const db = require('../database/db');

const categoriaExiste = async (id_categoria) => {
    const [rows] = await db.query('SELECT 1 FROM categorias WHERE id_categoria = ?', [id_categoria]);
    return rows.length > 0;
  };




const getArticulos = async (req, res) => {
  try {
    const filtro = req.query.buscar || '';  // Obtener filtro o cadena vacía
    const articulos = await Articulo.buscarArticulos(filtro);  // llamar a la función que busca con filtro
    res.json(articulos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener articulos' });
  }
};

const getArticuloById = async (req, res) => {
  const { id } = req.params;
  try {
    const articulo = await Articulo.getById(id);
    if (!articulo)
      return res.status(404).json({ error: "Artículo no encontrado" });
    res.json(articulo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener articulos" });
  }
};

const createArticulo = async (req, res) => {
  const { id_categoria, referencia } = req.body;

  try {
    const categoriaValida = await categoriaExiste(id_categoria);
    if (!categoriaValida) {
      return res.status(400).json({ error: 'La categoría especificada no existe' });
    }

    const [rows] = await db.query('SELECT * FROM articulos WHERE referencia = ?', [referencia]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un artículo con esa referencia' });
    }

    const id = await Articulo.create(req.body); 
    const articulo = await Articulo.getById(id); 

    res.status(201).json({ message: 'Artículo creado correctamente', articulo }); 
  } catch (err) {
    console.error('Error completo:', err);
    return res.status(500).json({ error: 'Error al crear el artículo' });
  }
};

 
const updateArticulo = async (req, res) => {
  const { id } = req.params;
  const { id_categoria, referencia } = req.body;
const idArticulo = parseInt(id);
 const [rows] = await db.query('SELECT * FROM articulos WHERE referencia = ?  AND id_articulo != ?', [referencia, idArticulo]);
    if (rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un artículo con esa referencia' });
    }
  // Validar existencia de la categoría
  const categoriaValida = await categoriaExiste(id_categoria);
  if (!categoriaValida) {
    return res.status(400).json({ error: 'La categoría especificada no existe' });
    
  }
  try {
    const result = await Articulo.update(id, req.body);

    if (result.affectedRows == 0) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }
    res.json({ message: "Artículo actualizado" });
  } catch (error) {
    console.error("Error al actualizar artículo:", error);
    res.status(500).json({ error: "Error al actualizar artículo" });
  }
};
              



const deleteArticulo = async (req, res) =>{
    const { id } = req.params
    try {
      const [movimientos] = await db.query('SELECT * FROM movimientos_inventario WHERE id_articulo = ?', [id]);


if (movimientos.length > 0) {
  return res.status(400).json({ error: 'No puedes eliminar este artículo porque tiene movimientos registrados.' });
}

        const result =  await Articulo.delete(id);
       if(result.affectedRows == 0){
        return res.status(404).json({error:'Articulo no encontrado'});
       }
        res.json({message: 'Articulo eliminado'});
    } catch (error) {
        console.error('Error al eliminar artículo:', error.message);
        res.status(500).json({error: 'Error al eliminar articulo'});
    }
};
module.exports = {
    getArticulos,
    getArticuloById,
    createArticulo,
    updateArticulo,
    deleteArticulo
};