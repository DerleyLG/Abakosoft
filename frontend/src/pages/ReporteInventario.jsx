import ReporteBase from "../components/ReporteBase";

const ReporteInventario = () => {
  const endpoint = '/reportes/inventario';

  return (
    <ReporteBase
      titulo="Informe de Inventario"
      endpoint={endpoint}
      columnas={[
        { header: "Artículo", accessor: "descripcion" },
        { header: "Categoría", accessor: "categoria" },
        { header: "Stock Disponible", accessor: "stock" },
        { header: "Stock Mínimo", accessor: "stock_minimo" },
        { header: "Vendidas", accessor: "unidades_vendidas" },
        { header: "Fabricadas", accessor: "unidades_fabricadas" },
        { header: "Última Actualización", accessor: "ultima_actualizacion" },
      ]}
      filtros={[
        { name: 'desde', label: 'Desde', type: 'datepicker' },
        { name: 'hasta', label: 'Hasta', type: 'datepicker' },
      ]}
    />
  );
};

export default ReporteInventario;
