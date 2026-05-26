const db = require("../database/db");

const kanbanModel = {
  /**
   * Obtiene todas las órdenes de fabricación agrupadas por su etapa/estado actual
   * para mostrar en el tablero Kanban
   */
  getOrdenesKanban: async () => {
    const query = `
      SELECT 
        ofa.id_orden_fabricacion,
        ofa.fecha_inicio,
        ofa.fecha_fin_estimada,
        ofa.estado as estado_orden,
        ofa.id_pedido,
        
       
        c.nombre as nombre_cliente,
        c.telefono as telefono_cliente,
        
        GROUP_CONCAT(DISTINCT CONCAT(a.referencia, ' - ', a.descripcion, ' (x', dof.cantidad, ')') SEPARATOR ', ') as productos,
        
        -- Trabajador actual (último que trabajó)
        MAX(t.nombre) as nombre_trabajador,
        
        -- Conteo de etapas completadas
        COUNT(DISTINCT CASE WHEN aep.estado = 'completado' THEN aep.id_etapa_produccion END) as etapas_completadas,
        
        -- Etapa final requerida (la máxima de todos los artículos de la orden)
        MAX(dof.id_etapa_final) as id_etapa_final_requerida,
        MAX(ep_final.nombre) as nombre_etapa_final,
        MAX(ep_final.orden) as orden_etapa_final
      
      FROM ordenes_fabricacion ofa
      
      -- Join con pedido para obtener cliente
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      
      -- Join con detalles para obtener productos Y etapa final
      LEFT JOIN detalle_orden_fabricacion dof ON ofa.id_orden_fabricacion = dof.id_orden_fabricacion
      LEFT JOIN articulos a ON dof.id_articulo = a.id_articulo
      LEFT JOIN etapas_produccion ep_final ON dof.id_etapa_final = ep_final.id_etapa
      
      -- Join con avances (solo registros existentes)
      LEFT JOIN avance_etapas_produccion aep ON ofa.id_orden_fabricacion = aep.id_orden_fabricacion
      LEFT JOIN etapas_produccion ep_avances ON aep.id_etapa_produccion = ep_avances.id_etapa
      
      -- Join con trabajador
      LEFT JOIN trabajadores t ON aep.id_trabajador = t.id_trabajador 
        AND aep.fecha_registro = (
          SELECT MAX(aep2.fecha_registro) 
          FROM avance_etapas_produccion aep2 
          WHERE aep2.id_orden_fabricacion = ofa.id_orden_fabricacion
        )
      
      WHERE ofa.estado IN ('pendiente', 'en proceso', 'completada', 'entregada')
      
      GROUP BY ofa.id_orden_fabricacion, c.nombre, c.telefono
      ORDER BY ofa.fecha_inicio DESC
    `;

    const [rows] = await db.query(query);

    // Obtener avances individuales por orden para determinar la etapa actual correctamente
    const [todosAvances] = await db.query(`
      SELECT aep.id_orden_fabricacion, aep.id_etapa_produccion, aep.estado, aep.fecha_registro,
             ep.orden as orden_etapa
      FROM avance_etapas_produccion aep
      JOIN etapas_produccion ep ON aep.id_etapa_produccion = ep.id_etapa
      ORDER BY ep.orden DESC, aep.fecha_registro DESC
    `);

    // Agrupar avances por orden de fabricación
    const avancesPorOrden = {};
    todosAvances.forEach((av) => {
      if (!avancesPorOrden[av.id_orden_fabricacion]) {
        avancesPorOrden[av.id_orden_fabricacion] = [];
      }
      avancesPorOrden[av.id_orden_fabricacion].push(av);
    });

    // Importar el modelo de detalles para obtener todas las etapas finales requeridas
    const detalleOrdenFabricacionModel = require("./detalleOrdenFabricacionModel");

    // Obtener todas las etapas finales requeridas para cada orden
    const detallesPorOrden = {};
    for (const orden of rows) {
      if (!detallesPorOrden[orden.id_orden_fabricacion]) {
        detallesPorOrden[orden.id_orden_fabricacion] =
          await detalleOrdenFabricacionModel.getById(
            orden.id_orden_fabricacion,
          );
      }
    }

    // Obtener etapas de producción desde la BD ordenadas por su campo 'orden'
    const [etapasDB] = await db.query(
      `SELECT id_etapa, nombre, orden FROM etapas_produccion ORDER BY orden ASC`,
    );

    // Crear mapa de id_etapa -> orden (posición en el flujo)
    const etapaOrdenMap = {};
    etapasDB.forEach((e) => {
      etapaOrdenMap[e.id_etapa] = e.orden;
    });

    // Crear mapa de siguiente etapa: salta al primer id con un orden SUPERIOR
    // Etapas paralelas (mismo orden) apuntan todas al mismo siguiente
    const siguienteMap = {};
    for (const etapa of etapasDB) {
      const siguiente = etapasDB.find((e) => e.orden > etapa.orden);
      siguienteMap[etapa.id_etapa] = siguiente ? siguiente.id_etapa : null;
    }

    // Primera etapa del flujo
    const primeraEtapaId = etapasDB.length > 0 ? etapasDB[0].id_etapa : null;

    const ordenes = rows.map((orden) => {
      let columna = "sin_iniciar";
      let estado_etapa = null;
      let total_etapas_requeridas = 0;
      const etapa_final = orden.id_etapa_final_requerida;

      // Calcular total de etapas requeridas usando el campo orden de la BD
      const orden_etapa_final = etapaOrdenMap[etapa_final];
      if (orden_etapa_final) {
        total_etapas_requeridas = orden_etapa_final;
      }
      if (total_etapas_requeridas === 0) {
        total_etapas_requeridas = etapasDB.length;
      }

      // Obtener todas las etapas finales requeridas para esta orden
      const detalles = detallesPorOrden[orden.id_orden_fabricacion] || [];
      const etapasFinalesRequeridas = detalles.map((d) => d.id_etapa_final);

      // Obtener el orden más alto de etapa final requerida (la última etapa que debe completarse)
      const ordenesFinales = etapasFinalesRequeridas
        .map((e) => etapaOrdenMap[e])
        .filter((o) => o !== undefined);
      const maxOrdenEtapaFinal =
        ordenesFinales.length > 0 ? Math.max(...ordenesFinales) : -1;

      // Obtener avances de esta orden
      const avancesOrden = avancesPorOrden[orden.id_orden_fabricacion] || [];

      // Etapa en proceso más TEMPRANA (cuello de botella: dónde hay trabajo pendiente)
      // Si hay empate de orden, elegir la más reciente por fecha
      const enProceso = avancesOrden
        .filter((av) => av.estado === "en proceso")
        .sort(
          (a, b) =>
            a.orden_etapa - b.orden_etapa ||
            new Date(b.fecha_registro) - new Date(a.fecha_registro),
        );
      const etapaEnProcesoActual = enProceso.length > 0 ? enProceso[0] : null;

      // Última etapa completada más avanzada (por campo orden, luego fecha)
      const completadas = avancesOrden
        .filter((av) => av.estado === "completado")
        .sort(
          (a, b) =>
            b.orden_etapa - a.orden_etapa ||
            new Date(b.fecha_registro) - new Date(a.fecha_registro),
        );
      const ultimaCompletada = completadas.length > 0 ? completadas[0] : null;

      const orden_ultima_completada = ultimaCompletada
        ? ultimaCompletada.orden_etapa
        : -1;

      // Verificar si TODOS los avances de la etapa final están completados
      // No basta con que UN artículo haya llegado a la etapa final
      const avancesEnEtapaFinal = avancesOrden.filter((av) => {
        const ordenEtapa = av.orden_etapa;
        return ordenEtapa >= maxOrdenEtapaFinal;
      });
      const todosAvancesFinalesCompletados =
        avancesEnEtapaFinal.length > 0 &&
        avancesEnEtapaFinal.every((av) => av.estado === "completado");
      const hayAvancesEnProceso = enProceso.length > 0;

      // Solo es finalizada si no hay avances en proceso Y la etapa final fue alcanzada y completada
      const todasFinalizadas =
        maxOrdenEtapaFinal >= 0 &&
        orden_ultima_completada >= 0 &&
        orden_ultima_completada >= maxOrdenEtapaFinal &&
        !hayAvancesEnProceso &&
        todosAvancesFinalesCompletados;

      // Prioridad 1: Si estado es 'entregada', va a la columna entregada
      if (orden.estado_orden === "entregada") {
        columna = "entregada";
      }
      // Prioridad 2: Si estado es 'completada', va a la columna finalizada (respetar estado de BD)
      else if (orden.estado_orden === "completada") {
        columna = "finalizada";
      }
      // Prioridad 3: Si todas las etapas requeridas fueron completadas
      else if (todasFinalizadas) {
        columna = "finalizada";
      } else if (etapaEnProcesoActual) {
        columna = `etapa_${etapaEnProcesoActual.id_etapa_produccion}`;
        estado_etapa = "en_proceso";
      } else {
        if (ultimaCompletada) {
          const proxima = siguienteMap[ultimaCompletada.id_etapa_produccion];
          const orden_proxima = proxima ? etapaOrdenMap[proxima] : -1;
          // Verificar si la próxima etapa está dentro del rango requerido (usando campo orden)
          if (
            proxima &&
            orden_proxima >= 0 &&
            orden_proxima <= maxOrdenEtapaFinal
          ) {
            columna = `etapa_${proxima}`;
            estado_etapa = "pendiente_iniciar";
          } else {
            // Ya completó todas las etapas requeridas
            columna = "finalizada";
          }
        } else {
          // No ha completado ninguna etapa, empieza en la primera etapa
          columna = primeraEtapaId ? `etapa_${primeraEtapaId}` : "sin_iniciar";
          estado_etapa = "pendiente_iniciar";
        }
      }

      // Calcular si está retrasada
      const hoy = new Date();
      const fechaEstimada = orden.fecha_fin_estimada
        ? new Date(orden.fecha_fin_estimada)
        : null;
      const diasRestantes = fechaEstimada
        ? Math.ceil((fechaEstimada - hoy) / (1000 * 60 * 60 * 24))
        : null;

      let prioridad = "normal";
      if (diasRestantes !== null) {
        if (diasRestantes < 0) prioridad = "retrasada";
        else if (diasRestantes <= 3) prioridad = "urgente";
      }

      return {
        ...orden,
        total_etapas_requeridas,
        columna,
        estado_etapa,
        dias_restantes: diasRestantes,
        prioridad,
      };
    });

    return ordenes;
  },

  /**
   * Obtiene órdenes entregadas filtradas por mes/año
   */
  getOrdenesEntregadas: async (mes = null, anio = null) => {
    // Si no se especifica mes/año, usar el mes actual
    const fechaActual = new Date();
    const mesConsulta = mes || fechaActual.getMonth() + 1;
    const anioConsulta = anio || fechaActual.getFullYear();

    const query = `
      SELECT 
        ofa.id_orden_fabricacion,
        ofa.fecha_inicio,
        ofa.fecha_fin_estimada,
        ofa.fecha_entrega,
        ofa.estado,
        ofa.id_pedido,
        c.nombre as nombre_cliente,
        c.telefono as telefono_cliente,
        GROUP_CONCAT(DISTINCT CONCAT(a.referencia, ' - ', a.descripcion, ' (x', dof.cantidad, ')') SEPARATOR ', ') as productos
      FROM ordenes_fabricacion ofa
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      LEFT JOIN detalle_orden_fabricacion dof ON ofa.id_orden_fabricacion = dof.id_orden_fabricacion
      LEFT JOIN articulos a ON dof.id_articulo = a.id_articulo
      WHERE ofa.estado = 'entregada'
        AND MONTH(ofa.fecha_entrega) = ?
        AND YEAR(ofa.fecha_entrega) = ?
      GROUP BY ofa.id_orden_fabricacion, ofa.fecha_inicio, ofa.fecha_fin_estimada, 
               ofa.fecha_entrega, ofa.estado, ofa.id_pedido, c.nombre, c.telefono
      ORDER BY ofa.fecha_entrega DESC
    `;

    const [rows] = await db.query(query, [mesConsulta, anioConsulta]);
    return rows;
  },

  /**
   * Marca una orden como entregada
   */
  marcarComoEntregada: async (id_orden_fabricacion) => {
    // Actualizar el estado y establecer la fecha de entrega
    await db.query(
      `UPDATE ordenes_fabricacion 
       SET estado = 'entregada', fecha_entrega = NOW() 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion],
    );

    // Retornar la orden actualizada con su fecha
    const [rows] = await db.query(
      `SELECT id_orden_fabricacion, fecha_fin_estimada, fecha_entrega
       FROM ordenes_fabricacion 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion],
    );

    return rows[0];
  },
  /**
   * Obtiene las etapas de producción ordenadas
   */ getEtapasProduccion: async () => {
    const [rows] = await db.query(
      `SELECT id_etapa, nombre, orden, cargo 
       FROM etapas_produccion 
       ORDER BY orden ASC`,
    );
    return rows;
  },
};

module.exports = kanbanModel;
