import { useEffect, useState } from "react";
import axios from "axios";
import { FiLoader, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";


const ReporteBase = ({ titulo, endpoint, filtros = [], columnas = [] }) => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtrosActivos, setFiltrosActivos] = useState({});
  const navigate = useNavigate();
  
  useEffect(() => {
    obtenerDatos();
  }, [filtrosActivos]);

  const obtenerDatos = async () => {
    try {
      setCargando(true);
      const res = await axios.get(endpoint, { params: filtrosActivos });
      console.log("Respuesta completa:", res.data);

      if (res.data.success) {
        setDatos(res.data.data);
      } else {
        toast.error("No se pudieron cargar los datos.");
      }
    } catch (error) {
      console.error("Error cargando datos del reporte:", error);
      toast.error("Error al cargar el reporte.");
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    setFiltrosActivos({ ...filtrosActivos, [e.target.name]: e.target.value });
  };
const exportarExcel = () => {
  const worksheet = XLSX.utils.json_to_sheet(datos);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  XLSX.writeFile(workbook, `${titulo || "reporte"}.xlsx`);
};

const exportarPDF = () => {
  const doc = new jsPDF();
  doc.text(titulo || "Reporte", 14, 15);

  const columnasPDF = columnas.map((col) => col.header);
  const filasPDF = datos.map((fila) =>
    columnas.map((col) => fila[col.accessor] ?? "")
  );

  autoTable(doc, {
    startY: 20,
    head: [columnasPDF],
    body: filasPDF,
  });

  doc.save(`${titulo || "reporte"}.pdf`);
};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
  <h1 className="text-3xl font-bold text-slate-700">{titulo}</h1>

  <div className="flex gap-2">
    <button
      onClick={() => exportarExcel()}
      className="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md cursor-pointer "
    >
      Exportar Excel
    </button>
    <button
      onClick={() => exportarPDF()}
      className="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md cursor-pointer"
    >
      Exportar PDF
    </button>
         <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
        >
          <FiArrowLeft />
          <span>Volver</span>
        </button>
  </div>
</div>


      {filtros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {filtros.map((filtro) => (
            <input
              key={filtro.name}
              type="text"
              name={filtro.name}
              placeholder={filtro.label}
              value={filtrosActivos[filtro.name] || ""}
              onChange={handleChange}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          ))}
        </div>
      )}

      <div className="overflow-x-auto bg-white rounded-lg shadow border border-slate-200">
        {cargando ? (
          <div className="text-center p-8 text-slate-500 flex justify-center items-center gap-2">
            <FiLoader className="animate-spin" /> Cargando datos...
          </div>
        ) : (
          <table className="min-w-full text-sm text-slate-700">
            <thead className="bg-slate-100">
              <tr>
                {columnas.map((col) => (
                  <th key={col.accessor} className="text-left px-4 py-2 font-medium border-b">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.length === 0 ? (
                <tr>
                  <td colSpan={columnas.length} className="text-center text-slate-400 py-6">
                    No hay datos para mostrar.
                  </td>
                </tr>
              ) : (
                datos.map((fila, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    {columnas.map((col) => (
                      <td key={col.accessor} className="px-4 py-2 border-b">
                        {col.accessor === "ultima_actualizacion"
                          ? new Date(fila[col.accessor]).toLocaleDateString()
                          : fila[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReporteBase;
