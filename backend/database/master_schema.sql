CREATE DATABASE IF NOT EXISTS abakosoft_master
CHARACTER SET utf8mb4
COLLATE utf8mb4_0900_ai_ci;

USE abakosoft_master;

CREATE TABLE empresas (
  id_empresa BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  email_contacto VARCHAR(255) NOT NULL,
  db_name VARCHAR(100) NOT NULL,
  db_host VARCHAR(255) NOT NULL DEFAULT 'localhost', 
  estado ENUM('activa','suspendida','cancelada') NOT NULL DEFAULT 'activa',
  estado_adm ENUM('ok','bloqueado') DEFAULT 'ok',
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_codigo (codigo),
  UNIQUE KEY uk_email (email_contacto),
  UNIQUE KEY uk_db_name (db_name)
);
CREATE TABLE admins_saas (
  id_admin INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100),
  nombre_usuario VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  rol ENUM('superadmin','soporte') DEFAULT 'soporte',
  activo TINYINT(1) DEFAULT 1,
  primer_login TINYINT(1) NOT NULL DEFAULT 1,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until DATETIME NULL DEFAULT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE saas_refresh_sessions (
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
);
CREATE TABLE planes (
  id_plan INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  precio_mensual INT NOT NULL,
  max_usuarios INT NOT NULL DEFAULT 5,
  activo TINYINT(1) DEFAULT 1
);
CREATE TABLE suscripciones (
  id_suscripcion BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa BIGINT UNSIGNED NOT NULL,
  id_plan INT UNSIGNED NOT NULL,
  es_prueba TINYINT(1) NOT NULL DEFAULT 0,
  estado ENUM('prueba','activa','gracia','suspendida','cancelada') NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  fecha_gracia_fin DATE DEFAULT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE CASCADE,
  FOREIGN KEY (id_plan) REFERENCES planes(id_plan),

  INDEX idx_empresa (id_empresa),
  INDEX idx_estado (estado),
  INDEX idx_empresa_estado_activo (id_empresa, estado),
  INDEX idx_empresa_fecha_fin (id_empresa, fecha_fin)
);
CREATE TABLE pagos (
  id_pago BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_empresa BIGINT UNSIGNED NOT NULL,
  id_suscripcion BIGINT UNSIGNED NULL,
  periodo_inicio DATE,
  periodo_fin DATE,
  id_admin_confirmador INT UNSIGNED NULL, 
  monto INT NOT NULL,
  metodo_pago ENUM('transferencia','nequi','efectivo') DEFAULT NULL,
  referencia VARCHAR(255),
  comprobante_url VARCHAR(255),
  estado ENUM('pendiente','confirmado','rechazado') DEFAULT 'pendiente',
  fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa),
  FOREIGN KEY (id_suscripcion) REFERENCES suscripciones(id_suscripcion) ON DELETE SET NULL,
  FOREIGN KEY (id_admin_confirmador) REFERENCES admins_saas(id_admin) 
);

CREATE TABLE log_actividad (
  id_log BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_admin INT UNSIGNED,
  id_empresa BIGINT UNSIGNED,
  tipo_accion VARCHAR(50),
  detalle TEXT,
  
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (id_admin) REFERENCES admins_saas(id_admin) ON DELETE SET NULL,
  FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa) ON DELETE SET NULL
);