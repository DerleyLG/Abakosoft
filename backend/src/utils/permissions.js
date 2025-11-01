
const { ROLES } = require("../constants/roles");

const ACTIONS = {
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_EDIT: "inventory:edit",
  INVENTORY_DELETE: "inventory:delete",
  MOVEMENTS_VIEW: "movements:view",
};

const rolePermissions = {
  [ROLES.OPERARIO]: [ACTIONS.INVENTORY_VIEW],
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
  return allowed.includes(action);
}

function requirePermission(action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Token no proporcionado" });
    }
    if (!can(req.user.rol, action)) {
      return res
        .status(403)
        .json({ error: "Acceso denegado: permiso insuficiente" });
    }
    next();
  };
}

module.exports = { ACTIONS, can, requirePermission, ROLES };
