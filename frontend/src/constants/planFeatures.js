// Espejo del backend: backend/src/constants/plans.js
// Mantener sincronizado si se agregan nuevas features en el backend.

const _normalize = (str) =>
  str
    ?.normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export const PLAN_FEATURES = {
  basico: [
    "articulos",
    "inventario",
    "ventas",
    "compras",
    "seguimiento_inventario",
    "clientes",
    "proveedores",
    "usuarios",
    "roles",
    "categorias",
    "unidades",
    "trabajadores",
    "dashboard",
    "tesoreria",
    "reportes",
  ],
  pro: [
    "articulos",
    "dashboard",
    "inventario",
    "seguimiento_inventario",
    "movimientos_inventario",
    "compras",
    "ventas",
    "reportes",
    "categorias",
    "proveedores",
    "clientes",
    "unidades",
    "usuarios",
    "roles",
    "fabricacion",
    "kanban",
    "progreso",
    "tesoreria",
    "costos",
    "trabajadores",
    "pagos",
    "anticipos",
    "creditos",
    "cierres_caja",
    "costos_materia_prima",
    "lotes",
    "etapas",
    "avances",
    "ordenes",
    "ordenes_pedido",
  ],
};

/** Devuelve el array de features para el plan dado  */
export function getPlanFeatures(plan) {
  const key = _normalize(plan) ?? "basico";
  return PLAN_FEATURES[key] ?? PLAN_FEATURES.basico;
}

/**
 * Mapeo canónico: acción de permiso → feature de plan.
 * Si la feature no está en el plan activo, el permiso se bloquea en el editor de roles.
 */
export const PERMISSION_TO_FEATURE = {
  // Artículos
  "articles:view": "articulos",
  "articles:create": "articulos",
  "articles:edit": "articulos",
  "articles:delete": "articulos",
  // Categorías
  "categories:view": "categorias",
  "categories:create": "categorias",
  "categories:edit": "categorias",
  "categories:delete": "categorias",
  // Proveedores
  "suppliers:view": "proveedores",
  "suppliers:create": "proveedores",
  "suppliers:edit": "proveedores",
  "suppliers:delete": "proveedores",
  // Clientes
  "clients:view": "clientes",
  "clients:create": "clientes",
  "clients:edit": "clientes",
  "clients:delete": "clientes",
  // Trabajadores
  "workers:view": "trabajadores",
  "workers:create": "trabajadores",
  "workers:edit": "trabajadores",
  "workers:delete": "trabajadores",
  // Inventario
  "inventory:view": "inventario",
  "inventory:create": "inventario",
  "inventory:edit": "inventario",
  "inventory:delete": "inventario",
  "inventory:consume": "inventario",
  "inventory:tracking": "seguimiento_inventario",
  "movements:view": "movimientos_inventario",
  // Ventas
  "sales:view": "ventas",
  "sales:create": "ventas",
  "sales:edit": "ventas",
  "sales:delete": "ventas",
  // Órdenes de Pedido
  "orders:view": "ordenes",
  "orders:create": "ordenes",
  "orders:edit": "ordenes",
  "orders:delete": "ordenes",
  // Fabricación
  "fabrication:view": "fabricacion",
  "fabrication:create": "fabricacion",
  "fabrication:edit": "fabricacion",
  "fabrication:delete": "fabricacion",
  // Avances de Fabricación
  "advances:view": "avances",
  "advances:create": "avances",
  "advances:edit": "avances",
  "advances:edit_quantity": "avances",
  // Kanban / Producción
  "kanban:view": "kanban",
  "kanban:manage": "kanban",
  "progress:view": "progreso",
  // Compras
  "purchases:view": "compras",
  "purchases:create": "compras",
  "purchases:edit": "compras",
  "purchases:delete": "compras",
  // Pagos
  "payments:view": "pagos",
  "payments:create": "pagos",
  "payments:delete": "pagos",
  "anticipos:view": "anticipos",
  // Ventas a Crédito
  "credits:view": "creditos",
  "credits:create": "creditos",
  "credits:manage": "creditos",
  // Costos Indirectos
  "indirect_costs:view": "costos",
  "indirect_costs:create": "costos",
  "indirect_costs:edit": "costos",
  "indirect_costs:delete": "costos",
  "indirect_costs:assign": "costos",
  // Tesorería
  "treasury:view": "tesoreria",
  "treasury:manage": "tesoreria",
  // Cierres de Caja
  "cash_closings:view": "cierres_caja",
  "cash_closings:create": "cierres_caja",
  "cash_closings:close": "cierres_caja",
  "cash_closings:delete": "cierres_caja",
  // Etapas de Producción
  "production_stages:view": "etapas",
  "production_stages:manage": "etapas",
  // Historial de Costos
  "cost_history:view": "costos",
  // Métodos de Pago (necesario para ventas/compras — disponible en básico)
  "payment_methods:view": "ventas",
  "payment_methods:manage": "ventas",
  // Servicios Tercerizados (ligado a fabricación)
  "outsourced_services:view": "fabricacion",
  "outsourced_services:manage": "fabricacion",
  // Unidades de Medida
  "units:view": "unidades",
  "units:manage": "unidades",
  // Reportes
  "reports:view": "reportes",
  // Gestión de Usuarios
  "users:manage": "usuarios",
};
