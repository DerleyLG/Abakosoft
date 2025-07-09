const CostosIndirectos = require('../models/costosIndirectosModel');

exports.getAll = async (req, res) => {
  try {
    const [rows] = await CostosIndirectos.getAll();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const [rows] = await CostosIndirectos.getById(req.params.id);
    if (rows.length === 0) return res.status(404).json({ error: 'No encontrado' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCostoIndirecto = async (req, res) => {
  const { tipo_costo, fecha, valor, observaciones } = req.body;

  if (!tipo_costo || !fecha || valor === undefined) {
    return res.status(400).json({
      error: 'Los campos tipo_costo, fecha y valor son obligatorios',
    });
  }

  if (typeof tipo_costo !== 'string' || tipo_costo.trim() === '') {
    return res.status(400).json({
      error: 'tipo_costo debe ser una cadena de texto no vacía',
    });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({
      error: 'El valor debe ser un número positivo',
    });
  }

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return res.status(400).json({
      error: 'La fecha debe estar en formato YYYY-MM-DD',
    });
  }

  try {
    const [result] = await CostosIndirectos.create({
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
    });

    res.status(201).json({
      id: result.insertId,
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  const { id } = req.params;
  const { tipo_costo, fecha, valor, observaciones } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'El ID es obligatorio' });
  }

  if (!tipo_costo || !fecha || valor === undefined) {
    return res.status(400).json({
      error: 'Los campos tipo_costo, fecha y valor son obligatorios',
    });
  }

  if (typeof tipo_costo !== 'string' || tipo_costo.trim() === '') {
    return res.status(400).json({
      error: 'tipo_costo debe ser una cadena de texto no vacía',
    });
  }

  if (isNaN(valor) || Number(valor) <= 0) {
    return res.status(400).json({
      error: 'El valor debe ser un número positivo',
    });
  }

  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha)) {
    return res.status(400).json({
      error: 'La fecha debe estar en formato YYYY-MM-DD',
    });
  }

  try {
    const [result] = await CostosIndirectos.update(id, {
      tipo_costo,
      fecha,
      valor,
      observaciones: observaciones || null,
    });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Costo indirecto no encontrado' });
    }

    res.status(200).json({ message: 'Costo indirecto actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
 const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'El ID es obligatorio' });
  }

  try {
    const [result] = await CostosIndirectos.delete(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Costo indirecto no encontrado' });
    }

    res.status(200).json({ message: 'Costo indirecto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
