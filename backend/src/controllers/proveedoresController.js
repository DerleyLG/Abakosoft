const proveedor = require('../models/proveedoresModel');
const db = require('../database/db');

const getProveedores = async (req, res) =>{
    try{
        const proveedores = await proveedor.getAll();
        res.json(proveedores);
    }catch(err){
        console.error(err);
        res.status(500).json({error:'Error al obtener proveedores'});
    }
};

const getProveedoresById = async (req, res) => {
    const { id } = req.params;
    try{
        const [rows] = await db.query('SELECT * FROM proveedores WHERE id_proveedor = ?', [id]);

        if(rows.length == 0){
            return res.status(404).json({error: 'Proveedor no encontrado'});
        }
        res.json(rows[0]);
    }catch(error){
        console.error('Error al obtener proveedor por ID:', error);
        res.status(500).json({error:'Error al obtener proveedor'});
    }

};

const createProveedor = async(req, res) => {
    try{
        const id = await proveedor.create(req.body);
        res.status(201).json({ id, message:'Proveedor creado'});
    }catch(err){
        console.error(err)
        res.status(500).json({error: 'Error al crear proveedor'});
    }
};

const updateProveedor = async (req, res) => {
    const { id } = req.params;
    try {
      const result = await proveedor.update(id, req.body);
  
      if (result.affectedRows == 0) {
        return res.status(404).json({ error: "Proveedor no encontrado" });
      }
      res.json({ message: "proveedor actualizado" });
    } catch (error) {
      console.error("Error al actualizar proveedor:", error);
      res.status(500).json({ error: "Error al actualizar proveedor" });
    }
  };
      

const deleteProveedor = async (req, res) =>{
    const { id } = req.params
    try {
        const result =  await proveedor.delete(id);
       if(result.affectedRows == 0){
        return res.status(404).json({error:'Proveedor no encontrado'});
       }
        res.json({message: 'Proveedor eliminado'});
    } catch (error) {
        console.error('Error al eliminar proveedor');
        res.status(500).json({error: 'Error al eliminar proveedor'});
    }
};

module.exports = {
    getProveedores,
    getProveedoresById,
    createProveedor,
    updateProveedor,
    deleteProveedor
};