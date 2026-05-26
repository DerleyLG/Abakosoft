const rolesModel = require("../models/rolesModel");
const permisosRolModel = require("../models/permisosRolModel");

const ALL_PERMISSIONS = [
  "articles:view",
  "articles:create",
  "articles:edit",
  "articles:delete",
  "categories:view",
  "categories:create",
  "categories:edit",
  "categories:delete",
  "suppliers:view",
  "suppliers:create",
  "suppliers:edit",
  "suppliers:delete",
  "clients:view",
  "clients:create",
  "clients:edit",
  "clients:delete",
  "workers:view",
  "workers:create",
  "workers:edit",
  "workers:delete",
  "inventory:view",
  "inventory:create",
  "inventory:edit",
  "inventory:delete",
  "inventory:consume",
  "inventory:tracking",
  "movements:view",
  "sales:view",
  "sales:create",
  "sales:edit",
  "sales:delete",
  "orders:view",
  "orders:create",
  "orders:edit",
  "orders:delete",
  "fabrication:view",
  "fabrication:create",
  "fabrication:edit",
  "fabrication:delete",
  "advances:view",
  "advances:create",
  "advances:edit",
  "advances:edit_quantity",
  "kanban:view",
  "kanban:manage",
  "progress:view",
  "purchases:view",
  "purchases:create",
  "purchases:edit",
  "purchases:delete",
  "payments:view",
  "payments:create",
  "payments:delete",
  "anticipos:view",
  "credits:view",
  "credits:create",
  "credits:manage",
  "indirect_costs:view",
  "indirect_costs:create",
  "indirect_costs:edit",
  "indirect_costs:delete",
  "indirect_costs:assign",
  "treasury:view",
  "treasury:manage",
  "cash_closings:view",
  "cash_closings:create",
  "cash_closings:close",
  "cash_closings:delete",
  "production_stages:view",
  "production_stages:manage",
  "cost_history:view",
  "payment_methods:view",
  "payment_methods:manage",
  "outsourced_services:view",
  "outsourced_services:manage",
  "units:view",
  "units:manage",
  "reports:view",
  "users:manage",
];

const OPERARIO_PERMISSIONS = [
  "articles:view",
  "categories:view",
  "suppliers:view",
  "clients:view",
  "workers:view",
  "inventory:view",
  "inventory:consume",
  "inventory:tracking",
  "movements:view",
  "sales:view",
  "orders:view",
  "fabrication:view",
  "fabrication:create",
  "advances:view",
  "advances:create",
  "kanban:view",
  "kanban:manage",
  "progress:view",
  "purchases:view",
  "payments:view",
  "anticipos:view",
  "credits:view",
  "production_stages:view",
  "payment_methods:view",
  "outsourced_services:view",
  "units:view",
  "reports:view",
];

function getSystemRoleDefaults(nombre_rol) {
  if (nombre_rol === "admin") return ALL_PERMISSIONS;
  if (nombre_rol === "supervisor")
    return ALL_PERMISSIONS.filter((p) => p !== "users:manage");
  if (nombre_rol === "operario") return OPERARIO_PERMISSIONS;
  return [];
}

module.exports = {
  // GET /api/roles
  async getAll(req, res) {
    try {
      const roles = await rolesModel.getAll();
      res.json(roles);
    } catch (err) {
      console.error("Error al obtener roles:", err);
      res.status(500).json({ error: "Error al obtener roles" });
    }
  },

  // GET /api/roles/:id
  async getById(req, res) {
    try {
      const rol = await rolesModel.getById(req.params.id);
      if (!rol) return res.status(404).json({ error: "Rol no encontrado" });
      let permisos = await permisosRolModel.getByRolId(rol.id_rol);

      // Auto-seed system roles on first access if permisos_rol is empty
      if (permisos.length === 0 && [1, 2, 3].includes(Number(rol.id_rol))) {
        const defaults = getSystemRoleDefaults(rol.nombre_rol);
        if (defaults.length > 0) {
          await permisosRolModel.setPermisos(rol.id_rol, defaults);
          permisos = defaults;
        }
      }

      res.json({ ...rol, permisos });
    } catch (err) {
      console.error("Error al obtener rol:", err);
      res.status(500).json({ error: "Error al obtener rol" });
    }
  },

  // POST /api/roles
  async create(req, res) {
    try {
      const { nombre_rol, permisos } = req.body;
      if (!nombre_rol || !nombre_rol.trim()) {
        return res
          .status(400)
          .json({ error: "El nombre del rol es requerido" });
      }
      const id = await rolesModel.create(nombre_rol.trim().toLowerCase());
      if (Array.isArray(permisos) && permisos.length > 0) {
        await permisosRolModel.setPermisos(id, permisos);
      }
      res.status(201).json({
        id_rol: id,
        nombre_rol: nombre_rol.trim().toLowerCase(),
        permisos: permisos || [],
      });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "Ya existe un rol con ese nombre" });
      }
      console.error("Error al crear rol:", err);
      res.status(500).json({ error: "Error al crear rol" });
    }
  },

  // PUT /api/roles/:id
  async update(req, res) {
    try {
      const { nombre_rol, permisos } = req.body;
      const id = req.params.id;

      // El rol admin no puede modificarse
      const rolActual = await rolesModel.getById(id);
      if (rolActual && rolActual.nombre_rol === "admin") {
        return res.status(403).json({
          error: "Los permisos del rol Administrador no pueden modificarse.",
        });
      }

      if (nombre_rol !== undefined) {
        if (!nombre_rol.trim()) {
          return res
            .status(400)
            .json({ error: "El nombre del rol no puede estar vacío" });
        }
        await rolesModel.update(id, nombre_rol.trim().toLowerCase());
      }

      if (Array.isArray(permisos)) {
        await permisosRolModel.setPermisos(id, permisos);
      }

      const rol = await rolesModel.getById(id);
      const permisosActuales = await permisosRolModel.getByRolId(id);
      res.json({ ...rol, permisos: permisosActuales });
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "Ya existe un rol con ese nombre" });
      }
      console.error("Error al actualizar rol:", err);
      res.status(500).json({ error: "Error al actualizar rol" });
    }
  },

  // DELETE /api/roles/:id
  async delete(req, res) {
    try {
      const id = req.params.id;
      // No permitir borrar los 3 roles base
      if ([1, 2, 3].includes(Number(id))) {
        return res
          .status(400)
          .json({ error: "No se pueden eliminar los roles predeterminados" });
      }
      await permisosRolModel.deleteByRolId(id);
      const affected = await rolesModel.delete(id);
      if (!affected)
        return res.status(404).json({ error: "Rol no encontrado" });
      res.json({ message: "Rol eliminado correctamente" });
    } catch (err) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({
          error: "No se puede eliminar: hay usuarios asignados a este rol",
        });
      }
      console.error("Error al eliminar rol:", err);
      res.status(500).json({ error: "Error al eliminar rol" });
    }
  },

  // GET /api/roles/:id/permisos
  async getPermisos(req, res) {
    try {
      const permisos = await permisosRolModel.getByRolId(req.params.id);
      res.json(permisos);
    } catch (err) {
      console.error("Error al obtener permisos:", err);
      res.status(500).json({ error: "Error al obtener permisos" });
    }
  },
};
