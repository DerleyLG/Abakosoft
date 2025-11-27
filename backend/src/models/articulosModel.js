const db = require("../database/db");

const Articulo = {
  async getAll() {
    const [rows] = await db.query(`
    SELECT 
      a.*, 
      c.nombre AS nombre_categoria
    FROM 
      articulos a
    LEFT JOIN 
      categorias c ON a.id_categoria = c.id_categoria
  `);
    return rows;
  },

  getById: async (id, connection = db) => {
    const [rows] = await (connection || db).query(
      "SELECT * FROM articulos WHERE id_articulo = ?",
      [id]
    );
    return rows[0] || null;
  },

  async create(
    {
      referencia,
      descripcion,
      precio_venta,
      precio_costo,
      id_categoria,
      es_compuesto = false,
    },
    connection = db
  ) {
    const [result] = await (connection || db).query(
      "INSERT INTO articulos (referencia, descripcion, precio_venta, id_categoria, precio_costo, es_compuesto) VALUES (?, ?, ?, ?, ?, ?)",
      [
        referencia,
        descripcion,
        precio_venta,
        id_categoria,
        precio_costo,
        es_compuesto,
      ]
    );
    return result.insertId;
  },

  async update(
    id,
    { referencia, descripcion, precio_venta, precio_costo, id_categoria }
  ) {
    const [result] = await db.query(
      "UPDATE articulos SET referencia=?, descripcion=?, precio_venta=?,precio_costo=?, id_categoria=? WHERE id_articulo=?",
      [referencia, descripcion, precio_venta, precio_costo, id_categoria, id]
    );
    return result;
  },

  async delete(id) {
    const [result] = await db.query(
      "DELETE FROM articulos WHERE id_articulo=?",
      [id]
    );
    return result;
  },

  async buscarArticulos(filtro) {
    const [rows] = await db.query(
      `
    SELECT a.*, c.nombre AS nombre_categoria
    FROM articulos a
    LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
    WHERE a.referencia LIKE ? OR a.descripcion LIKE ? OR c.nombre LIKE ?
  `,
      [`%${filtro}%`, `%${filtro}%`, `%${filtro}%`]
    );

    return rows;
  },

  async buscarArticulosPaginado({
    buscar = "",
    tipo_categoria = "",
    id_categoria = "",
    page = 1,
    pageSize = 25,
    sortBy = "descripcion",
    sortDir = "asc",
  }) {
    // Sanitizar y mapear columnas ordenables a expresiones SQL seguras
    const SORT_MAP = {
      referencia: "a.referencia",
      descripcion: "a.descripcion",
      precio_venta: "a.precio_venta",
      precio_costo: "a.precio_costo",
      nombre_categoria: "c.nombre",
    };
    const sortCol = SORT_MAP[sortBy] || SORT_MAP.descripcion;
    const dir = String(sortDir).toLowerCase() === "desc" ? "DESC" : "ASC";

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(10000, Math.max(1, parseInt(pageSize) || 25));
    const offset = (p - 1) * ps;

    const like = `%${buscar}%`;

    // Construir condición de filtro
    let whereCondition =
      "(a.referencia LIKE ? OR a.descripcion LIKE ? OR c.nombre LIKE ?)";
    let params = [like, like, like];

    // Agregar filtro por categoría específica (tiene prioridad)
    if (id_categoria) {
      whereCondition += " AND a.id_categoria = ?";
      params.push(id_categoria);
    }
    // Si no hay categoría específica, filtrar por tipo de categoría
    else if (tipo_categoria) {
      whereCondition += " AND c.tipo = ?";
      params.push(tipo_categoria);
    }

    // Consulta de datos paginados
    const [rows] = await db.query(
      `SELECT a.*, c.nombre AS nombre_categoria
       FROM articulos a
       LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
       WHERE ${whereCondition}
       ORDER BY ${sortCol} ${dir}
       LIMIT ? OFFSET ?`,
      [...params, ps, offset]
    );

    // Conteo total con el mismo filtro
    const [countRows] = await db.query(
      `SELECT COUNT(*) as total
       FROM articulos a
       LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
       WHERE ${whereCondition}`,
      params
    );
    const total = countRows[0]?.total || 0;

    return { data: rows, total };
  },

  async esCompuesto(id_articulo) {
    const [rows] = await db.query(
      `SELECT es_compuesto FROM articulos WHERE id_articulo = ?`,
      [id_articulo]
    );
    // Devuelve true si el artículo existe y es compuesto (es_compuesto = 1)
    return rows.length > 0 && rows[0].es_compuesto === 1;
  },
};

module.exports = Articulo;
