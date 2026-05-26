require("dotenv").config();
const { getCurrentTenantPool, getTenantPool } = require("./tenantDb");

// Pool por defecto (BD legada / empresa Abako original)
// Se usa como fallback cuando no hay contexto tenant activo (ej. scripts, tests)
const mysql = require("mysql2/promise");
const defaultPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

// Proxy: cada llamada (query, getConnection, etc.) se redirige
// al pool del tenant activo en el contexto AsyncLocalStorage,
// o al pool por defecto si no hay contexto tenant.
const dbProxy = new Proxy(
  {},
  {
    get(_target, prop) {
      const pool = getCurrentTenantPool() || defaultPool;
      const value = pool[prop];
      if (typeof value === "function") {
        return value.bind(pool);
      }
      return value;
    },
  },
);

module.exports = dbProxy;
