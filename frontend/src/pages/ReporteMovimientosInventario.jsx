import ReporteBase from "../components/ReporteBase";

const ReporteMovimientosInventario = () => {
  return (
    <ReporteBase
      titulo="Reporte de Movimientos de Inventario"
      endpoint="http://localhost:3300/api/reportes/movimientos-inventario"
      columnas={[
        { header: "Fecha", accessor: "fecha" },
        { header: "Artículo", accessor: "articulo" },
        { header: "Categoría", accessor: "categoria" },
        { header: "Tipo", accessor: "tipo_movimiento" },
        { header: "Cantidad", accessor: "cantidad" },
        { header: "Observaciones", accessor: "observaciones" },
      ]}
      filtros={[
        { label: "Artículo", name: "id_articulo", type: "text" },
        { label: "Tipo", name: "tipo_movimiento", type: "text" },
        { label: "Fecha Desde", name: "fecha_desde", type: "datepicker" },
        { label: "Fecha Hasta", name: "fecha_hasta", type: "datepicker" },
      ]}
    />
  );
};

export default ReporteMovimientosInventario;