/**
 * seedMaster.js
 * Crea la BD abakosoft_master, ejecuta el schema y siembra datos iniciales.
 *
 * Uso: node src/database/seedMaster.js
 *
 * El SuperAdmin se crea en el primer arranque del servidor a través del
 * flujo de setup en /saas/setup — no se siembra aquí.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  port: Number(process.env.DB_PORT) || 3306,
  multipleStatements: true,
};

async function main() {
  const conn = await mysql.createConnection(config);

  try {
    console.log("→ Conectado al servidor MySQL:", config.host);

    // ────────────────────────────────────────────
    // 1. Ejecutar master_schema.sql (solo si la BD no existe aún)
    // ────────────────────────────────────────────
    const schemaPath = path.join(
      __dirname,
      "../../../database/master_schema.sql",
    );
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`No se encontró master_schema.sql en: ${schemaPath}`);
    }

    const [dbExists] = await conn.query(
      `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA
       WHERE SCHEMA_NAME = ? LIMIT 1`,
      [process.env.MASTER_DB_NAME || "abakosoft_master"],
    );

    if (dbExists.length === 0) {
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      await conn.query(schemaSql);
      console.log("✓ BD abakosoft_master creada / actualizada");
    } else {
      console.log("✓ BD abakosoft_master ya existe, se omite schema");
    }

    await conn.query("USE `abakosoft_master`");

    // ────────────────────────────────────────────
    // 1b. Migraciones suaves
    // ────────────────────────────────────────────
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = 'abakosoft_master'
         AND TABLE_NAME = 'admins_saas'
         AND COLUMN_NAME IN ('primer_login','token_version','nombre_usuario','email')`,
    );
    const colSet = new Set(cols.map((c) => c.COLUMN_NAME));

    if (!colSet.has("primer_login")) {
      await conn.query(
        `ALTER TABLE admins_saas ADD COLUMN primer_login TINYINT(1) NOT NULL DEFAULT 1 AFTER activo`,
      );
      await conn.query(`UPDATE admins_saas SET primer_login = 0`);
      console.log("✓ Columna primer_login agregada a admins_saas");
    }

    if (!colSet.has("token_version")) {
      await conn.query(
        `ALTER TABLE admins_saas ADD COLUMN token_version INT UNSIGNED NOT NULL DEFAULT 0 AFTER primer_login`,
      );
      console.log("✓ Columna token_version agregada a admins_saas");
    }

    // Migración email → nombre_usuario para instalaciones existentes
    if (colSet.has("email") && !colSet.has("nombre_usuario")) {
      await conn.query(
        `ALTER TABLE admins_saas ADD COLUMN nombre_usuario VARCHAR(100) UNIQUE AFTER nombre`,
      );
      await conn.query(
        `UPDATE admins_saas SET nombre_usuario = SUBSTRING_INDEX(email, '@', 1)
         WHERE nombre_usuario IS NULL`,
      );
      await conn.query(
        `ALTER TABLE admins_saas MODIFY COLUMN nombre_usuario VARCHAR(100) NOT NULL`,
      );
      await conn.query(`ALTER TABLE admins_saas DROP COLUMN email`);
      console.log(
        "✓ Migración email → nombre_usuario completada en admins_saas",
      );
    }

    const [refreshSessionTables] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = 'abakosoft_master'
         AND TABLE_NAME = 'saas_refresh_sessions'`,
    );
    if (refreshSessionTables.length === 0) {
      await conn.query(
        `CREATE TABLE saas_refresh_sessions (
          id_sesion CHAR(36) PRIMARY KEY,
          id_admin INT UNSIGNED NOT NULL,
          token_hash CHAR(64) NOT NULL,
          user_agent VARCHAR(500) DEFAULT NULL,
          ip_address VARCHAR(255) DEFAULT NULL,
          expires_at DATETIME NOT NULL,
          revoked_at DATETIME DEFAULT NULL,
          motivo_revocacion VARCHAR(100) DEFAULT NULL,
          fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT fk_saas_refresh_admin
            FOREIGN KEY (id_admin) REFERENCES admins_saas(id_admin) ON DELETE CASCADE,

          INDEX idx_saas_refresh_admin (id_admin),
          INDEX idx_saas_refresh_expires (expires_at),
          INDEX idx_saas_refresh_revoked (revoked_at)
        )`,
      );
      console.log("✓ Tabla saas_refresh_sessions creada");
    }

    // ────────────────────────────────────────────
    // 2. Planes
    // ────────────────────────────────────────────
    const [planesExist] = await conn.query("SELECT COUNT(*) AS n FROM planes");
    if (planesExist[0].n === 0) {
      await conn.query(`
        INSERT INTO planes (nombre, precio_mensual, max_usuarios, activo) VALUES
          ('Básico', 80000,  3,  1),
          ('Pro',    250000, 50, 1)
      `);
      console.log("✓ Planes insertados: Básico y Pro");
    } else {
      console.log("  Planes ya existen, se omite seed");
    }

    // ────────────────────────────────────────────
    // 3. Empresa inicial: gestion_abako
    // ────────────────────────────────────────────
    const [empExist] = await conn.query(
      "SELECT id_empresa FROM empresas WHERE codigo = ? LIMIT 1",
      ["abako"],
    );
    if (empExist.length === 0) {
      const [dbPhysical] = await conn.query(
        `SELECT SCHEMA_NAME FROM information_schema.SCHEMATA
         WHERE SCHEMA_NAME = 'gestion_abako' LIMIT 1`,
      );

      const [result] = await conn.query(
        `INSERT INTO empresas (nombre, codigo, email_contacto, db_name, estado)
         VALUES (?, ?, ?, ?, 'activa')`,
        ["Abako", "abako", "admin@abako.com", "gestion_abako"],
      );
      const id_empresa = result.insertId;

      const [planes] = await conn.query(
        "SELECT id_plan FROM planes WHERE nombre = 'Pro' LIMIT 1",
      );
      const id_plan = planes.length > 0 ? planes[0].id_plan : 1;
      const fechaFin = new Date();
      fechaFin.setFullYear(fechaFin.getFullYear() + 1);

      await conn.query(
        `INSERT INTO suscripciones (id_empresa, id_plan, es_prueba, estado, fecha_inicio, fecha_fin)
         VALUES (?, ?, 0, 'activa', CURDATE(), ?)`,
        [id_empresa, id_plan, fechaFin.toISOString().slice(0, 10)],
      );

      console.log(
        dbPhysical.length > 0
          ? "✓ Empresa 'Abako' registrada → adopta BD existente: gestion_abako"
          : "✓ Empresa 'Abako' registrada → BD gestion_abako no existe aún en el servidor",
      );
    } else {
      console.log("  Empresa 'abako' ya existe, se omite seed");
    }

    console.log("\n✅ Seed completado correctamente.");
    console.log("────────────────────────────────────────────");
    console.log("  Panel SaaS : /saas/login");
    console.log("  SuperAdmin : crear en /saas/setup (primer arranque)");
    console.log("────────────────────────────────────────────");
  } catch (err) {
    console.error("✗ Error en seedMaster:", err.message);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

main();
