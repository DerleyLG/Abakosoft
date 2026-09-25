import { useState, useEffect, useMemo } from "react";
import ReporteBase from "../components/ReporteBase";
import api from "../services/api";

const ReporteInventario = () => {
  const [etapas, setEtapas] = useState([]);
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    const fetchEtapas = async () => {
      try {
        const res = await api.get("/etapas-produccion");
        setEtapas(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando etapas", error);
      }
    };
    fetchEtapas();
  }, []);

  // Cargar categorías para el filtro (igual que el módulo de inventario)
  useEffect(() => {
    const fetchCategorias = async () => {
      try {
        const res = await api.get("/categorias");
        setCategorias(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error cargando categorías", error);
      }
    };
    fetchCategorias();
  }, []);

  // Columnas de la vista "Por etapas": una columna por etapa de producción.
  // useMemo evita recrear los accessors en cada render (más rápido al pintar).
  // El accessor usa un Map cacheado por fila en lugar de .find() (O(1) por celda).
  const columnasEtapas = useMemo(
    () => [
      { header: "Referencia", accessor: "referencia" },
      { header: "Artículo", accessor: "descripcion" },
      {
        header: "Unidad",
        accessor: (f) => f.abreviatura_unidad || f.nombre_unidad || "ud",
      },
      ...etapas.map((e) => ({
        header: e.nombre,
        esCantidad: true,
        accessor: (f) => {
          if (!f._etapasMap) {
            f._etapasMap = new Map(
              (f.etapas || []).map((x) => [Number(x.id_etapa), x]),
            );
          }
          const etapa = f._etapasMap.get(Number(e.id_etapa));
          return etapa && etapa.cantidad > 0 ? etapa.cantidad : "";
        },
      })),
    ],
    [etapas],
  );

  // Filtros por vista (igual que el módulo de inventario):
  // - Stock: fecha + categoría
  // - Por etapas: fecha + etapa con unidades + categoría
  const filtrosComunes = [
    { name: "desde", label: "Desde", type: "datepicker" },
    { name: "hasta", label: "Hasta", type: "datepicker" },
  ];
  const filtroCategoria = {
    name: "id_categoria",
    label: "Categoría",
    type: "select",
    placeholder: "Todas las categorías",
    opciones: categorias.map((c) => ({
      value: c.id_categoria,
      label: c.nombre,
    })),
  };
  const filtroEtapa = {
    name: "id_etapa",
    label: "Etapa con unidades",
    type: "select",
    placeholder: "Todas las etapas",
    opciones: etapas.map((e) => ({
      value: e.id_etapa,
      label: e.nombre,
    })),
  };
  const filtroSoloProduccion = {
    name: "solo_con_produccion",
    label: "Solo con producción",
    type: "checkbox",
  };

  return (
    <ReporteBase
      titulo="Informe de Inventario"
      endpoint="/reportes/inventario"
      // Misma dinámica que el módulo de inventario: vista Stock | Por etapas
      vistas={[
        { id: "stock", label: "Stock" },
        { id: "etapas", label: "Por etapas" },
      ]}
      endpointsPorVista={{
        stock: "/reportes/inventario",
        etapas: "/inventario/por-etapas",
      }}
      columnasPorVista={{
        stock: [
          { header: "Artículo", accessor: "descripcion" },
          { header: "Categoría", accessor: "categoria" },
          { header: "Stock Disponible", accessor: "stock", esCantidad: true },
          {
            header: "Stock Mínimo",
            accessor: "stock_minimo",
            esCantidad: true,
          },
          {
            header: "Vendidas",
            accessor: "unidades_vendidas",
            esCantidad: true,
          },
          {
            header: "Fabricadas",
            accessor: "unidades_fabricadas",
            esCantidad: true,
          },
          {
            header: "Última Actualización",
            accessor: "ultima_actualizacion",
          },
        ],
        etapas: columnasEtapas,
      }}
      filtrosPorVista={{
        stock: [...filtrosComunes, filtroCategoria],
        etapas: [
          ...filtrosComunes,
          filtroEtapa,
          filtroSoloProduccion,
          filtroCategoria,
        ],
      }}
      // "Solo con producción" se aplica en el frontend (instantáneo, sin petición)
      filtrosClientSide={["solo_con_produccion"]}
      filtrarClientSide={(datos, filtros) => {
        if (filtros.solo_con_produccion) {
          return datos.filter((f) =>
            (f.etapas || []).some((e) => Number(e.cantidad) > 0),
          );
        }
        return datos;
      }}
    />
  );
};

export default ReporteInventario;
