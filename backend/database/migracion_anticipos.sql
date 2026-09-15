-- ============================================================
-- Migración: corregir FKs duplicadas y agregar índice único
-- en tablas de anticipos / pagos de trabajadores.
--
-- ⚠️  EJECUTAR EN CADA BASE DE DATOS TENANT EXISTENTE:
--     - La BD local (gestion_abako)
--     - La BD del servidor
--     - Cada BD de empresa creada antes de esta corrección
--
-- ✅ Es IDEMPOTENTE: se puede ejecutar varias veces sin dañar nada.
--    Si un objeto ya no existe o ya fue creado, lo omite.
--
-- Uso:
--   mysql -u root -p gestion_abako < migracion_anticipos.sql
--   (o pegar el contenido en el cliente SQL / phpMyAdmin)
-- ============================================================

-- 1) Eliminar FK duplicada sobre id_avance_etapa (ON DELETE CASCADE).
--    Se conserva fk_detalle_pago_avance (ON DELETE RESTRICT), que es
--    la que realmente aplica. Tener dos FKs sobre la misma columna con
--    reglas opuestas es ambiguo y MySQL aplica la más restrictiva.
SET @fk1 := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'detalle_pago_trabajador'
    AND COLUMN_NAME = 'id_avance_etapa'
    AND CONSTRAINT_NAME = 'detalle_pago_trabajador_ibfk_2'
  LIMIT 1
);
SET @sql1 := IF(
  @fk1 IS NOT NULL,
  'ALTER TABLE detalle_pago_trabajador DROP FOREIGN KEY detalle_pago_trabajador_ibfk_2',
  'SELECT ''[OK] FK detalle_pago_trabajador_ibfk_2 ya no existe'''
);
PREPARE stmt1 FROM @sql1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

-- 2) Eliminar FK redundante sobre id_pago (fk_pago_trabajador).
--    Se conserva fk_detalle_pago_pago (ON DELETE CASCADE ON UPDATE CASCADE).
SET @fk2 := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'detalle_pago_trabajador'
    AND COLUMN_NAME = 'id_pago'
    AND CONSTRAINT_NAME = 'fk_pago_trabajador'
  LIMIT 1
);
SET @sql2 := IF(
  @fk2 IS NOT NULL,
  'ALTER TABLE detalle_pago_trabajador DROP FOREIGN KEY fk_pago_trabajador',
  'SELECT ''[OK] FK fk_pago_trabajador ya no existe'''
);
PREPARE stmt2 FROM @sql2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- 3) Agregar índice único (id_detalle_pago, id_anticipo) en
--    anticipo_aplicaciones para evitar aplicaciones duplicadas.
--    Si ya existen duplicados, este paso fallará: primero ejecuta:
--      SELECT id_detalle_pago, id_anticipo, COUNT(*)
--      FROM anticipo_aplicaciones
--      GROUP BY id_detalle_pago, id_anticipo HAVING COUNT(*) > 1;
SET @idx := (
  SELECT COUNT(*)
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'anticipo_aplicaciones'
    AND INDEX_NAME = 'uk_aplicacion_detalle_anticipo'
);
SET @sql3 := IF(
  @idx = 0,
  'ALTER TABLE anticipo_aplicaciones ADD UNIQUE KEY uk_aplicacion_detalle_anticipo (id_detalle_pago, id_anticipo)',
  'SELECT ''[OK] Índice único uk_aplicacion_detalle_anticipo ya existe'''
);
PREPARE stmt3 FROM @sql3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- 4) Verificación final: deben quedar SOLO 2 FKs en detalle_pago_trabajador
--    (fk_detalle_pago_avance y fk_detalle_pago_pago) y el índice único.
SELECT CONSTRAINT_NAME AS fk_restante
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'detalle_pago_trabajador'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT INDEX_NAME AS indice_unicos
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'anticipo_aplicaciones'
  AND NON_UNIQUE = 0;