const db = require('../database/db');

const proveedor = {
  async getAll() {
    const [rows] = await db.query("SELECT * FROM proveedores");
    return rows;
  },

  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM proveedores WHERE id_proveedor = ?", [id]);
    return rows[0];
  },

  async create({nombre,identificacion,telefono,direccion,ciudad,departamento,}) {
    const [result] = await db.query(
      "INSERT INTO proveedores (nombre, identificacion, telefono, direccion, ciudad, departamento) VALUES (?, ?, ?, ?, ?, ?)",
      [nombre, identificacion, telefono, direccion, ciudad, departamento]
    );
    return result.insertId;
  },

    async update(id, { nombre, identificacion, telefono, direccion, ciudad, departamento }
  ) {
    const [result] = await db.query(
      "UPDATE proveedores SET nombre=?, identificacion=?, telefono=?, direccion=?, ciudad=?, departamento=? WHERE id_proveedor = ?",
      [nombre, identificacion, telefono, direccion, ciudad, departamento, id]
    );
    return result;
  },
    async delete (id){
        const [result] = await db.query('DELETE FROM proveedores WHERE id_proveedor = ?', [id]);
        return result;
      }

};
module.exports = proveedor