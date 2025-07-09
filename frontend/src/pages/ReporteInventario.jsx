import ReporteBase from "../components/ReporteBase";

const ReporteInventario = () => {
  return (
    <ReporteBase
      titulo="Reporte de Inventario"
      endpoint="http://localhost:3300/api/reportes/inventario"
      filtros={[
        { name: "categoria", label: "Categoría" },
        { name: "articulo", label: "Nombre del Artículo" },
      ]}
      columnas={[
        { header: "Artículo", accessor: "descripcion" },
        { header: "Categoría", accessor: "categoria" }, 
        { header: "Stock", accessor: "stock" },
        { header: "Stock Mínimo", accessor: "stock_minimo" },
        { header: "Última Actualización", accessor: "ultima_actualizacion" },
      ]}
    />
  );
};

export default ReporteInventario;
