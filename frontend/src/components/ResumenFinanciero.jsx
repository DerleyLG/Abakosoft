const ResumenFinanciero = ({ ingresos = 0, egresos = 0, margen = 0, className = '' }) => {
  return (
    <div className={`bg-white rounded shadow p-4 flex flex-col ${className}`}>
      <h3 className="text-center text-gray-700 font-semibold mb-1">
        RESUMEN FINANCIERO MENSUAL
      </h3>
      <p className="text-center text-xs text-gray-500 mb-3">Basado en movimientos de caja del mes (ventas cobradas y abonos de crédito)</p>
      <div className="px-2 md:px-6 space-y-3">
        <p className="text-sm text-gray-700 font-semibold ">
          INGRESOS:{" "}
          <span className="pl-4 text-2xl font-bold text-green-600">
            ${ingresos.toLocaleString()}
          </span>
        </p>
        <p className="text-sm text-gray-700 font-semibold">
          EGRESOS:{" "}
          <span className="pl-4 text-2xl font-bold text-red-600">
            ${egresos.toLocaleString()}
          </span>
        </p>
        <p className="text-sm text-gray-700 font-semibold">
          MARGEN DE UTILIDAD:{" "}
          <span className="pl-4 text-2xl font-bold text-blue-600">
            {margen.toLocaleString()}%
          </span>
        </p>
      </div>
    </div>
  );
};



export default ResumenFinanciero
