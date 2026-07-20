const db = require("../database/db");

const Cliente = {
  async getAll() {
    const [rows] = await db.query("SELECT * FROM clientes");
    return rows;
  },

  getById: async (id, connection = db) => {
    // Acepta 'connection' opcional
    const [rows] = await (connection || db).query(
      "SELECT * FROM clientes WHERE id_cliente = ?",
      [id],
    );
    return rows[0] || null;
  },

  async create({
    nombre,
    identificacion,
    telefono,
    direccion,
    ciudad,
    departamento,
  }) {
    const [result] = await db.query(
      `INSERT INTO clientes
        (nombre, identificacion, telefono, direccion, ciudad, departamento)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, identificacion, telefono, direccion, ciudad, departamento],
    );

    return result.insertId;
  },

  async update(
    id,
    { nombre, identificacion, telefono, direccion, ciudad, departamento },
  ) {
    const [result] = await db.query(
      `UPDATE clientes SET
        nombre=?, identificacion=?, telefono=?, direccion=?, ciudad=?, departamento=?
       WHERE id_cliente = ?`,
      [nombre, identificacion, telefono, direccion, ciudad, departamento, id],
    );
    return result;
  },

  async delete(id) {
    const [result] = await db.query(
      "DELETE FROM clientes WHERE id_cliente = ?",
      [id],
    );
    return result;
  },

  // Gestión de saldo a favor
  getSaldoFavor: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT COALESCE(saldo_favor, 0) AS saldo_favor FROM clientes WHERE id_cliente = ?",
      [id],
    );
    return Number(rows[0]?.saldo_favor || 0);
  },

  incrementarSaldoFavor: async (id, monto, connection = db) => {
    const [result] = await (connection || db).query(
      "UPDATE clientes SET saldo_favor = COALESCE(saldo_favor, 0) + ? WHERE id_cliente = ?",
      [monto, id],
    );
    return result.affectedRows;
  },

  decrementarSaldoFavor: async (id, monto, connection = db) => {
    const [result] = await (connection || db).query(
      "UPDATE clientes SET saldo_favor = GREATEST(0, COALESCE(saldo_favor, 0) - ?) WHERE id_cliente = ?",
      [monto, id],
    );
    return result.affectedRows;
  },

  getTotalSaldoFavor: async (connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT COALESCE(SUM(COALESCE(saldo_favor, 0)), 0) AS total FROM clientes",
    );
    return Number(rows[0]?.total || 0);
  },
};

module.exports = Cliente;
