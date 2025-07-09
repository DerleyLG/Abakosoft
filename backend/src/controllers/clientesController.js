
const Cliente = require('../models/clientesModel');


const getClientes = async (req, res) => {
  try {
    const clientes = await Cliente.getAll();
    res.json(clientes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
};

const getClienteById = async (req, res) => {
  const { id } = req.params;
  try {
    const cliente = await Cliente.getById(id);

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json(cliente);
  } catch (error) {
    console.error('Error al obtener cliente por ID:', error);
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

const createCliente = async (req, res) => {
  try {
    const id = await Cliente.create(req.body);
    res.status(201).json({ id, message: 'Cliente creado' });
  } catch (err) {
    console.error(' Error al crear cliente:', err);
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};



const updateCliente = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Cliente.update(id, req.body);

    if (result.affectedRows == 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    res.json({ message: "Cliente actualizado" });
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar Cliente" });
  }
};
    

const deleteCliente = async (req, res) => {
  const {id} = req.params;
  try {
    const result =  await Cliente.delete(id);
    if(result.affectedRows == 0){
     return res.status(404).json({error:'cliente no encontrado'});
    }
    res.json({ message: 'Cliente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

module.exports = {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente
};
