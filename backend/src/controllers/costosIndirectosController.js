const CostosIndirectos = require("../models/costosIndirectosModel");
const CostosIndirectosAsignados = require("../models/costosIndirectosAsignadosModel");
const db = require("../database/db");
const {
  validarFechaNoEnPeriodoCerrado,
} = require("../utils/validacionCierres");

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const sortBy = req.query.sortBy || "fecha";
    const sortDir = req.query.sortDir || "desc";
    const offset = (page - 1) * pageSize;

    // Validar sortBy para evitar SQL injection
    const allowedSortFields = [
      "fecha",
      "tipo_costo",
      "valor",
      "fecha_inicio",
      "fecha_fin",
    ];
    const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : "fecha";
    const validSortDir = sortDir.toLowerCase() === "asc" ? "ASC" : "DESC";

    // Obtener total de registros
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM costos_indirectos"
    );
    const total = countResult[0].total;

    // Obtener registros paginados
    const [rows] = await db.query(
      `SELECT * FROM costos_indirectos 
       ORDER BY ${validSortBy} ${validSortDir} 
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    res.json({
      data: rows,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await CostosIndirectos.getById(req.params.id);
    if (rows.length === 0)
      return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCostoIndirecto = async (req, res) => {
  const {
    tipo_costo,
    fecha,
    valor,
    observaciones,
    fecha_inicio,
    fecha_fin,
    id_orden_fabricacion,
    asignaciones,
    id_metodo_pago,
    referencia,
    observaciones_pago,
  } = req.body;

  if (!tipo_costo || !fecha || valor === undefined) {
    return res.status(400).json({
      error: "Los campos tipo_costo, fecha y valor son obligatorios",
    });
  }

  if (typeof tipo_costo !== "string" || tipo_costo.trim() === "") {
    return res.status(400).json({
      error: "tipo_costo debe ser una cadena de texto no vacía",
    });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({
      error: "El valor debe ser un número positivo",
    });
  }

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return res.status(400).json({
      error: "La fecha debe estar en formato YYYY-MM-DD",
    });
  }

  // Validar que la fecha no esté en un período cerrado
  const validacion = await validarFechaNoEnPeriodoCerrado(fecha);
  if (!validacion.valido) {
    return res.status(400).json({ error: validacion.error });
  }

  try {
    const [result] = await CostosIndirectos.create({
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
    });

    const created = {
      id: result.insertId,
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
    };

    // Registrar movimiento en tesorería (ahora obligatorio)
    if (Number(valor) > 0) {
      try {
        const tesoreriaModel = require("../models/tesoreriaModel");
        await tesoreriaModel.insertarMovimiento({
          id_documento: created.id,
          tipo_documento: "costo_indirecto",
          monto: -Math.abs(Number(valor)),
          id_metodo_pago,
          referencia: referencia || null,
          observaciones: observaciones_pago || null,
          fecha_movimiento: fecha,
        });
        created.movimiento_tesoreria = true;
      } catch (err) {
        created.movimiento_tesoreria = false;
        created.movimiento_tesoreria_error = err.message;
      }
    }

    const d = new Date(fecha);
    const anio = d.getFullYear();
    const mes = d.getMonth() + 1; // 1-12

    // Modo asignación múltiple si viene 'asignaciones' como arreglo
    if (Array.isArray(asignaciones) && asignaciones.length > 0) {
      // Validar montos
      const montos = asignaciones.map((a) => Number(a?.valor_asignado || 0));
      const suma = montos.reduce(
        (acc, n) => acc + (Number.isFinite(n) ? n : 0),
        0
      );
      if (suma !== Number(valor)) {
        return res.status(400).json({
          error:
            "La suma de los valores asignados debe ser exactamente igual al valor del costo.",
        });
      }
      for (const a of asignaciones) {
        const idof = Number(a?.id_orden_fabricacion);
        const val = Number(a?.valor_asignado);
        if (
          !Number.isFinite(idof) ||
          idof <= 0 ||
          !Number.isFinite(val) ||
          val <= 0
        ) {
          return res.status(400).json({
            error: "Asignación inválida: verifique OF y valores positivos.",
          });
        }
      }
      // Verificar estados de OF y crear asignaciones
      const idsOF = asignaciones.map((a) => Number(a.id_orden_fabricacion));
      const placeholders = idsOF.map(() => "?").join(",");
      const [estadoRows] = await db.query(
        `SELECT id_orden_fabricacion, estado FROM ordenes_fabricacion WHERE id_orden_fabricacion IN (${placeholders})`,
        idsOF
      );
      const estadoMap = new Map(
        estadoRows.map((r) => [Number(r.id_orden_fabricacion), r.estado])
      );
      for (const a of asignaciones) {
        const estado = estadoMap.get(Number(a.id_orden_fabricacion));
        if (!estado) {
          return res
            .status(400)
            .json({ error: `La OF #${a.id_orden_fabricacion} no existe.` });
        }
        if (["cancelada", "completada"].includes(String(estado))) {
          return res.status(400).json({
            error: `No se puede asignar a la OF #${a.id_orden_fabricacion} con estado '${estado}'.`,
          });
        }
      }
      // Crear asignaciones válidas
      for (const a of asignaciones) {
        await CostosIndirectosAsignados.create({
          id_costo_indirecto: created.id,
          id_orden_fabricacion: Number(a.id_orden_fabricacion),
          anio,
          mes,
          valor_asignado: Number(a.valor_asignado),
          observaciones:
            a?.observaciones || "Asignación múltiple al registrar el costo",
        });
      }
      created.asignaciones_creadas = asignaciones.length;
    } else if (id_orden_fabricacion) {
      // Asignación automática opcional a una OF si viene informada (modo único)
      try {
        // Validar estado de la OF
        const [rows] = await db.query(
          `SELECT estado FROM ordenes_fabricacion WHERE id_orden_fabricacion = ?`,
          [Number(id_orden_fabricacion)]
        );
        if (!rows.length) {
          return res
            .status(400)
            .json({ error: `La OF #${id_orden_fabricacion} no existe.` });
        }
        if (["cancelada", "completada"].includes(String(rows[0].estado))) {
          return res.status(400).json({
            error: `No se puede asignar a la OF #${id_orden_fabricacion} con estado '${rows[0].estado}'.`,
          });
        }
        await CostosIndirectosAsignados.create({
          id_costo_indirecto: created.id,
          id_orden_fabricacion: Number(id_orden_fabricacion),
          anio,
          mes,
          valor_asignado: Number(valor),
          observaciones: "Asignación automática al registrar el costo",
        });
        created.id_orden_fabricacion = Number(id_orden_fabricacion);
      } catch (e) {
        // No romper la creación del costo si falla la asignación; informar con warning
        console.error(
          "Fallo al crear asignación automática de costo indirecto:",
          e
        );
        created.asignacion_warning =
          "Costo creado, pero no se pudo asignar automáticamente a la OF.";
      }
    }

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { tipo_costo, fecha, valor, observaciones, fecha_inicio, fecha_fin } =
    req.body;

  if (!id) {
    return res.status(400).json({ error: "El ID es obligatorio" });
  }

  if (!tipo_costo || !fecha || valor === undefined) {
    return res.status(400).json({
      error: "Los campos tipo_costo, fecha y valor son obligatorios",
    });
  }

  if (typeof tipo_costo !== "string" || tipo_costo.trim() === "") {
    return res.status(400).json({
      error: "tipo_costo debe ser una cadena de texto no vacía",
    });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({
      error: "El valor debe ser un número positivo",
    });
  }

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return res.status(400).json({
      error: "La fecha debe estar en formato YYYY-MM-DD",
    });
  }

  try {
    const [result] = await CostosIndirectos.update(id, {
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Costo indirecto no encontrado" });
    }

    res
      .status(200)
      .json({ message: "Costo indirecto actualizado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "El ID es obligatorio" });
  }

  try {
    const [result] = await CostosIndirectos.delete(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Costo indirecto no encontrado" });
    }

    res
      .status(200)
      .json({ message: "Costo indirecto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
