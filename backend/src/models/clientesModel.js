const db = require('../database/db');

const Cliente = {
  async getAll() {
    const [rows] = await db.query('SELECT * FROM clientes');
    return rows;
  },

 getById: async (id, connection = db) => { // Acepta 'connection' opcional
    const [rows] = await (connection || db).query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
    return rows[0] || null;
  },

  async create({ nombre, identificacion, telefono, direccion, ciudad, departamento }) {
    const [result] = await db.query(
      `INSERT INTO clientes
        (nombre, identificacion, telefono, direccion, ciudad, departamento)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, identificacion, telefono, direccion, ciudad, departamento]
    );
    
    return result.insertId;
  },

  async update(id, { nombre, identificacion, telefono, direccion, ciudad, departamento }) {
   const [result] = await db.query(
      `UPDATE clientes SET
        nombre=?, identificacion=?, telefono=?, direccion=?, ciudad=?, departamento=?
       WHERE id_cliente = ?`,
      [nombre, identificacion, telefono, direccion, ciudad, departamento, id]
    );
    return result;
  },

  async delete(id) {
    const [result] = await db.query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
    return result;
  }

};

module.exports = Cliente;
