const { ROLES } = require("../constants/roles");
const permisosRolModel = require("../models/permisosRolModel");
const db = require("../database/db");

const ACTIONS = {
  // Artículos
  ARTICLES_VIEW: "articles:view",
  ARTICLES_CREATE: "articles:create",
  ARTICLES_EDIT: "articles:edit",
  ARTICLES_DELETE: "articles:delete",

  // Categorías
  CATEGORIES_VIEW: "categories:view",
  CATEGORIES_CREATE: "categories:create",
  CATEGORIES_EDIT: "categories:edit",
  CATEGORIES_DELETE: "categories:delete",

  // Proveedores
  SUPPLIERS_VIEW: "suppliers:view",
  SUPPLIERS_CREATE: "suppliers:create",
  SUPPLIERS_EDIT: "suppliers:edit",
  SUPPLIERS_DELETE: "suppliers:delete",

  // Clientes
  CLIENTS_VIEW: "clients:view",
  CLIENTS_CREATE: "clients:create",
  CLIENTS_EDIT: "clients:edit",
  CLIENTS_DELETE: "clients:delete",

  // Trabajadores
  WORKERS_VIEW: "workers:view",
  WORKERS_CREATE: "workers:create",
  WORKERS_EDIT: "workers:edit",
  WORKERS_DELETE: "workers:delete",

  // Inventario
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_CREATE: "inventory:create",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  INVENTORY_CONSUME: "inventory:consume",
  INVENTORY_TRACKING: "inventory:tracking",
  MOVEMENTS_VIEW: "movements:view",

  // Órdenes de Venta
  SALES_VIEW: "sales:view",
  SALES_CREATE: "sales:create",
  SALES_EDIT: "sales:edit",
  SALES_DELETE: "sales:delete",

  // Órdenes de Pedido
  ORDERS_VIEW: "orders:view",
  ORDERS_CREATE: "orders:create",
  ORDERS_EDIT: "orders:edit",
  ORDERS_DELETE: "orders:delete",

  // Órdenes de Fabricación
  FABRICATION_VIEW: "fabrication:view",
  FABRICATION_CREATE: "fabrication:create",
  FABRICATION_EDIT: "fabrication:edit",
  FABRICATION_DELETE: "fabrication:delete",

  // Órdenes de Compra
  PURCHASES_VIEW: "purchases:view",
  PURCHASES_CREATE: "purchases:create",
  PURCHASES_EDIT: "purchases:edit",
  PURCHASES_DELETE: "purchases:delete",

  // Avances de Fabricación
  ADVANCES_VIEW: "advances:view",
  ADVANCES_CREATE: "advances:create",
  ADVANCES_EDIT: "advances:edit",
  ADVANCES_EDIT_QUANTITY: "advances:edit_quantity",

  // Kanban / Tablero Producción
  KANBAN_VIEW: "kanban:view",
  KANBAN_MANAGE: "kanban:manage",

  // Progreso de Fabricación
  PROGRESS_VIEW: "progress:view",

  // Pagos a Trabajadores
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_CREATE: "payments:create",
  PAYMENTS_DELETE: "payments:delete",

  // Anticipos
  ANTICIPOS_VIEW: "anticipos:view",

  // Ventas a Crédito / Abonos
  CREDITS_VIEW: "credits:view",
  CREDITS_CREATE: "credits:create",
  CREDITS_MANAGE: "credits:manage",

  // Costos Indirectos
  INDIRECT_COSTS_VIEW: "indirect_costs:view",
  INDIRECT_COSTS_CREATE: "indirect_costs:create",
  INDIRECT_COSTS_EDIT: "indirect_costs:edit",
  INDIRECT_COSTS_DELETE: "indirect_costs:delete",
  INDIRECT_COSTS_ASSIGN: "indirect_costs:assign",

  // Tesorería
  TREASURY_VIEW: "treasury:view",
  TREASURY_MANAGE: "treasury:manage",

  // Cierres de Caja
  CASH_CLOSINGS_VIEW: "cash_closings:view",
  CASH_CLOSINGS_CREATE: "cash_closings:create",
  CASH_CLOSINGS_CLOSE: "cash_closings:close",
  CASH_CLOSINGS_DELETE: "cash_closings:delete",

  // Etapas de Producción
  PRODUCTION_STAGES_VIEW: "production_stages:view",
  PRODUCTION_STAGES_MANAGE: "production_stages:manage",

  // Historial de Costos
  COST_HISTORY_VIEW: "cost_history:view",

  // Métodos de Pago
  PAYMENT_METHODS_VIEW: "payment_methods:view",
  PAYMENT_METHODS_MANAGE: "payment_methods:manage",

  // Servicios Tercerizados
  OUTSOURCED_SERVICES_VIEW: "outsourced_services:view",
  OUTSOURCED_SERVICES_MANAGE: "outsourced_services:manage",

  // Unidades de Medida
  UNITS_VIEW: "units:view",
  UNITS_MANAGE: "units:manage",

  // Reportes
  REPORTS_VIEW: "reports:view",

  // Gestión de Usuarios
  USERS_MANAGE: "users:manage",

  // Devoluciones
  RETURNS_VIEW: "returns:view",
  RETURNS_CREATE: "returns:create",
  RETURNS_CANCEL: "returns:cancel",

  // Reparaciones
  REPAIRS_VIEW: "repairs:view",
  REPAIRS_CREATE: "repairs:create",
  REPAIRS_DIAGNOSE: "repairs:diagnose",
  REPAIRS_MANAGE: "repairs:manage",
  REPAIRS_DELIVER: "repairs:deliver",
  REPAIRS_CANCEL: "repairs:cancel",
};

const rolePermissions = {
  [ROLES.OPERARIO]: [
    ACTIONS.RETURNS_VIEW,
    ACTIONS.RETURNS_CREATE,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.ORDERS_VIEW,
    ACTIONS.ORDERS_CREATE,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.ADVANCES_CREATE,
    ACTIONS.KANBAN_VIEW,
    ACTIONS.PROGRESS_VIEW,
    ACTIONS.PRODUCTION_STAGES_VIEW,
    ACTIONS.COST_HISTORY_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
    ACTIONS.OUTSOURCED_SERVICES_VIEW,
    ACTIONS.UNITS_VIEW,
    ACTIONS.REPAIRS_VIEW,
    ACTIONS.REPAIRS_CREATE,
  ],
  [ROLES.SUPERVISOR]: [
    ACTIONS.RETURNS_VIEW,
    ACTIONS.RETURNS_CREATE,
    ACTIONS.RETURNS_CANCEL,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.ARTICLES_CREATE,
    ACTIONS.ARTICLES_EDIT,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.CATEGORIES_CREATE,
    ACTIONS.CATEGORIES_EDIT,
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.SUPPLIERS_CREATE,
    ACTIONS.SUPPLIERS_EDIT,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.CLIENTS_CREATE,
    ACTIONS.CLIENTS_EDIT,
    ACTIONS.WORKERS_VIEW,
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_CREATE,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.INVENTORY_CONSUME,
    ACTIONS.INVENTORY_TRACKING,
    ACTIONS.MOVEMENTS_VIEW,
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.SALES_EDIT,
    ACTIONS.ORDERS_VIEW,
    ACTIONS.ORDERS_CREATE,
    ACTIONS.ORDERS_EDIT,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    ACTIONS.FABRICATION_EDIT,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.PURCHASES_CREATE,
    ACTIONS.PURCHASES_EDIT,
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.ADVANCES_CREATE,
    ACTIONS.ADVANCES_EDIT,
    ACTIONS.ADVANCES_EDIT_QUANTITY,
    ACTIONS.KANBAN_VIEW,
    ACTIONS.KANBAN_MANAGE,
    ACTIONS.PROGRESS_VIEW,
    ACTIONS.PAYMENTS_VIEW,
    ACTIONS.PAYMENTS_CREATE,
    ACTIONS.ANTICIPOS_VIEW,
    ACTIONS.CREDITS_VIEW,
    ACTIONS.CREDITS_MANAGE,
    ACTIONS.INDIRECT_COSTS_VIEW,
    ACTIONS.TREASURY_VIEW,
    ACTIONS.CASH_CLOSINGS_VIEW,
    ACTIONS.REPORTS_VIEW,
    ACTIONS.PRODUCTION_STAGES_VIEW,
    ACTIONS.PRODUCTION_STAGES_MANAGE,
    ACTIONS.COST_HISTORY_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
    ACTIONS.PAYMENT_METHODS_MANAGE,
    ACTIONS.OUTSOURCED_SERVICES_VIEW,
    ACTIONS.OUTSOURCED_SERVICES_MANAGE,
    ACTIONS.UNITS_VIEW,
    ACTIONS.UNITS_MANAGE,
    ACTIONS.REPAIRS_VIEW,
    ACTIONS.REPAIRS_CREATE,
    ACTIONS.REPAIRS_DIAGNOSE,
    ACTIONS.REPAIRS_MANAGE,
    ACTIONS.REPAIRS_DELIVER,
    ACTIONS.REPAIRS_CANCEL,
  ],
  [ROLES.ADMIN]: Object.values(ACTIONS),
};

function can(role, action) {
  const allowed = rolePermissions[role] || [];
  return allowed.includes(action);
}

function requirePermission(action) {
  return async (req, res, next) => {
    if (!req.user) {
      console.warn("[requirePermission] Usuario no autenticado");
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    // Admin siempre tiene acceso
    if (req.user.rol === "admin") {
      return next();
    }

    // Obtener id_rol del JWT o de la BD si no está en el token
    let idRol = req.user.id_rol;
    if (!idRol) {
      try {
        let lookupField, lookupValue;
        if (req.user.id_usuario) {
          lookupField = "id_usuario";
          lookupValue = req.user.id_usuario;
        } else if (req.user.nombre_usuario) {
          lookupField = "nombre_usuario";
          lookupValue = req.user.nombre_usuario;
        }
        if (lookupField) {
          const [rows] = await db.query(
            `SELECT id_rol FROM usuarios WHERE ${lookupField} = ?`,
            [lookupValue],
          );
          if (rows.length > 0) idRol = rows[0].id_rol;
        }
      } catch (err) {
        console.error("[requirePermission] Error buscando id_rol:", err);
      }
    }

    // Consultar permisos reales del rol en BD
    if (idRol) {
      try {
        const permisos = await permisosRolModel.getByRolId(idRol);
        const actions = Array.isArray(action) ? action : [action];
        if (actions.some((a) => permisos.includes(a))) {
          return next();
        }
      } catch (err) {
        console.error("[requirePermission] Error consultando permisos:", err);
      }
    } else {
      console.warn(
        "[requirePermission] No se pudo determinar id_rol para el usuario",
      );
    }

    console.warn("[requirePermission] Acceso denegado: permiso insuficiente");
    return res
      .status(403)
      .json({ error: "Acceso denegado: permiso insuficiente" });
  };
}

module.exports = { ACTIONS, can, requirePermission, ROLES };
