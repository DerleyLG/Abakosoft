const ResumenFinanciero = ({ ingresos = 0, egresos = 0, margen = 0 }) => {
  return (
    <div className="bg-white rounded shadow p-4 flex flex-col md:col-span-2">
      <h3 className="p-4 text-center text-gray-700 font-semibold">
        RESUMEN FINANCIERO
      </h3>
      <div className="pl-16 space-y-4">
        <p className="text-2xs text-gray-700 font-semibold ">
          INGRESOS:{" "}
          <span className="pl-10 text-2xl font-bold text-green-600">
            ${ingresos.toLocaleString()}
          </span>
        </p>
        <p className="text-2xs text-gray-700 font-semibold">
          EGRESOS:{" "}
          <span className="pl-10 text-2xl font-bold text-red-600">
            ${egresos.toLocaleString()}
          </span>
        </p>
        <p className="text-gray-700 font-semibold">
          MARGEN DE UTILIDAD:{" "}
          <span className="pl-10 text-2xl font-bold text-blue-600">
            {margen.toLocaleString()}%
          </span>
        </p>
      </div>
    </div>
  );
};



export default ResumenFinanciero
