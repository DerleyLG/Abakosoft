-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: gestion_abako
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `abonos_credito`
--

DROP TABLE IF EXISTS `abonos_credito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `abonos_credito` (
  `id_abono` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_venta_credito` bigint unsigned NOT NULL,
  `fecha` date NOT NULL DEFAULT (curdate()),
  `monto` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id_abono`),
  KEY `id_venta_credito` (`id_venta_credito`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `abonos_credito_ibfk_1` FOREIGN KEY (`id_venta_credito`) REFERENCES `ventas_credito` (`id_venta_credito`),
  CONSTRAINT `abonos_credito_ibfk_2` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`)
) ENGINE=InnoDB AUTO_INCREMENT=56 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `anticipos_trabajadores`
--

DROP TABLE IF EXISTS `anticipos_trabajadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anticipos_trabajadores` (
  `id_anticipo` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_trabajador` bigint unsigned NOT NULL,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `fecha` date NOT NULL,
  `monto` int DEFAULT NULL,
  `monto_usado` int DEFAULT NULL,
  `estado` enum('pendiente','parcial','saldado') DEFAULT 'pendiente',
  `observaciones` text,
  PRIMARY KEY (`id_anticipo`),
  KEY `id_trabajador` (`id_trabajador`),
  KEY `id_orden_fabricacion` (`id_orden_fabricacion`),
  KEY `idx_anticipo_fecha` (`fecha`),
  CONSTRAINT `anticipos_trabajadores_ibfk_1` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`),
  CONSTRAINT `anticipos_trabajadores_ibfk_2` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `articulos`
--

DROP TABLE IF EXISTS `articulos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articulos` (
  `id_articulo` bigint unsigned NOT NULL AUTO_INCREMENT,
  `referencia` varchar(100) NOT NULL,
  `descripcion` text,
  `precio_venta` int DEFAULT NULL,
  `precio_costo` int DEFAULT NULL,
  `id_categoria` bigint unsigned DEFAULT NULL,
  `es_compuesto` tinyint(1) NOT NULL DEFAULT '0',
  `descatalogado` tinyint(1) NOT NULL DEFAULT '0',
  `id_unidad` int NOT NULL DEFAULT '1',
  `id_etapa` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_articulo`),
  UNIQUE KEY `id_articulo` (`id_articulo`),
  KEY `fk_articulos_categoria` (`id_categoria`),
  KEY `idx_descripcion` (`descripcion`(100)),
  KEY `idx_referencia` (`referencia`),
  KEY `fk_articulos_unidad` (`id_unidad`),
  KEY `fk_articulos_etapa` (`id_etapa`),
  KEY `idx_articulos_descatalogado` (`descatalogado`),
  CONSTRAINT `fk_articulos_categoria` FOREIGN KEY (`id_categoria`) REFERENCES `categorias` (`id_categoria`),
  CONSTRAINT `fk_articulos_etapa` FOREIGN KEY (`id_etapa`) REFERENCES `etapas_produccion` (`id_etapa`),
  CONSTRAINT `fk_articulos_unidad` FOREIGN KEY (`id_unidad`) REFERENCES `unidades` (`id_unidad`)
) ENGINE=InnoDB AUTO_INCREMENT=322 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `articulos_componentes`
--

DROP TABLE IF EXISTS `articulos_componentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `articulos_componentes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `articulo_padre_id` bigint unsigned NOT NULL,
  `articulo_componente_id` bigint unsigned NOT NULL,
  `cantidad_requerida` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `articulo_padre_id` (`articulo_padre_id`),
  KEY `articulo_componente_id` (`articulo_componente_id`),
  CONSTRAINT `articulos_componentes_ibfk_1` FOREIGN KEY (`articulo_padre_id`) REFERENCES `articulos` (`id_articulo`) ON DELETE CASCADE,
  CONSTRAINT `articulos_componentes_ibfk_2` FOREIGN KEY (`articulo_componente_id`) REFERENCES `articulos` (`id_articulo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `avance_etapas_produccion`
--

DROP TABLE IF EXISTS `avance_etapas_produccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avance_etapas_produccion` (
  `id_avance_etapa` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_fabricacion` bigint unsigned NOT NULL,
  `id_etapa_produccion` bigint unsigned NOT NULL,
  `id_trabajador` bigint unsigned NOT NULL,
  `cantidad` int NOT NULL,
  `estado` enum('pendiente','en proceso','completado') DEFAULT 'pendiente',
  `observaciones` text,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  `pagado` tinyint(1) DEFAULT '0',
  `id_articulo` bigint unsigned DEFAULT NULL,
  `costo_fabricacion` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_avance_etapa`),
  UNIQUE KEY `id_produccion_etapa` (`id_avance_etapa`),
  KEY `avance_etapas_produccion_ibfk_1` (`id_orden_fabricacion`),
  KEY `avance_etapas_produccion_ibfk_2` (`id_etapa_produccion`),
  KEY `fk_avance_trabajador` (`id_trabajador`),
  KEY `fk_avance_articulo` (`id_articulo`),
  KEY `idx_avance_orden_articulo_etapa` (`id_orden_fabricacion`,`id_articulo`,`id_etapa_produccion`,`estado`),
  CONSTRAINT `avance_etapas_produccion_ibfk_1` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE,
  CONSTRAINT `avance_etapas_produccion_ibfk_2` FOREIGN KEY (`id_etapa_produccion`) REFERENCES `etapas_produccion` (`id_etapa`) ON DELETE CASCADE,
  CONSTRAINT `fk_avance_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_avance_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=712 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categorias`
--

DROP TABLE IF EXISTS `categorias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categorias` (
  `id_categoria` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('articulo_fabricable','materia_prima','costo_produccion') NOT NULL DEFAULT 'articulo_fabricable',
  PRIMARY KEY (`id_categoria`),
  UNIQUE KEY `id_categoria` (`id_categoria`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `cierres_caja`
--

DROP TABLE IF EXISTS `cierres_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cierres_caja` (
  `id_cierre` int NOT NULL AUTO_INCREMENT,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date DEFAULT NULL,
  `numero_semana` int DEFAULT NULL,
  `anio_semana` int DEFAULT NULL,
  `estado` enum('abierto','pendiente_cierre','cerrado') NOT NULL DEFAULT 'abierto',
  `es_primer_periodo` tinyint(1) DEFAULT '0',
  `saldos_iniciales_confirmados` tinyint(1) DEFAULT '0',
  `fecha_cierre` datetime DEFAULT NULL,
  `id_usuario_cierre` bigint unsigned DEFAULT NULL,
  `tipo_cierre` enum('manual','automatico','migracion') DEFAULT NULL,
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cierre`),
  KEY `fk_cierre_usuario` (`id_usuario_cierre`),
  KEY `idx_cierres_estado` (`estado`),
  KEY `idx_cierres_fecha_inicio` (`fecha_inicio`),
  KEY `idx_cierres_fecha_fin` (`fecha_fin`),
  KEY `idx_estado_fecha` (`estado`,`fecha_inicio`),
  KEY `idx_semana_anio` (`anio_semana`,`numero_semana`),
  CONSTRAINT `fk_cierre_usuario` FOREIGN KEY (`id_usuario_cierre`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clientes`
--

DROP TABLE IF EXISTS `clientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clientes` (
  `id_cliente` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `identificacion` varchar(100) DEFAULT NULL,
  `telefono` varchar(50) NOT NULL,
  `direccion` text,
  `ciudad` varchar(100) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `saldo_favor` decimal(12,2) DEFAULT '0.00',
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `id_cliente` (`id_cliente`),
  KEY `idx_clientes_nombre` (`nombre`(100))
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `compras_materia_prima`
--

DROP TABLE IF EXISTS `compras_materia_prima`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras_materia_prima` (
  `id_compra_materia_prima` bigint unsigned NOT NULL AUTO_INCREMENT,
  `descripcion_gasto` varchar(255) NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` int DEFAULT NULL,
  `fecha_compra` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_proveedor` bigint unsigned DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id_compra_materia_prima`),
  KEY `idx_compra_mp_proveedor` (`id_proveedor`),
  KEY `idx_compra_mp_fecha` (`fecha_compra`),
  CONSTRAINT `compras_materia_prima_ibfk_2` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `configuracion_cierres`
--

DROP TABLE IF EXISTS `configuracion_cierres`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configuracion_cierres` (
  `id_config` int NOT NULL AUTO_INCREMENT,
  `clave` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` text,
  `tipo_dato` enum('string','number','boolean') DEFAULT 'string',
  `fecha_creacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_modificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_config`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `consumos_materia_prima`
--

DROP TABLE IF EXISTS `consumos_materia_prima`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consumos_materia_prima` (
  `id_consumo` int NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `cantidad` decimal(12,2) DEFAULT NULL,
  `costo_unitario` decimal(12,2) DEFAULT NULL,
  `costo_total` decimal(12,2) DEFAULT NULL,
  `notas` varchar(255) DEFAULT NULL,
  `id_usuario` bigint unsigned DEFAULT NULL,
  `fecha_registro` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_consumo`),
  KEY `id_articulo` (`id_articulo`),
  KEY `id_usuario` (`id_usuario`),
  KEY `fk_consumo_of` (`id_orden_fabricacion`),
  CONSTRAINT `consumos_materia_prima_ibfk_1` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `consumos_materia_prima_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_consumo_of` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costos_indirectos`
--

DROP TABLE IF EXISTS `costos_indirectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_indirectos` (
  `id_costo_indirecto` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tipo_costo` varchar(100) NOT NULL,
  `fecha` date NOT NULL,
  `valor` int DEFAULT NULL,
  `observaciones` text,
  `fecha_inicio` date DEFAULT NULL,
  `fecha_fin` date DEFAULT NULL,
  PRIMARY KEY (`id_costo_indirecto`),
  UNIQUE KEY `id_costo_indirecto` (`id_costo_indirecto`),
  KEY `idx_costo_indirecto_fecha` (`fecha`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `costos_indirectos_asignados`
--

DROP TABLE IF EXISTS `costos_indirectos_asignados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `costos_indirectos_asignados` (
  `id_asignacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_costo_indirecto` bigint unsigned NOT NULL,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `anio` year NOT NULL,
  `mes` tinyint NOT NULL,
  `valor_asignado` int DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id_asignacion`),
  KEY `id_orden_fabricacion` (`id_orden_fabricacion`),
  KEY `costos_indirectos_asignados_ibfk_1` (`id_costo_indirecto`),
  CONSTRAINT `costos_indirectos_asignados_ibfk_1` FOREIGN KEY (`id_costo_indirecto`) REFERENCES `costos_indirectos` (`id_costo_indirecto`) ON DELETE CASCADE,
  CONSTRAINT `costos_indirectos_asignados_ibfk_2` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_cierre_caja`
--

DROP TABLE IF EXISTS `detalle_cierre_caja`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_cierre_caja` (
  `id_detalle` int NOT NULL AUTO_INCREMENT,
  `id_cierre` int NOT NULL,
  `id_metodo_pago` int NOT NULL,
  `saldo_inicial` int DEFAULT '0',
  `total_ingresos` int DEFAULT '0',
  `total_egresos` int DEFAULT '0',
  `saldo_final` int GENERATED ALWAYS AS (((`saldo_inicial` + `total_ingresos`) - `total_egresos`)) STORED,
  PRIMARY KEY (`id_detalle`),
  UNIQUE KEY `uk_cierre_metodo` (`id_cierre`,`id_metodo_pago`),
  KEY `idx_detalle_cierre` (`id_cierre`),
  KEY `idx_detalle_metodo` (`id_metodo_pago`),
  CONSTRAINT `fk_detalle_cierre` FOREIGN KEY (`id_cierre`) REFERENCES `cierres_caja` (`id_cierre`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_metodo` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_orden_compra`
--

DROP TABLE IF EXISTS `detalle_orden_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_orden_compra` (
  `id_detalle_compra` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_compra` bigint unsigned DEFAULT NULL,
  `id_articulo` bigint unsigned DEFAULT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `es_bruto` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_detalle_compra`),
  UNIQUE KEY `id_detalle_compra` (`id_detalle_compra`),
  KEY `id_orden_fabricacion` (`id_orden_fabricacion`),
  KEY `idx_id_orden_compra` (`id_orden_compra`),
  KEY `idx_id_articulo_detalle_compra` (`id_articulo`),
  CONSTRAINT `detalle_orden_compra_ibfk_1` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`),
  CONSTRAINT `fk_detalle_compra_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_oc_orden` FOREIGN KEY (`id_orden_compra`) REFERENCES `ordenes_compra` (`id_orden_compra`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=339 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_orden_fabricacion`
--

DROP TABLE IF EXISTS `detalle_orden_fabricacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_orden_fabricacion` (
  `id_detalle_fabricacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `id_articulo` int DEFAULT NULL,
  `cantidad` int NOT NULL,
  `id_etapa_final` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_detalle_fabricacion`),
  UNIQUE KEY `id_detalle_fabricacion` (`id_detalle_fabricacion`),
  KEY `fk_orden_fabricacion` (`id_orden_fabricacion`),
  KEY `etapa_final_cliente` (`id_etapa_final`),
  KEY `idx_dof_orden_articulo` (`id_orden_fabricacion`,`id_articulo`),
  CONSTRAINT `detalle_orden_fabricacion_ibfk_1` FOREIGN KEY (`id_etapa_final`) REFERENCES `etapas_produccion` (`id_etapa`),
  CONSTRAINT `fk_orden_fabricacion` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=274 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_orden_venta`
--

DROP TABLE IF EXISTS `detalle_orden_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_orden_venta` (
  `id_detalle_venta` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_venta` bigint unsigned DEFAULT NULL,
  `id_articulo` bigint unsigned DEFAULT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_detalle_venta`),
  UNIQUE KEY `id_detalle_venta` (`id_detalle_venta`),
  KEY `idx_dov_orden` (`id_orden_venta`),
  KEY `idx_dov_articulo` (`id_articulo`),
  CONSTRAINT `fk_dov_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_dov_orden_venta` FOREIGN KEY (`id_orden_venta`) REFERENCES `ordenes_venta` (`id_orden_venta`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=114 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_pago_trabajador`
--

DROP TABLE IF EXISTS `detalle_pago_trabajador`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_pago_trabajador` (
  `id_detalle_pago` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_pago` bigint unsigned NOT NULL,
  `id_avance_etapa` bigint unsigned DEFAULT NULL,
  `cantidad` int NOT NULL,
  `pago_unitario` bigint DEFAULT NULL,
  `subtotal` decimal(12,2) GENERATED ALWAYS AS ((`cantidad` * `pago_unitario`)) STORED,
  `es_descuento` tinyint DEFAULT '0',
  PRIMARY KEY (`id_detalle_pago`),
  UNIQUE KEY `id_detalle_pago` (`id_detalle_pago`),
  KEY `ix_detalle_pago_por_pago` (`id_pago`),
  KEY `ix_detalle_pago_por_avance_etapa` (`id_avance_etapa`),
  CONSTRAINT `fk_detalle_pago_avance` FOREIGN KEY (`id_avance_etapa`) REFERENCES `avance_etapas_produccion` (`id_avance_etapa`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_detalle_pago_pago` FOREIGN KEY (`id_pago`) REFERENCES `pagos_trabajadores` (`id_pago`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=659 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `anticipo_aplicaciones`
--
-- Registra a qué anticipo(s) se aplicó cada línea de descuento de un pago,
-- para poder revertir con precisión el saldo del anticipo si el pago se edita o elimina.
--

DROP TABLE IF EXISTS `anticipo_aplicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anticipo_aplicaciones` (
  `id_aplicacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_detalle_pago` bigint unsigned NOT NULL,
  `id_anticipo` bigint unsigned NOT NULL,
  `monto_aplicado` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_aplicacion`),
  UNIQUE KEY `uk_aplicacion_detalle_anticipo` (`id_detalle_pago`,`id_anticipo`),
  KEY `ix_aplicacion_detalle` (`id_detalle_pago`),
  KEY `ix_aplicacion_anticipo` (`id_anticipo`),
  CONSTRAINT `fk_aplicacion_detalle` FOREIGN KEY (`id_detalle_pago`) REFERENCES `detalle_pago_trabajador` (`id_detalle_pago`) ON DELETE CASCADE,
  CONSTRAINT `fk_aplicacion_anticipo` FOREIGN KEY (`id_anticipo`) REFERENCES `anticipos_trabajadores` (`id_anticipo`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_pedido`
--

DROP TABLE IF EXISTS `detalle_pedido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_pedido` (
  `id_detalle_pedido` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_pedido` bigint unsigned NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `cantidad` int NOT NULL,
  `observaciones` text,
  `precio_unitario` int DEFAULT NULL,
  PRIMARY KEY (`id_detalle_pedido`),
  KEY `id_pedido` (`id_pedido`),
  KEY `id_articulo` (`id_articulo`),
  CONSTRAINT `detalle_pedido_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE CASCADE,
  CONSTRAINT `detalle_pedido_ibfk_2` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`)
) ENGINE=InnoDB AUTO_INCREMENT=228 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `etapas_detalle_fabricacion`
--

DROP TABLE IF EXISTS `etapas_detalle_fabricacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etapas_detalle_fabricacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_detalle_fabricacion` bigint unsigned NOT NULL,
  `id_etapa` bigint unsigned NOT NULL,
  `orden` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_detalle_etapa` (`id_detalle_fabricacion`,`id_etapa`),
  KEY `id_etapa` (`id_etapa`),
  CONSTRAINT `etapas_detalle_fabricacion_ibfk_1` FOREIGN KEY (`id_detalle_fabricacion`) REFERENCES `detalle_orden_fabricacion` (`id_detalle_fabricacion`) ON DELETE CASCADE,
  CONSTRAINT `etapas_detalle_fabricacion_ibfk_2` FOREIGN KEY (`id_etapa`) REFERENCES `etapas_produccion` (`id_etapa`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `etapas_produccion`
--

DROP TABLE IF EXISTS `etapas_produccion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `etapas_produccion` (
  `id_etapa` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `descripcion` text,
  `orden` int NOT NULL DEFAULT '1',
  `cargo` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_etapa`),
  UNIQUE KEY `id_etapa` (`id_etapa`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `historial_costos`
--

DROP TABLE IF EXISTS `historial_costos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_costos` (
  `id_historial` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_articulo` bigint unsigned DEFAULT NULL,
  `id_etapa` bigint unsigned DEFAULT NULL,
  `costo_unitario` decimal(10,2) DEFAULT NULL,
  `fecha_inicio` date DEFAULT NULL,
  PRIMARY KEY (`id_historial`),
  KEY `id_articulo` (`id_articulo`),
  KEY `ix_historial_etapa_fecha` (`id_etapa`,`fecha_inicio`),
  CONSTRAINT `historial_costos_ibfk_1` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `historial_costos_ibfk_2` FOREIGN KEY (`id_etapa`) REFERENCES `etapas_produccion` (`id_etapa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventario`
--

DROP TABLE IF EXISTS `inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventario` (
  `id_inventario` int NOT NULL AUTO_INCREMENT,
  `id_articulo` bigint unsigned NOT NULL,
  `stock` decimal(12,2) DEFAULT NULL,
  `stock_fabricado` decimal(12,2) NOT NULL DEFAULT '0.00',
  `stock_minimo` decimal(12,2) DEFAULT NULL,
  `stock_reparacion` decimal(10,2) DEFAULT '0.00',
  `ultima_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_inventario`),
  KEY `fk1_inventario_articulo` (`id_articulo`),
  CONSTRAINT `fk1_inventario_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=294 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `lotes_fabricados`
--

DROP TABLE IF EXISTS `lotes_fabricados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lotes_fabricados` (
  `id_lote` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_fabricacion` bigint unsigned NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `id_trabajador` bigint unsigned NOT NULL,
  `cantidad` int NOT NULL,
  `fecha` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text,
  PRIMARY KEY (`id_lote`),
  KEY `id_articulo` (`id_articulo`),
  KEY `id_trabajador` (`id_trabajador`),
  KEY `lotes_fabricados_ibfk_1` (`id_orden_fabricacion`),
  CONSTRAINT `lotes_fabricados_ibfk_1` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE,
  CONSTRAINT `lotes_fabricados_ibfk_2` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `lotes_fabricados_ibfk_3` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`)
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `metodos_pago`
--

DROP TABLE IF EXISTS `metodos_pago`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metodos_pago` (
  `id_metodo_pago` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `tipo` enum('contado','credito') NOT NULL DEFAULT 'contado',
  PRIMARY KEY (`id_metodo_pago`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimientos_inventario`
--

DROP TABLE IF EXISTS `movimientos_inventario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_inventario` (
  `id_movimiento` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_articulo` bigint unsigned DEFAULT NULL,
  `cantidad_movida` decimal(12,2) NOT NULL,
  `tipo_movimiento` enum('entrada','salida','ajuste') NOT NULL,
  `fecha_movimiento` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `observaciones` text,
  `tipo_origen_movimiento` enum('inicial','produccion','venta','compra','ajuste_manual','anulacion_venta','anulacion_compra','devolucion_cliente','devolucion_proveedor','reparacion') NOT NULL,
  `referencia_documento_id` bigint unsigned DEFAULT NULL,
  `referencia_documento_tipo` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  UNIQUE KEY `id_inventario` (`id_movimiento`),
  KEY `ix_inventario_articulo_fecha` (`id_articulo`,`fecha_movimiento`),
  KEY `ix_inventario_tipo` (`tipo_movimiento`),
  KEY `ix_inventario_origen` (`tipo_origen_movimiento`),
  CONSTRAINT `fk_inventario_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`)
) ENGINE=InnoDB AUTO_INCREMENT=965 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimientos_tesoreria`
--

DROP TABLE IF EXISTS `movimientos_tesoreria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimientos_tesoreria` (
  `id_movimiento` int NOT NULL AUTO_INCREMENT,
  `id_documento` bigint unsigned DEFAULT NULL,
  `tipo_documento` varchar(50) DEFAULT NULL,
  `fecha_movimiento` datetime NOT NULL,
  `monto` decimal(10,2) NOT NULL,
  `id_metodo_pago` int DEFAULT NULL,
  `referencia` varchar(255) DEFAULT NULL,
  `observaciones` text,
  `conciliado` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_conciliacion` datetime DEFAULT NULL,
  `id_usuario_conciliacion` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_movimiento`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  KEY `idx_fecha_movimiento` (`fecha_movimiento`),
  KEY `idx_conciliado` (`conciliado`),
  KEY `fk_conciliacion_usuario` (`id_usuario_conciliacion`),
  CONSTRAINT `movimientos_tesoreria_ibfk_1` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`),
  CONSTRAINT `fk_conciliacion_usuario` FOREIGN KEY (`id_usuario_conciliacion`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=477 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_compra`
--

DROP TABLE IF EXISTS `ordenes_compra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_compra` (
  `id_orden_compra` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_proveedor` bigint unsigned NOT NULL,
  `fecha` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `categoria_costo` varchar(100) DEFAULT NULL,
  `id_orden_fabricacion` bigint unsigned DEFAULT NULL,
  `estado` enum('pendiente','completada','cancelada') NOT NULL DEFAULT 'pendiente',
  `comprobante_path` varchar(255) DEFAULT NULL,
  `comprobante_nombre` varchar(255) DEFAULT NULL,
  `comprobante_fecha_subida` datetime DEFAULT NULL,
  `stock_actualizado` tinyint(1) NOT NULL DEFAULT '0',
  `tesoreria_actualizada` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_orden_compra`),
  UNIQUE KEY `id_compra` (`id_orden_compra`),
  KEY `fk_ordenes_compra_proveedor` (`id_proveedor`),
  KEY `fk_oc_ordenCompra` (`id_orden_fabricacion`),
  KEY `idx_oc_fecha` (`fecha`),
  CONSTRAINT `fk_oc_ordenCompra` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_ordenes_compra_proveedor` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=181 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_fabricacion`
--

DROP TABLE IF EXISTS `ordenes_fabricacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_fabricacion` (
  `id_orden_fabricacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_venta` bigint unsigned DEFAULT NULL,
  `fecha_inicio` date DEFAULT (curdate()),
  `fecha_fin_estimada` date DEFAULT NULL,
  `estado` enum('pendiente','en proceso','completada','entregada','cancelada') DEFAULT 'pendiente',
  `fecha_entrega` datetime DEFAULT NULL,
  `id_pedido` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_orden_fabricacion`),
  UNIQUE KEY `id_orden_fabricacion` (`id_orden_fabricacion`),
  KEY `fk_ofab_orden_venta` (`id_orden_venta`),
  KEY `fk_ofab_pedido` (`id_pedido`),
  KEY `idx_of_estado_fecha` (`estado`,`fecha_inicio`),
  CONSTRAINT `fk_ofab_orden_venta` FOREIGN KEY (`id_orden_venta`) REFERENCES `ordenes_venta` (`id_orden_venta`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ofab_pedido` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=166 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ordenes_venta`
--

DROP TABLE IF EXISTS `ordenes_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ordenes_venta` (
  `id_orden_venta` bigint unsigned NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL DEFAULT (curdate()),
  `id_cliente` bigint unsigned DEFAULT NULL,
  `id_metodo_pago` int DEFAULT NULL,
  `estado` enum('pendiente','completada','anulada') DEFAULT 'pendiente',
  `total` decimal(12,2) DEFAULT NULL,
  `monto` decimal(12,2) NOT NULL,
  `id_pedido` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_orden_venta`),
  UNIQUE KEY `id_orden_venta` (`id_orden_venta`),
  KEY `fk_ov_cliente` (`id_cliente`),
  KEY `id_pedido` (`id_pedido`),
  KEY `fk_ordenes_venta_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `fk_ordenes_venta_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_ordenes_venta_metodo_pago` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ov_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `ordenes_venta_ibfk_1` FOREIGN KEY (`id_pedido`) REFERENCES `pedidos` (`id_pedido`)
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pagos_trabajadores`
--

DROP TABLE IF EXISTS `pagos_trabajadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pagos_trabajadores` (
  `id_pago` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_trabajador` bigint unsigned NOT NULL,
  `fecha_pago` datetime DEFAULT CURRENT_TIMESTAMP,
  `monto_total` bigint DEFAULT NULL,
  `observaciones` text,
  PRIMARY KEY (`id_pago`),
  UNIQUE KEY `id_pago` (`id_pago`),
  KEY `ix_pagos_por_trabajador` (`id_trabajador`),
  KEY `idx_pago_fecha` (`fecha_pago`),
  CONSTRAINT `fk_pagos_trabajador_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=193 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pedidos`
--

DROP TABLE IF EXISTS `pedidos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pedidos` (
  `id_pedido` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_cliente` bigint unsigned NOT NULL,
  `fecha_pedido` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('pendiente','en fabricacion','listo para entrega','completado','cancelado') DEFAULT 'pendiente',
  `observaciones` text,
  PRIMARY KEY (`id_pedido`),
  KEY `id_cliente` (`id_cliente`),
  CONSTRAINT `pedidos_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=141 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `permisos_rol`
--

DROP TABLE IF EXISTS `permisos_rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos_rol` (
  `id_rol` bigint unsigned NOT NULL,
  `accion` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`,`accion`),
  CONSTRAINT `permisos_rol_ibfk_1` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Permisos base para cada rol

-- Admin: acceso total
INSERT INTO permisos_rol (id_rol, accion) VALUES
  (1, 'articles:view'), (1, 'articles:create'), (1, 'articles:edit'), (1, 'articles:delete'),
  (1, 'categories:view'), (1, 'categories:create'), (1, 'categories:edit'), (1, 'categories:delete'),
  (1, 'suppliers:view'), (1, 'suppliers:create'), (1, 'suppliers:edit'), (1, 'suppliers:delete'),
  (1, 'clients:view'), (1, 'clients:create'), (1, 'clients:edit'), (1, 'clients:delete'),
  (1, 'workers:view'), (1, 'workers:create'), (1, 'workers:edit'), (1, 'workers:delete'),
  (1, 'inventory:view'), (1, 'inventory:create'), (1, 'inventory:edit'), (1, 'inventory:delete'), (1, 'inventory:consume'), (1, 'inventory:tracking'), (1, 'movements:view'),
  (1, 'sales:view'), (1, 'sales:create'), (1, 'sales:edit'), (1, 'sales:delete'),
  (1, 'orders:view'), (1, 'orders:create'), (1, 'orders:edit'), (1, 'orders:delete'),
  (1, 'fabrication:view'), (1, 'fabrication:create'), (1, 'fabrication:edit'), (1, 'fabrication:delete'),
  (1, 'purchases:view'), (1, 'purchases:create'), (1, 'purchases:edit'), (1, 'purchases:delete'),
  (1, 'advances:view'), (1, 'advances:create'), (1, 'advances:edit'), (1, 'advances:edit_quantity'),
  (1, 'kanban:view'), (1, 'kanban:manage'),
  (1, 'progress:view'),
  (1, 'payments:view'), (1, 'payments:create'), (1, 'payments:delete'),
  (1, 'anticipos:view'), (1, 'anticipos:create'),
  (1, 'credits:view'), (1, 'credits:create'), (1, 'credits:manage'),
  (1, 'indirect_costs:view'), (1, 'indirect_costs:create'), (1, 'indirect_costs:edit'), (1, 'indirect_costs:delete'), (1, 'indirect_costs:assign'),
  (1, 'treasury:view'), (1, 'treasury:manage'), (1, 'treasury:reconcile'),
  (1, 'cash_closings:view'), (1, 'cash_closings:create'), (1, 'cash_closings:close'), (1, 'cash_closings:delete'),
  (1, 'production_stages:view'), (1, 'production_stages:manage'),
  (1, 'cost_history:view'),
  (1, 'payment_methods:view'), (1, 'payment_methods:manage'),
  (1, 'outsourced_services:view'), (1, 'outsourced_services:manage'),
  (1, 'units:view'), (1, 'units:manage'),
  (1, 'reports:view'),
  (1, 'returns:view'), (1, 'returns:create'), (1, 'returns:cancel'),
  (1, 'repairs:view'), (1, 'repairs:create'), (1, 'repairs:diagnose'), (1, 'repairs:manage'), (1, 'repairs:deliver'), (1, 'repairs:cancel'),
  (1, 'users:manage');

-- Operario: permisos operativos
INSERT INTO permisos_rol (id_rol, accion) VALUES
  (2, 'articles:view'),
  (2, 'categories:view'),
  (2, 'suppliers:view'),
  (2, 'clients:view'),
  (2, 'inventory:view'),
  (2, 'inventory:edit'),
  (2, 'sales:view'),
  (2, 'sales:create'),
  (2, 'orders:view'),
  (2, 'orders:create'),
  (2, 'fabrication:view'),
  (2, 'fabrication:create'),
  (2, 'purchases:view'),
  (2, 'advances:view'),
  (2, 'advances:create'),
  (2, 'kanban:view'),
  (2, 'progress:view'),
  (2, 'production_stages:view'),
  (2, 'cost_history:view'),
  (2, 'payment_methods:view'),
  (2, 'outsourced_services:view'),
  (2, 'units:view'),
  (2, 'returns:view'), (2, 'returns:create'),
  (2, 'repairs:view'), (2, 'repairs:create');

-- Supervisor: permisos intermedios y de supervisión
INSERT INTO permisos_rol (id_rol, accion) VALUES
  (3, 'articles:view'), (3, 'articles:create'), (3, 'articles:edit'),
  (3, 'categories:view'), (3, 'categories:create'), (3, 'categories:edit'),
  (3, 'suppliers:view'), (3, 'suppliers:create'), (3, 'suppliers:edit'),
  (3, 'clients:view'), (3, 'clients:create'), (3, 'clients:edit'),
  (3, 'workers:view'),
  (3, 'inventory:view'), (3, 'inventory:create'), (3, 'inventory:edit'), (3, 'inventory:consume'), (3, 'inventory:tracking'), (3, 'movements:view'),
  (3, 'sales:view'), (3, 'sales:create'), (3, 'sales:edit'),
  (3, 'orders:view'), (3, 'orders:create'), (3, 'orders:edit'),
  (3, 'fabrication:view'), (3, 'fabrication:create'), (3, 'fabrication:edit'),
  (3, 'purchases:view'), (3, 'purchases:create'), (3, 'purchases:edit'),
  (3, 'advances:view'), (3, 'advances:create'), (3, 'advances:edit'), (3, 'advances:edit_quantity'),
  (3, 'kanban:view'), (3, 'kanban:manage'),
  (3, 'progress:view'),
  (3, 'payments:view'), (3, 'payments:create'),
  (3, 'anticipos:view'), (3, 'anticipos:create'),
  (3, 'credits:view'), (3, 'credits:manage'),
  (3, 'indirect_costs:view'),
  (3, 'treasury:view'), (3, 'treasury:reconcile'),
  (3, 'cash_closings:view'),
  (3, 'reports:view'),
  (3, 'production_stages:view'), (3, 'production_stages:manage'),
  (3, 'cost_history:view'),
  (3, 'payment_methods:view'), (3, 'payment_methods:manage'),
  (3, 'outsourced_services:view'), (3, 'outsourced_services:manage'),
  (3, 'units:view'), (3, 'units:manage'),
  (3, 'returns:view'), (3, 'returns:create'), (3, 'returns:cancel'),
  (3, 'repairs:view'), (3, 'repairs:create'), (3, 'repairs:diagnose'), (3, 'repairs:manage'), (3, 'repairs:deliver'), (3, 'repairs:cancel');
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `proveedores`
--

DROP TABLE IF EXISTS `proveedores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedores` (
  `id_proveedor` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `identificacion` bigint DEFAULT NULL,
  `telefono` varchar(50) NOT NULL,
  `direccion` text,
  `ciudad` varchar(100) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_proveedor`),
  UNIQUE KEY `id_proveedor` (`id_proveedor`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) NOT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `nombre_rol` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insertar roles base
INSERT INTO roles (id_rol, nombre_rol) VALUES
  (1, 'admin'),
  (2, 'operario'),
  (3, 'supervisor');

/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `servicios_tercerizados`
--

DROP TABLE IF EXISTS `servicios_tercerizados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios_tercerizados` (
  `id_servicio` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_proveedor` bigint unsigned NOT NULL,
  `descripcion` varchar(255) NOT NULL,
  `estado` enum('pendiente','finalizado') DEFAULT 'pendiente',
  `fecha_inicio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `costo` int NOT NULL,
  PRIMARY KEY (`id_servicio`),
  KEY `id_proveedor` (`id_proveedor`),
  CONSTRAINT `servicios_tercerizados_ibfk_1` FOREIGN KEY (`id_proveedor`) REFERENCES `proveedores` (`id_proveedor`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `servicios_tercerizados_asignados`
--

DROP TABLE IF EXISTS `servicios_tercerizados_asignados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `servicios_tercerizados_asignados` (
  `id_asignacion` int NOT NULL AUTO_INCREMENT,
  `id_servicio` bigint unsigned NOT NULL,
  `id_orden_fabricacion` bigint unsigned NOT NULL,
  `id_etapa_produccion` bigint unsigned NOT NULL,
  `fecha_asignacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_asignacion`),
  UNIQUE KEY `unique_asignacion` (`id_servicio`,`id_orden_fabricacion`,`id_etapa_produccion`),
  KEY `fk_etapa_produccion` (`id_etapa_produccion`),
  KEY `fk1_orden_fabricacion` (`id_orden_fabricacion`),
  CONSTRAINT `fk1_orden_fabricacion` FOREIGN KEY (`id_orden_fabricacion`) REFERENCES `ordenes_fabricacion` (`id_orden_fabricacion`) ON DELETE CASCADE,
  CONSTRAINT `fk_etapa_produccion` FOREIGN KEY (`id_etapa_produccion`) REFERENCES `etapas_produccion` (`id_etapa`) ON DELETE CASCADE,
  CONSTRAINT `fk_servicio` FOREIGN KEY (`id_servicio`) REFERENCES `servicios_tercerizados` (`id_servicio`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `trabajadores`
--

DROP TABLE IF EXISTS `trabajadores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trabajadores` (
  `id_trabajador` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(255) NOT NULL,
  `telefono` varchar(50) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_trabajador`),
  UNIQUE KEY `id_trabajador` (`id_trabajador`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `unidades`
--

DROP TABLE IF EXISTS `unidades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `unidades` (
  `id_unidad` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(20) NOT NULL,
  `abreviatura` varchar(10) NOT NULL,
  PRIMARY KEY (`id_unidad`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` bigint unsigned NOT NULL AUTO_INCREMENT,
  `nombre_usuario` varchar(100) NOT NULL,
  `pin` varchar(255) NOT NULL,
  `id_rol` bigint unsigned DEFAULT NULL,
  `id_trabajador` bigint unsigned DEFAULT NULL,
  `failed_attempts` tinyint unsigned NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `id_usuario` (`id_usuario`),
  UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  KEY `fk_usuario_rol` (`id_rol`),
  KEY `fk_usuarios_trabajador` (`id_trabajador`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`),
  CONSTRAINT `fk_usuarios_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ventas_credito`
--

DROP TABLE IF EXISTS `ventas_credito`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ventas_credito` (
  `id_venta_credito` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_venta` bigint unsigned DEFAULT NULL,
  `id_cliente` bigint unsigned NOT NULL,
  `monto_total` int NOT NULL,
  `saldo_pendiente` int NOT NULL,
  `fecha` date NOT NULL DEFAULT (curdate()),
  `estado` enum('pendiente','parcial','pagado') DEFAULT 'pendiente',
  `observaciones` text,
  PRIMARY KEY (`id_venta_credito`),
  KEY `id_orden_venta` (`id_orden_venta`),
  KEY `id_cliente` (`id_cliente`),
  CONSTRAINT `ventas_credito_ibfk_1` FOREIGN KEY (`id_orden_venta`) REFERENCES `ordenes_venta` (`id_orden_venta`),
  CONSTRAINT `ventas_credito_ibfk_2` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

--
-- Table structure for table `idempotency_keys`
--

DROP TABLE IF EXISTS `idempotency_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE idempotency_keys (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  key_value     VARCHAR(64) NOT NULL UNIQUE,
  path          VARCHAR(255) NOT NULL,
  user_id       INT NOT NULL,
  status_code   SMALLINT NOT NULL,
  response_body JSON NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at    DATETIME NOT NULL,
  INDEX idx_key (key_value),
  INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devoluciones_venta`
--
DROP TABLE IF EXISTS `devoluciones_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devoluciones_venta` (
  `id_devolucion_venta` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_orden_venta` bigint unsigned DEFAULT NULL,
  `id_cliente` bigint unsigned NOT NULL,
  `fecha` date NOT NULL DEFAULT (curdate()),
  `id_metodo_pago` int DEFAULT NULL,
  `estado` enum('pendiente','aprobada','anulada') DEFAULT 'pendiente',
  `motivo` text,
  `total` decimal(12,2) NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_devolucion_venta`),
  KEY `id_cliente` (`id_cliente`),
  KEY `id_orden_venta` (`id_orden_venta`),
  KEY `id_metodo_pago` (`id_metodo_pago`),
  CONSTRAINT `devoluciones_venta_ibfk_1` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `devoluciones_venta_ibfk_2` FOREIGN KEY (`id_orden_venta`) REFERENCES `ordenes_venta` (`id_orden_venta`),
  CONSTRAINT `devoluciones_venta_ibfk_3` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_devolucion_venta`
--
DROP TABLE IF EXISTS `detalle_devolucion_venta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_devolucion_venta` (
  `id_detalle_devolucion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_devolucion_venta` bigint unsigned NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `cantidad` int NOT NULL,
  `precio_unitario` decimal(10,2) NOT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_detalle_devolucion`),
  KEY `id_articulo` (`id_articulo`),
  KEY `fk_detalle_devolucion_venta` (`id_devolucion_venta`),
  CONSTRAINT `detalle_devolucion_venta_ibfk_2` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `fk_detalle_devolucion_venta` FOREIGN KEY (`id_devolucion_venta`) REFERENCES `devoluciones_venta` (`id_devolucion_venta`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reparaciones`
--
DROP TABLE IF EXISTS `reparaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reparaciones` (
  `id_reparacion` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_cliente` bigint unsigned NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `id_devolucion_venta` bigint unsigned DEFAULT NULL,
  `fecha_ingreso` date NOT NULL DEFAULT (curdate()),
  `fecha_estimada` date DEFAULT NULL,
  `fecha_entrega` date DEFAULT NULL,
  `estado` enum('registrada','diagnosticada','en_reparacion','lista_entrega','entregada','cancelada') NOT NULL DEFAULT 'registrada',
  `motivo` text NOT NULL,
  `diagnostico` text,
  `requiere_pago` tinyint(1) NOT NULL DEFAULT '0',
  `subtotal_materiales` decimal(12,2) NOT NULL DEFAULT '0.00',
  `mano_obra` decimal(12,2) NOT NULL DEFAULT '0.00',
  `descuento` decimal(12,2) NOT NULL DEFAULT '0.00',
  `total` decimal(12,2) NOT NULL DEFAULT '0.00',
  `id_metodo_pago` int DEFAULT NULL,
  `observaciones` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `id_trabajador` bigint unsigned DEFAULT NULL,
  PRIMARY KEY (`id_reparacion`),
  KEY `fk_rep_cliente` (`id_cliente`),
  KEY `fk_rep_articulo` (`id_articulo`),
  KEY `fk_rep_devolucion` (`id_devolucion_venta`),
  KEY `fk_rep_metodo_pago` (`id_metodo_pago`),
  KEY `fk_rep_trabajador` (`id_trabajador`),
  CONSTRAINT `fk_rep_articulo` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `fk_rep_cliente` FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_rep_devolucion` FOREIGN KEY (`id_devolucion_venta`) REFERENCES `devoluciones_venta` (`id_devolucion_venta`),
  CONSTRAINT `fk_rep_metodo_pago` FOREIGN KEY (`id_metodo_pago`) REFERENCES `metodos_pago` (`id_metodo_pago`),
  CONSTRAINT `fk_rep_trabajador` FOREIGN KEY (`id_trabajador`) REFERENCES `trabajadores` (`id_trabajador`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `detalle_reparacion_material`
--
DROP TABLE IF EXISTS `detalle_reparacion_material`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `detalle_reparacion_material` (
  `id_detalle` bigint unsigned NOT NULL AUTO_INCREMENT,
  `id_reparacion` bigint unsigned NOT NULL,
  `id_articulo` bigint unsigned NOT NULL,
  `cantidad` decimal(12,2) NOT NULL,
  `costo_unitario` decimal(12,2) NOT NULL,
  `subtotal` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id_detalle`),
  KEY `fk_rep_mat_rep` (`id_reparacion`),
  KEY `fk_rep_mat_art` (`id_articulo`),
  CONSTRAINT `fk_rep_mat_art` FOREIGN KEY (`id_articulo`) REFERENCES `articulos` (`id_articulo`),
  CONSTRAINT `fk_rep_mat_rep` FOREIGN KEY (`id_reparacion`) REFERENCES `reparaciones` (`id_reparacion`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Datos iniciales: Unidades de medida
INSERT INTO `unidades` (`id_unidad`, `nombre`, `abreviatura`) VALUES
  (1, 'UNIDAD', 'UND'),
  (2, 'METRO', 'M'),
  (3, 'KILOGRAMO', 'KG'),
  (4, 'LITRO', 'L');

-- Datos iniciales: Métodos de pago
INSERT INTO `metodos_pago` (`id_metodo_pago`, `nombre`, `tipo`) VALUES
  (1, 'EFECTIVO', 'contado'),
  (2, 'TRANSFERENCIA BANCARIA', 'contado'),
  (3, 'CRÉDITO', 'credito');

-- Datos iniciales: Etapas de producción (solo para plan Pro)
INSERT INTO `etapas_produccion` (`nombre`, `orden`, `cargo`) VALUES
  ('Carpintería', 1, 'Carpintero'),
  ('Pulido', 2, 'Pulidor'),
  ('Pintura', 3, 'Pintor'),
  ('Tapizado', 4, 'Tapicero');

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-19 15:46:42
