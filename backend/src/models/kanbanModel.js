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
        
        GROUP_CONCAT(DISTINCT CONCAT(a.descripcion, ' (x', dof.cantidad, ')') SEPARATOR ', ') as productos,
        
        -- Etapa actualmente en proceso (de avances registrados)
        MAX(CASE WHEN aep.estado = 'en proceso' THEN aep.id_etapa_produccion ELSE NULL END) as etapa_en_proceso_id,
        MAX(CASE WHEN aep.estado = 'en proceso' THEN ep_avances.nombre ELSE NULL END) as etapa_en_proceso_nombre,
        
        -- Última etapa completada (de avances registrados) - Por FECHA, no por ID
        (SELECT aep2.id_etapa_produccion 
         FROM avance_etapas_produccion aep2 
         WHERE aep2.id_orden_fabricacion = ofa.id_orden_fabricacion 
           AND aep2.estado = 'completado'
         ORDER BY aep2.fecha_registro DESC 
         LIMIT 1) as ultima_etapa_id,
        
        -- Fecha de completado de la última etapa
        (SELECT aep2.fecha_registro 
         FROM avance_etapas_produccion aep2 
         WHERE aep2.id_orden_fabricacion = ofa.id_orden_fabricacion 
           AND aep2.estado = 'completado'
         ORDER BY aep2.fecha_registro DESC 
         LIMIT 1) as fecha_ultima_etapa_completada,
        
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

    // Fecha límite: 15 días atrás desde hoy
    const fechaLimiteFinalizadas = new Date();
    fechaLimiteFinalizadas.setDate(fechaLimiteFinalizadas.getDate() - 15);

    // Calcular la columna (etapa/estado) donde debe aparecer cada OF
    const ordenes = rows.map((orden) => {
      let columna = "sin_iniciar"; // Por defecto
      let estado_etapa = null; // Para mostrar si está pendiente por iniciar o en proceso

      // Mapa de siguiente etapa después de completar una
      const siguienteMap = {
        11: 12, // Después de Carpintería → Pulido
        12: 3, // Después de Pulido → Pintura
        3: 13, // Después de Pintura → Tapizado
        13: null, // Después de Tapizado → Completado
      };

      // Determinar cuántas etapas necesita esta orden
      let total_etapas_requeridas = 0;
      const etapa_final = orden.id_etapa_final_requerida;

      // Contar cuántas etapas hay hasta la etapa final (según el mapa)
      if (etapa_final) {
        const etapasOrdenadas = [11, 12, 3, 13]; // Carpintería, Pulido, Pintura, Tapizado
        const indice_final = etapasOrdenadas.indexOf(etapa_final);
        if (indice_final >= 0) {
          total_etapas_requeridas = indice_final + 1; // +1 porque el índice es 0-based
        }
      }

      // Si no hay etapa final definida, asumir las 4 etapas estándar
      if (total_etapas_requeridas === 0) {
        total_etapas_requeridas = 4;
      }

      // Prioridad 1: Si estado es 'entregada', va a la columna final
      if (orden.estado_orden === "entregada") {
        columna = "entregada";
      }
      // Prioridad 2: Si completó la etapa final requerida, va a "Finalizado"
      else if (orden.ultima_etapa_id && orden.ultima_etapa_id === etapa_final) {
        columna = "finalizada";
      }
      // Prioridad 3: Si hay una etapa EN PROCESO, va a esa columna
      else if (orden.etapa_en_proceso_id) {
        columna = `etapa_${orden.etapa_en_proceso_id}`;
        estado_etapa = "en_proceso";
      }
      // Prioridad 4: Si no hay en proceso, determinar la siguiente etapa lógica
      else {
        if (orden.ultima_etapa_id) {
          // Si ya completó alguna etapa, ir a la siguiente
          const proxima = siguienteMap[orden.ultima_etapa_id];

          if (proxima && proxima <= etapa_final) {
            // Hay siguiente etapa y está dentro del rango requerido
            columna = `etapa_${proxima}`;
            estado_etapa = "pendiente_iniciar";
          } else {
            // Ya completó la última etapa requerida
            columna = "finalizada";
          }
        } else {
          // No ha completado ninguna etapa, empieza en Carpintería (etapa 11)
          columna = "etapa_11";
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
        total_etapas_requeridas, // Agregar el total calculado
        columna,
        estado_etapa, // Nuevo campo: 'en_proceso', 'pendiente_iniciar', o null
        dias_restantes: diasRestantes,
        prioridad,
      };
    });

    // Filtrar las órdenes finalizadas que tengan más de 15 días
    const ordenesFiltradas = ordenes.filter((orden) => {
      // Si la orden está en columna 'finalizada', verificar fecha
      if (
        orden.columna === "finalizada" &&
        orden.fecha_ultima_etapa_completada
      ) {
        const fechaCompletado = new Date(orden.fecha_ultima_etapa_completada);
        // Solo mostrar si se completó hace 15 días o menos
        return fechaCompletado >= fechaLimiteFinalizadas;
      }
      // Todas las demás órdenes se muestran normalmente
      return true;
    });

    return ordenesFiltradas;
  },

  /**
   * Marca una orden como entregada
   */
  marcarComoEntregada: async (id_orden_fabricacion) => {
    const [result] = await db.query(
      `UPDATE ordenes_fabricacion 
       SET estado = 'entregada' 
       WHERE id_orden_fabricacion = ?`,
      [id_orden_fabricacion]
    );
    return result;
  },

  /**
   * Obtiene las etapas de producción ordenadas
   */
  getEtapasProduccion: async () => {
    const [rows] = await db.query(
      `SELECT id_etapa, nombre, orden, cargo 
       FROM etapas_produccion 
       ORDER BY orden ASC`
    );
    return rows;
  },
};

module.exports = kanbanModel;
