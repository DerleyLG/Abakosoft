// Permisos en frontend para ocultar UI según rol
export const ROLES = {
  OPERARIO: "operario",
  SUPERVISOR: "supervisor",
  ADMIN: "admin",
};

export const ACTIONS = {
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
};

// Agrupación de permisos para la UI de gestión de roles
export const PERMISSION_GROUPS = {
  Artículos: [
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.ARTICLES_CREATE,
    ACTIONS.ARTICLES_EDIT,
    ACTIONS.ARTICLES_DELETE,
  ],
  Categorías: [
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.CATEGORIES_CREATE,
    ACTIONS.CATEGORIES_EDIT,
    ACTIONS.CATEGORIES_DELETE,
  ],
  Proveedores: [
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.SUPPLIERS_CREATE,
    ACTIONS.SUPPLIERS_EDIT,
    ACTIONS.SUPPLIERS_DELETE,
  ],
  Clientes: [
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.CLIENTS_CREATE,
    ACTIONS.CLIENTS_EDIT,
    ACTIONS.CLIENTS_DELETE,
  ],
  Trabajadores: [
    ACTIONS.WORKERS_VIEW,
    ACTIONS.WORKERS_CREATE,
    ACTIONS.WORKERS_EDIT,
    ACTIONS.WORKERS_DELETE,
  ],
  Inventario: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_CREATE,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.INVENTORY_DELETE,
    ACTIONS.INVENTORY_CONSUME,
    ACTIONS.INVENTORY_TRACKING,
    ACTIONS.MOVEMENTS_VIEW,
  ],
  "Órdenes de Venta": [
    ACTIONS.SALES_VIEW,
    ACTIONS.SALES_CREATE,
    ACTIONS.SALES_EDIT,
    ACTIONS.SALES_DELETE,
  ],
  "Órdenes de Pedido": [
    ACTIONS.ORDERS_VIEW,
    ACTIONS.ORDERS_CREATE,
    ACTIONS.ORDERS_EDIT,
    ACTIONS.ORDERS_DELETE,
  ],
  Fabricación: [
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.FABRICATION_CREATE,
    ACTIONS.FABRICATION_EDIT,
    ACTIONS.FABRICATION_DELETE,
  ],
  "Avances de Fabricación": [
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.ADVANCES_CREATE,
    ACTIONS.ADVANCES_EDIT,
    ACTIONS.ADVANCES_EDIT_QUANTITY,
  ],
  "Kanban / Producción": [
    ACTIONS.KANBAN_VIEW,
    ACTIONS.KANBAN_MANAGE,
    ACTIONS.PROGRESS_VIEW,
  ],
  Compras: [
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.PURCHASES_CREATE,
    ACTIONS.PURCHASES_EDIT,
    ACTIONS.PURCHASES_DELETE,
  ],
  Pagos: [
    ACTIONS.PAYMENTS_VIEW,
    ACTIONS.PAYMENTS_CREATE,
    ACTIONS.PAYMENTS_DELETE,
    ACTIONS.ANTICIPOS_VIEW,
  ],
  "Ventas a Crédito": [
    ACTIONS.CREDITS_VIEW,
    ACTIONS.CREDITS_CREATE,
    ACTIONS.CREDITS_MANAGE,
  ],
  "Costos Indirectos": [
    ACTIONS.INDIRECT_COSTS_VIEW,
    ACTIONS.INDIRECT_COSTS_CREATE,
    ACTIONS.INDIRECT_COSTS_EDIT,
    ACTIONS.INDIRECT_COSTS_DELETE,
    ACTIONS.INDIRECT_COSTS_ASSIGN,
  ],
  Tesorería: [ACTIONS.TREASURY_VIEW, ACTIONS.TREASURY_MANAGE],
  "Cierres de Caja": [
    ACTIONS.CASH_CLOSINGS_VIEW,
    ACTIONS.CASH_CLOSINGS_CREATE,
    ACTIONS.CASH_CLOSINGS_CLOSE,
    ACTIONS.CASH_CLOSINGS_DELETE,
  ],
  "Etapas de Producción": [
    ACTIONS.PRODUCTION_STAGES_VIEW,
    ACTIONS.PRODUCTION_STAGES_MANAGE,
  ],
  "Historial de Costos": [ACTIONS.COST_HISTORY_VIEW],
  "Métodos de Pago": [
    ACTIONS.PAYMENT_METHODS_VIEW,
    ACTIONS.PAYMENT_METHODS_MANAGE,
  ],
  "Servicios Tercerizados": [
    ACTIONS.OUTSOURCED_SERVICES_VIEW,
    ACTIONS.OUTSOURCED_SERVICES_MANAGE,
  ],
  "Unidades de Medida": [ACTIONS.UNITS_VIEW, ACTIONS.UNITS_MANAGE],
  Reportes: [ACTIONS.REPORTS_VIEW],
  "Gestión de Usuarios": [ACTIONS.USERS_MANAGE],

  Devoluciones: [
    ACTIONS.RETURNS_VIEW,
    ACTIONS.RETURNS_CREATE,
    ACTIONS.RETURNS_CANCEL,
  ],
  Reparaciones: [
    ACTIONS.REPAIRS_VIEW,
    ACTIONS.REPAIRS_CREATE,
    ACTIONS.REPAIRS_DIAGNOSE,
    ACTIONS.REPAIRS_MANAGE,
    ACTIONS.REPAIRS_DELIVER,
    ACTIONS.REPAIRS_CANCEL,
  ],
};

// Etiquetas legibles para cada acción
export const ACTION_LABELS = {
  [ACTIONS.RETURNS_VIEW]: "Ver devoluciones",
  [ACTIONS.RETURNS_CREATE]: "Registrar devoluciones",
  [ACTIONS.RETURNS_CANCEL]: "Anular devoluciones",
  [ACTIONS.REPAIRS_VIEW]: "Ver órdenes de reparación",
  [ACTIONS.REPAIRS_CREATE]: "Crear órdenes de reparación",
  [ACTIONS.REPAIRS_DIAGNOSE]: "Realizar diagnóstico",
  [ACTIONS.REPAIRS_MANAGE]: "Gestionar materiales",
  [ACTIONS.REPAIRS_DELIVER]: "Entregar reparaciones",
  [ACTIONS.REPAIRS_CANCEL]: "Cancelar reparaciones",
  [ACTIONS.ARTICLES_VIEW]: "Ver artículos",
  [ACTIONS.ARTICLES_CREATE]: "Crear artículos",
  [ACTIONS.ARTICLES_EDIT]: "Editar artículos",
  [ACTIONS.ARTICLES_DELETE]: "Eliminar artículos",
  [ACTIONS.CATEGORIES_VIEW]: "Ver categorías",
  [ACTIONS.CATEGORIES_CREATE]: "Crear categorías",
  [ACTIONS.CATEGORIES_EDIT]: "Editar categorías",
  [ACTIONS.CATEGORIES_DELETE]: "Eliminar categorías",
  [ACTIONS.SUPPLIERS_VIEW]: "Ver proveedores",
  [ACTIONS.SUPPLIERS_CREATE]: "Crear proveedores",
  [ACTIONS.SUPPLIERS_EDIT]: "Editar proveedores",
  [ACTIONS.SUPPLIERS_DELETE]: "Eliminar proveedores",
  [ACTIONS.CLIENTS_VIEW]: "Ver clientes",
  [ACTIONS.CLIENTS_CREATE]: "Crear clientes",
  [ACTIONS.CLIENTS_EDIT]: "Editar clientes",
  [ACTIONS.CLIENTS_DELETE]: "Eliminar clientes",
  [ACTIONS.WORKERS_VIEW]: "Ver trabajadores",
  [ACTIONS.WORKERS_CREATE]: "Crear trabajadores",
  [ACTIONS.WORKERS_EDIT]: "Editar trabajadores",
  [ACTIONS.WORKERS_DELETE]: "Eliminar trabajadores",
  [ACTIONS.INVENTORY_VIEW]: "Ver inventario",
  [ACTIONS.INVENTORY_CREATE]: "Agregar artículo a inventario",
  [ACTIONS.INVENTORY_EDIT]: "Editar stock",
  [ACTIONS.INVENTORY_DELETE]: "Eliminar de inventario",
  [ACTIONS.INVENTORY_CONSUME]: "Registrar consumo materia prima",
  [ACTIONS.INVENTORY_TRACKING]: "Ver seguimiento de artículos",
  [ACTIONS.MOVEMENTS_VIEW]: "Ver movimientos de inventario",
  [ACTIONS.SALES_VIEW]: "Ver órdenes de venta",
  [ACTIONS.SALES_CREATE]: "Crear órdenes de venta",
  [ACTIONS.SALES_EDIT]: "Editar órdenes de venta",
  [ACTIONS.SALES_DELETE]: "Eliminar órdenes de venta",
  [ACTIONS.ORDERS_VIEW]: "Ver órdenes de pedido",
  [ACTIONS.ORDERS_CREATE]: "Crear órdenes de pedido",
  [ACTIONS.ORDERS_EDIT]: "Editar órdenes de pedido",
  [ACTIONS.ORDERS_DELETE]: "Eliminar órdenes de pedido",
  [ACTIONS.FABRICATION_VIEW]: "Ver órdenes de fabricación",
  [ACTIONS.FABRICATION_CREATE]: "Crear órdenes de fabricación",
  [ACTIONS.FABRICATION_EDIT]: "Editar órdenes de fabricación",
  [ACTIONS.FABRICATION_DELETE]: "Eliminar órdenes de fabricación",
  [ACTIONS.PURCHASES_VIEW]: "Ver órdenes de compra",
  [ACTIONS.PURCHASES_CREATE]: "Crear órdenes de compra",
  [ACTIONS.PURCHASES_EDIT]: "Editar órdenes de compra",
  [ACTIONS.PURCHASES_DELETE]: "Eliminar órdenes de compra",
  [ACTIONS.ADVANCES_VIEW]: "Ver avances de fabricación",
  [ACTIONS.ADVANCES_CREATE]: "Registrar avances",
  [ACTIONS.ADVANCES_EDIT]: "Editar avances (responsable/costo)",
  [ACTIONS.ADVANCES_EDIT_QUANTITY]: "Editar cantidad registrada en avances",
  [ACTIONS.KANBAN_VIEW]: "Ver tablero Kanban",
  [ACTIONS.KANBAN_MANAGE]: "Marcar órdenes como entregadas",
  [ACTIONS.PROGRESS_VIEW]: "Ver progreso de fabricación",
  [ACTIONS.PAYMENTS_VIEW]: "Ver pagos a trabajadores",
  [ACTIONS.PAYMENTS_CREATE]: "Registrar pagos",
  [ACTIONS.PAYMENTS_DELETE]: "Eliminar pagos",
  [ACTIONS.ANTICIPOS_VIEW]: "Ver anticipos",
  [ACTIONS.CREDITS_VIEW]: "Ver ventas a crédito",
  [ACTIONS.CREDITS_CREATE]: "Crear crédito manual",
  [ACTIONS.CREDITS_MANAGE]: "Registrar abonos a créditos",
  [ACTIONS.INDIRECT_COSTS_VIEW]: "Ver costos indirectos",
  [ACTIONS.INDIRECT_COSTS_CREATE]: "Crear costos indirectos",
  [ACTIONS.INDIRECT_COSTS_EDIT]: "Editar costos indirectos",
  [ACTIONS.INDIRECT_COSTS_DELETE]: "Eliminar costos indirectos",
  [ACTIONS.INDIRECT_COSTS_ASSIGN]: "Asignar costos a órdenes",
  [ACTIONS.TREASURY_VIEW]: "Ver tesorería",
  [ACTIONS.TREASURY_MANAGE]: "Gestionar tesorería (transferencias)",
  [ACTIONS.CASH_CLOSINGS_VIEW]: "Ver cierres de caja",
  [ACTIONS.CASH_CLOSINGS_CREATE]: "Crear períodos de caja",
  [ACTIONS.CASH_CLOSINGS_CLOSE]: "Cerrar períodos de caja",
  [ACTIONS.CASH_CLOSINGS_DELETE]: "Eliminar períodos de caja",
  [ACTIONS.PRODUCTION_STAGES_VIEW]: "Ver etapas de producción",
  [ACTIONS.PRODUCTION_STAGES_MANAGE]: "Gestionar etapas de producción",
  [ACTIONS.COST_HISTORY_VIEW]: "Ver historial de costos",
  [ACTIONS.PAYMENT_METHODS_VIEW]: "Ver métodos de pago",
  [ACTIONS.PAYMENT_METHODS_MANAGE]: "Gestionar métodos de pago",
  [ACTIONS.OUTSOURCED_SERVICES_VIEW]: "Ver servicios tercerizados",
  [ACTIONS.OUTSOURCED_SERVICES_MANAGE]: "Gestionar servicios tercerizados",
  [ACTIONS.UNITS_VIEW]: "Ver unidades de medida",
  [ACTIONS.UNITS_MANAGE]: "Gestionar unidades de medida",
  [ACTIONS.REPORTS_VIEW]: "Ver reportes",
  [ACTIONS.USERS_MANAGE]: "Gestionar usuarios y roles",
};

// Dependencias entre permisos: si seleccionas la clave, se auto-seleccionan los valores
export const PERMISSION_DEPENDENCIES = {
  // Artículos: crear/editar necesita categorías y unidades de medida (selectores del formulario)
  [ACTIONS.ARTICLES_CREATE]: [
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.UNITS_VIEW,
  ],

  [ACTIONS.RETURNS_CREATE]: [
    ACTIONS.RETURNS_VIEW,
    ACTIONS.SALES_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
  ],

  [ACTIONS.RETURNS_CANCEL]: [ACTIONS.RETURNS_VIEW],

  // Reparaciones
  [ACTIONS.REPAIRS_CREATE]: [
    ACTIONS.REPAIRS_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
  ],
  [ACTIONS.REPAIRS_DIAGNOSE]: [ACTIONS.REPAIRS_VIEW],
  [ACTIONS.REPAIRS_MANAGE]: [ACTIONS.REPAIRS_VIEW, ACTIONS.INVENTORY_VIEW],
  [ACTIONS.REPAIRS_DELIVER]: [ACTIONS.REPAIRS_VIEW, ACTIONS.TREASURY_VIEW],
  [ACTIONS.REPAIRS_CANCEL]: [ACTIONS.REPAIRS_VIEW],

  [ACTIONS.ARTICLES_EDIT]: [
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.UNITS_VIEW,
  ],
  [ACTIONS.ARTICLES_DELETE]: [ACTIONS.ARTICLES_VIEW],

  // Categorías
  [ACTIONS.CATEGORIES_CREATE]: [ACTIONS.CATEGORIES_VIEW],
  [ACTIONS.CATEGORIES_EDIT]: [ACTIONS.CATEGORIES_VIEW],
  [ACTIONS.CATEGORIES_DELETE]: [ACTIONS.CATEGORIES_VIEW],

  // Proveedores
  [ACTIONS.SUPPLIERS_CREATE]: [ACTIONS.SUPPLIERS_VIEW],
  [ACTIONS.SUPPLIERS_EDIT]: [ACTIONS.SUPPLIERS_VIEW],
  [ACTIONS.SUPPLIERS_DELETE]: [ACTIONS.SUPPLIERS_VIEW],

  // Clientes
  [ACTIONS.CLIENTS_CREATE]: [ACTIONS.CLIENTS_VIEW],
  [ACTIONS.CLIENTS_EDIT]: [ACTIONS.CLIENTS_VIEW],
  [ACTIONS.CLIENTS_DELETE]: [ACTIONS.CLIENTS_VIEW],

  // Trabajadores
  [ACTIONS.WORKERS_CREATE]: [ACTIONS.WORKERS_VIEW],
  [ACTIONS.WORKERS_EDIT]: [ACTIONS.WORKERS_VIEW],
  [ACTIONS.WORKERS_DELETE]: [ACTIONS.WORKERS_VIEW],

  // Inventario (necesita artículos para selector)
  [ACTIONS.INVENTORY_CREATE]: [ACTIONS.INVENTORY_VIEW, ACTIONS.ARTICLES_VIEW],
  [ACTIONS.INVENTORY_EDIT]: [ACTIONS.INVENTORY_VIEW, ACTIONS.ARTICLES_VIEW],
  [ACTIONS.INVENTORY_DELETE]: [ACTIONS.INVENTORY_VIEW],
  [ACTIONS.INVENTORY_CONSUME]: [ACTIONS.INVENTORY_VIEW],
  [ACTIONS.INVENTORY_TRACKING]: [ACTIONS.INVENTORY_VIEW],
  [ACTIONS.MOVEMENTS_VIEW]: [ACTIONS.INVENTORY_VIEW],

  // Órdenes de Venta (necesita clientes, artículos y métodos de pago)
  [ACTIONS.SALES_CREATE]: [
    ACTIONS.SALES_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
  ],
  [ACTIONS.SALES_EDIT]: [
    ACTIONS.SALES_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
  ],
  [ACTIONS.SALES_DELETE]: [ACTIONS.SALES_VIEW],

  // Órdenes de Pedido (necesita clientes, artículos y categorías para filtrar fabricables)
  [ACTIONS.ORDERS_CREATE]: [
    ACTIONS.ORDERS_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
  ],
  [ACTIONS.ORDERS_EDIT]: [
    ACTIONS.ORDERS_VIEW,
    ACTIONS.CLIENTS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
  ],
  [ACTIONS.ORDERS_DELETE]: [ACTIONS.ORDERS_VIEW],

  // Fabricación (necesita pedidos, artículos, categorías y etapas de producción)
  [ACTIONS.FABRICATION_CREATE]: [
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.ORDERS_VIEW,
    ACTIONS.PRODUCTION_STAGES_VIEW,
  ],
  [ACTIONS.FABRICATION_EDIT]: [
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.CATEGORIES_VIEW,
    ACTIONS.ORDERS_VIEW,
    ACTIONS.PRODUCTION_STAGES_VIEW,
  ],
  [ACTIONS.FABRICATION_DELETE]: [ACTIONS.FABRICATION_VIEW],

  // Compras (necesita proveedores, artículos y métodos de pago)
  [ACTIONS.PURCHASES_CREATE]: [
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
  ],
  [ACTIONS.PURCHASES_EDIT]: [
    ACTIONS.PURCHASES_VIEW,
    ACTIONS.SUPPLIERS_VIEW,
    ACTIONS.ARTICLES_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
  ],
  [ACTIONS.PURCHASES_DELETE]: [ACTIONS.PURCHASES_VIEW],

  // Avances de Fabricación (necesita trabajadores, etapas y fabricación)
  [ACTIONS.ADVANCES_CREATE]: [
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.WORKERS_VIEW,
    ACTIONS.PRODUCTION_STAGES_VIEW,
  ],
  [ACTIONS.ADVANCES_EDIT]: [
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.FABRICATION_VIEW,
    ACTIONS.WORKERS_VIEW,
  ],
  [ACTIONS.ADVANCES_EDIT_QUANTITY]: [
    ACTIONS.ADVANCES_VIEW,
    ACTIONS.FABRICATION_VIEW,
  ],

  // Kanban
  [ACTIONS.KANBAN_MANAGE]: [ACTIONS.KANBAN_VIEW],

  // Pagos (necesita trabajadores, métodos de pago, anticipos y fabricación)
  [ACTIONS.PAYMENTS_CREATE]: [
    ACTIONS.PAYMENTS_VIEW,
    ACTIONS.WORKERS_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
    ACTIONS.ANTICIPOS_VIEW,
    ACTIONS.FABRICATION_VIEW,
  ],
  [ACTIONS.PAYMENTS_DELETE]: [ACTIONS.PAYMENTS_VIEW],

  // Créditos
  [ACTIONS.CREDITS_CREATE]: [ACTIONS.CREDITS_VIEW],
  [ACTIONS.CREDITS_MANAGE]: [ACTIONS.CREDITS_VIEW],

  // Costos Indirectos (necesita métodos de pago y fabricación para asignar)
  [ACTIONS.INDIRECT_COSTS_CREATE]: [
    ACTIONS.INDIRECT_COSTS_VIEW,
    ACTIONS.PAYMENT_METHODS_VIEW,
    ACTIONS.FABRICATION_VIEW,
  ],
  [ACTIONS.INDIRECT_COSTS_EDIT]: [ACTIONS.INDIRECT_COSTS_VIEW],
  [ACTIONS.INDIRECT_COSTS_DELETE]: [ACTIONS.INDIRECT_COSTS_VIEW],
  [ACTIONS.INDIRECT_COSTS_ASSIGN]: [
    ACTIONS.INDIRECT_COSTS_VIEW,
    ACTIONS.FABRICATION_VIEW,
  ],

  // Tesorería
  [ACTIONS.TREASURY_MANAGE]: [ACTIONS.TREASURY_VIEW],

  // Cierres de Caja
  [ACTIONS.CASH_CLOSINGS_CREATE]: [ACTIONS.CASH_CLOSINGS_VIEW],
  [ACTIONS.CASH_CLOSINGS_CLOSE]: [ACTIONS.CASH_CLOSINGS_VIEW],
  [ACTIONS.CASH_CLOSINGS_DELETE]: [ACTIONS.CASH_CLOSINGS_VIEW],

  // Configuración
  [ACTIONS.PRODUCTION_STAGES_MANAGE]: [ACTIONS.PRODUCTION_STAGES_VIEW],
  [ACTIONS.PAYMENT_METHODS_MANAGE]: [ACTIONS.PAYMENT_METHODS_VIEW],
  [ACTIONS.OUTSOURCED_SERVICES_MANAGE]: [ACTIONS.OUTSOURCED_SERVICES_VIEW],
  [ACTIONS.UNITS_MANAGE]: [ACTIONS.UNITS_VIEW],
};

// Dado un array de permisos, agrega todas las dependencias necesarias
export function resolvePermissionDependencies(permisos) {
  const result = new Set(permisos);
  let changed = true;
  while (changed) {
    changed = false;
    for (const perm of [...result]) {
      const deps = PERMISSION_DEPENDENCIES[perm];
      if (deps) {
        for (const dep of deps) {
          if (!result.has(dep)) {
            result.add(dep);
            changed = true;
          }
        }
      }
    }
  }
  return [...result];
}

export function can(userOrRole, action) {
  if (!userOrRole) return false;
  // Admin siempre tiene acceso total
  if (typeof userOrRole === "object" && userOrRole.rol === "admin") return true;
  // Soporte dinámico: si se pasa el objeto user con permisos
  if (typeof userOrRole === "object" && Array.isArray(userOrRole.permisos)) {
    return userOrRole.permisos.includes(action);
  }
  return false;
}
