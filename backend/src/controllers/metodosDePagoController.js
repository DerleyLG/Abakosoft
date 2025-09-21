const metodosDePagoModel = require('../models/metodosDePagoModel');

module.exports = {
     getMetodosPago: async (req, res) => {
        try {
            const metodos = await metodosDePagoModel.getAll();
            res.json(metodos);
        } catch (error) {
            console.error('Error al obtener los metodos de pago:', error);
            res.status(500).json({ error: 'Error al obtener los metodos de pago' });
        }
     }
     ,
         create: async (req, res) => {
        try {
            const insert = await metodosDePagoModel.create();
            res.json(insert);
        } catch (error) {
            console.error('Error al crearmetodo de pago:', error);
            res.status(500).json({ error: 'Error al crear metodo de pago' });
        }

    }
}