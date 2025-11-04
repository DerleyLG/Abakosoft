const { ROLES } = require("../constants/roles");

const ACTIONS = {
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  MOVEMENTS_VIEW: "movements:view",
};

const rolePermissions = {
  [ROLES.OPERARIO]: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT, // Permitir inicializar artículos y registrar movimientos
  ],
  [ROLES.SUPERVISOR]: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.MOVEMENTS_VIEW,
  ],
  [ROLES.ADMIN]: [
    ACTIONS.INVENTORY_VIEW,
    ACTIONS.INVENTORY_EDIT,
    ACTIONS.INVENTORY_DELETE,
    ACTIONS.MOVEMENTS_VIEW,
  ],
};

function can(role, action) {
  const allowed = rolePermissions[role] || [];
  const hasPermission = allowed.includes(action);
  console.log(
    `[can] Rol: "${role}", Acción: "${action}", Permisos del rol:`,
    allowed,
    "-> Resultado:",
    hasPermission
  );
  return hasPermission;
}

function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user) {
      console.warn("[requirePermission] Usuario no autenticado");
      return res.status(401).json({ error: "Token no proporcionado" });
    }

    const hasPermission = can(req.user.rol, action);
    console.log(
      `[requirePermission] Verificando permiso "${action}" para rol "${req.user.rol}":`,
      hasPermission ? "PERMITIDO" : "DENEGADO"
    );

    if (!hasPermission) {
      console.warn(
        `[requirePermission] Acceso denegado. Rol: ${req.user.rol}, Acción: ${action}`
      );
      return res
        .status(403)
        .json({ error: "Acceso denegado: permiso insuficiente" });
    }
    next();
  };
}

module.exports = { ACTIONS, can, requirePermission, ROLES };
