const db = require("../database/db");

const ordenCompras = {
  //obtener ordenes
  async getAll() {
    const [rows] = await db.query(`
    SELECT 
      oc.id_orden_compra,
      oc.fecha,
      oc.estado,
      oc.id_proveedor,
      p.nombre AS proveedor,
      SUM(doc.cantidad * doc.precio_unitario) AS total
    FROM ordenes_compra oc
    JOIN proveedores p ON oc.id_proveedor = p.id_proveedor
    LEFT JOIN detalle_orden_compra doc ON oc.id_orden_compra = doc.id_orden_compra
    GROUP BY oc.id_orden_compra
    ORDER BY oc.fecha DESC
  `);
    return rows;
  },

  //obtener ordenes por id
  async getById(id) {
    const [rows] = await db.query(
      "SELECT * FROM ordenes_compra WHERE id_orden_compra=?",
      [id]
    );
    return rows[0];
  },

  //Insertar una nueva orden de compra
  async create(id_proveedor, categoria_costo, id_orden_fabricacion, estado) {
    console.log("==> INSERTANDO EN ordenes_compra");
    const [result] = await db.query(
      "INSERT INTO ordenes_compra (id_proveedor, categoria_costo, id_orden_fabricacion, estado) VALUES (?,?,?,?)",
      [id_proveedor, categoria_costo, id_orden_fabricacion, estado]
    );
    return result.insertId;
  },

  //Actualizar una orden de compra
  async update(
    id,
    { id_proveedor, categoria_costo, id_orden_fabricacion, estado }
  ) {
    const [result] = await db.query(
      "UPDATE ordenes_compra SET id_proveedor=?, categoria_costo=?, id_orden_fabricacion=?, estado=? WHERE id_orden_compra =?",
      [id_proveedor, categoria_costo, id_orden_fabricacion, estado, id]
    );
    return result;
  },

  async delete(id) {
    const [result] = await db.query(
      "DELETE FROM ordenes_compra WHERE id_orden_compra =?",
      [id]
    );
    return result;
  },
};

module.exports = ordenCompras;
