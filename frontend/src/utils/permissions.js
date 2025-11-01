// Permisos en frontend para ocultar UI según rol
export const ROLES = {
  OPERARIO: "operario",
  SUPERVISOR: "supervisor",
  ADMIN: "admin",
};

export const ACTIONS = {
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  MOVEMENTS_VIEW: "movements:view",
  // Vistas y acciones para otras áreas
  REPORTS_VIEW: "reports:view",

  SALES_VIEW: "sales:view",
  SALES_CREATE: "sales:create",
  SALES_EDIT: "sales:edit",
  SALES_DELETE: "sales:delete",

  PURCHASES_VIEW: "purchases:view",
  PURCHASES_CREATE: "purchases:create",
  PURCHASES_EDIT: "purchases:edit",
  PURCHASES_DELETE: "purchases:delete",

  FABRICATION_VIEW: "fabrication:view",
  FABRICATION_CREATE: "fabrication:create",
  FABRICATION_EDIT: "fabrication:edit",
  FABRICATION_DELETE: "fabrication:delete",

  WORKERS_VIEW: "workers:view",
  PAYMENTS_VIEW: "payments:view",
};

const rolePermissions = {
  [ROLES.OPERARIO]: [
    ACTIONS.INVENTORY_VIEW,
    // Órdenes: vista y creación
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.PURCHASES_CREATE,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    // Reportes: sin acceso
  ],
  [ROLES.SUPERVISOR]: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.MOVEMENTS_VIEW,
    // Reportes
    ACTIONS.REPORTS_VIEW,
    // Órdenes: crear/editar (no borrar)
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.SALES_EDIT,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.PURCHASES_CREATE,
    ACTIONS.PURCHASES_EDIT,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    ACTIONS.FABRICATION_EDIT,
    ACTIONS.WORKERS_VIEW,
    ACTIONS.PAYMENTS_VIEW,
  ],
  [ROLES.ADMIN]: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.INVENTORY_DELETE,
    ACTIONS.MOVEMENTS_VIEW,
    // Reportes
    ACTIONS.REPORTS_VIEW,
    // Órdenes: todo
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.SALES_EDIT,
    ACTIONS.SALES_DELETE,
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.PURCHASES_CREATE,
    ACTIONS.PURCHASES_EDIT,
    ACTIONS.PURCHASES_DELETE,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    ACTIONS.FABRICATION_EDIT,
    ACTIONS.FABRICATION_DELETE,
    ACTIONS.WORKERS_VIEW,
    ACTIONS.PAYMENTS_VIEW,
  ],
};

export function can(role, action) {
  const allowed = rolePermissions[role] || [];
  return allowed.includes(action);
}
