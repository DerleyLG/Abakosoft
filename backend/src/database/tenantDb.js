require("dotenv").config();
const mysql = require("mysql2/promise");
const { AsyncLocalStorage } = require("async_hooks");

const tenantContext = new AsyncLocalStorage();

const poolCache = new Map();

// Límite de pools inactivos que se mantienen en cache
const MAX_IDLE_POOLS = 20;

// Migraciones suaves aplicadas de forma perezosa la primera vez que se abre
// el pool de cada tenant en este proceso (no bloquea la creación del pool).
async function ensureTenantSchema(pool, dbName) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS anticipo_aplicaciones (
        id_aplicacion bigint unsigned NOT NULL AUTO_INCREMENT,
        id_detalle_pago bigint unsigned NOT NULL,
        id_anticipo bigint unsigned NOT NULL,
        monto_aplicado decimal(12,2) NOT NULL,
        PRIMARY KEY (id_aplicacion),
        KEY ix_aplicacion_detalle (id_detalle_pago),
        KEY ix_aplicacion_anticipo (id_anticipo),
        CONSTRAINT fk_aplicacion_detalle FOREIGN KEY (id_detalle_pago) REFERENCES detalle_pago_trabajador (id_detalle_pago) ON DELETE CASCADE,
        CONSTRAINT fk_aplicacion_anticipo FOREIGN KEY (id_anticipo) REFERENCES anticipos_trabajadores (id_anticipo) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (error) {
    console.error(
      `[tenant-schema] Error asegurando anticipo_aplicaciones en ${dbName}:`,
      error.message,
    );
  }
}

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
  ensureTenantSchema(pool, dbName);
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
