const db = require("../database/db");

const consumoMateriaPrimaModel = {
  calcularCostosPorArticulo: async (id_orden_fabricacion) => {
    // 1. Obtener consumos de materia prima asociados a la orden (exclusivos) y generales (sin orden)
    const [consumosExclusivos] = await db.query(
      `
      SELECT a.id_etapa, e.nombre AS nombre_etapa, c.id_articulo, a.descripcion, a.precio_costo, c.cantidad, (c.cantidad * a.precio_costo) AS total_consumo
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      JOIN etapas_produccion e ON a.id_etapa = e.id_etapa
      WHERE c.id_orden_fabricacion = ?
    `,
      [id_orden_fabricacion],
    );

    const [consumosGenerales] = await db.query(`
      SELECT a.id_articulo, a.descripcion, a.precio_costo, c.cantidad, c.costo_total, a.id_etapa, e.nombre AS nombre_etapa
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      JOIN etapas_produccion e ON a.id_etapa = e.id_etapa
      WHERE c.id_orden_fabricacion IS NULL
    `);

    // 2. Obtener avances de artículos en la orden, agrupados por etapa
    const [avances] = await db.query(
      `
      SELECT aep.id_etapa_produccion AS id_etapa, ep.nombre AS nombre_etapa, aep.id_articulo, art.descripcion, art.precio_venta, SUM(aep.cantidad) AS cantidad_avanzada
      FROM avance_etapas_produccion aep
      JOIN etapas_produccion ep ON aep.id_etapa_produccion = ep.id_etapa
      JOIN articulos art ON aep.id_articulo = art.id_articulo
      WHERE aep.id_orden_fabricacion = ?
      GROUP BY aep.id_etapa_produccion, aep.id_articulo
    `,
      [id_orden_fabricacion],
    );

    // 3. Agrupar avances por etapa
    const avancesPorEtapa = {};
    for (const a of avances) {
      if (!avancesPorEtapa[a.id_etapa]) {
        avancesPorEtapa[a.id_etapa] = {
          nombre_etapa: a.nombre_etapa,
          articulos: [],
        };
      }
      avancesPorEtapa[a.id_etapa].articulos.push(a);
    }

    // 4. Prorratear consumos exclusivos (por orden) igual que antes
    let resultado = [];
    for (const c of consumosExclusivos) {
      // Buscar avance correspondiente
      const etapaAvances = avancesPorEtapa[c.id_etapa];
      if (!etapaAvances || etapaAvances.articulos.length === 0) continue;
      // Calcular total ponderado de precio de venta en la etapa
      let totalVentaEtapa = 0;
      etapaAvances.articulos.forEach((a) => {
        totalVentaEtapa += Number(a.precio_venta) * Number(a.cantidad_avanzada);
      });
      if (totalVentaEtapa === 0) continue;
      // Para cada artículo avanzado, calcular porcentaje y prorratear
      etapaAvances.articulos.forEach((a) => {
        const valorTotalArticulo =
          Number(a.precio_venta) * Number(a.cantidad_avanzada);
        const porcentaje = valorTotalArticulo / totalVentaEtapa;
        const costo_prorrateado = porcentaje * Number(c.total_consumo);
        resultado.push({
          id_orden_fabricacion: id_orden_fabricacion,
          id_etapa: Number(c.id_etapa),
          nombre_etapa: c.nombre_etapa,
          id_articulo: a.id_articulo,
          descripcion: a.descripcion,
          cantidad_avanzada: Number(a.cantidad_avanzada),
          precio_venta: Number(a.precio_venta),
          porcentaje: +(porcentaje * 100).toFixed(2),
          costo_prorrateado: +costo_prorrateado.toFixed(2),
          costo_unitario_prorrateado: +(
            costo_prorrateado / Number(a.cantidad_avanzada)
          ).toFixed(2),
          costo_total_articulo: +costo_prorrateado.toFixed(2),
        });
      });
    }

    // 5. Prorratear consumos generales (sin orden) según avances de la orden y etapa referenciada
    for (const c of consumosGenerales) {
      // Solo prorratear si hay avances en la etapa de la orden
      const etapaAvances = avancesPorEtapa[c.id_etapa];
      if (!etapaAvances || etapaAvances.articulos.length === 0) continue;
      // Calcular total ponderado de precio de venta en la etapa
      let totalVentaEtapa = 0;
      etapaAvances.articulos.forEach((a) => {
        totalVentaEtapa += Number(a.precio_venta) * Number(a.cantidad_avanzada);
      });
      if (totalVentaEtapa === 0) continue;
      // Para cada artículo avanzado, calcular porcentaje y prorratear
      etapaAvances.articulos.forEach((a) => {
        const valorTotalArticulo =
          Number(a.precio_venta) * Number(a.cantidad_avanzada);
        const porcentaje = valorTotalArticulo / totalVentaEtapa;
        const costo_prorrateado = porcentaje * Number(c.costo_total);
        resultado.push({
          id_orden_fabricacion: id_orden_fabricacion,
          id_etapa: Number(c.id_etapa),
          nombre_etapa: c.nombre_etapa,
          id_articulo: a.id_articulo,
          descripcion: a.descripcion,
          cantidad_avanzada: Number(a.cantidad_avanzada),
          precio_venta: Number(a.precio_venta),
          porcentaje: +(porcentaje * 100).toFixed(2),
          costo_prorrateado: +costo_prorrateado.toFixed(2),
          costo_unitario_prorrateado: +(
            costo_prorrateado / Number(a.cantidad_avanzada)
          ).toFixed(2),
          costo_total_articulo: +costo_prorrateado.toFixed(2),
        });
      });
    }
    return resultado;
  },
  registrarConsumo: async ({
    fecha,
    id_articulo,
    cantidad,
    costo_unitario,
    notas,
    id_usuario,
    id_orden_fabricacion = null,
  }) => {
    const costo_total = cantidad * (costo_unitario || 0);

    const query = `
      INSERT INTO consumos_materia_prima 
      (fecha, id_articulo, id_orden_fabricacion, cantidad, costo_unitario, costo_total, notas, id_usuario)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(query, [
      fecha,
      id_articulo,
      id_orden_fabricacion,
      cantidad,
      costo_unitario || 0,
      costo_total,
      notas || null,
      id_usuario || null,
    ]);

    return result.insertId;
  },

  /**
   * Obtener consumos por artículo
   */
  getConsumosPorArticulo: async (id_articulo, limite = 10) => {
    const query = `
      SELECT 
        c.id_consumo,
        c.fecha,
        c.cantidad,
        c.costo_unitario,
        c.costo_total,
        c.notas,
        c.fecha_registro,
        c.id_orden_fabricacion,
        u.nombre_usuario,
        a.descripcion,
        a.referencia,
        un.abreviatura AS abreviatura_unidad,
        un.nombre AS unidad
      FROM consumos_materia_prima c
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      JOIN articulos a ON c.id_articulo = a.id_articulo
      LEFT JOIN unidades un ON a.id_unidad = un.id_unidad
      WHERE c.id_articulo = ?
      ORDER BY c.fecha DESC, c.fecha_registro DESC
      LIMIT ?
    `;
    const [rows] = await db.query(query, [id_articulo, limite]);
    return rows;
  },

  /**
   * Obtener resumen de consumos por período
   */
  getResumenSemanal: async (fechaInicio, fechaFin) => {
    const query = `
      SELECT 
        a.id_articulo,
        a.referencia,
        a.descripcion,
        a.precio_costo,
        u.nombre AS nombre_unidad,
        u.abreviatura AS abreviatura_unidad,
        a.id_etapa,
        e.nombre AS nombre_etapa,
        SUM(c.cantidad) AS total_consumido,
        SUM(c.costo_total) AS costo_total,
        COUNT(c.id_consumo) AS num_registros
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      LEFT JOIN unidades u ON a.id_unidad = u.id_unidad
      LEFT JOIN etapas_produccion e ON a.id_etapa = e.id_etapa
      WHERE c.fecha BETWEEN ? AND ?
      GROUP BY a.id_articulo, a.referencia, a.descripcion, a.precio_costo, u.nombre, u.abreviatura, a.id_etapa, e.nombre
      ORDER BY e.nombre ASC, total_consumido DESC
    `;
    const [rows] = await db.query(query, [fechaInicio, fechaFin]);
    return rows;
  },

  /**
   * Obtener detalle de consumos por período
   */
  getDetalleConsumos: async (fechaInicio, fechaFin, id_articulo = null) => {
    let query = `
      SELECT 
        c.id_consumo,
        c.fecha,
        c.cantidad,
        c.costo_unitario,
        c.costo_total,
        c.notas,
        c.fecha_registro,
        a.id_articulo,
        a.referencia,
        a.descripcion,
        u.nombre_usuario
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      LEFT JOIN usuarios u ON c.id_usuario = u.id_usuario
      WHERE c.fecha BETWEEN ? AND ?
    `;
    const params = [fechaInicio, fechaFin];

    if (id_articulo) {
      query += " AND c.id_articulo = ?";
      params.push(id_articulo);
    }

    query += " ORDER BY c.fecha DESC, c.fecha_registro DESC";

    const [rows] = await db.query(query, params);
    return rows;
  },

  /**
   * Obtener órdenes de fabricación activas en un período
   */
  getOrdenesActivasPeriodo: async (fechaInicio, fechaFin) => {
    const query = `
      SELECT 
        ofa.id_orden_fabricacion,
        ofa.estado,
        ofa.fecha_inicio,
        c.nombre AS nombre_cliente,
        (
          SELECT COUNT(DISTINCT dof.id_articulo)
          FROM detalle_orden_fabricacion dof
          WHERE dof.id_orden_fabricacion = ofa.id_orden_fabricacion
        ) AS total_articulos,
        (
          SELECT SUM(dof.cantidad)
          FROM detalle_orden_fabricacion dof
          WHERE dof.id_orden_fabricacion = ofa.id_orden_fabricacion
        ) AS total_unidades_orden,
        (
          SELECT COALESCE(SUM(aep.cantidad), 0)
          FROM avance_etapas_produccion aep
          JOIN etapas_produccion ep ON aep.id_etapa_produccion = ep.id_etapa
          WHERE aep.id_orden_fabricacion = ofa.id_orden_fabricacion
            AND ep.orden = 1
            AND aep.fecha_registro BETWEEN ? AND ?
        ) AS unidades_mecanizadas_periodo
      FROM ordenes_fabricacion ofa
      LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
      LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
      WHERE ofa.fecha_inicio BETWEEN ? AND ?
      ORDER BY ofa.id_orden_fabricacion DESC
    `;
    const [rows] = await db.query(query, [
      fechaInicio,
      fechaFin,
      fechaInicio,
      fechaFin,
    ]);
    return rows;
  },

  /**
   * Calcular prorrateo de consumo entre órdenes
   */
  calcularProrrateo: async (fechaInicio, fechaFin) => {
    // 1. Obtener detalle de consumos del período
    const detalleConsumos = await consumoMateriaPrimaModel.getDetalleConsumos(
      fechaInicio,
      fechaFin,
    );
    // 2. Obtener órdenes activas
    const ordenes = await consumoMateriaPrimaModel.getOrdenesActivasPeriodo(
      fechaInicio,
      fechaFin,
    );
    if (ordenes.length === 0 || detalleConsumos.length === 0) {
      return {
        consumos: [],
        ordenes,
        prorrateo: [],
        prorrateoPorArticulo: [],
        totales: {
          costo_total: 0,
          ordenes_activas: ordenes.length,
        },
      };
    }
    // 3. Separar consumos exclusivos y generales
    const consumosExclusivos = detalleConsumos.filter(
      (c) => c.id_orden_fabricacion,
    );
    const consumosGenerales = detalleConsumos.filter(
      (c) => !c.id_orden_fabricacion,
    );

    // DEBUG: Mostrar ids de artículos de consumos generales
    console.log(
      "[DEBUG] Artículos de consumos generales:",
      consumosGenerales.map((c) => c.id_articulo),
    );

    // 4. Obtener avances por orden, artículo y etapa en el periodo
    const idsOrdenes = ordenes.map((o) => o.id_orden_fabricacion);
    const avanceEtapasModel = require("./avanceEtapasModel");
    const avances = await avanceEtapasModel.getByOrdenes(idsOrdenes);

    // DEBUG: Mostrar ids de artículos y etapas de avances
    console.log(
      "[DEBUG] Avances encontrados:",
      avances.map((a) => ({
        id_articulo: a.id_articulo,
        id_etapa: a.id_etapa_produccion,
        nombre_etapa: a.nombre_etapa,
        cantidad: a.cantidad,
      })),
    );

    // Agrupar avances por artículo y etapa
    const avancesPorArticuloEtapa = {};
    let totalGlobalPorArticuloEtapa = {};
    for (const av of avances) {
      if (!avancesPorArticuloEtapa[av.id_articulo])
        avancesPorArticuloEtapa[av.id_articulo] = {};
      if (!avancesPorArticuloEtapa[av.id_articulo][av.id_etapa_produccion])
        avancesPorArticuloEtapa[av.id_articulo][av.id_etapa_produccion] = [];
      avancesPorArticuloEtapa[av.id_articulo][av.id_etapa_produccion].push({
        id_orden_fabricacion: av.id_orden_fabricacion,
        cantidad: Number(av.cantidad),
        id_etapa_produccion: av.id_etapa_produccion,
        nombre_etapa: av.nombre_etapa,
      });
      // Sumar al total global por artículo-etapa
      const key = `${av.id_articulo}_${av.id_etapa_produccion}`;
      totalGlobalPorArticuloEtapa[key] =
        (totalGlobalPorArticuloEtapa[key] || 0) + Number(av.cantidad);
    }

    // 5. Prorratear consumos generales por etapa relacionada
    // Primero, obtener la etapa relacionada de cada artículo de materia prima
    const db = require("../database/db");
    const consumosGeneralesPorArticulo = {};
    for (const c of consumosGenerales) {
      if (!consumosGeneralesPorArticulo[c.id_articulo]) {
        consumosGeneralesPorArticulo[c.id_articulo] = {
          ...c,
          total_consumido: 0,
          costo_total: 0,
          num_registros: 0,
          id_etapa_relacionada: null,
        };
      }
      consumosGeneralesPorArticulo[c.id_articulo].total_consumido += Number(
        c.cantidad,
      );
      consumosGeneralesPorArticulo[c.id_articulo].costo_total += Number(
        c.costo_total,
      );
      consumosGeneralesPorArticulo[c.id_articulo].num_registros += 1;
    }

    // Consultar la etapa relacionada y unidad para todos los artículos de materia prima involucrados
    const idsArticulos = Object.keys(consumosGeneralesPorArticulo);
    let etapasRelacionadas = {};
    let unidadesArticulos = {};
    if (idsArticulos.length > 0) {
      const [rows] = await db.query(
        `SELECT a.id_articulo, a.id_etapa, u.abreviatura AS abreviatura_unidad, u.nombre AS nombre_unidad 
         FROM articulos a 
         LEFT JOIN unidades u ON a.id_unidad = u.id_unidad
         WHERE a.id_articulo IN (${idsArticulos.map(() => "?").join(",")})`,
        idsArticulos,
      );
      for (const row of rows) {
        etapasRelacionadas[row.id_articulo] = row.id_etapa;
        unidadesArticulos[row.id_articulo] = {
          abreviatura: row.abreviatura_unidad || "uds",
          nombre: row.nombre_unidad || "Unidades",
        };
      }
    }

    // Estructura de prorrateo por artículo y etapa
    const prorrateoPorArticulo = [];
    for (const id_articulo in consumosGeneralesPorArticulo) {
      const consumo = consumosGeneralesPorArticulo[id_articulo];
      const id_etapa_relacionada = etapasRelacionadas[id_articulo] || null;
      if (!id_etapa_relacionada) continue; // Si el artículo no tiene etapa relacionada, no se prorratea

      // Obtener precio_costo real del artículo
      let precio_costo_real = 0;
      try {
        const [rows] = await db.query(
          "SELECT precio_costo FROM articulos WHERE id_articulo = ?",
          [id_articulo],
        );
        if (rows.length > 0) {
          precio_costo_real = Number(rows[0].precio_costo) || 0;
        }
      } catch (e) {
        precio_costo_real = 0;
      }

      // Buscar todos los avances en esa etapa (sin importar el artículo)
      let totalGlobal = 0;
      let avancesEtapa = [];
      for (const id_art in avancesPorArticuloEtapa) {
        if (avancesPorArticuloEtapa[id_art][id_etapa_relacionada]) {
          for (const av of avancesPorArticuloEtapa[id_art][
            id_etapa_relacionada
          ]) {
            // Agrupar por orden de fabricación
            let existente = avancesEtapa.find(
              (ae) => ae.id_orden_fabricacion === av.id_orden_fabricacion,
            );
            if (existente) {
              existente.cantidad += av.cantidad;
            } else {
              avancesEtapa.push({
                id_orden_fabricacion: av.id_orden_fabricacion,
                id_etapa_produccion: av.id_etapa_produccion,
                nombre_etapa: av.nombre_etapa,
                cantidad: av.cantidad,
              });
            }
            totalGlobal += av.cantidad;
          }
        }
      }
      if (totalGlobal === 0) continue;
      const distribucion = avancesEtapa.map((av) => {
        const proporcion = av.cantidad / totalGlobal;
        return {
          id_orden_fabricacion: av.id_orden_fabricacion,
          id_etapa_produccion: av.id_etapa_produccion,
          nombre_etapa: av.nombre_etapa,
          proporcion_porcentaje: Math.round(proporcion * 100),
          costo_asignado: Math.round(consumo.costo_total * proporcion),
          cantidad_asignada: Number(
            (consumo.total_consumido * proporcion).toFixed(3),
          ),
          cantidad_real_avance: av.cantidad,
        };
      });
      const unidadArticulo = unidadesArticulos[id_articulo] || {
        abreviatura: "uds",
        nombre: "Unidades",
      };
      prorrateoPorArticulo.push({
        id_articulo: Number(id_articulo),
        referencia: consumo.referencia,
        descripcion: consumo.descripcion,
        precio_costo: precio_costo_real,
        total_consumido: consumo.total_consumido,
        costo_total: consumo.costo_total,
        num_registros: consumo.num_registros,
        id_etapa: Number(id_etapa_relacionada),
        abreviatura_unidad: unidadArticulo.abreviatura,
        nombre_unidad: unidadArticulo.nombre,
        distribucion,
      });
    }
    console.log(
      "[DEBUG] prorrateoPorArticulo:",
      JSON.stringify(prorrateoPorArticulo, null, 2),
    );

    // 6. Calcular totales por orden (sumando exclusivos y prorrateados)
    const prorrateo = ordenes.map((orden) => {
      // Sumar consumos exclusivos de la orden
      const exclusivos = consumosExclusivos.filter(
        (c) => c.id_orden_fabricacion === orden.id_orden_fabricacion,
      );
      const totalExclusivo = exclusivos.reduce(
        (sum, c) => sum + Number(c.costo_total || 0),
        0,
      );
      // Sumar prorrateo de generales (costos y cantidades)
      let totalProrrateado = 0;
      let cantidadProrrateada = 0;
      for (const pr of prorrateoPorArticulo) {
        for (const dist of pr.distribucion) {
          if (dist.id_orden_fabricacion === orden.id_orden_fabricacion) {
            totalProrrateado += dist.costo_asignado;
            cantidadProrrateada += dist.cantidad_asignada;
          }
        }
      }
      // Sumar la cantidad de consumos exclusivos (asignados directamente a la orden)
      const cantidadExclusiva = exclusivos.reduce(
        (sum, c) => sum + Number(c.cantidad || 0),
        0,
      );
      return {
        id_orden_fabricacion: orden.id_orden_fabricacion,
        nombre_cliente: orden.nombre_cliente,
        costo_exclusivo: totalExclusivo,
        costo_prorrateado: totalProrrateado,
        costo_total: totalExclusivo + totalProrrateado,
        cantidad_prorrateada: cantidadProrrateada + cantidadExclusiva,
        cantidad_prorrateada_detalle: {
          prorrateada: cantidadProrrateada,
          exclusiva: cantidadExclusiva,
        },
      };
    });

    // 7. Totales generales
    const costoTotalConsumos = detalleConsumos.reduce(
      (sum, c) => sum + Number(c.costo_total || 0),
      0,
    );
    return {
      consumos: detalleConsumos,
      ordenes,
      prorrateo,
      prorrateoPorArticulo,
      totales: {
        costo_total: costoTotalConsumos,
        ordenes_activas: ordenes.length,
      },
    };
  },

  /**
   * Obtener resumen de consumo para cierre de caja
   * Incluye total por etapa y prorrateo por orden de fabricación
   */
  getResumenParaCierre: async (fechaInicio, fechaFin) => {
    // 1. Total de consumos en el período (con desglose por unidad)
    const [totalesGeneral] = await db.query(
      `SELECT 
        COUNT(DISTINCT c.id_consumo) AS total_registros,
        SUM(c.costo_total) AS costo_total
      FROM consumos_materia_prima c
      WHERE c.fecha BETWEEN ? AND ?`,
      [fechaInicio, fechaFin],
    );

    // 1b. Totales desglosados por unidad
    const [totalesPorUnidad] = await db.query(
      `SELECT 
        u.abreviatura AS abreviatura_unidad,
        u.nombre AS nombre_unidad,
        SUM(c.cantidad) AS total_unidades
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      LEFT JOIN unidades u ON a.id_unidad = u.id_unidad
      WHERE c.fecha BETWEEN ? AND ?
      GROUP BY u.abreviatura, u.nombre`,
      [fechaInicio, fechaFin],
    );

    // Estructurar totales con desglose
    const unidades_por_tipo = {};
    totalesPorUnidad.forEach((row) => {
      const unidadKey = row.abreviatura_unidad || "uds";
      unidades_por_tipo[unidadKey] = Number(row.total_unidades) || 0;
    });

    const totales = {
      total_registros: totalesGeneral[0]?.total_registros || 0,
      costo_total: totalesGeneral[0]?.costo_total || 0,
      unidades_por_tipo,
    };

    // 2. Consumos agrupados por etapa y unidad
    const [consumosPorEtapaUnidad] = await db.query(
      `SELECT 
        e.id_etapa,
        e.nombre AS nombre_etapa,
        u.abreviatura AS abreviatura_unidad,
        u.nombre AS nombre_unidad,
        COUNT(DISTINCT c.id_consumo) AS registros,
        SUM(c.cantidad) AS total_unidades,
        SUM(c.costo_total) AS costo_total
      FROM consumos_materia_prima c
      JOIN articulos a ON c.id_articulo = a.id_articulo
      LEFT JOIN unidades u ON a.id_unidad = u.id_unidad
      LEFT JOIN etapas_produccion e ON a.id_etapa = e.id_etapa
      WHERE c.fecha BETWEEN ? AND ?
      GROUP BY e.id_etapa, e.nombre, u.abreviatura, u.nombre
      ORDER BY e.nombre`,
      [fechaInicio, fechaFin],
    );

    // Agrupar consumos por etapa, con desglose por unidad
    const consumosPorEtapa = [];
    const etapaMap = {};
    consumosPorEtapaUnidad.forEach((row) => {
      const etapaKey = row.id_etapa || "sin_etapa";
      if (!etapaMap[etapaKey]) {
        etapaMap[etapaKey] = {
          id_etapa: row.id_etapa,
          nombre_etapa: row.nombre_etapa,
          registros: 0,
          costo_total: 0,
          unidades_por_tipo: {},
        };
      }
      etapaMap[etapaKey].registros += Number(row.registros) || 0;
      etapaMap[etapaKey].costo_total += Number(row.costo_total) || 0;
      const unidadKey = row.abreviatura_unidad || "uds";
      if (!etapaMap[etapaKey].unidades_por_tipo[unidadKey]) {
        etapaMap[etapaKey].unidades_por_tipo[unidadKey] = 0;
      }
      etapaMap[etapaKey].unidades_por_tipo[unidadKey] +=
        Number(row.total_unidades) || 0;
    });
    Object.values(etapaMap).forEach((etapa) => consumosPorEtapa.push(etapa));

    // 3. Avances reales por orden y etapa para calcular prorrateo
    // Solo incluir órdenes que NO estén canceladas y avances dentro del rango de fechas
    const [avancesReales] = await db.query(
      `SELECT 
        a.id_orden_fabricacion,
        a.id_etapa_produccion,
        e.nombre AS nombre_etapa,
        art.precio_venta,
        SUM(a.cantidad) AS cantidad_avanzada
      FROM avance_etapas_produccion a
      JOIN etapas_produccion e ON a.id_etapa_produccion = e.id_etapa
      JOIN articulos art ON a.id_articulo = art.id_articulo
      JOIN ordenes_fabricacion ofa ON a.id_orden_fabricacion = ofa.id_orden_fabricacion
      WHERE DATE(a.fecha_registro) BETWEEN ? AND ?
        AND ofa.estado != 'cancelada'
      GROUP BY a.id_orden_fabricacion, a.id_etapa_produccion, art.precio_venta`,
      [fechaInicio, fechaFin],
    );

    // 4. Calcular totales por etapa (precio venta total)
    const totalesPorEtapa = {};
    avancesReales.forEach((av) => {
      const etapaNombre = av.nombre_etapa || "Sin etapa";
      if (!totalesPorEtapa[etapaNombre]) {
        totalesPorEtapa[etapaNombre] = 0;
      }
      totalesPorEtapa[etapaNombre] +=
        Number(av.precio_venta || 0) * Number(av.cantidad_avanzada || 0);
    });

    // Asociar costo de consumo por etapa y unidades por tipo
    const costosPorEtapa = {};
    const unidadesPorEtapa = {}; // { etapa: { kg: 10, uds: 5, ... } }
    consumosPorEtapa.forEach((c) => {
      costosPorEtapa[c.nombre_etapa] = Number(c.costo_total || 0);
      unidadesPorEtapa[c.nombre_etapa] = c.unidades_por_tipo || {};
    });

    // 5. Calcular prorrateo por orden
    const ordenesProrrateo = {};
    avancesReales.forEach((av) => {
      const ordenId = av.id_orden_fabricacion;
      if (!ordenId) return;

      if (!ordenesProrrateo[ordenId]) {
        ordenesProrrateo[ordenId] = {
          id_orden_fabricacion: ordenId,
          etapas: {},
          totalPrecioVenta: 0,
          totalCostoEstimado: 0,
        };
      }

      const etapaNombre = av.nombre_etapa || "Sin etapa";
      const precioVentaAvance =
        Number(av.precio_venta || 0) * Number(av.cantidad_avanzada || 0);

      if (!ordenesProrrateo[ordenId].etapas[etapaNombre]) {
        ordenesProrrateo[ordenId].etapas[etapaNombre] = {
          precioVenta: 0,
          costoEstimado: 0,
        };
      }
      ordenesProrrateo[ordenId].etapas[etapaNombre].precioVenta +=
        precioVentaAvance;
      ordenesProrrateo[ordenId].totalPrecioVenta += precioVentaAvance;
    });

    // Calcular porcentaje y costo estimado por orden
    const totalGeneralPrecioVenta = Object.values(ordenesProrrateo).reduce(
      (sum, o) => sum + o.totalPrecioVenta,
      0,
    );
    const costoTotalConsumo = Number(totales.costo_total || 0);

    Object.values(ordenesProrrateo).forEach((orden) => {
      orden.porcentaje =
        totalGeneralPrecioVenta > 0
          ? (orden.totalPrecioVenta / totalGeneralPrecioVenta) * 100
          : 0;
      orden.totalCostoEstimado = (orden.porcentaje / 100) * costoTotalConsumo;

      // Calcular unidades prorrateadas por tipo para la orden
      orden.unidadesPorTipo = {};
      Object.keys(orden.etapas).forEach((etapaNombre) => {
        const etapaOrden = orden.etapas[etapaNombre];
        const totalEtapa = totalesPorEtapa[etapaNombre] || 0;
        const costoEtapa = costosPorEtapa[etapaNombre] || 0;
        const unidadesEtapa = unidadesPorEtapa[etapaNombre] || {};

        etapaOrden.porcentaje =
          totalEtapa > 0 ? (etapaOrden.precioVenta / totalEtapa) * 100 : 0;
        etapaOrden.costoEstimado = (etapaOrden.porcentaje / 100) * costoEtapa;

        // Calcular unidades prorrateadas por tipo para esta etapa y acumular en la orden
        Object.entries(unidadesEtapa).forEach(([unidad, cantidad]) => {
          const cantidadProrrateada = (etapaOrden.porcentaje / 100) * cantidad;
          if (!orden.unidadesPorTipo[unidad]) {
            orden.unidadesPorTipo[unidad] = 0;
          }
          orden.unidadesPorTipo[unidad] += cantidadProrrateada;
        });
      });
    });

    // 6. Obtener nombres de clientes para las órdenes
    const ordenesIds = Object.keys(ordenesProrrateo);
    let ordenesConCliente = [];
    if (ordenesIds.length > 0) {
      const [ordenesInfo] = await db.query(
        `SELECT ofa.id_orden_fabricacion, c.nombre AS nombre_cliente
        FROM ordenes_fabricacion ofa
        LEFT JOIN pedidos p ON ofa.id_pedido = p.id_pedido
        LEFT JOIN clientes c ON p.id_cliente = c.id_cliente
        WHERE ofa.id_orden_fabricacion IN (?)`,
        [ordenesIds],
      );
      ordenesConCliente = ordenesInfo;
    }

    // Agregar nombre de cliente a cada orden
    ordenesConCliente.forEach((info) => {
      if (ordenesProrrateo[info.id_orden_fabricacion]) {
        ordenesProrrateo[info.id_orden_fabricacion].nombre_cliente =
          info.nombre_cliente || "Sin cliente";
      }
    });

    return {
      totales,
      consumosPorEtapa,
      ordenesProrrateo: Object.values(ordenesProrrateo).sort(
        (a, b) => b.totalCostoEstimado - a.totalCostoEstimado,
      ),
    };
  },

  /**
   * Eliminar un consumo
   */
  eliminarConsumo: async (id_consumo) => {
    const [consumo] = await db.query(
      "SELECT * FROM consumos_materia_prima WHERE id_consumo = ?",
      [id_consumo],
    );

    if (consumo.length === 0) {
      throw new Error("Consumo no encontrado");
    }

    await db.query("DELETE FROM consumos_materia_prima WHERE id_consumo = ?", [
      id_consumo,
    ]);

    return consumo[0];
  },
};

module.exports = consumoMateriaPrimaModel;
