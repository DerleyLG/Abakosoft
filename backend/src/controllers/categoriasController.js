const Categoria = require('../models/categoriasModel');



const getCategoria = async (req, res) =>{
    try{
        const Caterogias = await Categoria.getAll();
        res.json(Caterogias);
    }catch(err){
        console.error(err);
        res.status(500).json({error:'Error al obtener Categorias'});
    }
};

const getCategoriaById = async (req, res) => {
    const { id } = req.params;
    const categoria = await Categoria.getById(id);
    
    try{
        const rows = await Categoria.getById(id);

    if (!categoria) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
       
        res.json(rows);
    }catch(error){
        console.error('Error al obtener Categoria por ID:', error);
        res.status(500).json({error:'Error al obtener Categoria'});
    }

};

const createCategoria = async(req, res) => {
   
    try{
        
        const id = await Categoria.create(req.body);
        res.status(201).json({ id, message:'Categoria creada'});
    }catch(err){
        console.error(err)
        res.status(500).json({error: 'Error al crear Categoria'});
    }
};

const updateCategoria = async (req, res) => {
    const { id } = req.params;

     const categoriaExistente = await Categoria.getById(id);
    if (!categoriaExistente) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    try {
       await Categoria.update(id, req.body);
        res.json({ message: 'Categoría actualizada' });
    } catch (error) {
      console.error("Error al actualizar Categoria:", error);
      res.status(500).json({ error: "Error al actualizar Categoria" });
    }
  };
      

const deleteCategoria = async (req, res) =>{
    const { id } = req.params
    try {
        const result =  await Categoria.delete(id);
       if(result.affectedRows == 0){
        return res.status(404).json({error:'Categorias no encontrado'});
       }
        res.json({message: 'Categorias eliminado'});
    } catch (error) {
        console.error('Error al eliminar Categorias');
        res.status(500).json({error: 'Error al eliminar Categoria'});
    }

    
      
};

module.exports = {
    getCategoria,
    getCategoriaById,
    createCategoria,
    updateCategoria,
    deleteCategoria
};