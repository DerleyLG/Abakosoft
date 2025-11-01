const Model = require("../models/costosIndirectosAsignadosModel");
const AvanceModel = require("../models/avanceEtapasModel");

const isValidMes = (mes) => mes >= 1 && mes <= 12;
const isValidAnio = (anio) => anio >= 2020 && anio <= new Date().getFullYear();

module.exports = {
  getAll: async (req, res) => {
    try {
      const datos = await Model.getAll();
      res.json(datos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
  // Sugerencias de distribución por driver (cantidad | avances | costo)
  getSugerencias: async (req, res) => {
    try {
      const anio = parseInt(req.query.anio, 10);
      const mes = parseInt(req.query.mes, 10);
      const driver = String(req.query.driver || "cantidad");
      const total = req.query.total ? parseInt(req.query.total, 10) : null;
      const estados = req.query.estados
        ? String(req.query.estados)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : ["pendiente", "en proceso"];

      if (!isValidMes(mes)) {
        return res.status(400).json({ error: "Mes inválido (1-12)" });
      }
      if (!isValidAnio(anio)) {
        return res.status(400).json({ error: "Año inválido" });
      }
      if (!["cantidad", "avances", "costo"].includes(driver)) {
        return res
          .status(400)
          .json({ error: "Driver inválido. Use cantidad | avances | costo" });
      }

      const rows = await AvanceModel.getDriverSumByMes({
        anio,
        mes,
        driver,
        estados,
      });
      if (!rows || rows.length === 0) {
        return res.json([]);
      }

      const totalDriver = rows.reduce(
        (acc, r) => acc + Number(r.valor || 0),
        0
      );
      if (totalDriver <= 0) {
        return res.json([]);
      }

      // Construye pesos y, si total viene, valores asignados enteros que suman exactamente total
      let sugerencias = rows.map((r) => ({
        id_orden_fabricacion: r.id_orden_fabricacion,
        driver_valor: Number(r.valor || 0),
        peso: Number(r.valor || 0) / totalDriver,
      }));

      if (Number.isInteger(total) && total > 0) {
        // Asignación con redondeo por pisos y residuo
        const prelim = sugerencias.map((s) => ({
          ...s,
          valor_asignado: Math.floor(s.peso * total),
        }));
        let asignado = prelim.reduce((acc, s) => acc + s.valor_asignado, 0);
        let resto = total - asignado;
        // Ordenar por peso descendente para repartir residuo a los más representativos
        prelim.sort(
          (a, b) =>
            b.peso - a.peso || a.id_orden_fabricacion - b.id_orden_fabricacion
        );
        for (let i = 0; i < prelim.length && resto > 0; i++) {
          prelim[i].valor_asignado += 1;
          resto -= 1;
        }
        // Restaurar orden por id_orden_fabricacion asc
        prelim.sort((a, b) => a.id_orden_fabricacion - b.id_orden_fabricacion);
        sugerencias = prelim;
      }

      res.json(sugerencias);
    } catch (error) {
      console.error("Error en getSugerencias:", error);
      res
        .status(500)
        .json({ error: error.message || "Error obteniendo sugerencias" });
    }
  },
  getResumen: async (req, res) => {
    try {
      let ids = [];
      if (req.query.ids) {
        ids = String(req.query.ids)
          .split(",")
          .map((x) => parseInt(x, 10))
          .filter((n) => Number.isFinite(n) && n > 0);
      }
      if (!ids.length) {
        // No ids: devolver vacío para evitar carga completa innecesaria
        return res.json([]);
      }
      const rows = await Model.sumByCostoIds(ids);
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  create: async (req, res) => {
    const {
      id_costo_indirecto,
      id_orden_fabricacion,
      anio,
      mes,
      valor_asignado,
    } = req.body;

    if (
      !id_costo_indirecto ||
      !id_orden_fabricacion ||
      !anio ||
      !mes ||
      !valor_asignado
    ) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    if (!isValidMes(mes)) {
      return res.status(400).json({ error: "Mes inválido (1-12)" });
    }

    if (!isValidAnio(anio)) {
      return res.status(400).json({ error: "Año inválido" });
    }

    try {
      const id = await Model.create(req.body);
      res.status(201).json({ message: "Asignación creada", id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  update: async (req, res) => {
    const id = req.params.id;
    const {
      id_costo_indirecto,
      id_orden_fabricacion,
      anio,
      mes,
      valor_asignado,
    } = req.body;

    if (
      !id_costo_indirecto ||
      !id_orden_fabricacion ||
      !anio ||
      !mes ||
      !valor_asignado
    ) {
      return res
        .status(400)
        .json({ error: "Todos los campos son obligatorios" });
    }

    if (!isValidMes(mes)) {
      return res.status(400).json({ error: "Mes inválido (1-12)" });
    }

    if (!isValidAnio(anio)) {
      return res.status(400).json({ error: "Año inválido" });
    }

    try {
      await Model.update(id, req.body);
      res.json({ message: "Asignación actualizada" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  delete: async (req, res) => {
    const id = req.params.id;
    try {
      await Model.delete(id);
      res.json({ message: "Asignación eliminada" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};
