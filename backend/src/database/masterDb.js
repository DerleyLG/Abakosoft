require("dotenv").config();
const mysql = require("mysql2/promise");

// Pool dedicado a la BD maestra (abakosoft_master)
// Solo se usa para gestión SaaS (empresas, admins, planes, etc.)
const masterPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.MASTER_DB_NAME || "abakosoft_master",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  charset: "utf8mb4",
});

module.exports = masterPool;
