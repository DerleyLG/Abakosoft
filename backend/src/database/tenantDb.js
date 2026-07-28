require("dotenv").config();
const mysql = require("mysql2/promise");
const { AsyncLocalStorage } = require("async_hooks");

const tenantContext = new AsyncLocalStorage();

const poolCache = new Map();

// Límite de pools inactivos que se mantienen en cache
const MAX_IDLE_POOLS = 20;

function getTenantPool(dbName) {
  if (!dbName) throw new Error("db_name requerido para obtener pool de tenant");

  if (poolCache.has(dbName)) {
    return poolCache.get(dbName);
  }

  // Controlar tamaño de cache
  if (poolCache.size >= MAX_IDLE_POOLS) {
    const firstKey = poolCache.keys().next().value;
    const oldPool = poolCache.get(firstKey);
    oldPool.end().catch(() => {});
    poolCache.delete(firstKey);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 20, // Máximo 20 conexiones por empresa (dashboard requiere ~19 simultáneas)
    queueLimit: 50,
    charset: "utf8mb4",
  });

  poolCache.set(dbName, pool);
  return pool;
}

async function releaseTenantPool(dbName) {
  if (poolCache.has(dbName)) {
    const pool = poolCache.get(dbName);
    await pool.end();
    poolCache.delete(dbName);
  }
}

function runWithTenant(dbName, fn) {
  const pool = getTenantPool(dbName);
  return tenantContext.run({ pool, dbName }, fn);
}

/**
 * Devuelve el pool del tenant activo en el contexto actual.

 */
function getCurrentTenantPool() {
  const store = tenantContext.getStore();
  return store ? store.pool : null;
}

/**
 * Devuelve el db_name del tenant activo en el contexto actual. */
function getCurrentDbName() {
  const store = tenantContext.getStore();
  return store ? store.dbName : null;
}

module.exports = {
  getTenantPool,
  releaseTenantPool,
  runWithTenant,
  getCurrentTenantPool,
  getCurrentDbName,
  poolCache,
};
