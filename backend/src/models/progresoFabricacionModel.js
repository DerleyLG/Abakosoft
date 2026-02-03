const db = require("../database/db");

const progresoFabricacionModel = {
  getProgresoOrdenesFabricacion: async ({
    fecha_inicio = null,
    fecha_fin = null,
    id_orden_fabricacion = null,
    estado_orden = null,
    busqueda = null,
  } = {}) => {
    const whereParts = [];
    const params = [];

    if (fecha_inicio) {
      whereParts.push("ofa.fecha_inicio >= ?");
      params.push(fecha_inicio);
    }
    if (fecha_fin) {
      whereParts.push("ofa.fecha_inicio <= ?");
      params.push(fecha_fin);
    }
    if (id_orden_fabricacion) {
      whereParts.push("ofa.id_orden_fabricacion = ?");
      params.push(id_orden_fabricacion);
    }
    if (estado_orden) {
      whereParts.push("ofa.estado = ?");
      params.push(estado_orden);
    } else {
      // Por defecto excluir órdenes canceladas
      whereParts.push("ofa.estado != 'Cancelada'");
    }

    // Filtro de búsqueda en SQL para mejor rendimiento
    if (busqueda) {
      whereParts.push(`(
        ofa.id_orden_fabricacion LIKE ? OR
        c.nombre LIKE ? OR
        art.descripcion LIKE ? OR
        art.referencia LIKE ?
      )`);
      const busquedaParam = `%${busqueda}%`;
      params.push(busquedaParam, busquedaParam, busquedaParam, busquedaParam);
    }

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    const query = `
      SELECT 
        ofa.id_orden_fabricacion,
        ofa.estado AS estado_orden,
        ofa.fecha_inicio,
        c.nombre AS nombre_cliente,
        dof.id_detalle_fabricacion,
        dof.id_articulo,
        art.descripcion AS nombre_articulo,
        art.referencia AS referencia_articulo,
        art.precio_costo AS costo_materia_prima,
        dof.cantidad AS cantidad_solicitada,
        dof.id_etapa_final,
        ef.nombre AS nombre_etapa_final,
        ef.orden AS orden_etapa_final,
        
        -- Cuenta de etapas completadas
        (
          SELECT COUNT(DISTINCT ep_av.id_etapa)
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'completado'
        ) AS etapas_completadas_count,
     
        (
          SELECT MAX(ep_av.orden)
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'completado'
        ) AS etapa_completada_max_orden,
        
        -- Lista de etapas completadas (nombres concatenados)
        (
          SELECT GROUP_CONCAT(DISTINCT ep_av.nombre ORDER BY ep_av.orden SEPARATOR ', ')
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'completado'
        ) AS etapas_completadas_nombres,
       
        (
          SELECT ep_av.nombre
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'completado'
          ORDER BY ep_av.orden DESC
          LIMIT 1
        ) AS etapa_completada_nombre,
        
       
        (
          SELECT COALESCE(SUM(aep.cantidad), 0)
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'completado'
            AND ep_av.id_etapa = dof.id_etapa_final
        ) AS cantidad_completada_final,
        
       
        (
          SELECT COUNT(*)
          FROM avance_etapas_produccion aep
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'en proceso'
        ) AS etapas_en_proceso,
        
       
        (
          SELECT ep_av.nombre
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'en proceso'
          ORDER BY ep_av.orden DESC
          LIMIT 1
        ) AS etapa_en_proceso_nombre,
        
        
        (
          SELECT COALESCE(SUM(aep.cantidad), 0)
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep_av ON aep.id_etapa_produccion = ep_av.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND aep.id_articulo = dof.id_articulo
            AND aep.estado = 'en proceso'
        ) AS cantidad_en_proceso
        
      FROM ordenes_fabricacion ofa
      JOIN detalle_orden_fabricacion dof ON ofa.id_orden_fabricacion = dof.id_orden_fabricacion
      JOIN articulos art ON dof.id_articulo = art.id_articulo
      LEFT JOIN etapas_produccion ef ON dof.id_etapa_final = ef.id_etapa
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      ${whereClause}
      ORDER BY ofa.id_orden_fabricacion DESC, art.descripcion ASC
    `;

    const [rows] = await db.query(query, params);
    return rows;
  },

  calcularProgresoConEstimacion: async (filtros = {}) => {
    const datos =
      await progresoFabricacionModel.getProgresoOrdenesFabricacion(filtros);

    const [etapas] = await db.query(
      "SELECT id_etapa, nombre, orden FROM etapas_produccion ORDER BY orden ASC",
    );

    // Crear mapa de etapas por orden
    const etapasPorOrden = {};
    etapas.forEach((e) => {
      etapasPorOrden[e.orden] = e;
    });

    const totalEtapas = etapas.length;

    // Procesar cada registro
    const resultado = datos.map((item) => {
      const ordenEtapaFinal = item.orden_etapa_final || totalEtapas;
      const etapaCompletadaOrden = item.etapa_completada_max_orden || 0;
      const tieneEnProceso = item.etapas_en_proceso > 0;

      // Calcular porcentaje de avance general del artículo
      // Si la etapa final es la 3 , y ya completó la etapa 2,
      // entonces lleva 2/3 = 66.67%
      let porcentajeGeneral = 0;
      if (ordenEtapaFinal > 0) {
        // Porcentaje base por etapas completadas
        porcentajeGeneral = (etapaCompletadaOrden / ordenEtapaFinal) * 100;

        // Si hay etapa en proceso, agregar un 50% de esa etapa
        if (tieneEnProceso && etapaCompletadaOrden < ordenEtapaFinal) {
          const porcentajePorEtapa = 100 / ordenEtapaFinal;
          porcentajeGeneral += porcentajePorEtapa * 0.5; // 50% de avance en etapa actual
        }
      }

      // Calcular cantidad "efectiva" considerando el progreso
      const cantidadSolicitada = item.cantidad_solicitada || 0;
      const cantidadCompletadaFinal = item.cantidad_completada_final || 0;
      const cantidadEnProceso = item.cantidad_en_proceso || 0;

      // Porcentaje de cantidad completada
      const porcentajeCantidadCompletada =
        cantidadSolicitada > 0
          ? (cantidadCompletadaFinal / cantidadSolicitada) * 100
          : 0;

      // Estimación de materia prima consumida
      // Basado en: (cantidad en proceso o completada en carpintería) / cantidad total
      // La carpintería (orden 1) es donde se consume la madera
      const costoMateriaPrima = item.costo_materia_prima || 0;
      const costoTotalEstimado = costoMateriaPrima * cantidadSolicitada;

      // Si ya pasó carpintería (orden 1), se considera 100% de la madera usada
      // Si está en carpintería, se considera proporcionalmente
      let porcentajeMateriaUsada = 0;
      if (etapaCompletadaOrden >= 1) {
        // Ya completó carpintería - 100% de la madera usada
        porcentajeMateriaUsada = 100;
      } else if (tieneEnProceso) {
        // Está en proceso en carpintería - 50% estimado
        porcentajeMateriaUsada = 50;
      }

      // Calcular cantidad que ya usó materia prima
      const cantidadConMateriaUsada = Math.max(
        cantidadCompletadaFinal,
        cantidadEnProceso,
      );

      const materiaUsadaEstimada =
        (cantidadConMateriaUsada / cantidadSolicitada) *
        costoTotalEstimado *
        (porcentajeMateriaUsada / 100);

      return {
        ...item,
        // Porcentajes calculados
        porcentaje_avance_general: Math.min(100, porcentajeGeneral).toFixed(1),
        porcentaje_cantidad_completada: porcentajeCantidadCompletada.toFixed(1),
        porcentaje_materia_usada: porcentajeMateriaUsada,

        // Cantidades
        cantidad_faltante: cantidadSolicitada - cantidadCompletadaFinal,

        // Costos estimados
        costo_total_estimado: costoTotalEstimado,
        materia_usada_estimada: Math.round(materiaUsadaEstimada),

        // Estado descriptivo
        estado_progreso:
          cantidadCompletadaFinal >= cantidadSolicitada
            ? "Completado"
            : tieneEnProceso
              ? "En Proceso"
              : etapaCompletadaOrden > 0
                ? "Parcial"
                : "Sin Iniciar",
      };
    });

    return resultado;
  },

  /**
   * Obtiene el detalle de avances por etapa para un artículo específico
   */
  getDetalleEtapasPorArticulo: async (idOrdenFabricacion, idArticulo) => {
    const query = `
      SELECT 
        ep.id_etapa,
        ep.nombre AS nombre_etapa,
        ep.orden AS orden_etapa,
        aep.estado,
        COALESCE(SUM(aep.cantidad), 0) AS cantidad,
        MAX(aep.fecha_registro) AS ultima_fecha
      FROM etapas_produccion ep
      LEFT JOIN avance_etapas_produccion aep 
        ON ep.id_etapa = aep.id_etapa_produccion 
        AND aep.id_orden_fabricacion = ?
        AND aep.id_articulo = ?
      GROUP BY ep.id_etapa, ep.nombre, ep.orden, aep.estado
      ORDER BY ep.orden ASC
    `;
    const [rows] = await db.query(query, [idOrdenFabricacion, idArticulo]);
    return rows;
  },

  /**
   * Obtiene el detalle de avances por etapa para múltiples artículos en batch (optimizado)
   */
  getDetalleEtapasBatch: async (articulosAConsultar) => {
    if (!articulosAConsultar || articulosAConsultar.length === 0) {
      return {};
    }

    // Crear placeholders para la consulta IN
    const condiciones = articulosAConsultar
      .map(() => "(aep.id_orden_fabricacion = ? AND aep.id_articulo = ?)")
      .join(" OR ");
    const params = articulosAConsultar.flatMap((art) => [
      art.id_orden,
      art.id_articulo,
    ]);

    const query = `
      SELECT 
        aep.id_orden_fabricacion,
        aep.id_articulo,
        ep.id_etapa,
        ep.nombre AS nombre_etapa,
        ep.orden AS orden_etapa,
        aep.estado,
        COALESCE(SUM(aep.cantidad), 0) AS cantidad,
        MAX(aep.fecha_registro) AS ultima_fecha
      FROM avance_etapas_produccion aep
      JOIN etapas_produccion ep ON aep.id_etapa_produccion = ep.id_etapa
      WHERE ${condiciones}
      GROUP BY aep.id_orden_fabricacion, aep.id_articulo, ep.id_etapa, ep.nombre, ep.orden, aep.estado
      ORDER BY aep.id_orden_fabricacion, aep.id_articulo, ep.orden ASC
    `;

    const [rows] = await db.query(query, params);

    // Agrupa resultados por clave orden_articulo
    const resultado = {};
    rows.forEach((row) => {
      const key = `${row.id_orden_fabricacion}_${row.id_articulo}`;
      if (!resultado[key]) {
        resultado[key] = [];
      }
      resultado[key].push({
        id_etapa: row.id_etapa,
        nombre_etapa: row.nombre_etapa,
        orden_etapa: row.orden_etapa,
        estado: row.estado,
        cantidad: row.cantidad,
        ultima_fecha: row.ultima_fecha,
      });
    });

    return resultado;
  },

  getResumenPorOrden: async (filtros = {}) => {
    const progreso =
      await progresoFabricacionModel.calcularProgresoConEstimacion(filtros);

    // Obtener todas las etapas disponibles
    const [todasEtapas] = await db.query(
      "SELECT id_etapa, nombre, orden FROM etapas_produccion ORDER BY orden ASC",
    );

    // Agrupar por orden de fabricación
    const resumenPorOrden = {};

    // Recopilar todas las combinaciones únicas de orden/artículo para consultar
    const articulosUnicos = new Map();
    progreso.forEach((item) => {
      const key = `${item.id_orden_fabricacion}_${item.id_articulo}`;
      if (!articulosUnicos.has(key)) {
        articulosUnicos.set(key, {
          id_orden: item.id_orden_fabricacion,
          id_articulo: item.id_articulo,
          orden_etapa_final: item.orden_etapa_final || todasEtapas.length,
          id_etapa_final: item.id_etapa_final, // Incluir id de la etapa final
        });
      }
    });
    const articulosAConsultar = Array.from(articulosUnicos.values());

    // Consultar detalle de etapas para todos los artículos en UNA sola consulta (batch)
    const detallesPorArticuloDB =
      await progresoFabricacionModel.getDetalleEtapasBatch(articulosAConsultar);

    // Completar el detalle con las etapas pendientes (sin avances registrados)
    const detallesPorArticulo = {};
    articulosAConsultar.forEach((art) => {
      const key = `${art.id_orden}_${art.id_articulo}`;
      const etapasConAvance = detallesPorArticuloDB[key] || [];

      // Crear mapa de etapas con avance usando id_etapa como clave (no orden_etapa)
      // para evitar conflictos cuando dos etapas tienen el mismo orden
      const etapasConAvanceMap = {};
      etapasConAvance.forEach((e) => {
        const etapaKey = e.id_etapa; // Usar id_etapa en lugar de orden_etapa
        // IMPORTANTE: Convertir cantidad a número porque MySQL puede devolverlo como string
        const cantidadNum = Number(e.cantidad) || 0;

        if (!etapasConAvanceMap[etapaKey]) {
          // Primera vez que vemos esta etapa
          etapasConAvanceMap[etapaKey] = {
            ...e,
            cantidad: cantidadNum,
            cantidad_completada: e.estado === "completado" ? cantidadNum : 0,
            cantidad_en_proceso: e.estado === "en proceso" ? cantidadNum : 0,
          };
        } else {
          // Ya existe, sumar cantidades según estado
          if (e.estado === "completado") {
            etapasConAvanceMap[etapaKey].cantidad_completada += cantidadNum;
          } else if (e.estado === "en proceso") {
            etapasConAvanceMap[etapaKey].cantidad_en_proceso += cantidadNum;
          }
          // Actualizar fecha si es más reciente
          if (e.ultima_fecha > etapasConAvanceMap[etapaKey].ultima_fecha) {
            etapasConAvanceMap[etapaKey].ultima_fecha = e.ultima_fecha;
          }
        }
      });

      // Calcular cantidad total y estado final para cada etapa
      Object.values(etapasConAvanceMap).forEach((etapa) => {
        etapa.cantidad =
          Number(etapa.cantidad_completada) + Number(etapa.cantidad_en_proceso);
        // El estado refleja la situación: si hay algo completado y algo en proceso, está "en proceso"
        if (etapa.cantidad_completada > 0 && etapa.cantidad_en_proceso > 0) {
          etapa.estado = "en proceso";
        } else if (etapa.cantidad_completada > 0) {
          etapa.estado = "completado";
        } else if (etapa.cantidad_en_proceso > 0) {
          etapa.estado = "en proceso";
        }
      });

      // Obtener la etapa final específica para este artículo
      const etapaFinalInfo = todasEtapas.find(
        (e) => e.orden === art.orden_etapa_final,
      );
      const idEtapaFinal =
        art.id_etapa_final || (etapaFinalInfo ? etapaFinalInfo.id_etapa : null);

      // Construir lista completa de etapas hasta la etapa final
      // Incluir etapas pendientes (sin avances) para mostrar el progreso completo
      const etapasCompletas = [];
      todasEtapas.forEach((etapa) => {
        // Solo incluir etapas hasta el orden de la etapa final
        if (etapa.orden <= art.orden_etapa_final) {
          if (etapasConAvanceMap[etapa.id_etapa]) {
            // Tiene avance registrado - usar los datos calculados
            etapasCompletas.push(etapasConAvanceMap[etapa.id_etapa]);
          } else {
            // No tiene avance - etapa pendiente
            etapasCompletas.push({
              id_etapa: etapa.id_etapa,
              nombre_etapa: etapa.nombre,
              orden_etapa: etapa.orden,
              estado: "pendiente",
              cantidad: 0,
              cantidad_completada: 0,
              cantidad_en_proceso: 0,
              ultima_fecha: null,
            });
          }
        }
      });

      detallesPorArticulo[key] = {
        etapas: etapasCompletas,
        id_etapa_final: idEtapaFinal,
        orden_etapa_final: art.orden_etapa_final,
      };
    });

    progreso.forEach((item) => {
      const idOrden = item.id_orden_fabricacion;

      if (!resumenPorOrden[idOrden]) {
        resumenPorOrden[idOrden] = {
          id_orden_fabricacion: idOrden,
          estado_orden: item.estado_orden,
          fecha_inicio: item.fecha_inicio,
          nombre_cliente: item.nombre_cliente,
          articulos: [],
          total_articulos: 0,
          articulos_completados: 0,
          articulos_en_proceso: 0,
          costo_materia_total: 0,
          materia_usada_total: 0,
        };
      }

      resumenPorOrden[idOrden].articulos.push({
        id_articulo: item.id_articulo,
        nombre_articulo: item.nombre_articulo,
        referencia_articulo: item.referencia_articulo || "",
        cantidad_solicitada: item.cantidad_solicitada,
        cantidad_completada: item.cantidad_completada_final || 0,
        cantidad_en_proceso: item.cantidad_en_proceso || 0,
        porcentaje_avance: parseFloat(item.porcentaje_avance_general) || 0,
        etapa_actual:
          item.etapa_en_proceso_nombre ||
          item.etapa_completada_nombre ||
          "Sin iniciar",
        etapa_final: item.nombre_etapa_final,
        orden_etapa_final: item.orden_etapa_final,
        etapa_completada_orden: item.etapa_completada_max_orden || 0,
        etapas_completadas_count: item.etapas_completadas_count || 0,
        etapas_completadas_nombres: item.etapas_completadas_nombres || "",
        // Detalle de cada etapa con su cantidad
        detalle_etapas:
          (detallesPorArticulo[`${idOrden}_${item.id_articulo}`] || {})
            .etapas || [],
        estado: item.estado_progreso,
        costo_materia_prima: item.costo_materia_prima || 0,
        materia_usada_estimada: item.materia_usada_estimada || 0,
      });

      // Recalcular el porcentaje de avance basado en las etapas completadas
      const detalleInfo =
        detallesPorArticulo[`${idOrden}_${item.id_articulo}`] || {};
      const etapasDelArticulo = detalleInfo.etapas || [];
      const ordenEtapaFinal =
        item.orden_etapa_final || detalleInfo.orden_etapa_final || 1;

      // Obtener referencia al artículo recién agregado
      const articuloActual =
        resumenPorOrden[idOrden].articulos[
          resumenPorOrden[idOrden].articulos.length - 1
        ];

      // El porcentaje se calcula basado en las etapas que REALMENTE tiene el artículo
      // (las que tienen avances registrados), no todas las etapas del sistema
      // Esto excluye etapas como "Mecanizado" que no forman parte del flujo normal
      const etapasConAvanceReal = etapasDelArticulo.filter(
        (e) =>
          (e.cantidad_completada > 0 || e.cantidad_en_proceso > 0) &&
          e.orden_etapa <= ordenEtapaFinal,
      );

      // El total de etapas requeridas es el orden de la etapa final
      // Pero solo contamos las etapas que realmente existen en el flujo de este artículo
      const cantidadSolicitada = item.cantidad_solicitada || 1;
      const totalEtapasRequeridas = ordenEtapaFinal;
      const porcentajePorEtapa = 100 / totalEtapasRequeridas;

      let porcentajeTotal = 0;
      etapasConAvanceReal.forEach((etapa) => {
        const cantidadCompletada = etapa.cantidad_completada || 0;
        const cantidadEnProceso = etapa.cantidad_en_proceso || 0;

        // Calcular qué proporción de la cantidad solicitada se ha completado en esta etapa
        const proporcionCompletada = Math.min(
          cantidadCompletada / cantidadSolicitada,
          1,
        );
        const proporcionEnProceso = Math.min(
          cantidadEnProceso / cantidadSolicitada,
          1,
        );

        // La etapa aporta su porcentaje proporcional
        // Completado aporta 100%, en proceso aporta 50%
        const aporteDelta =
          porcentajePorEtapa *
          (proporcionCompletada + proporcionEnProceso * 0.5);
        porcentajeTotal += aporteDelta;
      });

      // Formatear sin decimal innecesario (100 en vez de 100.0)
      const porcentajeFinal = Math.min(porcentajeTotal, 100);
      articuloActual.porcentaje_avance =
        porcentajeFinal % 1 === 0
          ? porcentajeFinal
          : parseFloat(porcentajeFinal.toFixed(1));

      resumenPorOrden[idOrden].total_articulos++;
      resumenPorOrden[idOrden].costo_materia_total += item.costo_total_estimado;
      resumenPorOrden[idOrden].materia_usada_total +=
        item.materia_usada_estimada;

      if (item.estado_progreso === "Completado") {
        resumenPorOrden[idOrden].articulos_completados++;
      } else if (
        item.estado_progreso === "En Proceso" ||
        item.estado_progreso === "Parcial"
      ) {
        resumenPorOrden[idOrden].articulos_en_proceso++;
      }
    });

    // Calcular porcentaje general de cada orden
    Object.values(resumenPorOrden).forEach((orden) => {
      const totalArticulos = orden.total_articulos;
      if (totalArticulos > 0) {
        // Calcular el promedio real del avance de todos los artículos
        const sumaAvances = orden.articulos.reduce(
          (sum, art) => sum + (parseFloat(art.porcentaje_avance) || 0),
          0,
        );
        const promedioGeneral = sumaAvances / totalArticulos;
        // Formatear sin decimal innecesario
        orden.porcentaje_general =
          promedioGeneral % 1 === 0
            ? promedioGeneral
            : parseFloat(promedioGeneral.toFixed(1));

        // También mantener el porcentaje de artículos completados 100%
        const porcCompletado =
          (orden.articulos_completados / totalArticulos) * 100;
        orden.porcentaje_completado =
          porcCompletado % 1 === 0
            ? porcCompletado
            : parseFloat(porcCompletado.toFixed(1));

        const porcMateria =
          orden.costo_materia_total > 0
            ? (orden.materia_usada_total / orden.costo_materia_total) * 100
            : 0;
        orden.porcentaje_materia_consumida =
          porcMateria % 1 === 0
            ? porcMateria
            : parseFloat(porcMateria.toFixed(1));
      }
    });

    return Object.values(resumenPorOrden);
  },

  /**
   * Obtiene el resumen de materia prima consumida en un período
   * Útil para el cierre semanal
   */
  getResumenMateriaPrimaPeriodo: async (fecha_inicio, fecha_fin) => {
    const progreso =
      await progresoFabricacionModel.calcularProgresoConEstimacion({
        fecha_inicio,
        fecha_fin,
      });

    // Calcular totales
    let totalMateriaEstimada = 0;
    let totalOrdenesActivas = new Set();
    let articulosEnProceso = 0;
    let articulosCompletados = 0;

    progreso.forEach((item) => {
      totalMateriaEstimada += item.materia_usada_estimada;
      totalOrdenesActivas.add(item.id_orden_fabricacion);

      if (item.estado_progreso === "Completado") {
        articulosCompletados++;
      } else if (
        item.estado_progreso === "En Proceso" ||
        item.estado_progreso === "Parcial"
      ) {
        articulosEnProceso++;
      }
    });

    return {
      periodo: { fecha_inicio, fecha_fin },
      resumen: {
        total_materia_prima_estimada: totalMateriaEstimada,
        ordenes_activas: totalOrdenesActivas.size,
        articulos_en_proceso: articulosEnProceso,
        articulos_completados: articulosCompletados,
        total_articulos: progreso.length,
      },
      detalle: progreso,
    };
  },
};

module.exports = progresoFabricacionModel;
