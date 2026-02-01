const Articulo = require("../models/articulosModel");
const ArticuloComponente = require("../models/articulosComponentesModel");
const db = require("../database/db");

const categoriaExiste = async (id_categoria) => {
  const [rows] = await db.query(
    "SELECT 1 FROM categorias WHERE id_categoria = ?",
    [id_categoria],
  );
  return rows.length > 0;
};

const getArticulos = async (req, res) => {
  try {
    const {
      buscar = "",
      tipo_categoria = "",
      id_categoria = "",
      page,
      pageSize,
      sortBy,
      sortDir,
    } = req.query;

    const p = Math.max(1, parseInt(page) || 1);
    const ps = Math.min(10000, Math.max(1, parseInt(pageSize) || 25));

    const { data, total } = await Articulo.buscarArticulosPaginado({
      buscar,
      tipo_categoria,
      id_categoria,
      page: p,
      pageSize: ps,
      sortBy,
      sortDir,
    });
    const totalPages = Math.ceil(total / ps) || 1;
    return res.json({
      data,
      page: p,
      pageSize: ps,
      total,
      totalPages,
      hasNext: p < totalPages,
      hasPrev: p > 1,
      sortBy: sortBy || "descripcion",
      sortDir: String(sortDir).toLowerCase() === "desc" ? "desc" : "asc",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener articulos" });
  }
};

const getArticuloById = async (req, res) => {
  const { id } = req.params;
  try {
    const articulo = await Articulo.getById(id);
    if (!articulo)
      return res.status(404).json({ error: "Artículo no encontrado" });
    res.json(articulo);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener articulos" });
  }
};

const createArticulo = async (req, res) => {
  const {
    id_categoria,
    referencia,
    descripcion,
    precio_venta,
    precio_costo,
    es_compuesto = false,
    componentes,
    id_unidad = 1,
  } = req.body;

  let connection;

  try {
    const categoriaValida = await categoriaExiste(id_categoria);
    if (!categoriaValida) {
      return res
        .status(400)
        .json({ error: "La categoría especificada no existe" });
    }

    const [referenciaRows] = await db.query(
      "SELECT id_articulo FROM articulos WHERE referencia = ?",
      [referencia],
    );
    if (referenciaRows.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe un artículo con esa referencia" });
    }

    if (es_compuesto) {
      if (!Array.isArray(componentes) || componentes.length === 0) {
        return res.status(400).json({
          error: "Un artículo compuesto debe tener al menos un componente.",
        });
      }

      // Validar la estructura y existencia de cada componente
      for (const comp of componentes) {
        if (
          !comp.id ||
          typeof comp.cantidad !== "number" ||
          comp.cantidad <= 0
        ) {
          return res.status(400).json({
            error: `Formato de componente inválido: ${JSON.stringify(
              comp,
            )}. Se requieren 'id' y 'cantidad' (número positivo).`,
          });
        }

        // Verificar que el ID del componente exista como un artículo válido

        const [componenteArticuloRows] = await db.query(
          "SELECT id_articulo FROM articulos WHERE id_articulo = ?",
          [comp.id],
        );
        if (componenteArticuloRows.length === 0) {
          return res.status(400).json({
            error: `El componente con ID ${comp.id} no es un artículo válido.`,
          });
        }
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // Convertimos es_compuesto a 1 o 0 para la base de datos (tinyint)
    const esCompuestoParaDB = es_compuesto ? 1 : 0;

    // Creamos el artículo principal
    const articuloId = await Articulo.create(
      {
        referencia,
        descripcion,
        precio_venta,
        precio_costo,
        id_categoria,
        es_compuesto: esCompuestoParaDB,
        id_unidad,
      },
      connection,
    );

    if (es_compuesto) {
      for (const comp of componentes) {
        if (comp.id === articuloId) {
          await connection.rollback();
          return res.status(400).json({
            error: `Un artículo compuesto no puede contenerse a sí mismo como componente.`,
          });
        }
      }

      await ArticuloComponente.CreateComponentesEnLote(
        articuloId,
        componentes,
        connection,
      );
    }

    await connection.commit();

    const articuloCreado = await Articulo.getById(articuloId);

    res.status(201).json({
      message: "Artículo creado correctamente",
      articulo: articuloCreado,
    });
  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Error completo al crear el artículo:", err);
    // Devolvemos un error 500 si es un error inesperado de servidor
    return res.status(500).json({ error: "Error al crear el artículo." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

const getComponentesParaOrdenFabricacion = async (req, res) => {
  try {
    const { id } = req.params; // id del artículo padre
    const cantidad_padre = parseInt(req.query.cantidad_padre) || 1; // Cantidad del artículo padre en el pedido

    // Obtenemos los componentes usando el modelo mejorado
    const componentesBase = await ArticuloComponente.getByArticuloPadreId(id);

    if (componentesBase.length === 0) {
      // Si el artículo no tiene componentes o no se encuentra, devuelve un array vacío
      return res.json([]);
    }

    // Calcula la cantidad total requerida para cada componente
    const componentesFinales = componentesBase.map((comp) => ({
      id_articulo: comp.id_articulo,
      referencia: comp.referencia,
      descripcion: comp.descripcion,
      precio_venta: comp.precio_venta,
      precio_costo: comp.precio_costo,
      id_categoria: comp.id_categoria,
      es_compuesto: comp.es_compuesto,
      cantidad: comp.cantidad_requerida * cantidad_padre,
    }));

    res.json(componentesFinales);
  } catch (error) {
    console.error(
      "Error al obtener componentes para orden de fabricación:",
      error,
    );
    res.status(500).json({
      error: "Error interno del servidor al obtener los componentes.",
    });
  }
};

const updateArticulo = async (req, res) => {
  const { id } = req.params;
  const idArticulo = parseInt(id);
  // Validar referencia solo si viene en el body
  if (req.body.referencia !== undefined) {
    const [rows] = await db.query(
      "SELECT * FROM articulos WHERE referencia = ?  AND id_articulo != ?",
      [req.body.referencia, idArticulo],
    );
    if (rows.length > 0) {
      return res
        .status(400)
        .json({ error: "Ya existe un artículo con esa referencia" });
    }
  }
  // Validar existencia de la categoría solo si viene en el body
  if (req.body.id_categoria !== undefined) {
    const categoriaValida = await categoriaExiste(req.body.id_categoria);
    if (!categoriaValida) {
      return res
        .status(400)
        .json({ error: "La categoría especificada no existe" });
    }
  }
  try {
    const result = await Articulo.update(id, req.body);

    if (result.affectedRows == 0) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }
    res.json({ message: "Artículo actualizado" });
  } catch (error) {
    console.error("Error al actualizar artículo:", error);
    res.status(500).json({ error: "Error al actualizar artículo" });
  }
};

const deleteArticulo = async (req, res) => {
  const { id } = req.params;
  try {
    const [movimientos] = await db.query(
      "SELECT * FROM movimientos_inventario WHERE id_articulo = ?",
      [id],
    );

    if (movimientos.length > 0) {
      return res.status(400).json({
        error:
          "No puedes eliminar este artículo porque tiene movimientos registrados.",
      });
    }

    const result = await Articulo.delete(id);
    if (result.affectedRows == 0) {
      return res.status(404).json({ error: "Articulo no encontrado" });
    }
    res.json({ message: "Articulo eliminado" });
  } catch (error) {
    console.error("Error al eliminar artículo:", error.message);
    res.status(500).json({ error: "Error al eliminar articulo" });
  }
};
module.exports = {
  getArticulos,
  getArticuloById,
  createArticulo,
  updateArticulo,
  deleteArticulo,
  getComponentesParaOrdenFabricacion,
};
