const db = require("../database/db");

module.exports = {
  // Obtener permisos de un rol
  async getByRolId(id_rol) {
    const [rows] = await db.query(
      `SELECT accion FROM permisos_rol WHERE id_rol = ?`,
      [id_rol],
    );
    return rows.map((r) => r.accion);
  },

  // Reemplazar todos los permisos de un rol
  async setPermisos(id_rol, acciones) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`DELETE FROM permisos_rol WHERE id_rol = ?`, [id_rol]);
      if (acciones.length > 0) {
        const values = acciones.map((a) => [id_rol, a]);
        await conn.query(`INSERT INTO permisos_rol (id_rol, accion) VALUES ?`, [
          values,
        ]);
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Eliminar todos los permisos de un rol
  async deleteByRolId(id_rol) {
    await db.query(`DELETE FROM permisos_rol WHERE id_rol = ?`, [id_rol]);
  },
};
