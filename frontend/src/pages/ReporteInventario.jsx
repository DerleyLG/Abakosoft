import ReporteBase from "../components/ReporteBase";

const ReporteInventario = () => {
  return (
    <ReporteBase
      titulo="Reporte de Inventario"
      endpoint={`${import.meta.env.VITE_API_URL}/reportes/inventario`}
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
