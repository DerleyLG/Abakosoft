import React, { useEffect, useState, useCallback } from "react";
import formateaCantidad from "../utils/formateaCantidad";
import api from "../services/api";
import { FiLoader, FiArrowLeft, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatInTimeZone } from "date-fns-tz";

const debounce = (func, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

const ReporteBase = ({
  endpoint,
  columnas,
  titulo,
  filtros = [],
  onDataChange,
  exportSummary = [],
  showSummary = true,
  containerClassName = "p-6",
  summaryVariant = "default",
}) => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtrosActivos, setFiltrosActivos] = useState({});
  const [filtrosParaAPI, setFiltrosParaAPI] = useState({});
  const [internalSummary, setInternalSummary] = useState([]);
  const navigate = useNavigate();

  const timezone = "America/Bogota";

  const formatDateCell = (value) => {
    if (!value) return "";
    if (typeof value === "string") {
      const ymd = value.slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
        const [y, m, d] = ymd.split("-");
        return `${d}/${m}/${y}`;
      }
    }
    try {
      return new Date(value).toLocaleDateString("es-CO", {
        timeZone: "America/Bogota",
      });
    } catch {
      return String(value);
    }
  };

  const obtenerDatos = useCallback(async () => {
    try {
      setCargando(true);
      const res = await api.get(endpoint, { params: filtrosParaAPI });

      // Soportar forma { data, summary }
      let datosProcesados = Array.isArray(res.data)
        ? res.data
        : res.data?.data || [];
      const summaryFromRes = Array.isArray(res.data?.summary)
        ? res.data.summary
        : [];
      setInternalSummary(summaryFromRes);
      setDatos(datosProcesados);
      try {
        onDataChange && onDataChange(datosProcesados);
      } catch {}
      toast.success("Datos cargados exitosamente.");
    } catch (error) {
      console.error("Error al cargar los datos:", error);
      toast.error(
        `Error al cargar los datos: ${
          error.response?.data?.message || error.message
        }`,
      );
      try {
        onDataChange && onDataChange([]);
      } catch {}
    } finally {
      setCargando(false);
    }
  }, [endpoint, filtrosParaAPI]);

  useEffect(() => {
    obtenerDatos();
  }, [obtenerDatos]);

  const debouncedSetFiltrosParaAPI = useCallback(
    debounce((newFiltros) => {
      setFiltrosParaAPI(newFiltros);
    }, 1000),
    [],
  );

  const handleChangeFiltro = (name, value) => {
    const newFiltros = { ...filtrosActivos, [name]: value };
    setFiltrosActivos(newFiltros);
    debouncedSetFiltrosParaAPI(newFiltros);
  };

  const generarPDF = () => {
    try {
      if (!datos || datos.length === 0)
        return toast.error("No hay datos para exportar");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const headers = columnas.map((c) => c.header);
      const body = datos.map((row) => {
        return columnas.map((col) => {
          let value;
          if (typeof col.accessor === "function") {
            value = col.accessor(row);
          } else {
            value = row[col.accessor];
          }

          const isDateColumn = [
            "fecha_registro",
            "ultima_actualizacion",
            "fecha",
            "fecha_pago",
            "fecha_inicio",
          ].includes(col.accessor);
          if (isDateColumn && value) return formatDateCell(value);
          if (col.isCurrency) return formatCurrencyCOP(value);
          return value == null ? "" : String(value);
        });
      });

      doc.setFontSize(14);
      doc.text(titulo || "Reporte", 40, 40);
      doc.setFontSize(10);
      const dateStr = new Date().toLocaleString();
      doc.text(`Generado: ${dateStr}`, 40, 56);

      let startY = 80;
      const summaryToUse =
        exportSummary && exportSummary.length > 0
          ? exportSummary
          : internalSummary;
      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        let y = 76;
        doc.setFontSize(11);
        summaryToUse.forEach((item) => {
          const label = item?.label ? String(item.label) : "";
          const valueNum =
            typeof item?.value === "string"
              ? parseFloat(item.value)
              : Number(item?.value);
          const valueStr = item?.isCurrency
            ? formatCurrencyCOP(valueNum)
            : (item?.value ?? "");
          doc.text(`${label}: ${valueStr}`, 40, y);
          y += 16;
        });
        startY = y + 8;
      }

      autoTable(doc, {
        startY,
        head: [headers],
        body: body,
        theme: "striped",
        styles: { fontSize: 9 },
        headStyles: { fillColor: [44, 62, 80], textColor: 255 },
      });

      const fileName = `${(titulo || "reporte").replace(
        /\s+/g,
        "_",
      )}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      toast.success("PDF generado");
    } catch (e) {
      console.error("Error generando PDF", e);
      toast.error("Error al generar PDF");
    }
  };

  const handleDownloadExcel = () => {
    try {
      if (!datos || datos.length === 0)
        return toast.error("No hay datos para exportar");

      const headers = columnas.map(
        (c) =>
          c.header || (typeof c.accessor === "string" ? c.accessor : "col"),
      );
      const rows = datos.map((row) => {
        return columnas.map((col) => {
          let value;
          if (typeof col.accessor === "function") value = col.accessor(row);
          else value = row[col.accessor];

          const isDateColumn = [
            "fecha_registro",
            "ultima_actualizacion",
            "fecha",
            "fecha_pago",
            "fecha_inicio",
          ].includes(col.accessor);
          if (isDateColumn && value) return formatDateCell(value);

          if (col.isCurrency) {
            const num =
              typeof value === "string"
                ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
                : Number(value);
            return isNaN(num) ? "" : num;
          }

          return value == null ? "" : value;
        });
      });

      const aoa = [];
      const summaryToUse =
        exportSummary && exportSummary.length > 0
          ? exportSummary
          : internalSummary;
      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        summaryToUse.forEach((item) => {
          const label = item?.label ? String(item.label) : "";
          const valueNum =
            typeof item?.value === "string"
              ? parseFloat(item.value.replace(/[^0-9.-]+/g, ""))
              : Number(item?.value);
          const valueCell = item?.isCurrency
            ? isNaN(valueNum)
              ? ""
              : valueNum
            : (item?.value ?? "");
          aoa.push([label, valueCell]);
        });
        aoa.push([]);
      }
      aoa.push(headers);
      rows.forEach((r) => aoa.push(r));
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const numCols = Math.max(...aoa.map((row) => row.length));
      const colWidths = Array.from({ length: numCols }).map((_, colIndex) => {
        let max = 0;
        aoa.forEach((row) => {
          const cell = row[colIndex];
          const len = cell == null ? 0 : String(cell).length;
          if (len > max) max = len;
        });
        return { wch: Math.min(Math.max(max + 2, 10), 50) };
      });
      ws["!cols"] = colWidths;

      columnas.forEach((col, colIndex) => {
        if (col.isCurrency) {
          const headerRowIndex = aoa.findIndex((r) => r === headers);
          for (let r = headerRowIndex + 1; r <= aoa.length; r++) {
            const cellAddress = XLSX.utils.encode_cell({
              c: colIndex,
              r: r - 1,
            });
            const cell = ws[cellAddress];
            if (cell && typeof cell.v === "number") {
              cell.t = "n";

              cell.z = "#,##0";
            }
          }
        }
      });

      if (Array.isArray(summaryToUse) && summaryToUse.length > 0) {
        summaryToUse.forEach((item, idx) => {
          if (item?.isCurrency) {
            const cellAddress = XLSX.utils.encode_cell({ c: 1, r: idx });
            const cell = ws[cellAddress];
            if (cell && typeof cell.v === "number") {
              cell.t = "n";
              cell.z = "#,##0";
            }
          }
        });
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Reporte");
      const fileName = `${(titulo || "reporte").replace(
        /\s+/g,
        "_",
      )}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel descargado");
    } catch (e) {
      console.error("Error exportando Excel", e);
      toast.error("Error al exportar Excel");
    }
  };

  const formatCurrencyCOP = (value) => {
    if (value === null || value === undefined) {
      return "";
    }
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      return String(value);
    }
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  };

  const effectiveSummary =
    exportSummary && exportSummary.length > 0 ? exportSummary : internalSummary;

  return (
    <div className={containerClassName}>
           {" "}
      <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl font-bold text-slate-700">{titulo}</h1> 
             {" "}
        <div className="flex gap-2">
                   {" "}
          <button
            onClick={handleDownloadExcel}
            className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datos.length === 0}
          >
                        Exportar Excel          {" "}
          </button>
                   {" "}
          <button
            onClick={generarPDF}
            className="bg-slate-600 hover:bg-slate-800 text-white px-4 py-2 rounded-md cursor-pointer"
            disabled={cargando || datos.length === 0}
          >
                        Exportar PDF          {" "}
          </button>
                   {" "}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-md font-semibold cursor-pointer"
            disabled={cargando}
          >
                        <FiArrowLeft />            <span>Volver</span>       
             {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </div>
           {" "}
      {filtros.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-10 mb-4">
                   {" "}
          {filtros.map((filtro) => (
            <div key={filtro.name} className="flex flex-col">
                           {" "}
              <label className="text-sm mb-1 text-slate-600">
                {filtro.label}
              </label>
                           {" "}
              {filtro.type === "datepicker" ? (
                <div className="relative">
                                   {" "}
                  <DatePicker
                    selected={
                      filtrosActivos[filtro.name]
                        ? new Date(filtrosActivos[filtro.name] + "T00:00:00")
                        : null
                    }
                    onChange={(date) => {
                      if (date) {
                        const formattedDate = formatInTimeZone(
                          date,
                          timezone,
                          "yyyy-MM-dd",
                        );
                        handleChangeFiltro(filtro.name, formattedDate);
                      } else {
                        handleChangeFiltro(filtro.name, null);
                      }
                    }}
                    dateFormat="yyyy-MM-dd"
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full"
                    disabled={cargando}
                    placeholderText={filtro.label}
                  />
                                                   {" "}
                  {filtrosActivos[filtro.name] && (
                    <button
                      type="button"
                      onClick={() => handleChangeFiltro(filtro.name, null)}
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                                            <FiX className="h-5 w-5" />         
                               {" "}
                    </button>
                  )}
                                 {" "}
                </div>
              ) : (
                <input
                  type={filtro.type || "text"}
                  name={filtro.name}
                  placeholder={filtro.label}
                  value={filtrosActivos[filtro.name] || ""}
                  onChange={(e) =>
                    handleChangeFiltro(e.target.name, e.target.value)
                  }
                  className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full"
                  disabled={cargando}
                />
              )}
                         {" "}
            </div>
          ))}
                 {" "}
        </div>
      )}
      {showSummary &&
        Array.isArray(effectiveSummary) &&
        effectiveSummary.length > 0 &&
        (summaryVariant === "prominent-all" ? (
          <div className="mb-4">
            <div className="rounded-xl p-5 bg-slate-50 border border-slate-200 text-slate-800 shadow-sm">
              <div className="flex flex-wrap gap-6">
                {effectiveSummary.map((item, idx) => (
                  <div key={idx} className="min-w-[220px]">
                    <div className="text-sm text-slate-600">
                      {item?.label ?? ""}
                    </div>
                    <div className="font-bold text-emerald-600">
                      {item?.isCurrency
                        ? formatCurrencyCOP(item?.value)
                        : (item?.value ?? "")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          (() => {
            const primary =
              effectiveSummary.find((i) => i && i.isCurrency) ||
              effectiveSummary[0];
            const others = effectiveSummary.filter((i) => i && i !== primary);
            return (
              <div className="mb-4">
                <div className="rounded-xl p-5 bg-slate-50 border border-slate-200 text-slate-800 shadow-sm flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 flex items-baseline flex-wrap gap-x-3 gap-y-1">
                    <span>{primary?.label ?? "Total"}</span>
                    <span className="pl-5 text-green-600 font-bold">
                      {primary?.isCurrency
                        ? formatCurrencyCOP(primary?.value)
                        : (primary?.value ?? "")}
                    </span>
                  </div>
                  {others.length > 0 && (
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      {others.map((item, idx) => (
                        <div key={idx}>
                          <span className="font-medium text-slate-600">
                            {item?.label ?? ""}:
                          </span>{" "}
                          <span className="font-semibold text-slate-900">
                            {item?.isCurrency
                              ? formatCurrencyCOP(item?.value)
                              : (item?.value ?? "")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()
        ))}
           {" "}
      <div className="overflow-x-auto bg-white rounded-lg shadow border border-slate-200">
               {" "}
        {cargando ? (
          <div className="text-center p-8 text-slate-500 flex justify-center items-center gap-2">
                        <FiLoader className="animate-spin" /> Cargando datos...
                     {" "}
          </div>
        ) : (
          <table className="min-w-full text-sm border-spacing-0 border border-gray-300 rounded-lg overflow-hidden text-left">
                       {" "}
            <thead className="bg-slate-100">
                           {" "}
              <tr>
                               {" "}
                {columnas.map((col) => (
                  <th
                    key={col.accessor}
                    className="text-left px-4 py-2 font-medium border-b border-gray-300"
                  >
                                        {col.header}                 {" "}
                  </th>
                ))}
                             {" "}
              </tr>
                         {" "}
            </thead>
                       {" "}
            <tbody>
                           {" "}
              {datos.length === 0 ? (
                <tr>
                                   {" "}
                  <td
                    colSpan={columnas.length}
                    className="text-center text-slate-400 py-6"
                  >
                                        No hay datos para mostrar.              
                       {" "}
                  </td>
                                 {" "}
                </tr>
              ) : (
                datos.map((fila, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                       {" "}
                    {columnas.map((col) => (
                      <td
                        key={col.accessor}
                        className="px-2 py-2 border-b border-gray-300"
                      >
                               {" "}
                        {(() => {
                          let value;
                          if (typeof col.accessor === "function") {
                            value = col.accessor(fila);
                          } else {
                            value = fila[col.accessor];
                          }

                          const isDateColumn = [
                            "fecha_registro",
                            "ultima_actualizacion",
                            "fecha",
                            "fecha_pago",
                            "fecha_inicio",
                          ].includes(col.accessor);

                          if (isDateColumn && value) {
                            return formatDateCell(value);
                          }

                          if (col.isCurrency) {
                            return formatCurrencyCOP(value);
                          }

                          // Formatear cantidades para columnas marcadas como esCantidad
                          if (col.esCantidad) {
                            return formateaCantidad(value);
                          }

                          return value;
                        })()}
                             {" "}
                      </td>
                    ))}
                     {" "}
                  </tr>
                ))
              )}
                         {" "}
            </tbody>
                     {" "}
          </table>
        )}
             {" "}
      </div>
         {" "}
    </div>
  );
};

export default ReporteBase;
