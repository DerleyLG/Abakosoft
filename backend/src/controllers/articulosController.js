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

// Normaliza la referencia: recorta espacios y convierte a mayúsculas
// para evitar duplicados por diferencias de caja o espacios.
const normalizarReferencia = (ref) =>
  String(ref || "").trim().toUpperCase();

const getArticulos = async (req, res) => {
  try {
    const {
      buscar = "",
      tipo_categoria = "",
      id_categoria = "",
      solo_descatalogados = "",
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
      solo_descatalogados:
        solo_descatalogados === "1" || solo_descatalogados === "true",
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
      [normalizarReferencia(referencia)],
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
        referencia: normalizarReferencia(referencia),
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
  let connection;

  try {
    const {
      referencia,
      descripcion,
      precio_venta,
      precio_costo,
      id_categoria,
      id_unidad,
      id_etapa,
      es_compuesto,
      descatalogado,
      componentes,
    } = req.body;

    // Normalizar referencia si viene en el body
    const referenciaFinal =
      referencia !== undefined && referencia !== null
        ? normalizarReferencia(referencia)
        : undefined;

    // Validar referencia única (normalizada) solo si viene
    if (referenciaFinal !== undefined) {
      const [rows] = await db.query(
        "SELECT * FROM articulos WHERE referencia = ? AND id_articulo != ?",
        [referenciaFinal, idArticulo],
      );
      if (rows.length > 0) {
        return res
          .status(400)
          .json({ error: "Ya existe un artículo con esa referencia" });
      }
    }

    // Validar existencia de la categoría solo si viene en el body
    if (id_categoria !== undefined && id_categoria !== null) {
      const categoriaValida = await categoriaExiste(id_categoria);
      if (!categoriaValida) {
        return res
          .status(400)
          .json({ error: "La categoría especificada no existe" });
      }
    }

    // Obtener el artículo actual para conocer su estado de compuesto
    const articuloActual = await Articulo.getById(idArticulo);
    if (!articuloActual) {
      return res.status(404).json({ error: "Artículo no encontrado" });
    }

    // Determinar el valor final de es_compuesto (si viene o se conserva)
    const esCompuestoFinal =
      es_compuesto !== undefined && es_compuesto !== null
        ? es_compuesto
          ? 1
          : 0
        : articuloActual.es_compuesto
          ? 1
          : 0;

    // Validar componentes según el estado final
    if (esCompuestoFinal === 1) {
      if (!Array.isArray(componentes) || componentes.length === 0) {
        return res.status(400).json({
          error:
            "Un artículo compuesto debe tener al menos un componente válido.",
        });
      }
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
        if (Number(comp.id) === idArticulo) {
          return res.status(400).json({
            error: "Un artículo compuesto no puede contenerse a sí mismo como componente.",
          });
        }
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

    // Actualizar el artículo (incluye es_compuesto y descatalogado)
    const result = await Articulo.update(
      idArticulo,
      {
        referencia: referenciaFinal,
        descripcion,
        precio_venta,
        precio_costo,
        id_categoria,
        id_unidad,
        id_etapa,
        es_compuesto: esCompuestoFinal,
        descatalogado,
      },
      connection,
    );

    if (result.affectedRows == 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ error: "Artículo no encontrado" });
    }

    // Actualizar componentes: borrar y recrear si es compuesto,
    // o eliminar los existentes si dejó de serlo
    await ArticuloComponente.deleteByArticuloPadreId(idArticulo, connection);
    if (esCompuestoFinal === 1) {
      await ArticuloComponente.CreateComponentesEnLote(
        idArticulo,
        componentes,
        connection,
      );
    }

    await connection.commit();
    connection.release();

    res.json({ message: "Artículo actualizado" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
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
          "No puedes eliminar este artículo porque tiene movimientos registrados. Puedes descatalogarlo para ocultarlo de los selectores sin perder su histórico.",
      });
    }

    // Detectar referencias en otras tablas para dar un mensaje claro
    const [refs] = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM detalle_orden_venta WHERE id_articulo = ?) AS en_ventas,
        (SELECT COUNT(*) FROM detalle_orden_compra WHERE id_articulo = ?) AS en_compras,
        (SELECT COUNT(*) FROM detalle_orden_fabricacion WHERE id_articulo = ?) AS en_fabricacion,
        (SELECT COUNT(*) FROM detalle_pedido WHERE id_articulo = ?) AS en_pedidos,
        (SELECT COUNT(*) FROM articulos_componentes WHERE articulo_componente_id = ?) AS es_componente,
        (SELECT COUNT(*) FROM articulos_componentes WHERE articulo_padre_id = ?) AS tiene_componentes,
        (SELECT COUNT(*) FROM historial_costos WHERE id_articulo = ?) AS en_historial,
        (SELECT COUNT(*) FROM lotes_fabricados WHERE id_articulo = ?) AS en_lotes,
        (SELECT COUNT(*) FROM inventario WHERE id_articulo = ?) AS en_inventario`,
      [id, id, id, id, id, id, id, id, id],
    );
    const r = refs[0] || {};
    const usos = [
      r.en_ventas > 0 && `${r.en_ventas} venta(s)`,
      r.en_compras > 0 && `${r.en_compras} compra(s)`,
      r.en_fabricacion > 0 && `${r.en_fabricacion} orden(es) de fabricación`,
      r.en_pedidos > 0 && `${r.en_pedidos} pedido(s)`,
      r.es_componente > 0 && "es componente de otro artículo",
      r.tiene_componentes > 0 && "tiene componentes definidos",
      r.en_historial > 0 && "tiene historial de costos",
      r.en_lotes > 0 && "tiene lotes fabricados",
      r.en_inventario > 0 && "está en el inventario",
    ].filter(Boolean);

    if (usos.length > 0) {
      return res.status(400).json({
        error: `No puedes eliminar este artículo porque ${usos.join(
          ", ",
        )}. Puedes descatalogarlo para ocultarlo de los selectores sin perder su histórico.`,
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
