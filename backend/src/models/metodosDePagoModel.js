const db = require('../database/db');

module.exports = {
  getAll: async () => {
    const [rows] = await db.query('SELECT * FROM metodos_pago');
    return rows;
  },

   create: async (req, res) => {
    try {
      const { nombre } = req.body; 
      if (!nombre) {
        return res.status(400).json({ error: 'El nombre del método de pago es obligatorio.' });
      }
      const result = await metodosDePagoModel.create(nombre); 
      res.status(201).json({ message: 'Método de pago creado con éxito.', id: result.insertId });
    } catch (error) {
      console.error('Error al crear metodo de pago:', error);
      res.status(500).json({ error: 'Error al crear metodo de pago' });
    }
  }
};